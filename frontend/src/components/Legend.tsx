import { ORBIT_CLASS_COLOR, type OrbitClass } from "@spacemap/shared";

const ORDER: { key: OrbitClass; label: string }[] = [
  { key: "LEO", label: "LEO" },
  { key: "MEO", label: "MEO" },
  { key: "GEO", label: "GEO" },
  { key: "HEO", label: "HEO (elliptical)" },
  { key: "POLAR", label: "Polar" },
  { key: "SSO", label: "Sun-sync" },
];

export function Legend() {
  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-10 rounded-md border border-space-border bg-space-panel/85 p-3 text-xs backdrop-blur">
      <div className="mb-2 text-[9px] uppercase tracking-widest text-space-dim">
        Orbit class
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono">
        {ORDER.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: ORBIT_CLASS_COLOR[key], boxShadow: `0 0 6px ${ORBIT_CLASS_COLOR[key]}` }}
            />
            <span className="text-space-text">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
