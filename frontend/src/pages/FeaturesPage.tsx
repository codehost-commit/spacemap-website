import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Camera,
  Clock,
  Layers,
  MapPin,
  Radio,
  Rocket,
  Search,
  Shield,
  Zap,
} from 'lucide-react';
import { FeatureLiveShowcase } from '../components/FeatureLiveShowcase.js';
import {
  formatLaunchCountdown,
  getLaunchTone,
  useUpcomingLaunches,
} from '../hooks/useUpcomingLaunches.js';

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
            <h1 className="max-w-4xl text-4xl font-bold leading-tight text-white md:text-6xl">
              Real product modules, not filler orbit art.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-space-dim">
              The features page now shows what SpaceMap actually does: live ISS video, ranked
              conjunction risk, nearby-object leaderboards, launch countdowns, and alerts that feel
              connected to the tracker instead of bolted on beside it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs font-medium text-space-dim">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm transition-colors hover:border-space-accent/30 hover:text-white">
                Same data lanes as the tracker
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm transition-colors hover:border-space-accent/30 hover:text-white">
                Live collision probability
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm transition-colors hover:border-space-accent/30 hover:text-white">
                Location-aware and launch-aware
              </span>
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
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    The page behaves like a live preview of the tracker.
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
          <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">
            The strongest parts of the product now show up here as actual working panels.
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
          <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">
            The page now mirrors how SpaceMap is actually used.
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
            <h2 className="mt-4 text-3xl font-bold text-white">
              The surrounding surfaces still matter and now make more sense beside the live cards.
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

      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(77,150,232,0.18),rgba(8,15,25,0.94)_55%,rgba(142,216,255,0.12))] p-10 text-center shadow-[0_30px_90px_rgba(0,0,0,0.3)] backdrop-blur-xl md:p-14">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
            Start Exploring
          </p>
          <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
            Open the tracker and carry the same live surfaces into the full globe.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-space-dim">
            No account needed. No downloads. The feature page now previews the product honestly, and
            the tracker is still where the full mission-control view opens up.
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
