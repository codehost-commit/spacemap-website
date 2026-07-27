import { ORBIT_CLASSES, ORBIT_CLASS_COLOR, type OrbitClass } from "@spacemap/shared";
import { useStore, type TrailMode } from "../state/store.js";
import { ImageryPicker } from "./ImageryPicker.js";

const LABELS: Record<OrbitClass, string> = {
  LEO: "LEO",
  MEO: "MEO",
  GEO: "GEO",
  HEO: "HEO",
  POLAR: "Polar",
  SSO: "Sun-sync",
  UNKNOWN: "Other",
};

const TRAIL_LABEL: Record<TrailMode, string> = {
  off: "Off",
  selected: "Selected",
  visible: "Visible",
};

export function FilterPanel() {
  const filter = useStore((s) => s.filter);
  const toggle = useStore((s) => s.toggleOrbitFilter);
  const setFilter = useStore((s) => s.setFilter);
  const trailMode = useStore((s) => s.trailMode);
  const setTrailMode = useStore((s) => s.setTrailMode);
  const heatmapOn = useStore((s) => s.heatmapOn);
  const setHeatmap = useStore((s) => s.setHeatmap);

  return (
    <aside className="pointer-events-auto absolute left-4 top-20 z-10 max-h-[calc(100vh-6rem)] w-56 overflow-auto rounded-md border border-space-border bg-space-panel/85 p-3 font-mono text-xs backdrop-blur">
      <ImageryPicker />
      <SectionHeader
        label="Orbit class"
        action={
          <button
            onClick={() =>
              setFilter(filter.size === ORBIT_CLASSES.length ? [] : ORBIT_CLASSES)
            }
            className="text-space-dim hover:text-space-text"
          >
            {filter.size === ORBIT_CLASSES.length ? "None" : "All"}
          </button>
        }
      />
      <div className="mb-4 space-y-1">
        {ORBIT_CLASSES.map((cls) => {
          const active = filter.has(cls);
          return (
            <label
              key={cls}
              className={`flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5 ${
                active ? "text-space-text" : "text-space-dim line-through"
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(cls)}
                className="h-3 w-3 accent-space-accent"
              />
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: ORBIT_CLASS_COLOR[cls],
                  boxShadow: active ? `0 0 6px ${ORBIT_CLASS_COLOR[cls]}` : "none",
                }}
              />
              <span>{LABELS[cls]}</span>
            </label>
          );
        })}
      </div>

      <SectionHeader label="Trails" />
      <div className="mb-4 flex gap-1">
        {(["off", "selected", "visible"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setTrailMode(mode)}
            className={`flex-1 rounded border px-2 py-1 ${
              trailMode === mode
                ? "border-space-accent bg-space-accent/10 text-space-accent"
                : "border-space-border text-space-dim hover:text-space-text"
            }`}
          >
            {TRAIL_LABEL[mode]}
          </button>
        ))}
      </div>

      <SectionHeader label="Overlays" />
      <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5">
        <input
          type="checkbox"
          checked={heatmapOn}
          onChange={(e) => setHeatmap(e.target.checked)}
          className="h-3 w-3 accent-space-accent"
        />
        <span>Density heatmap</span>
      </label>
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
