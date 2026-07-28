import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store.js";

/**
 * Upcoming-launches panel powered by Launch Library 2 (thespacedevs.com).
 * The free tier is CORS-open and rate-limited to ~15 req/hour per IP — we
 * fetch once when the panel opens and refresh every 5 min while it's open.
 * Each row shows a countdown ticking to T-0 and, when the launch has a live
 * stream URL, a "Watch" button that embeds the YouTube video inline.
 */
const LL2_URL =
  "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&mode=list&hide_recent_previous=true";
const REFRESH_MS = 5 * 60 * 1000;

interface LL2VidUrl {
  url?: string;
  title?: string;
}
interface LL2Launch {
  id: string;
  name: string;
  net: string; // ISO launch time (No Earlier Than)
  status?: { name?: string };
  rocket?: { configuration?: { full_name?: string; name?: string } };
  mission?: { name?: string; description?: string; type?: string };
  pad?: { name?: string; location?: { name?: string } };
  image?: string;
  vidURLs?: LL2VidUrl[];
}
interface LL2Response {
  results: LL2Launch[];
}

export function LaunchTracker() {
  const open = useStore((s) => s.openOverlays.has("launches"));
  const setOverlay = useStore((s) => s.setOverlay);
  const [launches, setLaunches] = useState<LL2Launch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [watching, setWatching] = useState<string | null>(null);

  // 1s tick for countdown UI.
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(LL2_URL);
        if (!res.ok) {
          throw new Error(`LL2 ${res.status}`);
        }
        const body = (await res.json()) as LL2Response;
        if (!cancelled) {
          setLaunches(body.results ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };
    void load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [open]);

  const watchedEmbed = useMemo(() => {
    if (!watching || !launches) return null;
    const l = launches.find((x) => x.id === watching);
    const url = l?.vidURLs?.find((v) => v.url)?.url;
    if (!url) return null;
    return toYoutubeEmbed(url);
  }, [watching, launches]);

  if (!open) return null;

  return (
    <aside className="spacemap-overlay pointer-events-auto absolute z-10 flex flex-col overflow-hidden rounded-2xl border border-space-border bg-space-panel/92 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-space-border px-3 py-2">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-space-dim">
            Upcoming launches
          </div>
          <div className="font-mono text-sm text-space-text">Launch Library 2</div>
        </div>
        <button
          onClick={() => setOverlay("launches", false)}
          className="text-space-dim hover:text-space-text"
        >
          ×
        </button>
      </header>

      {watching && watchedEmbed && (
        <div className="border-b border-space-border">
          <div className="flex items-center justify-between bg-space-bg/80 px-3 py-1 text-[10px] uppercase tracking-widest text-space-dim">
            <span>Live stream</span>
            <button
              onClick={() => setWatching(null)}
              className="text-space-dim hover:text-space-text"
            >
              Close video
            </button>
          </div>
          <div className="aspect-video w-full bg-black">
            <iframe
              title="Launch live stream"
              src={watchedEmbed}
              className="h-full w-full"
              frameBorder={0}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <div className="overflow-auto">
        {error && (
          <div className="p-3 text-xs text-space-warn">
            Couldn't reach Launch Library ({error}). The service occasionally
            rate-limits public traffic — try again in a few minutes.
          </div>
        )}
        {launches == null && !error && (
          <div className="p-3 text-xs text-space-dim">Loading upcoming launches…</div>
        )}
        {launches && launches.length === 0 && !error && (
          <div className="p-3 text-xs text-space-dim">No upcoming launches returned.</div>
        )}
        <ul className="font-mono text-xs">
          {launches?.map((l) => {
            const netMs = new Date(l.net).getTime();
            const dt = netMs - nowMs;
            const status = l.status?.name ?? "";
            const streamUrl = l.vidURLs?.find((v) => v.url)?.url;
            return (
              <li
                key={l.id}
                className="border-b border-space-border/40 px-3 py-2 last:border-b-0"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="min-w-0 flex-1 truncate text-space-text">
                    {l.name}
                  </div>
                  <div className="shrink-0 text-space-accent">{formatCountdown(dt)}</div>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] text-space-dim">
                  <span className="truncate">
                    {l.rocket?.configuration?.full_name ?? l.rocket?.configuration?.name ?? ""}
                    {l.pad?.name ? ` · ${l.pad.name}` : ""}
                  </span>
                  {status && <span className="ml-2 shrink-0">{status}</span>}
                </div>
                {(streamUrl || l.mission?.description) && (
                  <div className="mt-1 flex items-center gap-2">
                    {streamUrl && (
                      <button
                        onClick={() => setWatching(l.id === watching ? null : l.id)}
                        className={`rounded border px-2 py-0.5 text-[10px] ${
                          watching === l.id
                            ? "border-space-accent bg-space-accent/10 text-space-accent"
                            : "border-space-border text-space-text hover:border-space-accent"
                        }`}
                      >
                        {watching === l.id ? "Hide video" : "Watch live"}
                      </button>
                    )}
                    {l.mission?.description && (
                      <span className="truncate text-[10px] text-space-dim" title={l.mission.description}>
                        {l.mission.description}
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

function formatCountdown(deltaMs: number): string {
  const abs = Math.abs(deltaMs);
  const sign = deltaMs < 0 ? "T+" : "T-";
  const totalSec = Math.floor(abs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (days > 0) return `${sign}${days}d ${pad(hours)}h ${pad(minutes)}m`;
  if (hours > 0) return `${sign}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${sign}${pad(minutes)}:${pad(seconds)}`;
}

/**
 * LL2 gives YouTube/other URLs as-is. Convert common YouTube variants into
 * an /embed/ URL that's iframe-friendly. Returns null for unknown providers.
 */
function toYoutubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname === "youtu.be") {
      id = u.pathname.slice(1);
    } else if (u.hostname.endsWith("youtube.com") || u.hostname.endsWith("youtube-nocookie.com")) {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else if (u.pathname.startsWith("/embed/")) return url;
      else if (u.pathname.startsWith("/live/")) id = u.pathname.split("/")[2];
    }
    if (!id) return null;
    return `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&mute=1&controls=1`;
  } catch {
    return null;
  }
}
