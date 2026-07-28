import { useEffect, useState } from "react";
import { useStore } from "../state/store.js";
import { closestPairs, type ClosestPair } from "../state/snapshot-util.js";
import { ORBIT_CLASS_COLOR } from "@spacemap/shared";

const REFRESH_MS = 3000;

/**
 * Live "top closest pairs" leaderboard. Recomputes every ~3 s while the panel
 * is open; the scan is throttled and uses altitude-window pruning so it fits
 * in a main-thread budget without dropping frames. Click any row to select the
 * pair and jump the telemetry panel straight into full conjunction analysis
 * (TCA + miss + Pc).
 */
export function ConjunctionLeaderboard() {
  const open = useStore((s) => s.openOverlays.has("leaderboard"));
  const setOverlay = useStore((s) => s.setOverlay);
  const names = useStore((s) => s.indexByNorad);
  const select = useStore((s) => s.select);
  const setCompare = useStore((s) => s.setCompare);
  const [pairs, setPairs] = useState<ClosestPair[]>([]);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = () => {
      const snap = useStore.getState().snapshot;
      if (!snap) return;
      setComputing(true);
      // Push heavy pass off the render frame with a 0-ms defer.
      setTimeout(() => {
        if (cancelled) return;
        const t0 = performance.now();
        const result = closestPairs(snap, 10);
        const dt = performance.now() - t0;
        if (dt > 300) console.debug(`[leaderboard] scan took ${dt.toFixed(0)}ms`);
        setPairs(result);
        setComputing(false);
      }, 0);
    };
    run();
    const id = setInterval(run, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [open]);

  if (!open) return null;

  return (
    <aside className="spacemap-overlay pointer-events-auto absolute z-10 flex flex-col overflow-hidden rounded-2xl border border-space-border bg-space-panel/92 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-space-border px-3 py-2">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-space-dim">
            Global closest pairs
          </div>
          <div className="font-mono text-sm text-space-text">
            Top 10 · updated every {REFRESH_MS / 1000}s
          </div>
        </div>
        <button
          onClick={() => setOverlay("leaderboard", false)}
          className="text-space-dim hover:text-space-text"
        >
          ×
        </button>
      </header>

      <div className="border-b border-space-border px-3 py-2 text-[10px] leading-snug text-space-dim">
        Live pairs currently closest in 3-D space with relative speed &gt; 0.4 km/s
        (co-orbital cluster-mates filtered out). Click a row to load the full
        24-hour conjunction analysis in the telemetry panel.
      </div>

      <ul className="overflow-auto font-mono text-xs">
        {computing && pairs.length === 0 && (
          <li className="p-3 text-space-dim">Scanning…</li>
        )}
        {pairs.length === 0 && !computing && (
          <li className="p-3 text-space-dim">
            No qualifying pairs found in the current snapshot.
          </li>
        )}
        {pairs.map((p, idx) => (
          <li
            key={`${p.aId}-${p.bId}`}
            className="border-b border-space-border/40 last:border-b-0"
          >
            <button
              onClick={() => {
                select(p.aId);
                setCompare(p.bId);
                (window as unknown as { spacemapFocus?: (id: number) => void }).spacemapFocus?.(p.aId);
              }}
              className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-2 px-3 py-2 text-left hover:bg-white/5"
            >
              <span className="w-4 text-space-dim">{idx + 1}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate text-space-text">
                  <ClassDot cls={p.aClass} />
                  <span className="truncate">{names.get(p.aId) ?? `#${p.aId}`}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate text-space-dim">
                  <ClassDot cls={p.bClass} />
                  <span className="truncate">{names.get(p.bId) ?? `#${p.bId}`}</span>
                </div>
              </div>
              <span
                className={
                  p.distanceKm < 5
                    ? "text-space-bad"
                    : p.distanceKm < 15
                      ? "text-space-warn"
                      : "text-space-text"
                }
              >
                {p.distanceKm.toFixed(2)} km
              </span>
              <span className="text-space-dim">
                {p.relSpeedKmS.toFixed(2)} km/s
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function ClassDot({ cls }: { cls: string }) {
  const color = (ORBIT_CLASS_COLOR as Record<string, string>)[cls] ?? "#8899aa";
  return (
    <span
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: color }}
    />
  );
}
