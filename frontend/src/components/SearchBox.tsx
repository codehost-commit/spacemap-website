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
    <div className="spacemap-search pointer-events-auto absolute left-1/2 top-[6.1rem] z-20 w-[25rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 font-mono text-xs">
      <div className="rounded-2xl border border-space-border/90 bg-space-panel/78 shadow-[0_18px_40px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Click any satellite, or search by name / NORAD id."
          className="w-full appearance-none rounded-2xl bg-transparent px-4 py-3 text-[13px] text-space-text outline-none placeholder:text-space-dim/85"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="mt-2 max-h-80 overflow-auto rounded-2xl border border-space-border/90 bg-space-panel/86 shadow-[0_18px_40px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          {results.map((r) => (
            <li key={r.noradId}>
              <button
                onClick={() => focus(r.noradId, r.name)}
                className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-white/5"
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
