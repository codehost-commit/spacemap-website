import { useEffect, useMemo, useState } from 'react';
import {
  formatLaunchCountdown,
  getLaunchTone,
  useUpcomingLaunches,
} from '../hooks/useUpcomingLaunches.js';
import { useStore } from '../state/store.js';

/**
 * Upcoming-launches panel powered by the shared SpaceMap launch feed.
 * Each row shows a countdown ticking to T-0 and, when the launch has a live
 * stream URL, a "Watch" button that embeds the YouTube video inline.
 */

export function LaunchTracker() {
  const open = useStore((s) => s.openOverlays.has('launches'));
  const setOverlay = useStore((s) => s.setOverlay);
  const { launches, error, loading } = useUpcomingLaunches({ enabled: open });
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [watching, setWatching] = useState<string | null>(null);

  // 1s tick for countdown UI.
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
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
          onClick={() => setOverlay('launches', false)}
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

      <div className="flex-1 overflow-auto">
        {error && (
          <div className="p-3 text-xs text-space-warn">
            {error}
          </div>
        )}
        {loading && !error && (
          <div className="p-3 text-xs text-space-dim">Loading upcoming launches…</div>
        )}
        {launches && launches.length === 0 && !error && (
          <div className="p-3 text-xs text-space-dim">No upcoming launches returned.</div>
        )}
        <ul className="font-mono text-xs">
          {launches?.map((l) => {
            const netMs = new Date(l.net).getTime();
            const dt = netMs - nowMs;
            const tone = getLaunchTone(dt);
            const status = l.status?.name ?? '';
            const streamUrl = l.vidURLs?.find((v) => v.url)?.url;
            return (
              <li key={l.id} className="border-b border-space-border/40 px-3 py-2 last:border-b-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 truncate text-space-text">{l.name}</div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.dotClass}`}>
                      {tone.label}
                    </span>
                    <div className={`font-semibold ${tone.textClass}`}>{formatLaunchCountdown(dt)}</div>
                  </div>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] text-space-dim">
                  <span className="truncate">
                    {l.rocket?.configuration?.full_name ?? l.rocket?.configuration?.name ?? ''}
                    {l.pad?.name ? ` · ${l.pad.name}` : ''}
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
                            ? 'border-space-accent bg-space-accent/10 text-space-accent'
                            : 'border-space-border text-space-text hover:border-space-accent'
                        }`}
                      >
                        {watching === l.id ? 'Hide video' : 'Watch live'}
                      </button>
                    )}
                    {l.mission?.description && (
                      <span
                        className="truncate text-[10px] text-space-dim"
                        title={l.mission.description}
                      >
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

/**
 * LL2 gives YouTube/other URLs as-is. Convert common YouTube variants into
 * an /embed/ URL that's iframe-friendly. Returns null for unknown providers.
 */
function toYoutubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname === 'youtu.be') {
      id = u.pathname.slice(1);
    } else if (u.hostname.endsWith('youtube.com') || u.hostname.endsWith('youtube-nocookie.com')) {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else if (u.pathname.startsWith('/embed/')) return url;
      else if (u.pathname.startsWith('/live/')) id = u.pathname.split('/')[2];
    }
    if (!id) return null;
    return `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&mute=1&controls=1`;
  } catch {
    return null;
  }
}
