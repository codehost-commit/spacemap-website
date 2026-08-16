import { useStore } from '../state/store.js';
import {
  MARS_KIND_COLOR,
  MARS_KIND_LABEL,
  MARS_ORBITERS,
  type MarsOrbiterKind,
} from '../simulation/mars-catalog.js';
import {
  MARS_SITE_KIND_COLOR,
  MARS_SITE_KIND_LABEL,
  MARS_SURFACE_SITES,
  type MarsSiteKind,
} from '../simulation/mars-surface-catalog.js';

/**
 * Mars twin of LunarFilterPanel. Same three sections — mission-type filter,
 * trails mode, overlays — so a user swapping between bodies keeps the same
 * mental model.
 */
const KIND_ORDER: MarsOrbiterKind[] = ['science', 'weather', 'communications', 'crewed-precursor'];
const SURFACE_KIND_ORDER: MarsSiteKind[] = ['rover', 'lander', 'crash'];

export function MarsFilterPanel() {
  const kindFilter = useStore((s) => s.marsKindFilter);
  const toggleKind = useStore((s) => s.toggleMarsKindFilter);
  const setKind = useStore((s) => s.setMarsKindFilter);
  const trailMode = useStore((s) => s.trailMode);
  const setTrailMode = useStore((s) => s.setTrailMode);
  const terminatorOn = useStore((s) => s.terminatorOn);
  const setTerminator = useStore((s) => s.setTerminator);
  const graticuleOn = useStore((s) => s.graticuleOn);
  const setGraticule = useStore((s) => s.setGraticule);
  const surfaceOn = useStore((s) => s.marsSurfaceOn);
  const setSurfaceOn = useStore((s) => s.setMarsSurfaceOn);
  const surfaceKindFilter = useStore((s) => s.marsSurfaceKindFilter);
  const toggleSurfaceKind = useStore((s) => s.toggleMarsSurfaceKindFilter);
  const setSurfaceKind = useStore((s) => s.setMarsSurfaceKindFilter);

  const kindsPresent = new Set(MARS_ORBITERS.map((o) => o.kind));

  return (
    <aside className="spacemap-filter pointer-events-auto min-h-0 flex-1 overflow-y-auto rounded-2xl border border-space-border bg-space-panel/92 p-3 font-mono text-xs shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <SectionHeader
        label="Mission type"
        action={
          <button
            onClick={() =>
              setKind(kindFilter.size === kindsPresent.size ? [] : [...kindsPresent])
            }
            className="text-space-dim hover:text-space-text"
          >
            {kindFilter.size === kindsPresent.size ? 'None' : 'All'}
          </button>
        }
      />
      <div className="mb-4 space-y-1">
        {KIND_ORDER.filter((k) => kindsPresent.has(k)).map((kind) => {
          const active = kindFilter.has(kind);
          const count = MARS_ORBITERS.filter((o) => o.kind === kind).length;
          return (
            <label
              key={kind}
              className={`flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5 ${
                active ? 'text-space-text' : 'text-space-dim line-through'
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggleKind(kind)}
                className="h-3 w-3 accent-space-accent"
              />
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: MARS_KIND_COLOR[kind],
                  boxShadow: active ? `0 0 6px ${MARS_KIND_COLOR[kind]}` : 'none',
                }}
              />
              <span className="flex-1">{MARS_KIND_LABEL[kind]}</span>
              <span className="text-[10px] text-space-dim">{count}</span>
            </label>
          );
        })}
      </div>

      <SectionHeader label="Trails" />
      <div className="mb-4 flex gap-1">
        {(['off', 'selected', 'visible'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setTrailMode(mode)}
            className={`flex-1 rounded border px-2 py-1 ${
              trailMode === mode
                ? 'border-space-accent bg-space-accent/10 text-space-accent'
                : 'border-space-border text-space-dim hover:text-space-text'
            }`}
          >
            {mode === 'off' ? 'Off' : mode === 'selected' ? 'Selected' : 'All'}
          </button>
        ))}
      </div>

      <SectionHeader label="Overlays" />
      <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5">
        <input
          type="checkbox"
          checked={terminatorOn}
          onChange={(e) => setTerminator(e.target.checked)}
          className="h-3 w-3 accent-space-accent"
        />
        <span>Solar terminator</span>
      </label>
      <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5">
        <input
          type="checkbox"
          checked={graticuleOn}
          onChange={(e) => setGraticule(e.target.checked)}
          className="h-3 w-3 accent-space-accent"
        />
        <span>Lat / lon grid</span>
      </label>
      <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5">
        <input
          type="checkbox"
          checked={surfaceOn}
          onChange={(e) => setSurfaceOn(e.target.checked)}
          className="h-3 w-3 accent-space-accent"
        />
        <span>Surface sites</span>
      </label>

      {surfaceOn && (
        <>
          <SectionHeader
            label="Surface site type"
            action={
              <button
                onClick={() =>
                  setSurfaceKind(
                    surfaceKindFilter.size === SURFACE_KIND_ORDER.length ? [] : SURFACE_KIND_ORDER,
                  )
                }
                className="text-space-dim hover:text-space-text"
              >
                {surfaceKindFilter.size === SURFACE_KIND_ORDER.length ? 'None' : 'All'}
              </button>
            }
          />
          <div className="mb-4 space-y-1">
            {SURFACE_KIND_ORDER.map((kind) => {
              const active = surfaceKindFilter.has(kind);
              const count = MARS_SURFACE_SITES.filter((s) => s.kind === kind).length;
              return (
                <label
                  key={kind}
                  className={`flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5 ${
                    active ? 'text-space-text' : 'text-space-dim line-through'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleSurfaceKind(kind)}
                    className="h-3 w-3 accent-space-accent"
                  />
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: MARS_SITE_KIND_COLOR[kind],
                      boxShadow: active ? `0 0 6px ${MARS_SITE_KIND_COLOR[kind]}` : 'none',
                    }}
                  />
                  <span className="flex-1">{MARS_SITE_KIND_LABEL[kind]}</span>
                  <span className="text-[10px] text-space-dim">{count}</span>
                </label>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-4 border-t border-white/5 pt-3 text-[10px] leading-relaxed text-space-dim">
        Orbiters propagated from mission-page Keplerian elements. Surface
        sites pinned from published landing coordinates (Viking, USGS Mars
        Nomenclature, HiRISE post-2005 landing images).
      </div>
    </aside>
  );
}

function SectionHeader({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-widest text-space-dim">
      <span>{label}</span>
      {action}
    </div>
  );
}
