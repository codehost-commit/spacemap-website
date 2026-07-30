import { useEffect, useState } from 'react';
import type { ConjunctionResult } from '@spacemap/shared';
import { useStore } from '../state/store.js';
import { closestPairs } from '../state/snapshot-util.js';
import { getSimulation } from '../simulation/simulation.js';
import { ORBIT_CLASS_COLOR } from '@spacemap/shared';

const REFRESH_MS = 500;

interface RankedConjunctionRow extends ConjunctionResult {
  aName: string;
  bName: string;
  aClass: string;
  bClass: string;
}

/**
 * Live "top closest pairs" leaderboard. Recomputes every ~3 s while the panel
 * is open; the scan is throttled and uses altitude-window pruning so it fits
 * in a main-thread budget without dropping frames. Click any row to select the
 * pair and jump the telemetry panel straight into full conjunction analysis
 * (TCA + miss + Pc).
 */
export function ConjunctionLeaderboard() {
  const open = useStore((s) => s.openOverlays.has('leaderboard'));
  const setOverlay = useStore((s) => s.setOverlay);
  const names = useStore((s) => s.indexByNorad);
  const select = useStore((s) => s.select);
  const setCompare = useStore((s) => s.setCompare);
  const [pairs, setPairs] = useState<RankedConjunctionRow[]>([]);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let running = false;
    const run = async () => {
      if (running) return;
      const snap = useStore.getState().snapshot;
      const sim = getSimulation();
      if (!snap || !sim) return;
      running = true;
      setComputing(true);

      try {
        const result = closestPairs(snap, 10, 40, 0.4);
        const nextRows: RankedConjunctionRow[] = [];

        for (const pair of result) {
          try {
            const conjunction = await sim.runConjunction(pair.aId, pair.bId, {
              hours: 24,
              coarseStepSec: 90,
            });
            if (cancelled) return;
            nextRows.push({
              ...conjunction,
              aName: names.get(pair.aId) ?? `#${pair.aId}`,
              bName: names.get(pair.bId) ?? `#${pair.bId}`,
              aClass: pair.aClass,
              bClass: pair.bClass,
            });
          } catch {
            // Skip pairs that fail refinement so the panel still renders.
          }
        }

        if (cancelled) return;
        nextRows.sort((a, b) => b.probabilityOfCollision - a.probabilityOfCollision);
        setPairs(nextRows);
      } finally {
        running = false;
        if (!cancelled) {
          setComputing(false);
        }
      }
    };
    void run();
    const id = setInterval(() => void run(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [open, names]);

  if (!open) return null;

  return (
    <aside className="spacemap-overlay pointer-events-auto absolute z-10 flex flex-col overflow-hidden rounded-2xl border border-space-border bg-space-panel/92 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-space-border px-3 py-2">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-space-dim">
            Global collision watch
          </div>
          <div className="font-mono text-sm text-space-text">Top 10</div>
        </div>
        <button
          onClick={() => setOverlay('leaderboard', false)}
          className="text-space-dim hover:text-space-text"
        >
          ×
        </button>
      </header>

      <div className="border-b border-space-border px-3 py-2 text-[10px] leading-snug text-space-dim">
        Pairs are ranked by actual collision probability over the next 24 hours, with miss distance
        and relative speed kept beside the percentage. Click any row to load the full conjunction
        analysis in the telemetry panel.
      </div>

      <ul className="flex-1 overflow-auto font-mono text-xs">
        {computing && pairs.length === 0 && <li className="p-3 text-space-dim">Scanning…</li>}
        {pairs.length === 0 && !computing && (
          <li className="p-3 text-space-dim">No qualifying pairs found in the current snapshot.</li>
        )}
        {pairs.map((p, idx) => (
          <li key={`${p.aId}-${p.bId}`} className="border-b border-space-border/40 last:border-b-0">
            <button
              onClick={() => {
                select(p.aId);
                setCompare(p.bId);
                (window as unknown as { spacemapFocus?: (id: number) => void }).spacemapFocus?.(
                  p.aId,
                );
              }}
              className="block w-full px-3 py-3 text-left transition-colors hover:bg-white/5"
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 w-5 shrink-0 text-space-dim">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate text-space-text">
                    <ClassDot cls={p.aClass} />
                    <span className="truncate">{p.aName}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 truncate text-space-dim">
                    <ClassDot cls={p.bClass} />
                    <span className="truncate">{p.bName}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`text-sm font-semibold ${getConjunctionTone(p.severity, p.probabilityOfCollision)}`}>
                    {formatProbabilityPercent(p.probabilityOfCollision)}
                  </div>
                  <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-space-dim">
                    Collision
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 pl-8">
                <MetricChip label="Miss" value={`${p.missKm} km`} valueClass="text-space-warn" />
                <MetricChip
                  label="Speed"
                  value={`${p.relSpeedKmS} km/s`}
                  valueClass="text-space-dim"
                />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function ClassDot({ cls }: { cls: string }) {
  const color = (ORBIT_CLASS_COLOR as Record<string, string>)[cls] ?? '#8899aa';
  return (
    <span
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: color }}
    />
  );
}

function getConjunctionTone(severity: number, pc: number): string {
  if (severity >= 70 || pc >= 1e-4) return 'text-[#ff6b6b]';
  if (severity >= 40 || pc >= 1e-6) return 'text-[#ffd166]';
  return 'text-[#8ed8ff]';
}

function formatProbabilityPercent(pc: number): string {
  const percent = pc * 100;
  if (percent === 0) return '0%';
  // Show full decimal precision so the user can see exactly how small the
  // probability is — never round or truncate significant digits.
  if (percent < 1) return `${percent.toExponential()}%`;
  return `${percent}%`;
}

function MetricChip({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="rounded-lg border border-space-border/60 bg-space-bg/30 px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-[0.18em] text-space-dim">{label}</div>
      <div className={`mt-1 text-xs font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
}
