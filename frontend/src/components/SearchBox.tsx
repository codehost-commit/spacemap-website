import { useMemo, useState } from "react";
import { useStore } from "../state/store.js";

const MAX_RESULTS = 12;

/**
 * Instant substring search over the loaded catalog (satellite name + NORAD id).
 * Selecting a hit selects the satellite in the store and asks the globe to
 * fly the camera to it via the global focus API.
 */
export function SearchBox() {
  const index = useStore((s) => s.index);
  const select = useStore((s) => s.select);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const needle = q.trim().toLowerCase();
    const asNum = Number(needle);
    const out: { noradId: number; name: string }[] = [];
    for (const e of index) {
      const nameMatch = e.name.toLowerCase().includes(needle);
      const idMatch = Number.isFinite(asNum) && e.noradId === asNum;
      if (nameMatch || idMatch) {
        out.push(e);
        if (out.length >= MAX_RESULTS) break;
      }
    }
    return out;
  }, [q, index]);

  const focus = (noradId: number, name: string) => {
    select(noradId);
    const w = window as unknown as { spacemapFocus?: (id: number) => void };
    w.spacemapFocus?.(noradId);
    setQ(name);
    setOpen(false);
  };

  return (
    <div className="spacemap-search pointer-events-auto absolute left-1/2 top-4 z-20 w-96 -translate-x-1/2 font-mono text-xs">
      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search satellite name or NORAD id…"
        className="w-full rounded-md border border-space-border bg-space-panel/90 px-3 py-2 text-space-text placeholder:text-space-dim focus:border-space-accent focus:outline-none"
      />
      {open && results.length > 0 && (
        <ul className="mt-1 max-h-80 overflow-auto rounded-md border border-space-border bg-space-panel/95 backdrop-blur">
          {results.map((r) => (
            <li key={r.noradId}>
              <button
                onClick={() => focus(r.noradId, r.name)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-white/5"
              >
                <span className="truncate text-space-text">{r.name}</span>
                <span className="ml-2 shrink-0 text-space-dim">#{r.noradId}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
