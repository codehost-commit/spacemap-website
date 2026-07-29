import { useEffect, useState } from 'react';
import type { SatelliteTelemetry } from '@spacemap/shared';
import { useStore } from '../state/store.js';
import { findInSnapshot } from '../state/snapshot-util.js';
import { computeTelemetry } from '../simulation/client-telemetry.js';

const ISS_NORAD = 25544;
// ISS live YouTube embed. Autoplay works only when muted per browser policy;
// controls are hidden for a clean panel — click through to youtube.com to
// unmute or interact.
const ISS_LIVE_EMBED = 'https://www.youtube.com/embed/awQzjn72bI0?autoplay=1&mute=1&controls=0';

// Launch Library 2 — expedition endpoint returns the current ISS crew with
// start dates, roles, and nationality info. Rate-limited to ~15 req/hr on
// the public tier, so we cache aggressively (10 min refresh).
const LL2_ISS_STATION_URL =
  'https://ll.thespacedevs.com/2.2.0/spacestation/4/?format=json';
const BUNDLED_ISS_CREW_URL = `${import.meta.env.BASE_URL}data/iss-crew.json`;
const CREW_REFRESH_MS = 10 * 60 * 1000;
const CREW_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CREW_RETRY_COOLDOWN_MS = 15 * 60 * 1000;
const CREW_CACHE_KEY = 'spacemap.tracker.iss-crew.v1';
const CREW_COOLDOWN_KEY = 'spacemap.tracker.iss-crew.cooldown.v1';

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
  url?: string;
}

interface LL2SpaceStation {
  active_expeditions?: LL2Expedition[];
}

interface CrewSnapshot {
  fetchedAt: number;
  expeditionName: string | null;
  crew: CrewMember[];
}

let crewRequest: Promise<CrewSnapshot> | null = null;

/**
 * Floating ISS live-stream + telemetry panel. Uses the propagator snapshot
 * for real-time position and the backend's telemetry endpoint for orbital
 * elements. The video is embedded in an iframe so nothing has to leave the
 * browser to work.
 */
export function IssCamera() {
  const open = useStore((s) => s.openOverlays.has('iss'));
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
      const cached = readCrewCache();
      if (cached) {
        setCrew(cached.crew);
        setExpeditionName(cached.expeditionName);
        setCrewError(null);
      }

      if (cached && Date.now() - cached.fetchedAt < CREW_CACHE_TTL_MS) return;
      if (cached && isCrewRetryCoolingDown()) return;

      try {
        const snapshot = await loadIssCrewSnapshot();
        if (!cancelled) {
          setCrew(snapshot.crew);
          setExpeditionName(snapshot.expeditionName);
          setCrewError(null);
        }
      } catch {
        if (!cancelled) {
          setCrew(cached?.crew ?? []);
          setExpeditionName(cached?.expeditionName ?? null);
          setCrewError(null);
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
    <aside className="spacemap-overlay pointer-events-auto absolute z-10 flex flex-col overflow-hidden rounded-2xl border border-space-border bg-space-panel/92 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-space-border px-3 py-2">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-space-dim">Live camera</div>
          <div className="font-mono text-sm text-space-text">ISS · NORAD 25544</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              select(ISS_NORAD);
              (window as unknown as { spacemapFocus?: (id: number) => void }).spacemapFocus?.(
                ISS_NORAD,
              );
            }}
            className="rounded border border-space-border px-2 py-0.5 text-[10px] text-space-dim hover:border-space-accent hover:text-space-text"
          >
            Focus
          </button>
          <button
            onClick={() => setOverlay('iss', false)}
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
        <Cell label="Altitude" value={row ? `${row.altKm.toFixed(1)} km` : '—'} />
        <Cell label="Speed" value={row ? `${row.speedKmS.toFixed(3)} km/s` : '—'} />
        <Cell label="Period" value={tel ? `${tel.elements.periodMinutes.toFixed(2)} min` : '—'} />
        <Cell label="Latitude" value={row ? `${row.latDeg.toFixed(2)}°` : '—'} />
        <Cell label="Longitude" value={row ? `${row.lonDeg.toFixed(2)}°` : '—'} />
        <Cell label="Sunlit" value={tel ? (tel.sunlit ? 'Yes' : 'Shadow') : '—'} />
      </div>

      <div className="flex-1 overflow-auto border-t border-space-border/60 px-3 py-2 font-mono text-xs">
        <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-widest text-space-dim">
          <span>Crew {expeditionName ? `· ${expeditionName}` : ''}</span>
          {crew && <span>{crew.length} aboard</span>}
        </div>
        {crewError && (
          <div className="text-[10px] text-space-warn">
            {crewError}
          </div>
        )}
        {!crew && !crewError && <div className="text-[10px] text-space-dim">Loading crew…</div>}
        {crew && crew.length === 0 && !crewError && (
          <div className="text-[10px] text-space-dim">Crew manifest is retrying quietly.</div>
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
                      {c.agencyAbbrev ? ` · ${c.agencyAbbrev}` : ''}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-[10px] text-space-dim">{c.daysOnStation}d</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

async function loadIssCrewSnapshot(): Promise<CrewSnapshot> {
  if (crewRequest) return crewRequest;
  crewRequest = (async () => {
    const sources = import.meta.env.PROD ? [tryBundledCrew, tryLiveCrew] : [tryLiveCrew];
    let firstError: unknown = null;

    try {
      for (const source of sources) {
        try {
          const snapshot = await source();
          writeCrewCache(snapshot);
          clearCrewRetryCooldown();
          return snapshot;
        } catch (sourceError) {
          firstError ??= sourceError;
        }
      }

      setCrewRetryCooldown();
      const cached = readCrewCache();
      if (cached) return cached;
      if (firstError instanceof Error) {
        throw firstError;
      }
      throw new Error(String(firstError ?? 'ISS crew unavailable'));
    } finally {
      crewRequest = null;
    }
  })();
  return crewRequest;
}

async function tryLiveCrew(): Promise<CrewSnapshot> {
  const stationRes = await fetch(LL2_ISS_STATION_URL);
  if (!stationRes.ok) throw new Error(`LL2 ${stationRes.status}`);
  const station = (await stationRes.json()) as LL2SpaceStation;
  const activeExpedition = station.active_expeditions?.[0];
  if (!activeExpedition?.url) throw new Error('no active ISS expedition');

  const expeditionRes = await fetch(activeExpedition.url);
  if (!expeditionRes.ok) throw new Error(`LL2 ${expeditionRes.status}`);
  const expedition = (await expeditionRes.json()) as LL2Expedition;
  return parseCrewSnapshot(expedition);
}

async function tryBundledCrew(): Promise<CrewSnapshot> {
  const res = await fetch(BUNDLED_ISS_CREW_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`bundled ISS crew ${res.status}`);
  const body = (await res.json()) as CrewSnapshot | LL2Expedition;
  if ('crew' in body && Array.isArray(body.crew) && body.crew.every((member) => 'name' in member)) {
    return {
      fetchedAt: Number('fetchedAt' in body ? body.fetchedAt : Date.now()),
      expeditionName: 'expeditionName' in body ? body.expeditionName : body.name ?? null,
      crew: (body.crew as Array<Partial<CrewMember>>).map((member) => ({
        name: member.name ?? 'Crew',
        role: member.role ?? 'Crew',
        agencyAbbrev: member.agencyAbbrev,
        countryCode: member.countryCode,
        daysOnStation: member.daysOnStation ?? 0,
        wikiUrl: member.wikiUrl,
      })),
    };
  }
  return parseCrewSnapshot(body as LL2Expedition);
}

function parseCrewSnapshot(expedition: LL2Expedition): CrewSnapshot {
  const startMs = expedition.start ? new Date(expedition.start).getTime() : Date.now();
  const now = Date.now();
  return {
    fetchedAt: Date.now(),
    expeditionName: expedition.name ?? null,
    crew:
      expedition.crew
        ?.filter((member) => member.astronaut?.name)
        .map((member) => ({
          name: member.astronaut!.name!,
          role: member.role?.name ?? member.role?.role ?? 'Crew',
          agencyAbbrev: member.astronaut?.agency?.abbrev,
          countryCode: member.astronaut?.nationality?.alpha_2_code?.toUpperCase() ?? undefined,
          daysOnStation: Math.max(0, Math.floor((now - startMs) / 86_400_000)),
          wikiUrl: member.astronaut?.wiki,
        })) ?? [],
  };
}

function readCrewCache(): CrewSnapshot | null {
  try {
    const raw = localStorage.getItem(CREW_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CrewSnapshot;
    if (!Array.isArray(parsed.crew)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCrewCache(snapshot: CrewSnapshot): void {
  try {
    localStorage.setItem(CREW_CACHE_KEY, JSON.stringify({ ...snapshot, fetchedAt: Date.now() }));
  } catch {
    /* localStorage can be disabled in private browsing */
  }
}

function isCrewRetryCoolingDown(): boolean {
  try {
    const retryAt = Number(sessionStorage.getItem(CREW_COOLDOWN_KEY) ?? 0);
    return Number.isFinite(retryAt) && Date.now() < retryAt;
  } catch {
    return false;
  }
}

function setCrewRetryCooldown(): void {
  try {
    sessionStorage.setItem(CREW_COOLDOWN_KEY, String(Date.now() + CREW_RETRY_COOLDOWN_MS));
  } catch {
    /* sessionStorage can be disabled in private browsing */
  }
}

function clearCrewRetryCooldown(): void {
  try {
    sessionStorage.removeItem(CREW_COOLDOWN_KEY);
  } catch {
    /* sessionStorage can be disabled in private browsing */
  }
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
  if (!code || code.length !== 2) return '🏳️';
  const A = 0x41;
  const OFFSET = 0x1f1e6 - A;
  const upper = code.toUpperCase();
  return String.fromCodePoint(upper.charCodeAt(0) + OFFSET, upper.charCodeAt(1) + OFFSET);
}
