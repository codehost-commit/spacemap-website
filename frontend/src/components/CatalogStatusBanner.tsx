import emblemSrc from '../assets/brand-emblem.png';
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

  const step1Done = catalogReady || isError;
  const step2Done = step1Done && imageryReady;
  const step3Done = step2Done && firstSnapshot;
  const step4Done = step3Done;
  const steps: Array<{ label: string; done: boolean; note?: string }> = [
    {
      label: 'Loading orbital catalog',
      done: step1Done,
      note: catalogReady ? `${catalogSize.toLocaleString()} objects` : undefined,
    },
    {
      label: 'Rendering Earth imagery',
      done: step2Done,
    },
    {
      label: 'Computing first snapshot',
      done: step3Done,
    },
    {
      label: 'Finalizing interface',
      done: step4Done,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-space-bg/90 backdrop-blur">
      <div className="mx-6 w-full max-w-md rounded-xl border border-space-border bg-space-panel/92 p-6 font-mono text-sm text-space-text shadow-2xl">
        <div className="mb-1 text-[10px] uppercase tracking-widest text-space-dim">SpaceMap</div>
        <div className="mb-6 text-base font-semibold">
          {isError ? "Couldn't load the catalog" : 'Loading the sky…'}
        </div>

        {!isError && (
          <>
            <div className="mb-6 flex justify-center">
              <div className="relative h-28 w-28">
                <div className="spacemap-loader-spinner absolute inset-0 rounded-full border-[3px] border-white/10 border-t-space-accent" />
                <div className="absolute inset-[16px] flex items-center justify-center rounded-full border border-white/10 bg-space-panel/95">
                  <img
                    src={emblemSrc}
                    alt="SpaceMap"
                    className="h-12 w-12 object-contain"
                    draggable={false}
                  />
                </div>
              </div>
            </div>

            <ul className="space-y-2 text-xs">
              {steps.map((step, index) => (
                <li key={step.label} className="flex items-center gap-3 rounded-lg px-1 py-1">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${
                      step.done
                        ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-300'
                        : 'border-space-border bg-white/5 text-space-accent'
                    }`}
                    aria-hidden
                  >
                    {step.done ? '✓' : index + 1}
                  </span>
                  <span className={step.done ? 'text-space-dim' : 'text-space-text'}>
                    {step.label}
                  </span>
                  {step.note && <span className="ml-auto text-space-dim">{step.note}</span>}
                </li>
              ))}
            </ul>
          </>
        )}

        {isError && (
          <>
            <div className="mb-3 whitespace-pre-line text-xs text-space-bad">{error}</div>
            <div className="text-xs text-space-dim">
              Wait a few minutes and try again. If the problem persists, please report it on the
              Contact form.
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
