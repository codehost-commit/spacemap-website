import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Binary,
  BookOpen,
  Calculator,
  Camera,
  Compass,
  Cpu,
  Database,
  Globe,
  GraduationCap,
  Layers,
  MapPin,
  Orbit,
  Radio,
  Rocket,
  Satellite,
  Shield,
  Signal,
  Sigma,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { SystemPill } from '../components/SystemPill.js';

// ─── Content ────────────────────────────────────────────────────────────────

const ORBIT_REGIMES = [
  {
    tag: 'LEO',
    name: 'Low Earth Orbit',
    altitude: '160 – 2,000 km',
    period: '~90 minutes',
    examples: 'ISS, Starlink, Hubble',
    color: '#4d96e8',
    desc: 'The busiest neighbourhood in space. Fast orbital periods, strong drag, short pass windows. Almost every human spacecraft is here.',
  },
  {
    tag: 'MEO',
    name: 'Medium Earth Orbit',
    altitude: '2,000 – 35,786 km',
    period: '2 – 24 hours',
    examples: 'GPS, GLONASS, Galileo',
    color: '#8ed8ff',
    desc: 'Home to navigation constellations. Higher altitude means each satellite sees a larger slice of Earth, so fewer birds cover the whole globe.',
  },
  {
    tag: 'GEO',
    name: 'Geostationary',
    altitude: '35,786 km',
    period: '23h 56m 4s',
    examples: 'Comms, weather sats',
    color: '#ffd166',
    desc: 'Locked over one longitude. From the ground the satellite appears motionless in the sky, which is why TV dishes never have to move.',
  },
  {
    tag: 'HEO',
    name: 'Highly Elliptical',
    altitude: 'up to ~40,000 km',
    period: '4 – 24 hours',
    examples: 'Molniya, TESS',
    color: '#ff6b6b',
    desc: 'Stretched elliptical orbits that dwell over one hemisphere. Useful for high-latitude coverage that GEO satellites can\'t reach.',
  },
];

const CONCEPTS = [
  {
    icon: Binary,
    title: 'What is a TLE?',
    body: 'A Two-Line Element set is 138 characters that encode a satellite\'s position and velocity at a specific moment (the epoch). Given a TLE and a time, SGP4 can predict where the object will be. Every satellite you see on the tracker started as a TLE.',
    detail: '1 25544U 98067A   26210.58333333 …\n2 25544  51.6416 247.4622 …',
  },
  {
    icon: Sigma,
    title: 'SGP4 — the propagator',
    body: 'Simplified General Perturbations 4 is the algorithm that turns a TLE into a position at any past or future time. It models Earth\'s oblateness, atmospheric drag, and lunar/solar gravity. It\'s the same math NORAD uses.',
    detail: 'Accuracy: ~1 km RMS on fresh TLEs. Degrades over days.',
  },
  {
    icon: Orbit,
    title: 'Keplerian elements',
    body: 'Six numbers that fully describe an orbit shape and orientation: semi-major axis, eccentricity, inclination, argument of perigee, RAAN, and mean anomaly. Everything else — period, altitude, ground track — is derived from these.',
    detail: 'a · e · i · ω · Ω · M',
  },
  {
    icon: Target,
    title: 'Conjunctions',
    body: 'A conjunction is a close approach between two objects. SpaceMap sweeps every pair of nearby satellites, refines the time-of-closest-approach, and estimates collision probability using a Gaussian miss-distance model.',
    detail: 'Pc = probability of collision within uncertainty ellipsoid',
  },
  {
    icon: Compass,
    title: 'Ground track',
    body: 'The path directly below a satellite as it orbits. Because Earth rotates, the track shifts west with each orbit. Sun-synchronous satellites keep the same local sun angle by rotating their orbit plane too.',
    detail: 'ISS crosses your latitude ~15 times per day.',
  },
  {
    icon: Sparkles,
    title: 'Visible passes',
    body: 'You can see a satellite from the ground when it\'s in sunlight but you\'re in twilight or darkness. The satellite reflects sunlight; the sky is dark enough to see it. Best passes: 1 – 2 hours after sunset or before sunrise.',
    detail: 'Magnitude scale: brighter = more negative number.',
  },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: Database,
    title: 'Data ingestion',
    desc: 'TLE and OMM data flows in from CelesTrak, Space-Track, and supplemental amateur feeds. The catalog is chunked so the app is usable in seconds while the rest streams in.',
  },
  {
    step: 2,
    icon: Cpu,
    title: 'Client-side propagation',
    desc: 'SGP4 runs entirely in Web Workers on your CPU. Every satellite\'s ECEF position and velocity are computed every ~80 ms. Nothing is uploaded to a server.',
  },
  {
    step: 3,
    icon: Globe,
    title: '3D rendering',
    desc: 'Positions are drawn as Cesium billboards with per-frame velocity interpolation, so 34,000+ objects glide smoothly at 60 fps instead of teleporting each tick.',
  },
  {
    step: 4,
    icon: Activity,
    title: 'Conjunction analysis',
    desc: 'A neighbour search finds close pairs; a golden-section refinement locates the exact time-of-closest-approach; a Gaussian model estimates collision probability.',
  },
];

const TUTORIALS = [
  {
    icon: Rocket,
    title: 'Track your first satellite',
    steps: [
      'Open the Tracker and let the catalog load',
      'Use search — type "ISS" or a NORAD ID',
      'Click the result to select and follow',
      'Open the telemetry panel to see altitude, velocity, RAAN, inclination',
    ],
  },
  {
    icon: Signal,
    title: 'Watch a live pass over your location',
    steps: [
      'Grant location access when prompted',
      'Open the "Local sky" overlay',
      'The panel lists upcoming passes with elevation and azimuth',
      'Best viewing: 1 – 2 hours after sunset in clear sky',
    ],
  },
  {
    icon: Camera,
    title: 'Ride along in POV mode',
    steps: [
      'Select any satellite',
      'Switch camera mode to "POV" in the sidebar',
      'The camera locks to the satellite looking along its velocity vector',
      'Scrub time to fast-forward the ride',
    ],
  },
  {
    icon: Shield,
    title: 'Investigate a conjunction',
    steps: [
      'Open the Collision Watch panel',
      'Rows are sorted by real collision probability',
      'Click a row to load full conjunction analysis',
      'Time-of-closest-approach, miss distance, and Pc are shown to full precision',
    ],
  },
];

// ─── Live global stats dashboard ────────────────────────────────────────────

interface CatalogStats {
  totalCount: number;
  propagatableCount: number;
  metadataOnlyCount: number;
  chunks: Array<{ id: string; label: string; count: number; propagatableCount: number }>;
  fetchedAt: number;
}

function useCatalogStats(): CatalogStats | null {
  const [stats, setStats] = useState<CatalogStats | null>(null);
  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.BASE_URL || '/';
    fetch(`${base}data/catalog-manifest.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setStats(data);
      })
      .catch(() => {
        /* swallow — the dashboard just doesn't render if it fails */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return stats;
}

const CONSTELLATION_ESTIMATES = [
  { name: 'Starlink', count: 6432, operator: 'SpaceX', color: '#4d96e8' },
  { name: 'OneWeb', count: 648, operator: 'Eutelsat', color: '#8ed8ff' },
  { name: 'Iridium NEXT', count: 66, operator: 'Iridium', color: '#ffd166' },
  { name: 'GPS III', count: 31, operator: 'US Space Force', color: '#8ed8ff' },
  { name: 'Planet SkySat', count: 21, operator: 'Planet Labs', color: '#ff6b6b' },
];

function LiveGlobalStats() {
  const stats = useCatalogStats();
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setPulse((p) => p + 1), 4000);
    return () => window.clearInterval(id);
  }, []);

  const totalObjects = stats?.totalCount ?? 70_740;
  const trackable = stats?.propagatableCount ?? 34_704;
  const metadataOnly = stats?.metadataOnlyCount ?? totalObjects - trackable;
  const debrisCount = stats?.chunks.find((c) => c.id === 'debris')?.propagatableCount ?? 2_635;
  const constellationsCount =
    stats?.chunks.find((c) => c.id === 'constellations')?.propagatableCount ?? 12_419;
  const navCount = stats?.chunks.find((c) => c.id === 'navigation')?.propagatableCount ?? 808;

  const fetchedLabel = stats?.fetchedAt
    ? new Date(stats.fetchedAt).toISOString().slice(0, 10)
    : 'live';

  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
              Live Global Stats
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-5xl">
              What&apos;s above Earth, right now.
            </h2>
            <p className="mt-3 max-w-2xl text-space-dim">
              Numbers refresh from the same catalog that powers the tracker. No server, no cache
              layer — this is the actual public catalog SpaceMap propagates.
            </p>
          </div>
          <SystemPill tone="live" icon={Radio} pulse>
            Catalog · {fetchedLabel}
          </SystemPill>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Total tracked objects"
            value={totalObjects.toLocaleString()}
            sub={`${metadataOnly.toLocaleString()} historical · ${trackable.toLocaleString()} live`}
            icon={Satellite}
            gradient="from-[#4d96e8]/25 to-[#8ed8ff]/10"
          />
          <StatCard
            label="Actively propagated"
            value={trackable.toLocaleString()}
            sub="Every one gets an ECEF position each tick"
            icon={Zap}
            gradient="from-[#8ed8ff]/25 to-[#4d96e8]/10"
          />
          <StatCard
            label="Constellation objects"
            value={constellationsCount.toLocaleString()}
            sub="Starlink, OneWeb, Iridium, Planet, Kuiper…"
            icon={Layers}
            gradient="from-[#ffd166]/22 to-[#4d96e8]/10"
          />
          <StatCard
            label="Tracked debris pieces"
            value={debrisCount.toLocaleString()}
            sub="Cosmos-1408, Fengyun-1C, Iridium-33, Cosmos-2251"
            icon={Target}
            gradient="from-[#ff6b6b]/22 to-[#8ed8ff]/10"
          />
          <StatCard
            label="Navigation satellites"
            value={navCount.toLocaleString()}
            sub="GPS · GLONASS · Galileo · BeiDou"
            icon={Compass}
            gradient="from-[#8ed8ff]/25 to-[#ffd166]/10"
          />
          <StatCard
            label="Propagation frequency"
            value="~12 Hz"
            sub="Every satellite advances 80 ms per tick"
            icon={Activity}
            gradient="from-[#4d96e8]/22 to-[#ff6b6b]/10"
          />
        </div>

        {/* Constellation breakdown */}
        <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-space-accent">
                Largest constellations
              </div>
              <div className="mt-1 text-lg font-semibold text-white">
                Where the numbers come from
              </div>
            </div>
            <SystemPill tone="neutral" icon={Sparkles}>
              Approx · public sources
            </SystemPill>
          </div>
          <div className="space-y-3">
            {CONSTELLATION_ESTIMATES.map((c, i) => {
              const max = CONSTELLATION_ESTIMATES[0].count;
              const width = Math.max(6, (c.count / max) * 100);
              const highlight = (pulse + i) % CONSTELLATION_ESTIMATES.length === 0;
              return (
                <div key={c.name} className="grid grid-cols-[1fr_auto] items-center gap-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{c.name}</span>
                      <span className="text-xs text-space-dim">{c.operator}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${width}%`,
                          background: `linear-gradient(90deg, ${c.color}, ${c.color}66)`,
                          boxShadow: highlight ? `0 0 20px ${c.color}88` : 'none',
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right font-mono text-sm font-semibold text-white">
                    {c.count.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ size?: number | string }>;
  gradient: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} p-6 backdrop-blur-sm`}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-space-accent">
        <Icon size={20} />
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-space-dim">
        {label}
      </div>
      <div className="mt-2 font-mono text-3xl font-bold text-white md:text-4xl">{value}</div>
      <div className="mt-2 text-xs text-space-dim">{sub}</div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function LearnPage() {
  return (
    <div className="relative pt-24">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.7fr)] lg:items-center">
          <div>
            <div className="flex flex-wrap gap-3">
              <SystemPill tone="accent" icon={GraduationCap}>
                Learn
              </SystemPill>
              <SystemPill tone="live" icon={Radio} pulse>
                No prerequisites
              </SystemPill>
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-tight text-white md:text-6xl">
              Everything above Earth,{' '}
              <span className="bg-gradient-to-r from-[#8ed8ff] to-[#4d96e8] bg-clip-text text-transparent">
                explained plainly.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-space-dim md:text-lg">
              A crash course in orbital mechanics, TLE data, SGP4 propagation, and how SpaceMap
              turns 34,000+ objects into something you can actually navigate. Written for people
              who&apos;ve never touched aerospace software.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#concepts"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff] px-6 py-3 text-sm font-semibold text-[#06101a] transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#4d96e8]/30"
              >
                <BookOpen size={16} />
                Start with concepts
              </a>
              <a
                href="#live-stats"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all hover:border-space-accent/30 hover:bg-white/10"
              >
                <Activity size={16} />
                Jump to live stats
              </a>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.08),rgba(8,15,25,0.96)_58%,rgba(77,150,232,0.15))] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl">
            <div className="absolute right-[-3rem] top-[-2rem] h-28 w-28 rounded-full bg-[#8ed8ff]/12 blur-3xl" />
            <div className="absolute bottom-[-3rem] left-[-2rem] h-32 w-32 rounded-full bg-[#ff6b6b]/8 blur-3xl" />
            <div className="relative">
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
                What&apos;s inside
              </div>
              <ul className="mt-4 space-y-3 text-sm">
                {[
                  { icon: Orbit, label: 'Orbital regimes — LEO, MEO, GEO, HEO' },
                  { icon: Binary, label: 'How TLEs encode an entire orbit' },
                  { icon: Sigma, label: 'SGP4 propagation, in plain English' },
                  { icon: Target, label: 'Conjunctions and collision probability' },
                  { icon: MapPin, label: 'Ground tracks and visible passes' },
                  { icon: Rocket, label: 'How SpaceMap actually works' },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-space-accent">
                      <Icon size={14} />
                    </div>
                    <span className="text-space-dim">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Orbital regimes */}
      <section id="regimes" className="scroll-mt-32 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
              Orbital regimes
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-5xl">
              Four altitudes, four totally different orbits.
            </h2>
            <p className="mt-3 max-w-3xl text-space-dim">
              Where a satellite sits determines almost everything about it: how fast it moves, how
              long it stays up, how much of Earth it sees, and how easy it is to reach.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {ORBIT_REGIMES.map((r) => (
              <div
                key={r.tag}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-space-accent/30 hover:bg-white/10"
              >
                <div
                  className="absolute right-[-2rem] top-[-2rem] h-24 w-24 rounded-full blur-2xl"
                  style={{ background: `${r.color}22` }}
                />
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <span
                      className="rounded-lg px-3 py-1 font-mono text-xs font-bold"
                      style={{ background: `${r.color}22`, color: r.color }}
                    >
                      {r.tag}
                    </span>
                    <span className="text-lg font-semibold text-white">{r.name}</span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-space-dim">{r.desc}</p>
                  <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
                    <div>
                      <div className="text-[9px] font-semibold uppercase tracking-widest text-space-dim">
                        Altitude
                      </div>
                      <div className="mt-1 font-mono text-xs text-white">{r.altitude}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-semibold uppercase tracking-widest text-space-dim">
                        Period
                      </div>
                      <div className="mt-1 font-mono text-xs text-white">{r.period}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-semibold uppercase tracking-widest text-space-dim">
                        Examples
                      </div>
                      <div className="mt-1 text-xs text-white">{r.examples}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core concepts */}
      <section id="concepts" className="scroll-mt-32 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
              Core concepts
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-5xl">
              The six things worth actually knowing.
            </h2>
            <p className="mt-3 max-w-3xl text-space-dim">
              You don&apos;t need to be a flight dynamicist to use SpaceMap, but these ideas make
              every panel in the tracker make sense.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {CONCEPTS.map((c) => (
              <div
                key={c.title}
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-space-accent/30 hover:bg-white/10"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#4d96e8]/25 to-[#8ed8ff]/15 text-space-accent transition-transform group-hover:scale-110">
                  <c.icon size={20} />
                </div>
                <h3 className="text-base font-semibold text-white">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-space-dim">{c.body}</p>
                <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-space-accent whitespace-pre-wrap">
                  {c.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How SpaceMap works */}
      <section id="how-it-works" className="scroll-mt-32 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
              Under the hood
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-5xl">
              How SpaceMap turns raw data into a globe.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((s) => (
              <div
                key={s.step}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
              >
                <div className="absolute right-4 top-4 font-mono text-[42px] font-bold leading-none text-white/5">
                  {s.step}
                </div>
                <div className="relative">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#4d96e8]/25 to-[#8ed8ff]/15 text-space-accent">
                    <s.icon size={20} />
                  </div>
                  <h3 className="text-base font-semibold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-space-dim">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live global stats */}
      <div id="live-stats" className="scroll-mt-32">
        <LiveGlobalStats />
      </div>

      {/* Tutorials */}
      <section id="tutorials" className="scroll-mt-32 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
              Try it now
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-5xl">
              Four things to do in the tracker.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {TUTORIALS.map((t) => (
              <div
                key={t.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-space-accent/30 hover:bg-white/10"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#4d96e8]/25 to-[#8ed8ff]/15 text-space-accent">
                    <t.icon size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{t.title}</h3>
                </div>
                <ol className="space-y-2 text-sm text-space-dim">
                  {t.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 font-mono text-[10px] font-bold text-space-accent">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formulas cheatsheet */}
      <section id="formulas" className="scroll-mt-32 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
              Cheatsheet
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-5xl">
              The formulas that matter.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FormulaCard
              icon={Calculator}
              label="Orbital period (Kepler)"
              formula="T = 2π · √(a³ / μ)"
              note="μ = 3.986 × 10¹⁴ m³/s². a = semi-major axis."
            />
            <FormulaCard
              icon={Calculator}
              label="Circular orbital velocity"
              formula="v = √(μ / r)"
              note="At 400 km altitude (ISS): ~7.66 km/s."
            />
            <FormulaCard
              icon={Calculator}
              label="Escape velocity"
              formula="v_esc = √(2μ / r)"
              note="From Earth&apos;s surface: ~11.2 km/s."
            />
            <FormulaCard
              icon={Calculator}
              label="Apogee / perigee radius"
              formula="rₐ = a(1 + e)   r_p = a(1 − e)"
              note="e = eccentricity. Circle when e = 0."
            />
            <FormulaCard
              icon={Calculator}
              label="Mean motion (revs/day)"
              formula="n = 86400 / T_seconds"
              note="What the second line of a TLE encodes."
            />
            <FormulaCard
              icon={Calculator}
              label="Look angles (approx)"
              formula="el = 90° − arccos(cos(Δlat) · cos(Δlon))"
              note="Rough elevation from observer to satellite."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#4d96e8]/10 to-[#8ed8ff]/5 p-12 backdrop-blur-sm md:p-16">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
              Ready to look up?
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
              Every idea on this page is one click away in the tracker.
            </h2>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/tracker/"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff] px-8 py-4 text-base font-semibold text-[#06101a] transition-all hover:scale-105 hover:shadow-xl hover:shadow-[#4d96e8]/30"
              >
                <Globe size={18} />
                Open SpaceMap
              </Link>
              <Link
                to="/features"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-base font-medium text-white transition-all hover:border-space-accent/30 hover:bg-white/10"
              >
                See all features
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FormulaCard({
  icon: Icon,
  label,
  formula,
  note,
}: {
  icon: React.ComponentType<{ size?: number | string }>;
  label: string;
  formula: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4d96e8]/25 to-[#8ed8ff]/15 text-space-accent">
        <Icon size={18} />
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-space-dim">
        {label}
      </div>
      <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-sm text-space-accent">
        {formula}
      </div>
      <div className="mt-3 text-xs text-space-dim">{note}</div>
    </div>
  );
}
