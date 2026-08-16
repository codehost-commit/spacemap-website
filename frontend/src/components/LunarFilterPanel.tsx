import { useStore } from '../state/store.js';
import {
  LUNAR_KIND_COLOR,
  LUNAR_KIND_LABEL,
  LUNAR_ORBITERS,
  type LunarOrbiterKind,
} from '../simulation/lunar-catalog.js';

/**
 * The Moon-side twin of Earth's FilterPanel. Much smaller by design:
 * the lunar catalogue is tiny, so a "toggle by mission category" +
 * "orbit trails" + "solar terminator" set covers the interesting axes.
 *
 * Overlays here mirror the Earth UI so a user swapping between bodies
 * keeps the same mental model of "toggle overlays in the right rail".
 */
const KIND_ORDER: LunarOrbiterKind[] = ['science', 'relay', 'nrho', 'lander-support'];

export function LunarFilterPanel() {
  const kindFilter = useStore((s) => s.lunarKindFilter);
  const toggleKind = useStore((s) => s.toggleLunarKindFilter);
  const setKind = useStore((s) => s.setLunarKindFilter);
  const trailMode = useStore((s) => s.trailMode);
  const setTrailMode = useStore((s) => s.setTrailMode);
  const terminatorOn = useStore((s) => s.terminatorOn);
  const setTerminator = useStore((s) => s.setTerminator);
  const graticuleOn = useStore((s) => s.graticuleOn);
  const setGraticule = useStore((s) => s.setGraticule);

  // We only list the kinds that actually appear in the current catalogue —
  // no dead "Lander support" row when nothing in that category is flying.
  const kindsPresent = new Set(LUNAR_ORBITERS.map((o) => o.kind));

  return (
    <aside className="spacemap-filter pointer-events-auto min-h-0 flex-1 overflow-y-auto rounded-2xl border border-space-border bg-space-panel/92 p-3 font-mono text-xs shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <SectionHeader
        label="Lunar mission type"
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
          const count = LUNAR_ORBITERS.filter((o) => o.kind === kind).length;
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
                  background: LUNAR_KIND_COLOR[kind],
                  boxShadow: active ? `0 0 6px ${LUNAR_KIND_COLOR[kind]}` : 'none',
                }}
              />
              <span className="flex-1">{LUNAR_KIND_LABEL[kind]}</span>
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

      <div className="mt-4 border-t border-white/5 pt-3 text-[10px] leading-relaxed text-space-dim">
        Positions from mission-page orbital elements, Keplerian-propagated.
        Good to a few km / day — swap for SPICE ephemerides for anything
        needing rendezvous precision.
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
