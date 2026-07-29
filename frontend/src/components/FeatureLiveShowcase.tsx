import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConjunctionResult, PropagationSnapshot, Tle } from '@spacemap/shared';
import {
  Activity,
  Camera,
  Crosshair,
  MapPin,
  Radio,
  Rocket,
  Shield,
} from 'lucide-react';
import PropagatorWorker from '../workers/propagator.worker.ts?worker';
import { fetchTles } from '../simulation/tle-catalog.js';
import { setLocalCatalog } from '../simulation/catalog-store.js';
import { computeTelemetry } from '../simulation/client-telemetry.js';
import { ensureNotificationPermission } from '../simulation/notifications.js';
import { closestPairs, findInSnapshot } from '../state/snapshot-util.js';

const ISS_NORAD = 25544;
const ISS_LIVE_EMBED = 'https://www.youtube.com/embed/awQzjn72bI0?autoplay=1&mute=1&controls=0';
const LL2_EXPEDITION_URL =
  'https://ll.thespacedevs.com/2.2.0/expedition/?ongoing=true&format=json&limit=3';
const LL2_LAUNCHES_URL =
  'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&mode=list&hide_recent_previous=true';
const LAUNCH_REFRESH_MS = 5 * 60 * 1000;
const CREW_REFRESH_MS = 10 * 60 * 1000;
const SNAPSHOT_REFRESH_MS = 5000;
const UI_TICK_MS = 100;
const ALERT_COOLDOWN_MS = 15 * 60 * 1000;

type RiskLevel = 'danger' | 'caution' | 'watch';

interface OrbitalFeed {
  snapshot: PropagationSnapshot | null;
  catalogSize: number;
  namesById: Map<number, string>;
  loading: boolean;
  error: string | null;
  runConjunction: (
    aId: number,
    bId: number,
    opts?: { hours?: number; coarseStepSec?: number },
  ) => Promise<ConjunctionResult>;
}

interface CollisionRow {
  aId: number;
  bId: number;
  aName: string;
  bName: string;
  missKm: number;
  relSpeedKmS: number;
  probabilityOfCollision: number;
  severity: number;
  tcaMs: number;
}

interface NearbyRow {
  noradId: number;
  name: string;
  rangeMiles: number;
  elevationDeg: number;
  azimuthDeg: number;
}

interface Observer {
  latDeg: number;
  lonDeg: number;
  altKm: number;
}

interface CrewMember {
  name: string;
  role: string;
  agencyAbbrev?: string;
  countryCode?: string;
}

interface LL2Astronaut {
  name?: string;
  nationality?: {
    alpha_2_code?: string;
  };
  agency?: { abbrev?: string };
}

interface LL2Crew {
  role?: { name?: string; role?: string };
  astronaut?: LL2Astronaut;
}

interface LL2Expedition {
  name?: string;
  spacestation?: { name?: string };
  crew?: LL2Crew[];
}

interface LaunchVideoUrl {
  url?: string;
}

interface LaunchMission {
  name?: string;
  description?: string;
}

interface LaunchPad {
  name?: string;
  location?: { name?: string };
}

interface LaunchStatus {
  name?: string;
}

interface LaunchRocket {
  configuration?: { full_name?: string; name?: string };
}

interface UpcomingLaunch {
  id: string;
  name: string;
  net: string;
  status?: LaunchStatus;
  rocket?: LaunchRocket;
  mission?: LaunchMission;
  pad?: LaunchPad;
  vidURLs?: LaunchVideoUrl[];
}

const SHELL_CARD =
  'group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(165deg,rgba(255,255,255,0.08),rgba(8,15,25,0.97)_56%,rgba(77,150,232,0.14))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-space-accent/30 hover:shadow-[0_26px_72px_rgba(77,150,232,0.12)] md:p-7';

const PANEL_CARD =
  'rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(8,15,25,0.92))] backdrop-blur-sm';

export function FeatureLiveShowcase() {
  const feed = useFeatureOrbitalFeed();

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <CollisionWatchCard feed={feed} />
      <IssFeatureCard feed={feed} />
      <ProximityFeatureCard feed={feed} />
      <LaunchFeatureCard catalogSize={feed.catalogSize} />
    </div>
  );
}

function CollisionWatchCard({ feed }: { feed: OrbitalFeed }) {
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [rows, setRows] = useState<CollisionRow[]>([]);
  const [scanning, setScanning] = useState(false);
  const [alertsArmed, setAlertsArmed] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted',
  );
  const alertMemoryRef = useRef(new Map<string, number>());

  useEffect(() => {
    const id = window.setInterval(() => setClockMs(Date.now()), UI_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!feed.snapshot) {
      setRows([]);
      setScanning(false);
      return;
    }
    let cancelled = false;
    setScanning(true);

    void (async () => {
      const candidates = closestPairs(feed.snapshot, 6, 40, 0.4).slice(0, 5);
      const nextRows: CollisionRow[] = [];

      for (const pair of candidates) {
        try {
          const result = await feed.runConjunction(pair.aId, pair.bId, {
            hours: 24,
            coarseStepSec: 90,
          });
          if (cancelled) return;
          nextRows.push({
            aId: pair.aId,
            bId: pair.bId,
            aName: feed.namesById.get(pair.aId) ?? `#${pair.aId}`,
            bName: feed.namesById.get(pair.bId) ?? `#${pair.bId}`,
            missKm: result.missKm,
            relSpeedKmS: result.relSpeedKmS,
            probabilityOfCollision: result.probabilityOfCollision,
            severity: result.severity,
            tcaMs: result.tcaMs,
          });
        } catch {
          // Skip pairs that fail conjunction refinement so the board still renders.
        }
      }

      if (cancelled) return;
      nextRows.sort((a, b) => b.probabilityOfCollision - a.probabilityOfCollision);
      setRows(nextRows);
      setScanning(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [feed.snapshot, feed.namesById, feed.runConjunction]);

  useEffect(() => {
    if (!alertsArmed || typeof Notification === 'undefined') return;
    const hottest = rows.find((row) => row.severity >= 60);
    if (!hottest) return;
    const key = `${hottest.aId}-${hottest.bId}`;
    const now = Date.now();
    const prev = alertMemoryRef.current.get(key) ?? 0;
    if (now - prev < ALERT_COOLDOWN_MS) return;
    alertMemoryRef.current.set(key, now);
    try {
      new Notification('SpaceMap collision watch', {
        body: `${hottest.aName} vs ${hottest.bName} · Pc ${formatProbabilityPercent(hottest.probabilityOfCollision)} · miss ${hottest.missKm.toFixed(3)} km`,
        tag: `feature-conjunction-${key}`,
        icon: '/brand/favicon-3.png',
      });
    } catch {
      // Ignore strict browser notification policies.
    }
  }, [alertsArmed, rows]);

  async function armAlerts() {
    const granted = await ensureNotificationPermission();
    setAlertsArmed(granted);
  }

  return (
    <section className={`${SHELL_CARD} lg:col-span-7`}>
      <AmbientGlow />
      <div className="relative">
        <CardHeader
          icon={Activity}
          eyebrow="Collision watch"
          title="Highest Pc pairs pulled from the live conjunction engine"
          detail={feed.loading ? 'Booting catalog' : '0.1 s board tick'}
        />

        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-space-dim">
          This board ranks the current most-likely encounters by actual probability of collision,
          not placeholder severity art. Percentages are expanded out of scientific notation so the
          risk reads instantly, and the countdown keeps ticking live until TCA.
        </p>

        <div className={`mt-6 overflow-hidden ${PANEL_CARD}`}>
          <div className="grid grid-cols-[1.4fr_auto_auto_auto] gap-3 border-b border-white/10 px-4 py-3 text-[10px] uppercase tracking-[0.28em] text-space-dim">
            <span>Pair</span>
            <span>Pc</span>
            <span>Miss</span>
            <span>TCA</span>
          </div>

          {feed.error && (
            <div className="px-4 py-4 text-sm text-space-warn">
              Orbital feed unavailable: {feed.error}
            </div>
          )}

          {!feed.error && rows.length === 0 && (
            <div className="flex items-center justify-between px-4 py-5 text-sm text-space-dim">
              <span>{scanning || feed.loading ? 'Resolving live conjunctions…' : 'No live conjunction rows yet.'}</span>
              {(scanning || feed.loading) && <Activity className="animate-spin" size={18} />}
            </div>
          )}

          {rows.map((row, index) => {
            const tone = getConjunctionTone(row.severity, row.probabilityOfCollision);
            return (
              <div
                key={`${row.aId}-${row.bId}`}
                className="grid grid-cols-[1.4fr_auto_auto_auto] items-center gap-3 border-b border-white/10 px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full border text-[10px] font-semibold ${tone.dotClass}`}>
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{row.aName}</div>
                      <div className="truncate text-xs text-space-dim">{row.bName}</div>
                    </div>
                  </div>
                </div>
                <div className={`text-right text-sm font-semibold ${tone.textClass}`}>
                  {formatProbabilityPercent(row.probabilityOfCollision)}
                </div>
                <div className="text-right text-xs text-space-dim">{row.missKm.toFixed(3)} km</div>
                <div className="text-right text-xs text-space-dim">
                  {formatTimeToEvent(row.tcaMs - clockMs)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void armAlerts()}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
              alertsArmed
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                : 'border-white/10 bg-white/5 text-space-dim hover:border-space-accent/40 hover:text-white'
            }`}
          >
            {alertsArmed ? <Shield size={16} /> : <Radio size={16} />}
            {alertsArmed ? 'Alerts armed' : 'Arm alerts'}
          </button>
          <span className="text-sm text-space-dim">
            Same browser alert lane used for close conjunctions when something crosses the danger
            threshold.
          </span>
        </div>
      </div>
    </section>
  );
}

function IssFeatureCard({ feed }: { feed: OrbitalFeed }) {
  const [crew, setCrew] = useState<CrewMember[] | null>(null);
  const [crewError, setCrewError] = useState<string | null>(null);
  const [expeditionName, setExpeditionName] = useState<string | null>(null);
  const issRow = feed.snapshot ? findInSnapshot(feed.snapshot, ISS_NORAD) : null;
  const telemetry = issRow ? computeTelemetry(ISS_NORAD, new Date(feed.snapshot!.timeMs)) : null;

  useEffect(() => {
    let cancelled = false;
    const loadCrew = async () => {
      try {
        const res = await fetch(LL2_EXPEDITION_URL);
        if (!res.ok) throw new Error(`LL2 ${res.status}`);
        const body = (await res.json()) as { results?: LL2Expedition[] };
        const iss =
          body.results?.find((item) =>
            (item.spacestation?.name ?? '').toLowerCase().includes('international'),
          ) ?? body.results?.[0];
        const members =
          iss?.crew
            ?.filter((member) => member.astronaut?.name)
            .map((member) => ({
              name: member.astronaut!.name!,
              role: member.role?.name ?? member.role?.role ?? 'Crew',
              agencyAbbrev: member.astronaut?.agency?.abbrev,
              countryCode: member.astronaut?.nationality?.alpha_2_code?.toUpperCase(),
            })) ?? [];
        if (!cancelled) {
          setCrew(members);
          setCrewError(null);
          setExpeditionName(iss?.name ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setCrewError(error instanceof Error ? error.message : String(error));
        }
      }
    };
    void loadCrew();
    const id = window.setInterval(loadCrew, CREW_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <section className={`${SHELL_CARD} lg:col-span-5`}>
      <AmbientGlow />
      <div className="relative">
        <CardHeader
          icon={Camera}
          eyebrow="ISS cam"
          title="The live station feed sits right inside the feature stack"
          detail="Embedded from tracker"
        />

        <div className={`mt-6 overflow-hidden ${PANEL_CARD}`}>
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
          <div className="grid grid-cols-3 gap-3 border-t border-white/10 px-4 py-4 text-sm">
            <MetricCell label="Altitude" value={issRow ? `${issRow.altKm.toFixed(1)} km` : 'Syncing'} />
            <MetricCell label="Speed" value={issRow ? `${issRow.speedKmS.toFixed(3)} km/s` : 'Syncing'} />
            <MetricCell
              label="Sunlit"
              value={telemetry ? (telemetry.sunlit ? 'Yes' : 'Shadow') : 'Syncing'}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className={`p-4 ${PANEL_CARD}`}>
            <div className="text-[10px] uppercase tracking-[0.28em] text-space-dim">
              Orbit status
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <InfoRow label="Latitude" value={issRow ? `${issRow.latDeg.toFixed(2)}°` : 'Syncing'} />
              <InfoRow
                label="Longitude"
                value={issRow ? `${issRow.lonDeg.toFixed(2)}°` : 'Syncing'}
              />
              <InfoRow
                label="Period"
                value={telemetry ? `${telemetry.elements.periodMinutes.toFixed(2)} min` : 'Syncing'}
              />
            </div>
          </div>

          <div className={`p-4 ${PANEL_CARD}`}>
            <div className="text-[10px] uppercase tracking-[0.28em] text-space-dim">
              {expeditionName ? `Crew · ${expeditionName}` : 'Crew manifest'}
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {crewError && <div className="text-space-warn">Crew feed unavailable: {crewError}</div>}
              {!crew && !crewError && <div className="text-space-dim">Loading current crew…</div>}
              {crew?.slice(0, 3).map((member) => (
                <div key={member.name} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-white">{member.name}</div>
                    <div className="truncate text-xs text-space-dim">
                      {member.role}
                      {member.agencyAbbrev ? ` · ${member.agencyAbbrev}` : ''}
                    </div>
                  </div>
                  <span className="text-base leading-none" aria-hidden>
                    {countryFlag(member.countryCode)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProximityFeatureCard({ feed }: { feed: OrbitalFeed }) {
  const [observer, setObserver] = useState<Observer | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [alertsArmed, setAlertsArmed] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted',
  );
  const alertMemoryRef = useRef(new Map<string, number>());

  const nearby = useMemo(
    () => nearestToObserver(feed.snapshot, observer, feed.namesById, 5),
    [feed.snapshot, feed.namesById, observer],
  );

  useEffect(() => {
    if (!alertsArmed || !observer || typeof Notification === 'undefined') return;
    const nearestVisible = nearby.find((row) => row.elevationDeg >= 20);
    if (!nearestVisible) return;
    const now = Date.now();
    const prev = alertMemoryRef.current.get(String(nearestVisible.noradId)) ?? 0;
    if (now - prev < ALERT_COOLDOWN_MS) return;
    alertMemoryRef.current.set(String(nearestVisible.noradId), now);
    try {
      new Notification('SpaceMap local sky alert', {
        body: `${nearestVisible.name} is ${nearestVisible.rangeMiles.toFixed(0)} miles away at ${nearestVisible.elevationDeg.toFixed(0)}° elevation`,
        tag: `feature-sky-${nearestVisible.noradId}`,
        icon: '/brand/favicon-3.png',
      });
    } catch {
      // Ignore strict browser notification policies.
    }
  }, [alertsArmed, nearby, observer]);

  async function requestLocation() {
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation is not available in this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setObserver({
          latDeg: pos.coords.latitude,
          lonDeg: pos.coords.longitude,
          altKm: (pos.coords.altitude ?? 0) / 1000,
        });
        setGeoError(null);
        setLocating(false);
      },
      (error) => {
        setGeoError(error.message);
        setLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 8000 },
    );
  }

  async function armAlerts() {
    const granted = await ensureNotificationPermission();
    setAlertsArmed(granted);
  }

  return (
    <section className={`${SHELL_CARD} lg:col-span-7`}>
      <AmbientGlow />
      <div className="relative">
        <CardHeader
          icon={MapPin}
          eyebrow="Closest to you"
          title="Approve location and get a live nearest-object leaderboard in miles"
          detail={observer ? 'Geolocation locked' : 'Location requested on demand'}
        />

        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-space-dim">
          This is the same local-sky idea from the tracker, but surfaced as a leaderboard. Once you
          approve location, SpaceMap ranks the closest live objects relative to your position and
          colors them by urgency: red, yellow, and light blue.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void requestLocation()}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:border-space-accent/40 hover:text-space-accent"
          >
            <Crosshair size={16} />
            {locating ? 'Locating…' : observer ? 'Refresh location' : 'Use my location'}
          </button>
          <button
            onClick={() => void armAlerts()}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
              alertsArmed
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                : 'border-white/10 bg-white/5 text-space-dim hover:border-space-accent/40 hover:text-white'
            }`}
          >
            {alertsArmed ? <Shield size={16} /> : <Radio size={16} />}
            {alertsArmed ? 'Nearby alerts armed' : 'Arm nearby alerts'}
          </button>
          {observer && (
            <span className="text-sm text-space-dim">
              {observer.latDeg.toFixed(3)}°, {observer.lonDeg.toFixed(3)}°
            </span>
          )}
        </div>

        <div className={`mt-6 overflow-hidden ${PANEL_CARD}`}>
          {!observer && !geoError && (
            <div className="px-4 py-6 text-sm text-space-dim">
              Location stays opt-in. Approve it and this board will populate with the objects closest
              to you right now.
            </div>
          )}
          {geoError && <div className="px-4 py-6 text-sm text-space-warn">{geoError}</div>}
          {observer && nearby.length === 0 && (
            <div className="px-4 py-6 text-sm text-space-dim">Resolving nearest objects…</div>
          )}
          {nearby.map((row, index) => {
            const tone = getRangeTone(row.rangeMiles);
            return (
              <div
                key={row.noradId}
                className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b border-white/10 px-4 py-3 last:border-b-0"
              >
                <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full border text-[10px] font-semibold ${tone.dotClass}`}>
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{row.name}</div>
                  <div className="text-xs text-space-dim">
                    el {row.elevationDeg.toFixed(0)}° · az {row.azimuthDeg.toFixed(0)}°
                  </div>
                </div>
                <span className={`text-sm font-semibold ${tone.textClass}`}>
                  {row.rangeMiles.toFixed(0)} mi
                </span>
                <span className="text-xs text-space-dim">{tone.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LaunchFeatureCard({
  catalogSize,
}: {
  catalogSize: number;
}) {
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [launches, setLaunches] = useState<UpcomingLaunch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setClockMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(LL2_LAUNCHES_URL);
        if (!res.ok) throw new Error(`LL2 ${res.status}`);
        const body = (await res.json()) as { results?: UpcomingLaunch[] };
        if (!cancelled) {
          setLaunches(body.results ?? []);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      }
    };
    void load();
    const id = window.setInterval(load, LAUNCH_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const nextLaunches = launches?.slice(0, 3) ?? [];

  return (
    <section className={`${SHELL_CARD} lg:col-span-5`}>
      <AmbientGlow />
      <div className="relative">
        <CardHeader
          icon={Rocket}
          eyebrow="Launch tracker"
          title="The next launches update from the same live list used in the tracker"
          detail={catalogSize > 0 ? `${catalogSize.toLocaleString()} objects in catalog` : 'Live launch feed'}
        />

        <div className="mt-6 grid gap-3">
          {error && <div className={`px-4 py-4 text-sm text-space-warn ${PANEL_CARD}`}>{error}</div>}
          {!error && nextLaunches.length === 0 && (
            <div className={`flex items-center justify-between px-4 py-5 text-sm text-space-dim ${PANEL_CARD}`}>
              <span>Loading next launches…</span>
              <Activity className="animate-spin" size={18} />
            </div>
          )}
          {nextLaunches.map((launch) => {
            const deltaMs = new Date(launch.net).getTime() - clockMs;
            const tone = getLaunchTone(deltaMs);
            return (
              <div key={launch.id} className={`p-4 ${PANEL_CARD}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-white">{launch.name}</div>
                    <div className="mt-1 truncate text-xs text-space-dim">
                      {launch.rocket?.configuration?.full_name ??
                        launch.rocket?.configuration?.name ??
                        'Launch vehicle pending'}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${tone.dotClass}`}>
                    {tone.label}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className={`text-2xl font-semibold ${tone.textClass}`}>
                    {formatCountdown(deltaMs)}
                  </div>
                  <div className="text-right text-xs text-space-dim">
                    <div>{launch.pad?.name ?? 'Pad TBD'}</div>
                    <div>{launch.pad?.location?.name ?? launch.status?.name ?? 'Pending'}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs text-space-dim">
                  <Radio size={14} className={tone.textClass} />
                  <span className="truncate">
                    {launch.mission?.name ??
                      launch.mission?.description ??
                      'Mission details will land here as Launch Library updates.'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function useFeatureOrbitalFeed(): OrbitalFeed {
  const [snapshot, setSnapshot] = useState<PropagationSnapshot | null>(null);
  const [catalogSize, setCatalogSize] = useState(0);
  const [namesById, setNamesById] = useState(() => new Map<number, string>());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const intervalRef = useRef<number | null>(null);
  const nextRequestIdRef = useRef(1);
  const waitersRef = useRef(
    new Map<number, { resolve: (value: ConjunctionResult) => void; reject: (error: Error) => void }>(),
  );

  useEffect(() => {
    let cancelled = false;
    const worker = new PropagatorWorker();
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<unknown>) => {
      const message = event.data as { type?: string };
      if (message?.type === 'snapshot') {
        const data = event.data as {
          type: 'snapshot';
          timeMs: number;
          count: number;
          ids: ArrayBuffer;
          eciPos: ArrayBuffer;
          ecefPos: ArrayBuffer;
          ecefVel: ArrayBuffer;
          geodetic: ArrayBuffer;
          speed: ArrayBuffer;
          orbitClass: ArrayBuffer;
        };
        setSnapshot({
          timeMs: data.timeMs,
          count: data.count,
          ids: new Int32Array(data.ids, 0, data.count),
          eciPos: new Float32Array(data.eciPos, 0, data.count * 3),
          ecefPos: new Float32Array(data.ecefPos, 0, data.count * 3),
          ecefVel: new Float32Array(data.ecefVel, 0, data.count * 3),
          geodetic: new Float32Array(data.geodetic, 0, data.count * 3),
          speed: new Float32Array(data.speed, 0, data.count),
          orbitClass: new Uint8Array(data.orbitClass, 0, data.count),
        });
        setLoading(false);
        return;
      }

      if (message?.type === 'conjunctionResult') {
        const data = event.data as {
          type: 'conjunctionResult';
          requestId: number;
          result?: ConjunctionResult;
          error?: string;
        };
        const waiter = waitersRef.current.get(data.requestId);
        if (!waiter) return;
        waitersRef.current.delete(data.requestId);
        if (data.result) waiter.resolve(data.result);
        else waiter.reject(new Error(data.error ?? 'conjunction failed'));
      }
    };

    void (async () => {
      try {
        const tles = await fetchTles();
        if (cancelled) return;
        setLocalCatalog(tles);
        setCatalogSize(tles.length);
        setNamesById(new Map(tles.map((tle: Tle) => [tle.noradId, tle.name])));
        worker.postMessage({ type: 'load', tles });
        const propagate = () => worker.postMessage({ type: 'propagate', timeMs: Date.now() });
        propagate();
        intervalRef.current = window.setInterval(propagate, SNAPSHOT_REFRESH_MS);
        setError(null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
      }
      worker.terminate();
      workerRef.current = null;
      for (const [, waiter] of waitersRef.current) {
        waiter.reject(new Error('Orbital feed shut down'));
      }
      waitersRef.current.clear();
    };
  }, []);

  const runConjunction = useCallback<OrbitalFeed['runConjunction']>((aId, bId, opts = {}) => {
    const worker = workerRef.current;
    if (!worker) {
      return Promise.reject(new Error('orbital feed unavailable'));
    }
    const requestId = nextRequestIdRef.current++;
    const hours = opts.hours ?? 24;
    const coarseStepSec = opts.coarseStepSec ?? 60;
    const now = Date.now();
    return new Promise<ConjunctionResult>((resolve, reject) => {
      waitersRef.current.set(requestId, { resolve, reject });
      worker.postMessage({
        type: 'conjunction',
        requestId,
        aId,
        bId,
        startMs: now,
        endMs: now + hours * 3_600_000,
        coarseStepSec,
      });
    });
  }, []);

  return { snapshot, catalogSize, namesById, loading, error, runConjunction };
}

function CardHeader({
  icon: Icon,
  eyebrow,
  title,
  detail,
}: {
  icon: typeof Activity;
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
          {eyebrow}
        </p>
        <h3 className="mt-4 max-w-2xl text-2xl font-semibold leading-tight text-white">{title}</h3>
      </div>
      <div className="feature-float flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-space-accent">
        <Icon size={22} />
      </div>
      <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-space-dim md:block">
        {detail}
      </div>
    </div>
  );
}

function AmbientGlow() {
  return (
    <>
      <div className="absolute right-[-3rem] top-[-2rem] h-28 w-28 rounded-full bg-[#8ed8ff]/12 blur-3xl" />
      <div className="absolute bottom-[-3rem] left-[-2rem] h-32 w-32 rounded-full bg-[#ff6b6b]/8 blur-3xl" />
    </>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.24em] text-space-dim">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-space-dim">{label}</span>
      <span className="text-right text-white">{value}</span>
    </div>
  );
}

function getConjunctionTone(severity: number, pc: number) {
  if (severity >= 70 || pc >= 1e-4) {
    return {
      label: 'Danger',
      textClass: 'text-[#ff6b6b]',
      dotClass: 'border-[#ff6b6b]/35 bg-[#ff6b6b]/12 text-[#ff9ca6]',
    };
  }
  if (severity >= 40 || pc >= 1e-6) {
    return {
      label: 'Caution',
      textClass: 'text-[#ffd166]',
      dotClass: 'border-[#ffd166]/35 bg-[#ffd166]/12 text-[#ffe19a]',
    };
  }
  return {
    label: 'Watch',
    textClass: 'text-[#8ed8ff]',
    dotClass: 'border-[#8ed8ff]/35 bg-[#8ed8ff]/12 text-[#c7efff]',
  };
}

function getRangeTone(rangeMiles: number) {
  if (rangeMiles <= 500) {
    return {
      label: 'Danger',
      textClass: 'text-[#ff6b6b]',
      dotClass: 'border-[#ff6b6b]/35 bg-[#ff6b6b]/12 text-[#ff9ca6]',
    };
  }
  if (rangeMiles <= 1200) {
    return {
      label: 'Caution',
      textClass: 'text-[#ffd166]',
      dotClass: 'border-[#ffd166]/35 bg-[#ffd166]/12 text-[#ffe19a]',
    };
  }
  return {
    label: 'Watch',
    textClass: 'text-[#8ed8ff]',
    dotClass: 'border-[#8ed8ff]/35 bg-[#8ed8ff]/12 text-[#c7efff]',
  };
}

function getLaunchTone(deltaMs: number) {
  if (deltaMs <= 2 * 60 * 60 * 1000) {
    return {
      label: 'Hot',
      textClass: 'text-[#ff6b6b]',
      dotClass: 'border-[#ff6b6b]/35 bg-[#ff6b6b]/12 text-[#ff9ca6]',
    };
  }
  if (deltaMs <= 24 * 60 * 60 * 1000) {
    return {
      label: 'Soon',
      textClass: 'text-[#ffd166]',
      dotClass: 'border-[#ffd166]/35 bg-[#ffd166]/12 text-[#ffe19a]',
    };
  }
  return {
    label: 'Tracked',
    textClass: 'text-[#8ed8ff]',
    dotClass: 'border-[#8ed8ff]/35 bg-[#8ed8ff]/12 text-[#c7efff]',
  };
}

function nearestToObserver(
  snapshot: PropagationSnapshot | null,
  observer: Observer | null,
  namesById: Map<number, string>,
  limit: number,
): NearbyRow[] {
  if (!snapshot || !observer) return [];
  const latR = (observer.latDeg * Math.PI) / 180;
  const lonR = (observer.lonDeg * Math.PI) / 180;
  const a = 6_378_137;
  const f = 1 / 298.257223563;
  const e2 = 2 * f - f * f;
  const sinLat = Math.sin(latR);
  const cosLat = Math.cos(latR);
  const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
  const h = observer.altKm * 1000;
  const obsX = (N + h) * cosLat * Math.cos(lonR);
  const obsY = (N + h) * cosLat * Math.sin(lonR);
  const obsZ = (N * (1 - e2) + h) * sinLat;

  const rows: NearbyRow[] = [];
  for (let i = 0; i < snapshot.count; i++) {
    const dx = snapshot.ecefPos[i * 3] - obsX;
    const dy = snapshot.ecefPos[i * 3 + 1] - obsY;
    const dz = snapshot.ecefPos[i * 3 + 2] - obsZ;
    const east = -Math.sin(lonR) * dx + Math.cos(lonR) * dy;
    const north = -sinLat * Math.cos(lonR) * dx - sinLat * Math.sin(lonR) * dy + cosLat * dz;
    const up = cosLat * Math.cos(lonR) * dx + cosLat * Math.sin(lonR) * dy + sinLat * dz;
    const rangeM = Math.hypot(east, north, up);
    const elevation = Math.asin(up / rangeM);
    let azimuth = Math.atan2(east, north);
    if (azimuth < 0) azimuth += 2 * Math.PI;
    rows.push({
      noradId: snapshot.ids[i],
      name: namesById.get(snapshot.ids[i]) ?? `#${snapshot.ids[i]}`,
      rangeMiles: (rangeM / 1000) * 0.621371,
      elevationDeg: (elevation * 180) / Math.PI,
      azimuthDeg: (azimuth * 180) / Math.PI,
    });
  }
  rows.sort((aRow, bRow) => aRow.rangeMiles - bRow.rangeMiles);
  return rows.slice(0, limit);
}

function formatProbabilityPercent(pc: number): string {
  const percent = pc * 100;
  if (percent === 0) return '0%';
  if (percent < 0.00000001) return '<0.00000001%';
  if (percent < 0.0001) return `${trimTrailingZeroes(percent.toFixed(8))}%`;
  if (percent < 0.01) return `${trimTrailingZeroes(percent.toFixed(6))}%`;
  return `${trimTrailingZeroes(percent.toFixed(4))}%`;
}

function formatTimeToEvent(deltaMs: number): string {
  const sign = deltaMs >= 0 ? 'T-' : 'T+';
  const totalTenths = Math.floor(Math.abs(deltaMs) / 100);
  const totalSeconds = Math.floor(totalTenths / 10);
  const tenths = totalTenths % 10;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');
  if (hours > 0) return `${sign}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${sign}${pad(minutes)}:${pad(seconds)}.${tenths}`;
}

function formatCountdown(deltaMs: number): string {
  const abs = Math.abs(deltaMs);
  const sign = deltaMs < 0 ? 'T+' : 'T-';
  const totalSec = Math.floor(abs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');
  if (days > 0) return `${sign}${days}d ${pad(hours)}h ${pad(minutes)}m`;
  return `${sign}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function trimTrailingZeroes(value: string): string {
  return value.replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '');
}

function countryFlag(code?: string): string {
  if (!code || code.length !== 2) return '🏳️';
  const A = 0x41;
  const OFFSET = 0x1f1e6 - A;
  const upper = code.toUpperCase();
  return String.fromCodePoint(upper.charCodeAt(0) + OFFSET, upper.charCodeAt(1) + OFFSET);
}
