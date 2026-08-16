import { useStore } from '../state/store.js';
import { BODIES, type BodyId } from '../cesium/bodies.js';

/**
 * "Beyond Earth" body selector — the entry point for switching between
 * Earth and Moon views. Rendered as a pill row of body chips floating in
 * the top-centre of the tracker, in the same visual family as the rest of
 * the HUD (frosted glass, space-accent gradient on active).
 *
 * Part 1 shows only Earth + Moon; more bodies land here as the map grows.
 */
const BODY_ORDER: BodyId[] = ['earth', 'moon'];

const BODY_ICON: Record<BodyId, string> = {
  earth: '🌍',
  moon: '🌕',
};

export function BodySwitcher() {
  const body = useStore((s) => s.body);
  const setBody = useStore((s) => s.setBody);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-24 z-30 flex justify-center px-4">
      <div className="spacemap-hud pointer-events-auto flex items-center gap-1 rounded-full border border-space-border bg-space-panel/94 px-1.5 py-1 font-mono text-[11px] shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <span className="pl-2 pr-1 text-[9px] uppercase tracking-widest text-space-dim">
          Beyond Earth
        </span>
        {BODY_ORDER.map((id) => {
          const def = BODIES[id];
          const active = body === id;
          return (
            <button
              key={id}
              onClick={() => setBody(id)}
              title={def.short}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
                active
                  ? 'bg-space-accent/20 text-space-accent shadow-[inset_0_0_0_1px_rgba(141,216,255,0.35)]'
                  : 'text-space-dim hover:bg-white/5 hover:text-space-text'
              }`}
            >
              <span className="text-sm leading-none">{BODY_ICON[id]}</span>
              <span>{def.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
