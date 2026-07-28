import { useStore } from '../state/store.js';
import { IMAGERY_LAYERS } from '../cesium/imagery.js';

/**
 * Small imagery-layer dropdown pinned inside the filter panel. Cheap to
 * change — the imagery controller swaps the base layer without touching
 * overlays or satellite primitives.
 */
export function ImageryPicker() {
  const imageryId = useStore((s) => s.imageryId);
  const setImagery = useStore((s) => s.setImagery);
  const active = IMAGERY_LAYERS.find((l) => l.id === imageryId) ?? IMAGERY_LAYERS[0];

  return (
    <div className="mb-4">
      <div className="mb-2 text-[9px] uppercase tracking-widest text-space-dim">Earth imagery</div>
      <select
        value={imageryId}
        onChange={(e) => setImagery(e.target.value)}
        className="w-full rounded border border-space-border bg-space-bg px-2 py-1 font-mono text-xs text-space-text focus:border-space-accent focus:outline-none"
      >
        {IMAGERY_LAYERS.map((layer) => (
          <option key={layer.id} value={layer.id}>
            {layer.label}
          </option>
        ))}
      </select>
      <div className="mt-1 text-[10px] leading-snug text-space-dim">{active.description}</div>
    </div>
  );
}
