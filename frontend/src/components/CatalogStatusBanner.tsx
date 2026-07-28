import { useStore } from '../state/store.js';

/**
 * Full-screen boot overlay. Stays up until three things are true:
 *   1. The TLE catalog has loaded (or errored out).
 *   2. Cesium's globe has finished streaming its initial imagery tiles.
 *   3. The propagator has produced its first non-empty snapshot.
 *
 * This gives the user a curated "loading → ready" experience instead of a
 * flash of an empty Earth while everything spools up.
 */
export function CatalogStatusBanner() {
  const status = useStore((s) => s.catalogStatus);
  const error = useStore((s) => s.catalogError);
  const imageryReady = useStore((s) => s.imageryReady);
  const firstSnapshot = useStore((s) => s.firstSnapshotReceived);
  const catalogSize = useStore((s) => s.catalogSize);

  const catalogReady = status === 'ready';
  const isError = status === 'error';
  const fullyReady = catalogReady && imageryReady && firstSnapshot;
  if (fullyReady && !isError) return null;

  // Progress fractions for the checklist.
  const steps: Array<{ label: string; done: boolean; note?: string }> = [
    {
      label: 'Downloading TLE catalog',
      done: catalogReady || isError,
      note: catalogReady ? `${catalogSize.toLocaleString()} objects` : undefined,
    },
    {
      label: 'Streaming Earth imagery',
      done: imageryReady,
    },
    {
      label: 'Propagating first snapshot',
      done: firstSnapshot,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const progressPct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-space-bg/90 backdrop-blur">
      <div className="mx-6 w-full max-w-md rounded-lg border border-space-border bg-space-panel/95 p-6 font-mono text-sm text-space-text shadow-2xl">
        <div className="mb-1 text-[10px] uppercase tracking-widest text-space-dim">
          SpaceMap — Orbital Nexus
        </div>
        <div className="mb-4 text-base font-semibold">
          {isError ? "Couldn't load the catalog" : 'Loading the sky…'}
        </div>

        {!isError && (
          <>
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-space-border">
              <div
                className="h-full bg-space-accent transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <ul className="space-y-1.5 text-xs">
              {steps.map((s) => (
                <li key={s.label} className="flex items-center gap-2">
                  <span
                    className={s.done ? 'text-emerald-400' : 'animate-pulse text-space-accent'}
                    aria-hidden
                  >
                    {s.done ? '✓' : '•'}
                  </span>
                  <span className={s.done ? 'text-space-dim' : 'text-space-text'}>{s.label}</span>
                  {s.note && <span className="ml-auto text-space-dim">{s.note}</span>}
                </li>
              ))}
            </ul>
          </>
        )}

        {isError && (
          <>
            <div className="mb-3 whitespace-pre-line text-xs text-space-bad">{error}</div>
            <div className="text-xs text-space-dim">
              If you deployed via GitHub Actions, check the "Fetch TLE snapshot for bundling" step
              in the workflow log.
            </div>
            <button
              onClick={() => location.reload()}
              className="mt-4 rounded border border-space-accent px-3 py-1 text-xs text-space-accent hover:bg-space-accent/10"
            >
              Reload
            </button>
          </>
        )}
      </div>
    </div>
  );
}
