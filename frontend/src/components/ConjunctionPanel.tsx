import { useEffect, useState } from 'react';
import { useStore } from '../state/store.js';
import { getSimulation } from '../simulation/simulation.js';
import { findInSnapshot, nearestNeighbors } from '../state/snapshot-util.js';

const HELP: Record<string, string> = {
  Now: 'Live 3-D distance between the two satellites right now (from the propagator snapshot).',
  'Rel. speed':
    'Magnitude of their relative velocity right now. Head-on can exceed 14 km/s; co-orbital cluster-mates are near 0.',
  TCA: 'Time of Closest Approach — the exact instant during the next 24 h when they get nearest each other.',
  'Miss @ TCA':
    "3-D distance at TCA. Real collisions require this to be smaller than the two spacecraft's combined radius (a few metres).",
  'Rel. speed @ TCA': 'Closing speed at TCA. Higher = less warning time, more energy at impact.',
  Pc: 'Probability of Collision — statistical risk under a simplified Gaussian model (300 m 1σ uncertainty, 20 m combined hard-body radius). Operators typically start paying attention around 1e-4.',
  Severity:
    'UI meter only (0–100). Blends miss distance and Pc so you can eyeball dangerous conjunctions. NOT a formal risk metric — Pc is.',
};

/**
 * Two-satellite conjunction analysis. Shown whenever a satellite is selected;
 * populates automatically as soon as the user picks a "compare with" partner.
 * Also always shows a rolling list of the nearest neighbours in ECI space.
 */
export function ConjunctionPanel() {
  const selected = useStore((s) => s.selectedNoradId);
  const compare = useStore((s) => s.compareNoradId);
  const setCompare = useStore((s) => s.setCompare);
  const pickMode = useStore((s) => s.pickCompareMode);
  const setPickMode = useStore((s) => s.setPickCompareMode);
  const conjunction = useStore((s) => s.conjunction);
  const loading = useStore((s) => s.conjunctionLoading);
  const setConjunction = useStore((s) => s.setConjunction);
  const snapshot = useStore((s) => s.snapshot);
  const names = useStore((s) => s.indexByNorad);

  const selRow = selected != null ? findInSnapshot(snapshot, selected) : null;
  const neighbors = selRow && snapshot ? nearestNeighbors(snapshot, selected!, 5) : [];
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (selected == null || compare == null) return;
    const sim = getSimulation();
    if (!sim) return;
    let cancelled = false;
    setConjunction(null, true);
    sim
      .runConjunction(selected, compare, { hours: 24, coarseStepSec: 60 })
      .then((r) => {
        if (!cancelled) setConjunction(r, false);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('[conjunction]', err);
          setConjunction(null, false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selected, compare, setConjunction]);

  if (selected == null) return null;

  return (
    <section className="border-t border-space-border px-4 py-3">
      <header className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-widest text-space-dim">
        <div className="flex items-center gap-2">
          <span>Conjunction</span>
          <button
            onClick={() => setShowHelp((v) => !v)}
            className="rounded-full border border-space-border px-1.5 text-[9px] leading-tight hover:text-space-text"
            title="What do these values mean?"
          >
            ?
          </button>
        </div>
        {compare != null && (
          <button onClick={() => setCompare(null)} className="text-space-dim hover:text-space-text">
            clear
          </button>
        )}
      </header>

      {showHelp && (
        <div className="mb-3 space-y-2 rounded border border-space-border bg-space-bg/60 p-2 font-mono text-[10px] leading-snug text-space-text">
          <p className="text-space-dim">
            A <b>conjunction</b> is a close approach between two orbiting objects — not necessarily
            a collision. Values below describe how close and how risky the encounter is:
          </p>
          {Object.entries(HELP).map(([k, v]) => (
            <div key={k}>
              <span className="text-space-accent">{k}</span>
              <span className="text-space-dim"> — {v}</span>
            </div>
          ))}
        </div>
      )}

      {compare == null ? (
        <button
          onClick={() => setPickMode(!pickMode)}
          className={`w-full rounded border px-2 py-1.5 font-mono text-xs ${
            pickMode
              ? 'border-space-accent bg-space-accent/10 text-space-accent'
              : 'border-space-border text-space-text hover:border-space-accent'
          }`}
        >
          {pickMode ? 'Click a satellite to compare…' : 'Compare with…'}
        </button>
      ) : (
        <div className="mb-2 font-mono text-xs">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-space-dim">vs</span>
            <span className="truncate text-space-text">{names.get(compare) ?? `#${compare}`}</span>
          </div>
          {loading && <div className="text-space-dim">Searching next 24 h…</div>}
          {conjunction && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <Cell label="Now" value={`${conjunction.currentSepKm} km`} />
              <Cell
                label="Rel. speed"
                value={`${conjunction.currentRelSpeedKmS} km/s`}
              />
              <Cell
                label="TCA"
                value={new Date(conjunction.tcaMs).toISOString().slice(0, 19)}
                wide
              />
              <Cell label="Miss @ TCA" value={`${conjunction.missKm} km`} />
              <Cell label="Rel. speed @ TCA" value={`${conjunction.relSpeedKmS} km/s`} />
              <Cell label="Pc" value={conjunction.probabilityOfCollision.toExponential()} />
              <Cell label="Severity" value={<SeverityBar value={conjunction.severity} />} />
            </div>
          )}
        </div>
      )}

      {neighbors.length > 0 && (
        <>
          <div className="mb-1 mt-3 text-[9px] uppercase tracking-widest text-space-dim">
            Nearest neighbours
          </div>
          <ul className="font-mono text-xs">
            {neighbors.map((n) => (
              <li key={n.noradId}>
                <button
                  onClick={() => setCompare(n.noradId)}
                  className="flex w-full items-center justify-between rounded px-1.5 py-1 hover:bg-white/5"
                >
                  <span className="min-w-0 truncate text-left text-space-text">
                    {names.get(n.noradId) ?? `#${n.noradId}`}
                  </span>
                  <span className="ml-2 shrink-0 text-space-dim">{n.distanceKm.toFixed(0)} km</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Cell({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  const tip = HELP[label];
  return (
    <div className={wide ? 'col-span-2 flex justify-between' : 'flex flex-col'}>
      <span className="text-[9px] uppercase tracking-widest text-space-dim" title={tip}>
        {label}
        {tip && <span className="ml-1 opacity-60">ⓘ</span>}
      </span>
      <span className="text-space-text">{value}</span>
    </div>
  );
}

function SeverityBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = clamped > 66 ? 'bg-space-bad' : clamped > 33 ? 'bg-space-warn' : 'bg-emerald-400';
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-right">{clamped.toFixed(0)}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-space-border">
        <div className={`h-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
