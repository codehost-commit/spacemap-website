import { useStore } from "../state/store.js";

/** Bookmarked satellites list. Click to focus, click ✕ to remove. */
export function SavedList() {
  const open = useStore((s) => s.openOverlays.has("saved"));
  const setOverlay = useStore((s) => s.setOverlay);
  const savedIds = useStore((s) => s.savedIds);
  const names = useStore((s) => s.indexByNorad);
  const select = useStore((s) => s.select);
  const toggleSaved = useStore((s) => s.toggleSaved);

  if (!open) return null;

  const items = [...savedIds].map((id) => ({
    id,
    name: names.get(id) ?? `#${id}`,
  }));

  return (
    <aside className="spacemap-overlay pointer-events-auto absolute bottom-24 right-44 z-10 flex max-h-[calc(100vh-14rem)] w-[400px] flex-col overflow-hidden rounded-2xl border border-space-border bg-space-panel/92 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-space-border px-3 py-2">
        <span className="text-[10px] uppercase tracking-widest text-space-dim">
          Saved satellites
        </span>
        <button
          onClick={() => setOverlay("saved", false)}
          className="text-space-dim hover:text-space-text"
        >
          ×
        </button>
      </header>
      <ul className="max-h-80 overflow-auto font-mono text-xs">
        {items.length === 0 ? (
          <li className="px-3 py-3 text-space-dim">
            No saved satellites yet. Star one in the telemetry panel.
          </li>
        ) : (
          items.map((it) => (
            <li key={it.id} className="flex items-center border-b border-space-border/50 last:border-b-0">
              <button
                onClick={() => {
                  select(it.id);
                  (window as unknown as { spacemapFocus?: (id: number) => void }).spacemapFocus?.(it.id);
                }}
                className="min-w-0 flex-1 truncate px-3 py-2 text-left text-space-text hover:bg-white/5"
              >
                {it.name}
              </button>
              <button
                onClick={() => toggleSaved(it.id)}
                className="px-2 text-space-dim hover:text-space-bad"
                title="Remove"
              >
                ×
              </button>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
