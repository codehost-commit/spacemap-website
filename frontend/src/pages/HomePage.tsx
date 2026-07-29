import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeroGlobe } from '../components/HeroGlobe.js';
import {
  Activity,
  ArrowRight,
  Camera,
  Eye,
  Globe,
  MapPin,
  Radio,
  Satellite,
  Search,
  Shield,
  Zap,
} from 'lucide-react';
import emblemSrc from '../assets/brand-emblem.png';
import {
  formatLaunchCountdown,
  getLaunchTone,
  useUpcomingLaunches,
} from '../hooks/useUpcomingLaunches.js';

const FEATURE_SUPPORT = [
  {
    icon: Globe,
    title: '3D scene control',
    desc: 'Fly, rotate, scrub, and layer the globe without leaving the same browser surface.',
  },
  {
    icon: Satellite,
    title: 'Deep live catalog',
    desc: 'LEO, MEO, GEO, HEO, polar, and debris all stay visible instead of being flattened into a demo subset.',
  },
  {
    icon: Search,
    title: 'Fast object search',
    desc: 'Name, NORAD ID, and designator lookup narrow the sky down fast when you already know what you want.',
  },
  {
    icon: Shield,
    title: 'Private local compute',
    desc: 'Propagation stays client-side, so the responsive feel comes without handing your session off to a server.',
  },
];

const STATS = [
  { value: '30,000+', label: 'Tracked objects' },
  { value: '<1s', label: 'Refresh interval' },
  { value: '100%', label: 'Client-side' },
  { value: '0', label: 'Data uploaded' },
];

export function HomePage() {
  const launchFeed = useUpcomingLaunches();
  const [clockMs, setClockMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setClockMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const nextLaunch = launchFeed.launches?.[0] ?? null;
  const nextLaunchDeltaMs = nextLaunch ? new Date(nextLaunch.net).getTime() - clockMs : null;
  const nextLaunchTone = nextLaunchDeltaMs == null ? null : getLaunchTone(nextLaunchDeltaMs);

  return (
    <div className="relative">
      {/* Hero Section — Globe spans FULL section behind text */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
        {/* Full-bleed globe background */}
        <div className="absolute inset-0 z-0">
          <HeroGlobe className="w-full h-full" />
        </div>

        {/* Content overlay */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: text */}
          <div className="text-center lg:text-left">
            <div className="mb-8 flex justify-center lg:justify-start">
              <img
                src={emblemSrc}
                alt="SpaceMap"
                className="h-20 w-20 drop-shadow-2xl"
                draggable={false}
              />
            </div>
            <h1 className="text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl drop-shadow-lg">
              See everything
              <br />
              <span className="bg-gradient-to-r from-[#8ed8ff] to-[#4d96e8] bg-clip-text text-transparent">
                above Earth.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/80 md:text-xl drop-shadow-md">
              Real-time orbital tracking for every satellite, piece of debris, and spacecraft,
              rendered on a 3D globe and powered entirely by your browser.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start sm:justify-center">
              <Link
                to="/tracker"
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff] px-8 py-4 text-base font-semibold text-[#06101a] transition-all hover:shadow-xl hover:shadow-[#4d96e8]/30 hover:scale-105"
              >
                <Zap size={18} />
                Launch Tracker
              </Link>
              <Link
                to="/about"
                className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm px-8 py-4 text-base font-medium text-white transition-all hover:bg-white/10"
              >
                <Eye size={18} />
                Learn More
              </Link>
            </div>
          </div>

          {/* Right: empty space — globe continues underneath */}
          <div className="hidden lg:block" />
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10">
          <div className="h-8 w-5 rounded-full border-2 border-white/30 flex items-start justify-center pt-1.5">
            <div className="h-2 w-1 rounded-full bg-white/50" />
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 border-y border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-space-accent md:text-4xl">{stat.value}</div>
              <div className="mt-1 text-sm text-space-dim">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid - top 6 */}
      <section id="features" className="relative z-10 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-space-accent">
              Features
            </p>
            <h2 className="text-3xl font-bold text-white md:text-5xl">
              A cleaner preview of what SpaceMap actually gives you
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-space-dim">
              Track live satellites and debris, monitor close approaches, watch the ISS camera,
              rank what is nearest to you, and stay ahead of upcoming launches from one browser-based
              orbital map.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(165deg,rgba(255,255,255,0.08),rgba(8,15,25,0.97)_58%,rgba(77,150,232,0.14))] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-space-accent/30 hover:shadow-[0_28px_75px_rgba(77,150,232,0.14)] md:p-8">
              <div className="absolute right-[-4rem] top-[-3rem] h-32 w-32 rounded-full bg-[#8ed8ff]/12 blur-3xl" />
              <div className="absolute bottom-[-3rem] left-[-2rem] h-28 w-28 rounded-full bg-[#ff6b6b]/10 blur-3xl" />

              <div className="relative">
                <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
                      Mission Surface
                    </p>
                    <h3 className="mt-4 max-w-2xl text-2xl font-semibold leading-tight text-white md:text-3xl">
                      The strongest product moments are visible here before you ever open the full
                      feature stack.
                    </h3>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-space-dim">
                      Real tracker behavior, compressed into one landing-page card so visitors can
                      feel the product instead of reading six copies of the same pitch.
                    </p>
                  </div>

                  <div className="hidden grid-cols-[4rem_9rem] gap-3 md:grid">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-white/10 bg-white/10 text-space-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      <Activity size={24} />
                    </div>
                    <div className="flex h-16 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-center text-[10px] font-semibold uppercase leading-[1.45] tracking-[0.22em] text-space-dim shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <span>Live tracker preview</span>
                    </div>
                  </div>
                </div>

                <div className="mt-7 grid gap-4 md:grid-cols-3">
                  {[
                    {
                      icon: Activity,
                      title: 'Collision watch',
                      desc: 'Probability-led ranking replaces abstract risk art.',
                    },
                    {
                      icon: Camera,
                      title: 'ISS camera',
                      desc: 'Live station video sits in the same experience.',
                    },
                    {
                      icon: MapPin,
                      title: 'Closest to you',
                      desc: 'Local sky ranking translates orbit into miles.',
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-space-accent">
                        <item.icon size={18} />
                      </div>
                      <h4 className="mt-4 text-sm font-semibold text-white">{item.title}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-space-dim">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-[#09131f]/88 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-space-dim">
                        Launch lane
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {nextLaunch?.name ?? 'Upcoming launches stay synced to the tracker feed'}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-space-dim">
                        {launchFeed.loading ? 'Loading' : 'Shared feed'}
                      </span>
                      {nextLaunchTone && (
                        <span
                          className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] ${nextLaunchTone.dotClass}`}
                        >
                          {nextLaunchTone.label}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-space-dim">
                        {nextLaunch?.rocket?.configuration?.full_name ??
                          nextLaunch?.rocket?.configuration?.name ??
                          'Launch vehicle details sync in from the live list'}
                      </div>
                      <div className="mt-1 truncate text-xs uppercase tracking-[0.24em] text-space-dim">
                        {nextLaunch?.pad?.location?.name ??
                          nextLaunch?.pad?.name ??
                          launchFeed.error ??
                          'Countdown and launch metadata appear here'}
                      </div>
                    </div>
                    <div className="text-2xl font-semibold text-white">
                      {nextLaunchDeltaMs == null ? 'T-' : formatLaunchCountdown(nextLaunchDeltaMs)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-space-dim">
                      <Radio size={14} className={nextLaunchTone?.textClass ?? 'text-space-accent'} />
                      <span>{launchFeed.error ? 'Retrying quietly' : 'Tracker-linked'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              {FEATURE_SUPPORT.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-space-accent/30 hover:bg-white/10 hover:shadow-[0_18px_45px_rgba(77,150,232,0.12)]"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#4d96e8]/20 to-[#8ed8ff]/20 text-space-accent transition-transform duration-300 group-hover:scale-110">
                    <f.icon size={22} />
                  </div>
                  <h3 className="text-base font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-space-dim">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-base font-medium text-white transition-all hover:bg-white/10 hover:border-space-accent/30"
            >
              View All Features
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#4d96e8]/10 to-[#8ed8ff]/5 p-12 backdrop-blur-sm md:p-16">
            <h2 className="text-3xl font-bold text-white md:text-4xl">Ready to explore orbit?</h2>
            <p className="mx-auto mt-4 max-w-lg text-space-dim">
              No account needed. No downloads. Just open the tracker and start exploring.
            </p>
            <Link
              to="/tracker"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff] px-10 py-4 text-base font-semibold text-[#06101a] transition-all hover:shadow-xl hover:shadow-[#4d96e8]/30 hover:scale-105"
            >
              <Globe size={18} />
              Open SpaceMap
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
