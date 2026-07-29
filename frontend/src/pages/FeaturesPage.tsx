import { Link } from 'react-router-dom';
import {
  Globe,
  Satellite,
  Search,
  Activity,
  Shield,
  Clock,
  Zap,
  Eye,
  MapPin,
  Camera,
  Layers,
  BarChart3,
  Rocket,
  Radio,
  Crosshair,
  Timer,
  Orbit,
  SlidersHorizontal,
} from 'lucide-react';

const HERO_METRICS = [
  { value: '30,000+', label: 'objects rendered live' },
  { value: '1000x', label: 'simulation speed ceiling' },
  { value: '100%', label: 'client-side propagation' },
  { value: '0', label: 'accounts or installs required' },
];

const FEATURE_PILLARS = [
  {
    id: 'globe',
    icon: Globe,
    eyebrow: 'Spatial command',
    title: 'Command the globe, not a spreadsheet',
    desc: 'SpaceMap keeps the whole orbital picture legible. Fly to an object, swap map layers, follow a vehicle, and reorient instantly without losing context.',
    bullets: [
      'Jump from search result to live object in one click.',
      'Blend imagery, borders, density, and orbit context on demand.',
      'Switch between free navigation and locked follow modes fluidly.',
    ],
    span: 'lg:col-span-7',
    cardClass:
      'bg-[linear-gradient(145deg,rgba(142,216,255,0.14),rgba(9,18,29,0.92)_44%,rgba(77,150,232,0.12))]',
  },
  {
    id: 'conjunction',
    icon: Activity,
    eyebrow: 'Collision insight',
    title: 'See close approaches before they blur into noise',
    desc: 'The conjunction stack highlights which objects deserve attention first, with miss distance, relative motion, and time-to-approach surfaced in plain view.',
    bullets: [
      'Live leaderboard ranks the highest-interest encounters.',
      'Relative velocity and timing stay visible beside each pair.',
      'Use proximity effects to understand neighborhood density fast.',
    ],
    span: 'lg:col-span-5',
    cardClass:
      'bg-[linear-gradient(180deg,rgba(77,150,232,0.16),rgba(9,18,29,0.94)_56%,rgba(242,109,125,0.08))]',
  },
  {
    id: 'time',
    icon: Clock,
    eyebrow: 'Temporal control',
    title: 'Move through orbital history like playback',
    desc: 'Scrub backward, accelerate forward, and compare how a pass or launch evolves over time without waiting for server-side recomputes.',
    bullets: [
      'Replay notable events with frame-by-frame control.',
      'Fast-forward into future geometry at up to 1000x speed.',
      'Keep trails and telemetry synchronized as time moves.',
    ],
    span: 'lg:col-span-5',
    cardClass:
      'bg-[linear-gradient(155deg,rgba(255,255,255,0.08),rgba(9,18,29,0.94)_48%,rgba(142,216,255,0.14))]',
  },
  {
    id: 'private',
    icon: Shield,
    eyebrow: 'Trust & performance',
    title: 'Mission-control feel, local-machine trust',
    desc: 'The simulation runs on your hardware with Web Workers handling propagation. No account wall, no hidden upload, and no waiting for a cloud round trip to inspect the sky.',
    bullets: [
      'Propagation runs locally for privacy and responsiveness.',
      'Telemetry and visualization update inside the same tab.',
      'Useful for classrooms, enthusiasts, and researchers alike.',
    ],
    span: 'lg:col-span-7',
    cardClass:
      'bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(9,18,29,0.94)_52%,rgba(142,216,255,0.12))]',
  },
];

const FLOW_STEPS = [
  {
    step: '01',
    icon: Search,
    title: 'Search or filter',
    desc: 'Start with a name, NORAD ID, or orbit class and narrow the sky before you inspect it.',
  },
  {
    step: '02',
    icon: BarChart3,
    title: 'Inspect the object',
    desc: 'Open telemetry, orbit trails, and position context without leaving the globe.',
  },
  {
    step: '03',
    icon: Timer,
    title: 'Shift through time',
    desc: 'Replay passes, fast-forward scenarios, and compare geometry across a moving timeline.',
  },
  {
    step: '04',
    icon: Radio,
    title: 'Watch the neighborhood',
    desc: 'Use conjunctions, overlays, and local sky tools to understand who shares the same space.',
  },
];

const SURFACES = [
  {
    icon: Search,
    title: 'Instant search',
    desc: 'Name, NORAD ID, or designator matching that narrows the catalog as you type.',
  },
  {
    icon: Layers,
    title: 'Layer stack',
    desc: 'Heatmaps, terminator, borders, cities, and infrastructure overlays available in seconds.',
  },
  {
    icon: Orbit,
    title: 'Orbit context',
    desc: 'Trails, history, regime filters, and follow states that make motion easier to reason about.',
  },
  {
    icon: Crosshair,
    title: 'Local sky view',
    desc: 'Translate the global scene into what is actually visible over a specific observer.',
  },
  {
    icon: Eye,
    title: 'Immersive modes',
    desc: 'ISS camera and POV tracking keep the experience exploratory, not just analytical.',
  },
];

const STACK_MODULES = [
  'Heatmaps',
  'Day / night terminator',
  'Country borders',
  'City markers',
  'Ground stations',
  'Orbit regimes',
  'Imagery picker',
  'History trails',
];

const EXTRA_TOOLS = [
  {
    icon: Rocket,
    title: 'Launch tracker',
    desc: 'Tie launches back to live catalog objects once they appear.',
  },
  {
    icon: MapPin,
    title: 'Ground sites',
    desc: 'Anchor the orbital scene with real stations and launch infrastructure.',
  },
  {
    icon: Camera,
    title: 'POV camera',
    desc: 'Lock to a spacecraft and ride along while Earth rolls underneath.',
  },
];

const CARD_HOVER =
  'transition-all duration-300 hover:-translate-y-1 hover:border-space-accent/30 hover:shadow-[0_18px_45px_rgba(77,150,232,0.12)]';

export function FeaturesPage() {
  return (
    <div className="relative overflow-hidden pt-24">
      <div className="absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(77,150,232,0.2),transparent_62%)]" />
      <div className="absolute right-[-8rem] top-[18rem] h-72 w-72 rounded-full bg-[#8ed8ff]/10 blur-3xl" />
      <div className="absolute left-[-8rem] top-[42rem] h-80 w-80 rounded-full bg-[#4d96e8]/10 blur-3xl" />

      <section className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:items-center">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-space-accent">
              Feature Architecture
            </p>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight text-white md:text-6xl">
              A cleaner, faster way to read everything moving over Earth.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-space-dim">
              SpaceMap is built to feel less like a dashboard cemetery and more like a live orbital
              workspace. It blends real-time tracking, time control, and visibility tools into one
              coherent surface.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs font-medium text-space-dim">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm transition-colors hover:border-space-accent/30 hover:text-white">
                Real-time orbital awareness
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm transition-colors hover:border-space-accent/30 hover:text-white">
                Browser-native exploration
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm transition-colors hover:border-space-accent/30 hover:text-white">
                Private local compute
              </span>
            </div>
          </div>

          <div
            className={`group rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.08),rgba(8,15,25,0.96)_58%,rgba(77,150,232,0.16))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl md:p-8 ${CARD_HOVER}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
                  Mission Deck
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  Everything stays readable at once.
                </h2>
              </div>
              <div className="feature-float flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-space-accent transition-transform duration-300 group-hover:scale-110">
                <Satellite size={22} />
              </div>
            </div>

            <div className="mt-8 grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors duration-300 group-hover:bg-white/10">
                <div className="flex items-center justify-between text-sm text-white">
                  <span>Catalog sync</span>
                  <span className="text-space-accent">Nominal</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/5">
                  <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff]" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors duration-300 group-hover:bg-white/10">
                  <div className="flex items-center gap-3 text-space-accent">
                    <Shield size={16} />
                    <span className="text-xs font-semibold uppercase tracking-[0.24em]">
                      Local Compute
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-space-dim">
                    Propagation and rendering stay in-browser, which keeps the interaction fast and
                    your session private.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors duration-300 group-hover:bg-white/10">
                  <div className="flex items-center gap-3 text-space-accent">
                    <SlidersHorizontal size={16} />
                    <span className="text-xs font-semibold uppercase tracking-[0.24em]">
                      Live Controls
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-space-dim">
                    Speed, overlays, orbit classes, and follow modes all stay one adjustment away.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#08111c]/90 p-5 transition-colors duration-300 group-hover:bg-[#0b1521]">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-space-dim">
                <span>Live stack</span>
                <span className="text-emerald-300">Ready</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Search', 'Telemetry', 'Overlays', 'Conjunctions', 'Timeline'].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-space-dim transition-colors hover:border-space-accent/30 hover:text-white"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <div className="relative mt-5 h-24 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_center,rgba(142,216,255,0.18),transparent_52%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]">
                <div className="feature-scan-beam absolute inset-y-0 left-[-20%] w-14 bg-gradient-to-r from-transparent via-[#8ed8ff]/30 to-transparent" />
                <div className="absolute inset-x-4 top-1/2 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                <div className="feature-orbit-ring absolute left-1/2 top-4 h-16 w-16 -translate-x-1/2 rounded-full border border-space-accent/25" />
                <div className="feature-orbit-ring feature-orbit-ring-slow absolute left-1/2 top-2 h-20 w-20 -translate-x-1/2 rounded-full border border-space-accent/15" />
                <div className="feature-float absolute left-[22%] top-[38%] h-2.5 w-2.5 rounded-full bg-space-accent shadow-[0_0_22px_rgba(142,216,255,0.8)]" />
                <div className="feature-float feature-float-delayed absolute right-[24%] top-[48%] h-2.5 w-2.5 rounded-full bg-white/70" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {HERO_METRICS.map((metric) => (
            <div
              key={metric.label}
              className={`rounded-2xl border border-white/10 bg-white/5 px-5 py-6 backdrop-blur-sm ${CARD_HOVER}`}
            >
              <div className="text-3xl font-bold text-white">{metric.value}</div>
              <p className="mt-2 text-sm text-space-dim">{metric.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
            Core Systems
          </p>
          <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">
            Four parts of the product that do the heavy lifting.
          </h2>
          <p className="mt-4 text-space-dim">
            The page is organized around the actual jobs SpaceMap helps with: orienting yourself,
            identifying risk, moving through time, and trusting what the tool is doing.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {FEATURE_PILLARS.map((pillar) => (
            <article
              key={pillar.id}
              className={`group ${pillar.span} ${pillar.cardClass} relative overflow-hidden rounded-[2rem] border border-white/10 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl md:p-8 ${CARD_HOVER}`}
            >
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/5 blur-3xl transition-opacity duration-300 group-hover:opacity-80" />
              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
                      {pillar.eyebrow}
                    </p>
                    <h3 className="mt-4 max-w-xl text-2xl font-semibold leading-tight text-white">
                      {pillar.title}
                    </h3>
                  </div>
                  <div className="feature-float flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-space-accent transition-transform duration-300 group-hover:scale-110">
                    <pillar.icon size={22} />
                  </div>
                </div>

                <p className="mt-5 max-w-2xl text-sm leading-relaxed text-space-dim">{pillar.desc}</p>

                <div className="mt-6 grid gap-3 text-sm text-space-dim">
                  {pillar.bullets.map((bullet) => (
                    <div
                      key={bullet}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition-all duration-300 group-hover:bg-white/10"
                    >
                      <span className="mt-1 h-2 w-2 rounded-full bg-space-accent" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>

                {pillar.id === 'globe' ? (
                  <div className="relative mt-8 min-h-[13rem] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#08111c]/90 p-5 transition-colors duration-300 group-hover:bg-[#0b1521]">
                    <div className="feature-scan-beam absolute inset-y-0 left-[-18%] w-12 bg-gradient-to-r from-transparent via-[#8ed8ff]/20 to-transparent" />
                    <div className="feature-orbit-ring absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-space-accent/20" />
                    <div className="feature-orbit-ring feature-orbit-ring-slow absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-space-accent/30" />
                    <div className="feature-float absolute left-[20%] top-[28%] h-3 w-3 rounded-full bg-space-accent shadow-[0_0_26px_rgba(142,216,255,0.85)]" />
                    <div className="feature-float feature-float-delayed absolute right-[22%] top-[34%] h-2.5 w-2.5 rounded-full bg-white/80" />
                    <div className="feature-float absolute left-[30%] bottom-[24%] h-2.5 w-2.5 rounded-full bg-[#4d96e8]" />
                    <div className="relative ml-auto grid max-w-[15rem] gap-3">
                      {['Global camera', 'POV mode', 'Imagery layers'].map((item) => (
                        <div
                          key={item}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-space-dim backdrop-blur-sm transition-colors duration-300 group-hover:bg-white/10"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {pillar.id === 'conjunction' ? (
                  <div className="mt-8 grid gap-3 rounded-[1.75rem] border border-white/10 bg-[#08111c]/90 p-4 transition-colors duration-300 group-hover:bg-[#0b1521]">
                    {[
                      { pair: 'STARLINK-1842 / CZ-4B DEB', miss: '2.1 km', time: 'T-18m' },
                      { pair: 'ISS / PROGRESS MS', miss: '5.6 km', time: 'T-42m' },
                      { pair: 'COSMOS / FREGAT DEB', miss: '8.4 km', time: 'T-71m' },
                    ].map((item) => (
                      <div
                        key={item.pair}
                        className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition-colors duration-300 group-hover:bg-white/10"
                      >
                        <span className="text-sm text-white">{item.pair}</span>
                        <span className="text-xs font-semibold text-space-accent">{item.miss}</span>
                        <span className="text-xs text-space-dim">{item.time}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {pillar.id === 'time' ? (
                  <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-[#08111c]/90 p-5 transition-colors duration-300 group-hover:bg-[#0b1521]">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-space-dim">
                      <span>Timeline scrubber</span>
                      <span className="text-space-accent">+240x</span>
                    </div>
                    <div className="relative mt-5 h-16 rounded-2xl bg-white/5">
                      <div className="absolute inset-y-0 left-[12%] w-px bg-white/10" />
                      <div className="absolute inset-y-0 left-[36%] w-px bg-white/10" />
                      <div className="absolute inset-y-0 left-[62%] w-px bg-white/10" />
                      <div className="absolute inset-y-0 left-[84%] w-px bg-white/10" />
                      <div className="absolute left-[18%] top-1/2 h-8 w-[58%] -translate-y-1/2 rounded-full bg-gradient-to-r from-[#4d96e8]/35 via-[#8ed8ff]/55 to-[#4d96e8]/15" />
                      <div className="feature-float absolute left-[70%] top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border border-space-accent/40 bg-[#09131d] shadow-[0_0_28px_rgba(142,216,255,0.32)]" />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-space-dim">
                      <span>Past event</span>
                      <span>Live</span>
                      <span>Projected approach</span>
                    </div>
                  </div>
                ) : null}

                {pillar.id === 'private' ? (
                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    {[
                      { value: 'Web Workers', label: 'propagate in parallel' },
                      { value: 'No sign-in', label: 'open and explore immediately' },
                      { value: 'Local state', label: 'session stays on your machine' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[1.5rem] border border-white/10 bg-[#08111c]/90 p-5 transition-colors duration-300 group-hover:bg-[#0b1521]"
                      >
                        <div className="text-lg font-semibold text-white">{item.value}</div>
                        <p className="mt-2 text-sm leading-relaxed text-space-dim">{item.label}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
            Workflow
          </p>
          <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">
            From scan to decision in four moves.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-space-dim">
            The tracker works best when the interface matches the way people actually investigate an
            orbiting object. This section turns the feature list into a usable sequence.
          </p>
        </div>

        <div className="relative mt-14">
          <div className="absolute left-[12.5%] right-[12.5%] top-10 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent lg:block" />
          <div className="grid gap-5 lg:grid-cols-4">
            {FLOW_STEPS.map((item) => (
              <div
                key={item.step}
                className={`group relative rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm ${CARD_HOVER}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-space-accent">
                    {item.step}
                  </span>
                  <div className="feature-float flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-space-accent transition-transform duration-300 group-hover:scale-110">
                    <item.icon size={18} />
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-space-dim">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(9,18,29,0.96)_58%,rgba(77,150,232,0.08))] p-6 backdrop-blur-xl md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
              Inside The Tab
            </p>
            <h2 className="mt-4 text-3xl font-bold text-white">
              The supporting surfaces that make the main globe useful.
            </h2>
            <div className="mt-8 grid gap-4">
              {SURFACES.map((item, index) => (
                <div
                  key={item.title}
                  className={`group grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 md:grid-cols-[auto_1fr_auto] ${CARD_HOVER}`}
                >
                  <div className="feature-float flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-space-accent transition-transform duration-300 group-hover:scale-110">
                    <item.icon size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-space-dim">{item.desc}</p>
                  </div>
                  <div className="flex items-center">
                    <div className="h-1.5 w-20 rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff]"
                        style={{ width: `${58 + index * 8}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(77,150,232,0.16),rgba(8,15,25,0.96)_64%)] p-6 backdrop-blur-xl md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
                Overlay Stack
              </p>
              <h3 className="mt-4 text-2xl font-semibold text-white">
                Context layers that you can actually toggle without clutter.
              </h3>
              <div className="mt-6 flex flex-wrap gap-3">
                {STACK_MODULES.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-space-dim transition-colors hover:border-space-accent/30 hover:text-white"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
                Extra Tools
              </p>
              <div className="mt-6 grid gap-4">
                {EXTRA_TOOLS.map((item) => (
                  <div
                    key={item.title}
                    className={`group rounded-[1.5rem] border border-white/10 bg-[#08111c]/85 p-4 ${CARD_HOVER}`}
                  >
                    <div className="flex items-center gap-3 text-white">
                      <item.icon
                        size={18}
                        className="text-space-accent transition-transform duration-300 group-hover:scale-110"
                      />
                      <h3 className="text-base font-semibold">{item.title}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-space-dim">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(77,150,232,0.18),rgba(8,15,25,0.94)_55%,rgba(142,216,255,0.12))] p-10 text-center shadow-[0_30px_90px_rgba(0,0,0,0.3)] backdrop-blur-xl md:p-14">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
            Start Exploring
          </p>
          <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
            Open the tracker and see the page become the product.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-space-dim">
            No account needed. No downloads. The fastest way to understand SpaceMap is still to put
            the globe in front of you and start moving through orbit.
          </p>
          <Link
            to="/tracker"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff] px-10 py-4 text-base font-semibold text-[#06101a] transition-all hover:scale-105 hover:shadow-xl hover:shadow-[#4d96e8]/30"
          >
            <Zap size={18} />
            Launch Tracker
          </Link>
        </div>
      </section>
    </div>
  );
}
