import { useStore } from "../state/store.js";

/**
 * Full-screen boot-time overlay. Blocks the empty globe with a status
 * message while the TLE catalog is being fetched or after a failure —
 * the previous behaviour silently left the user staring at an empty Earth.
 */
export function CatalogStatusBanner() {
  const status = useStore((s) => s.catalogStatus);
  const error = useStore((s) => s.catalogError);

  if (status === "ready") return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-space-bg/85 backdrop-blur">
      <div className="mx-6 w-full max-w-md rounded-lg border border-space-border bg-space-panel/95 p-6 font-mono text-sm text-space-text shadow-2xl">
        <div className="mb-2 text-[10px] uppercase tracking-widest text-space-dim">
          SpaceMap — catalog
        </div>
        {status === "idle" && <Body title="Initializing…" body="Booting the propagator." />}
        {status === "loading" && (
          <Body
            title="Loading satellite catalog"
            body={
              <>
                Fetching TLEs (bundled snapshot → CelesTrak → proxy fallback).
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-space-border">
                  <div className="h-full w-1/3 animate-[loading_1.2s_ease-in-out_infinite] bg-space-accent" />
                </div>
                <style>
                  {`@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}
                </style>
              </>
            }
          />
        )}
        {status === "error" && (
          <Body
            title="Couldn't load the catalog"
            body={
              <>
                <div className="mb-3 whitespace-pre-line text-space-bad">{error}</div>
                <div className="text-space-dim">
                  If you deployed via GitHub Actions, verify the "Fetch TLE
                  snapshot for bundling" step succeeded — see the workflow log.
                  Otherwise the app will retry when you reload.
                </div>
                <button
                  onClick={() => location.reload()}
                  className="mt-4 rounded border border-space-accent px-3 py-1 text-space-accent hover:bg-space-accent/10"
                >
                  Reload
                </button>
              </>
            }
          />
        )}
      </div>
    </div>
  );
}

function Body({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <>
      <div className="mb-2 text-base font-semibold text-space-text">{title}</div>
      <div className="text-xs leading-relaxed text-space-text">{body}</div>
    </>
  );
}
