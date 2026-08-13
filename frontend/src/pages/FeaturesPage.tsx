import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Camera,
  Check,
  Clock,
  Layers,
  MapPin,
  Minus,
  Radio,
  Rocket,
  Search,
  Shield,
  X,
  Zap,
} from 'lucide-react';
import { FeatureLiveShowcase } from '../components/FeatureLiveShowcase.js';
import {
  formatLaunchCountdown,
  getLaunchTone,
  useUpcomingLaunches,
} from '../hooks/useUpcomingLaunches.js';
import { SystemPill } from '../components/SystemPill.js';

function AccentWord({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`spacemap-heading-accent ${className}`.trim()}>{children}</span>;
}

const BASE_HERO_METRICS = [
  { value: 'Live', label: 'ISS video embedded in-page', valueClass: 'text-white' },
  { value: '0.1s', label: 'risk board display tick', valueClass: 'text-white' },
  { value: 'Miles', label: 'location-aware proximity ranking', valueClass: 'text-white' },
];

const WORKFLOW = [
  {
    icon: Search,
    step: '01',
    title: 'Find what matters first',
    desc: 'Search, filters, and the live catalog narrow 30,000+ objects down into something readable fast.',
  },
  {
    icon: Activity,
    step: '02',
    title: 'Watch the highest-risk pairs',
    desc: 'Conjunctions rank by actual collision probability, with miss distance and TCA always in view.',
  },
  {
    icon: MapPin,
    step: '03',
    title: 'Bring it down to your sky',
    desc: 'Location-aware ranking translates the global scene into the objects nearest to you right now.',
  },
  {
    icon: Rocket,
    step: '04',
    title: 'Stay ahead of what is next',
    desc: 'Launch countdowns, ISS live video, and alerts keep the whole product feeling active, not archived.',
  },
];

const SUPPORT_SYSTEMS = [
  {
    icon: Layers,
    title: 'Overlay stack',
    desc: 'Density, day-night, grids, borders, cities, and ground sites layer in without burying the scene.',
  },
  {
    icon: Clock,
    title: 'Timeline control',
    desc: 'Past, live, and projected geometry stay scrubbable, so you can move through orbit instead of waiting on it.',
  },
  {
    icon: Radio,
    title: 'Alert surface',
    desc: 'Browser alerts can be armed for conjunctions and nearby passes, matching the monitoring feel of the tracker.',
  },
  {
    icon: Shield,
    title: 'Private local compute',
    desc: 'Propagation stays in-browser, which keeps the experience responsive and avoids shipping your session away.',
  },
];

const PROOF_POINTS = [
  { icon: Activity, label: 'Collision probability', value: 'Collision %, miss, and TCA' },
  { icon: Camera, label: 'Live station feed', value: 'ISS video plus orbit data' },
  { icon: MapPin, label: 'Local ranking', value: 'Nearest objects in miles' },
  { icon: Rocket, label: 'Launch timeline', value: 'Next three countdowns' },
];

const CARD_HOVER =
  'transition-all duration-300 hover:-translate-y-1 hover:border-space-accent/30 hover:shadow-[0_18px_45px_rgba(77,150,232,0.12)]';

export function FeaturesPage() {
  const launchFeed = useUpcomingLaunches();

  return (
    <div className="relative overflow-hidden pt-24">
      <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(77,150,232,0.18),transparent_62%)]" />
      <div className="absolute right-[-9rem] top-[18rem] h-80 w-80 rounded-full bg-[#8ed8ff]/10 blur-3xl" />
      <div className="absolute left-[-8rem] top-[50rem] h-80 w-80 rounded-full bg-[#4d96e8]/10 blur-3xl" />

      <section className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-center">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-space-accent">
              Live Feature Surface
            </p>
            <h1 className="spacemap-heading-display max-w-4xl text-4xl text-white md:text-6xl">
              Real product <AccentWord className="text-space-accent">modules</AccentWord>, not filler orbit art.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-space-dim">
              The features page now shows what SpaceMap actually does: live ISS video, ranked
              conjunction risk, nearby-object leaderboards, launch countdowns, and alerts that feel
              connected to the tracker instead of bolted on beside it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <SystemPill tone="neutral" icon={Layers}>
                Same data lanes as the tracker
              </SystemPill>
              <SystemPill tone="accent" icon={Activity}>
                Live collision probability
              </SystemPill>
              <SystemPill tone="neutral" icon={MapPin}>
                Location-aware and launch-aware
              </SystemPill>
            </div>
          </div>

          <div
            className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.08),rgba(8,15,25,0.96)_58%,rgba(77,150,232,0.16))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl md:p-8 ${CARD_HOVER}`}
          >
            <div className="absolute right-[-3rem] top-[-2rem] h-28 w-28 rounded-full bg-[#8ed8ff]/12 blur-3xl" />
            <div className="absolute bottom-[-2rem] left-[-2rem] h-28 w-28 rounded-full bg-[#ff6b6b]/8 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
                    Mission Deck
                  </p>
                  <h2 className="spacemap-heading-display mt-3 text-2xl text-white">
                    The page behaves like a live preview of the <AccentWord className="text-space-accent">tracker</AccentWord>.
                  </h2>
                </div>
                <div className="feature-float flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-space-accent">
                  <Camera size={24} className="scale-x-125" />
                </div>
              </div>

              <div className="mt-8 grid gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-sm text-white">
                    <span>Live feature feed</span>
                    <span className="text-emerald-300">Synced</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/5">
                    <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff]" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3 text-space-accent">
                      <Radio size={16} />
                      <span className="text-xs font-semibold uppercase tracking-[0.24em]">
                        Alerts
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-space-dim">
                      Conjunction and nearby-object warnings can be armed from the page instead of
                      hidden in the tracker chrome.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3 text-space-accent">
                      <Rocket size={16} />
                      <span className="text-xs font-semibold uppercase tracking-[0.24em]">
                        Launch feed
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-space-dim">
                      Upcoming launches stay on deck with T-minus timing so the page always feels in
                      motion.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#08111c]/90 p-5">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-space-dim">
                  <span>What changed</span>
                  <span className="text-space-accent">Live now</span>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-space-dim">
                  {[
                    'ISS cam is embedded directly from the tracker source.',
                    'Collision board ranks by probability with percentages expanded out.',
                    'Location permission unlocks the nearest-to-you leaderboard in miles.',
                    'Launches show the next three countdowns from the existing launch list.',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-space-accent" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <FeatureMetrics launchFeed={launchFeed} />
      </section>

      <section className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
            Live Modules
          </p>
          <h2 className="spacemap-heading-display mt-4 text-3xl text-white md:text-5xl">
            The strongest parts of the product now show up here as actual working <AccentWord className="text-space-accent">panels</AccentWord>.
          </h2>
          <p className="mt-4 text-space-dim">
            Instead of repeating the same box pattern with abstract visuals, this section exposes the
            things people actually care about when they land on SpaceMap.
          </p>
        </div>

        <FeatureLiveShowcase launchFeed={launchFeed} />
      </section>

      <section className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
            Workflow
          </p>
          <h2 className="spacemap-heading-display mt-4 text-3xl text-white md:text-5xl">
            The page now mirrors how <AccentWord className="text-space-accent">SpaceMap</AccentWord> is actually used.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-space-dim">
            Search, rank, localize, and track what comes next. The features page should feel like a
            clear walk through the product instead of a collage of generic cards.
          </p>
        </div>

        <div className="relative mt-14">
          <div className="absolute left-[12.5%] right-[12.5%] top-10 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent lg:block" />
          <div className="grid gap-5 lg:grid-cols-4">
            {WORKFLOW.map((item) => (
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)]">
          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(9,18,29,0.96)_58%,rgba(77,150,232,0.08))] p-6 backdrop-blur-xl md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
              Support Systems
            </p>
            <h2 className="spacemap-heading-display mt-4 text-3xl text-white">
              The surrounding surfaces still matter and now make more sense beside the live <AccentWord className="text-space-accent">cards</AccentWord>.
            </h2>
            <div className="mt-8 grid gap-4">
              {SUPPORT_SYSTEMS.map((item) => (
                <div
                  key={item.title}
                  className={`group grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 md:grid-cols-[auto_1fr] ${CARD_HOVER}`}
                >
                  <div className="feature-float flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-space-accent transition-transform duration-300 group-hover:scale-110">
                    <item.icon size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-space-dim">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`group relative flex min-h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(142,216,255,0.12),rgba(8,15,25,0.96)_54%,rgba(242,109,125,0.08))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl md:p-8 ${CARD_HOVER}`}>
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-space-accent/60 to-transparent" />
            <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
              Live Proof
            </p>
            <h3 className="mt-4 text-2xl font-semibold leading-tight text-white">
              Four working surfaces that make the tracker feel worth opening.
            </h3>
            <div className="mt-8 grid gap-3">
              {PROOF_POINTS.map((item) => (
                <div
                  key={item.label}
                  className="group/item grid grid-cols-[auto_1fr] items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:bg-white/10"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-space-accent transition-transform group-hover/item:scale-105">
                    <item.icon size={19} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{item.label}</div>
                    <div className="mt-1 truncate text-sm text-space-dim">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-6">
              <div className="rounded-[1.5rem] border border-white/10 bg-[#08111c]/85 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
                <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-space-dim">
                  <span>Preview path</span>
                  <span className="text-space-accent">Features &gt; Tracker</span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {['See it', 'Trust it', 'Open it'].map((step, index) => (
                    <div key={step} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center">
                      <div className="text-sm font-semibold text-white">0{index + 1}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-space-dim">
                        {step}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ComparisonSection />

    </div>
  );
}

function FeatureMetrics({ launchFeed }: { launchFeed: ReturnType<typeof useUpcomingLaunches> }) {
  const [clockMs, setClockMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setClockMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const nextLaunch = launchFeed.launches?.find(
    (launch) => new Date(launch.net).getTime() >= clockMs - 60_000,
  );
  const launchDeltaMs = nextLaunch ? new Date(nextLaunch.net).getTime() - clockMs : null;
  const launchTone = launchDeltaMs == null ? null : getLaunchTone(launchDeltaMs);
  const metrics = [
    ...BASE_HERO_METRICS,
    {
      value:
        launchDeltaMs == null
          ? launchFeed.error
            ? 'TBD'
            : 'T-'
          : formatLaunchCountdown(launchDeltaMs),
      label: nextLaunch
        ? nextLaunch.name
        : launchFeed.error
          ? 'launch feed retrying'
          : 'loading next launch',
      valueClass: launchTone?.textClass ?? 'text-white',
    },
  ];

  return (
    <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={`rounded-2xl border border-white/10 bg-white/5 px-5 py-6 backdrop-blur-sm ${CARD_HOVER}`}
        >
          <div className={`truncate text-3xl font-bold ${metric.valueClass ?? 'text-white'}`}>
            {metric.value}
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-space-dim">{metric.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Comparison section ────────────────────────────────────────────────────

type CellState = 'yes' | 'no' | 'partial' | string;

interface CompetitorRow {
  feature: string;
  spacemap: CellState;
  n2yo: CellState;
  heavensAbove: CellState;
  stuffInSpace: CellState;
}

const COMPARISON_ROWS: CompetitorRow[] = [
  { feature: 'Free, no account required', spacemap: 'yes', n2yo: 'partial', heavensAbove: 'yes', stuffInSpace: 'yes' },
  { feature: 'Fully 3D interactive globe', spacemap: 'yes', n2yo: 'no', heavensAbove: 'no', stuffInSpace: 'yes' },
  { feature: 'Tracks 30,000+ objects', spacemap: 'yes', n2yo: 'partial', heavensAbove: 'no', stuffInSpace: 'partial' },
  { feature: 'Includes debris + rocket bodies', spacemap: 'yes', n2yo: 'partial', heavensAbove: 'no', stuffInSpace: 'partial' },
  { feature: '100% client-side propagation', spacemap: 'yes', n2yo: 'no', heavensAbove: 'no', stuffInSpace: 'yes' },
  { feature: 'No data leaves your device', spacemap: 'yes', n2yo: 'no', heavensAbove: 'no', stuffInSpace: 'yes' },
  { feature: 'Real-time conjunction analysis', spacemap: 'yes', n2yo: 'no', heavensAbove: 'no', stuffInSpace: 'no' },
  { feature: 'Live ISS HD camera embedded', spacemap: 'yes', n2yo: 'no', heavensAbove: 'no', stuffInSpace: 'no' },
  { feature: 'Time travel (past + future)', spacemap: 'yes', n2yo: 'partial', heavensAbove: 'partial', stuffInSpace: 'yes' },
  { feature: 'Local sky view + pass predictions', spacemap: 'yes', n2yo: 'yes', heavensAbove: 'yes', stuffInSpace: 'no' },
  { feature: 'POV camera (ride-along)', spacemap: 'yes', n2yo: 'no', heavensAbove: 'no', stuffInSpace: 'no' },
  { feature: 'Ground stations + launch sites', spacemap: 'yes', n2yo: 'no', heavensAbove: 'no', stuffInSpace: 'no' },
  { feature: '3D glTF spacecraft models', spacemap: 'yes', n2yo: 'no', heavensAbove: 'no', stuffInSpace: 'no' },
  { feature: 'Modern responsive UI', spacemap: 'yes', n2yo: 'no', heavensAbove: 'no', stuffInSpace: 'partial' },
  { feature: 'Open source / inspectable', spacemap: 'yes', n2yo: 'no', heavensAbove: 'no', stuffInSpace: 'yes' },
];

function ComparisonCell({ state }: { state: CellState }) {
  if (state === 'yes') {
    return (
      <div className="flex items-center justify-center">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4d96e8]/25 text-[#8ed8ff]">
          <Check size={16} />
        </div>
      </div>
    );
  }
  if (state === 'partial') {
    return (
      <div className="flex items-center justify-center">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffd166]/20 text-[#ffd166]">
          <Minus size={16} />
        </div>
      </div>
    );
  }
  if (state === 'no') {
    return (
      <div className="flex items-center justify-center">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-space-dim">
          <X size={16} />
        </div>
      </div>
    );
  }
  return (
    <div className="text-center text-xs font-mono text-space-dim">{state}</div>
  );
}

function ComparisonSection() {
  return (
    <section id="compare" className="scroll-mt-32 relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
            How SpaceMap compares
          </p>
          <h2 className="spacemap-heading-display mt-3 text-3xl text-white md:text-5xl">
            Every other satellite <AccentWord className="text-space-accent">tracker</AccentWord>,{' '}
            <span className="bg-gradient-to-r from-[#8ed8ff] to-[#4d96e8] bg-clip-text text-transparent">
              side by side.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-space-dim">
            Honest column view of what SpaceMap ships versus the tools most people compare it to.
            Green check = full support. Yellow bar = partial. Blank = not available.
          </p>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-sm md:block">
          {/* Header row */}
          <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] border-b border-white/10 bg-[linear-gradient(120deg,rgba(77,150,232,0.14),rgba(8,15,25,0.6))]">
            <div className="p-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-space-dim">
              Feature
            </div>
            <div className="p-5 text-center">
              <div className="text-sm font-bold text-white">SpaceMap</div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-space-accent">
                spacemap.earth
              </div>
            </div>
            <div className="p-5 text-center">
              <div className="text-sm font-bold text-white">N2YO</div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-space-dim">
                n2yo.com
              </div>
            </div>
            <div className="p-5 text-center">
              <div className="text-sm font-bold text-white">Heavens-Above</div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-space-dim">
                heavens-above.com
              </div>
            </div>
            <div className="p-5 text-center">
              <div className="text-sm font-bold text-white">Stuff-in-Space</div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-space-dim">
                stuffin.space
              </div>
            </div>
          </div>

          {COMPARISON_ROWS.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] items-center border-b border-white/5 last:border-b-0 ${
                i % 2 === 0 ? 'bg-white/[0.02]' : ''
              }`}
            >
              <div className="p-4 text-sm text-white">{row.feature}</div>
              <div className="p-4">
                <ComparisonCell state={row.spacemap} />
              </div>
              <div className="p-4">
                <ComparisonCell state={row.n2yo} />
              </div>
              <div className="p-4">
                <ComparisonCell state={row.heavensAbove} />
              </div>
              <div className="p-4">
                <ComparisonCell state={row.stuffInSpace} />
              </div>
            </div>
          ))}
        </div>

        {/* Mobile stacked cards */}
        <div className="space-y-6 md:hidden">
          {[
            { name: 'SpaceMap', domain: 'spacemap.earth', key: 'spacemap' as const, accent: true },
            { name: 'N2YO', domain: 'n2yo.com', key: 'n2yo' as const, accent: false },
            {
              name: 'Heavens-Above',
              domain: 'heavens-above.com',
              key: 'heavensAbove' as const,
              accent: false,
            },
            {
              name: 'Stuff-in-Space',
              domain: 'stuffin.space',
              key: 'stuffInSpace' as const,
              accent: false,
            },
          ].map((col) => (
            <div
              key={col.name}
              className={`rounded-2xl border p-5 backdrop-blur-sm ${
                col.accent
                  ? 'border-[#4d96e8]/30 bg-[linear-gradient(140deg,rgba(77,150,232,0.16),rgba(8,15,25,0.9))]'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="mb-4 flex items-baseline justify-between">
                <div className="text-lg font-bold text-white">{col.name}</div>
                <div className="text-[10px] uppercase tracking-widest text-space-dim">
                  {col.domain}
                </div>
              </div>
              <div className="space-y-2">
                {COMPARISON_ROWS.map((row) => (
                  <div
                    key={row.feature}
                    className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-b-0"
                  >
                    <span className="text-sm text-space-dim">{row.feature}</span>
                    <ComparisonCell state={row[col.key]} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs text-space-dim">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4d96e8]/25 text-[#8ed8ff]">
              <Check size={14} />
            </div>
            <span>Full support</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ffd166]/20 text-[#ffd166]">
              <Minus size={14} />
            </div>
            <span>Partial or with limits</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-space-dim">
              <X size={14} />
            </div>
            <span>Not available</span>
          </div>
        </div>
      </div>
    </section>
  );
}
