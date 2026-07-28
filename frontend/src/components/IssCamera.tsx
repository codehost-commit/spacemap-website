import { useEffect, useState } from "react";
import type { SatelliteTelemetry } from "@spacemap/shared";
import { useStore } from "../state/store.js";
import { findInSnapshot } from "../state/snapshot-util.js";
import { computeTelemetry } from "../simulation/client-telemetry.js";

const ISS_NORAD = 25544;
// ISS live YouTube embed. Autoplay works only when muted per browser policy;
// controls are hidden for a clean panel — click through to youtube.com to
// unmute or interact.
const ISS_LIVE_EMBED =
  "https://www.youtube.com/embed/awQzjn72bI0?autoplay=1&mute=1&controls=0";

// Launch Library 2 — expedition endpoint returns the current ISS crew with
// start dates, roles, and nationality info. Rate-limited to ~15 req/hr on
// the public tier, so we cache aggressively (10 min refresh).
const LL2_EXPEDITION_URL =
  "https://ll.thespacedevs.com/2.2.0/expedition/?ongoing=true&format=json&limit=3";
const CREW_REFRESH_MS = 10 * 60 * 1000;

interface CrewMember {
  name: string;
  role: string;
  agencyAbbrev?: string;
  countryCode?: string;
  daysOnStation: number;
  wikiUrl?: string;
}

interface LL2Astronaut {
  name?: string;
  nationality?: {
    name?: string;
    alpha_2_code?: string;
    alpha_3_code?: string;
  };
  agency?: { abbrev?: string; name?: string };
  wiki?: string;
}
interface LL2Crew {
  role?: { name?: string; role?: string };
  astronaut?: LL2Astronaut;
}
interface LL2Expedition {
  name?: string;
  start?: string;
  end?: string | null;
  spacestation?: { name?: string };
  crew?: LL2Crew[];
}

/**
 * Floating ISS live-stream + telemetry panel. Uses the propagator snapshot
 * for real-time position and the backend's telemetry endpoint for orbital
 * elements. The video is embedded in an iframe so nothing has to leave the
 * browser to work.
 */
export function IssCamera() {
  const open = useStore((s) => s.openOverlays.has("iss"));
  const setOverlay = useStore((s) => s.setOverlay);
  const snapshot = useStore((s) => s.snapshot);
  const select = useStore((s) => s.select);
  const [tel, setTel] = useState<SatelliteTelemetry | null>(null);
  const [crew, setCrew] = useState<CrewMember[] | null>(null);
  const [crewError, setCrewError] = useState<string | null>(null);
  const [expeditionName, setExpeditionName] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const refresh = () => {
      const t = computeTelemetry(ISS_NORAD, new Date());
      if (t) setTel(t);
    };
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadCrew = async () => {
      try {
        const res = await fetch(LL2_EXPEDITION_URL);
        if (!res.ok) throw new Error(`LL2 ${res.status}`);
        const body = (await res.json()) as { results?: LL2Expedition[] };
        // Prefer expeditions that mention ISS in their spacestation field;
        // fall back to the first ongoing expedition returned.
        const iss = body.results?.find((e) =>
          (e.spacestation?.name ?? "").toLowerCase().includes("international"),
        ) ?? body.results?.[0];
        if (!iss || !iss.crew) throw new Error("no crew returned");
        const startMs = iss.start ? new Date(iss.start).getTime() : Date.now();
        const now = Date.now();
        const members: CrewMember[] = iss.crew
          .filter((c) => c.astronaut && c.astronaut.name)
          .map((c) => ({
            name: c.astronaut!.name!,
            role: c.role?.name ?? c.role?.role ?? "Crew",
            agencyAbbrev: c.astronaut!.agency?.abbrev,
            countryCode:
              c.astronaut!.nationality?.alpha_2_code?.toUpperCase() ?? undefined,
            daysOnStation: Math.max(0, Math.floor((now - startMs) / 86_400_000)),
            wikiUrl: c.astronaut!.wiki,
          }));
        if (!cancelled) {
          setCrew(members);
          setExpeditionName(iss.name ?? null);
          setCrewError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setCrewError(err instanceof Error ? err.message : String(err));
        }
      }
    };
    void loadCrew();
    const id = setInterval(loadCrew, CREW_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [open]);

  if (!open) return null;

  const row = findInSnapshot(snapshot, ISS_NORAD);

  return (
    <aside className="spacemap-overlay pointer-events-auto absolute bottom-24 right-44 z-10 flex max-h-[calc(100vh-14rem)] w-[400px] flex-col overflow-hidden rounded-2xl border border-space-border bg-space-panel/92 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-space-border px-3 py-2">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-space-dim">Live camera</div>
          <div className="font-mono text-sm text-space-text">ISS · NORAD 25544</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              select(ISS_NORAD);
              (window as unknown as { spacemapFocus?: (id: number) => void }).spacemapFocus?.(ISS_NORAD);
            }}
            className="rounded border border-space-border px-2 py-0.5 text-[10px] text-space-dim hover:border-space-accent hover:text-space-text"
          >
            Focus
          </button>
          <button
            onClick={() => setOverlay("iss", false)}
            className="text-space-dim hover:text-space-text"
          >
            ×
          </button>
        </div>
      </header>
      <div className="aspect-video w-full bg-black">
        <iframe
          title="ISS live stream"
          src={ISS_LIVE_EMBED}
          className="h-full w-full"
          frameBorder={0}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-1 px-3 py-2 font-mono text-xs">
        <Cell label="Altitude" value={row ? `${row.altKm.toFixed(1)} km` : "—"} />
        <Cell label="Speed" value={row ? `${row.speedKmS.toFixed(3)} km/s` : "—"} />
        <Cell label="Period" value={tel ? `${tel.elements.periodMinutes.toFixed(2)} min` : "—"} />
        <Cell label="Latitude" value={row ? `${row.latDeg.toFixed(2)}°` : "—"} />
        <Cell label="Longitude" value={row ? `${row.lonDeg.toFixed(2)}°` : "—"} />
        <Cell label="Sunlit" value={tel ? (tel.sunlit ? "Yes" : "Shadow") : "—"} />
      </div>

      <div className="flex-1 overflow-auto border-t border-space-border/60 px-3 py-2 font-mono text-xs">
        <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-widest text-space-dim">
          <span>Crew {expeditionName ? `· ${expeditionName}` : ""}</span>
          {crew && <span>{crew.length} aboard</span>}
        </div>
        {crewError && (
          <div className="text-[10px] text-space-warn">
            Couldn't reach Launch Library ({crewError}).
          </div>
        )}
        {!crew && !crewError && (
          <div className="text-[10px] text-space-dim">Loading crew…</div>
        )}
        {crew && crew.length === 0 && !crewError && (
          <div className="text-[10px] text-space-dim">No crew listed by LL2.</div>
        )}
        {crew && crew.length > 0 && (
          <ul className="space-y-1">
            {crew.map((c) => (
              <li
                key={c.name}
                className="flex items-center justify-between gap-2 rounded px-1 py-1 hover:bg-white/5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-base leading-none" aria-hidden>
                    {countryFlag(c.countryCode)}
                  </span>
                  <div className="min-w-0 leading-tight">
                    {c.wikiUrl ? (
                      <a
                        href={c.wikiUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-space-text hover:text-space-accent"
                      >
                        {c.name}
                      </a>
                    ) : (
                      <div className="truncate text-space-text">{c.name}</div>
                    )}
                    <div className="text-[9px] uppercase tracking-wider text-space-dim">
                      {c.role}
                      {c.agencyAbbrev ? ` · ${c.agencyAbbrev}` : ""}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-[10px] text-space-dim">
                  {c.daysOnStation}d
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[9px] uppercase tracking-widest text-space-dim">{label}</span>
      <span className="text-space-text">{value}</span>
    </div>
  );
}

/** ISO 3166-1 alpha-2 → flag emoji via regional-indicator code points. */
function countryFlag(code?: string): string {
  if (!code || code.length !== 2) return "🏳️";
  const A = 0x41;
  const OFFSET = 0x1f1e6 - A;
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    upper.charCodeAt(0) + OFFSET,
    upper.charCodeAt(1) + OFFSET,
  );
}
