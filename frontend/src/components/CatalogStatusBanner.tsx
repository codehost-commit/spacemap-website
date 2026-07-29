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

  const orbitalEngineReady = catalogReady && firstSnapshot;
  const interfaceReady = imageryReady && firstSnapshot;
  const steps: Array<{ label: string; done: boolean; note?: string }> = [
    {
      label: 'Acquiring orbital catalog',
      done: catalogReady || isError,
      note: catalogReady ? `${catalogSize.toLocaleString()} objects` : undefined,
    },
    {
      label: 'Rendering Earth imagery',
      done: imageryReady,
      note: imageryReady ? 'Tiles locked in' : undefined,
    },
    {
      label: 'Propagating orbital engine',
      done: orbitalEngineReady || isError,
      note: firstSnapshot ? 'First live snapshot locked' : undefined,
    },
    {
      label: 'Finalizing interface',
      done: interfaceReady || isError,
      note: interfaceReady ? 'Tracker ready for handoff' : undefined,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const progressPct = Math.round((doneCount / steps.length) * 100);
  const ringStyle = {
    background: `conic-gradient(rgba(142,216,255,0.95) ${progressPct}%, rgba(255,255,255,0.08) ${progressPct}% 100%)`,
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(77,150,232,0.22),transparent_42%),linear-gradient(180deg,rgba(6,16,26,0.92),rgba(6,16,26,0.97))] backdrop-blur-md">
      <div className="absolute left-1/2 top-[16%] h-52 w-52 -translate-x-1/2 rounded-full bg-[#8ed8ff]/10 blur-3xl" />
      <div className="absolute bottom-[14%] left-[18%] h-40 w-40 rounded-full bg-[#4d96e8]/10 blur-3xl" />

      <div className="mx-6 w-full max-w-lg rounded-[2rem] border border-white/12 bg-[linear-gradient(145deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03)_36%,rgba(77,150,232,0.08)_100%)] p-7 font-mono text-sm text-space-text shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl md:p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div
            className="spacemap-loader-ring relative mb-5 h-36 w-36 rounded-full p-[10px]"
            style={ringStyle}
          >
            <div className="absolute inset-[10px] rounded-full border border-white/8 bg-[#07111b]/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
            <div className="absolute inset-1 rounded-full border border-space-accent/20" />
            <div className="absolute inset-0 rounded-full border border-space-accent/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full border border-white/10 bg-white/5 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.32)]">
                <img
                  src={emblemSrc}
                  alt="SpaceMap"
                  className="h-16 w-16 object-contain"
                  draggable={false}
                />
              </div>
            </div>
          </div>

          <div className="text-[11px] uppercase tracking-[0.35em] text-space-accent">SpaceMap</div>
          <div className="mt-3 text-2xl font-semibold text-white">
            {isError ? 'Launch interrupted' : 'Preparing orbital view'}
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-space-dim">
            {isError
              ? "The live catalog didn't finish loading. Everything else is standing by."
              : 'Booting the live map, syncing the catalog, and bringing the first frame online.'}
          </p>
        </div>

        {!isError && (
          <>
            <div className="mb-5 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
              <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-space-dim">
                <span>Startup Progress</span>
                <span className="text-space-accent">{progressPct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#4d96e8] via-[#8ed8ff] to-[#7be4c5] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <ul className="space-y-3 text-xs">
              {steps.map((step, index) => (
                <li
                  key={step.label}
                  className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm ${
                        step.done
                          ? 'border-emerald-400/30 bg-emerald-400/12 text-emerald-300'
                          : 'border-space-accent/25 bg-space-accent/10 text-space-accent'
                      }`}
                      aria-hidden
                    >
                      {step.done ? '✓' : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={step.done ? 'text-space-text' : 'text-white'}>
                        {step.label}
                      </div>
                      <div className="mt-1 text-[11px] text-space-dim">
                        {step.note ?? (step.done ? 'Complete' : 'In progress')}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-[0.24em] ${
                        step.done ? 'text-emerald-300' : 'text-space-accent'
                      }`}
                    >
                      {step.done ? 'Ready' : 'Working'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {isError && (
          <>
            <div className="rounded-2xl border border-space-bad/30 bg-space-bad/10 px-4 py-3 text-xs text-space-bad">
              <div className="mb-1 text-[10px] uppercase tracking-[0.28em] text-space-bad/80">
                Loader Report
              </div>
              <div className="whitespace-pre-line">{error}</div>
            </div>
            <div className="mt-4 text-xs leading-relaxed text-space-dim">
              Wait a minute and try again. If it keeps failing, send it through the Contact
              page and we’ll investigate.
            </div>
            <button
              onClick={() => location.reload()}
              className="mt-5 rounded-xl border border-space-accent px-4 py-2 text-xs text-space-accent transition hover:bg-space-accent/10"
            >
              Reload SpaceMap
            </button>
          </>
        )}
      </div>
    </div>
  );
}
