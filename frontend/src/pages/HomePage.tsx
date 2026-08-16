import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Camera,
  Eye,
  Satellite,
  Search,
  Zap,
} from 'lucide-react';
import emblemSrc from '../assets/brand-emblem.png';

const ISS_LIVE_EMBED = 'https://www.youtube.com/embed/awQzjn72bI0?autoplay=1&mute=1&controls=0';
const HERO_VIDEO_MP4_SRC = `${import.meta.env.BASE_URL || '/'}brand/HeroVideo.mp4`;
const HERO_VIDEO_2_MP4_SRC = `${import.meta.env.BASE_URL || '/'}brand/HeroVideo2.mp4`;
const HERO_SLIDE_INTERVAL_MS = 8000;
const GAME_LAUNCH_TARGET_MS = new Date('2026-08-21T16:30:00-05:00').getTime();
const GAME_NAME = 'Orbital';

function HeroVideoBackground({
  src = HERO_VIDEO_MP4_SRC,
  overlayClassName = 'bg-[#07131f]/56',
  topGradientClassName = 'bg-[#06101a]/30',
  bottomGradientClassName = 'bg-[#06101a]/72',
  active = true,
  restartOnActivate = false,
}: {
  src?: string;
  overlayClassName?: string;
  topGradientClassName?: string;
  bottomGradientClassName?: string;
  active?: boolean;
  restartOnActivate?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loopTimerRef = useRef<number | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const previousActiveRef = useRef(active);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const wasActive = previousActiveRef.current;
    previousActiveRef.current = active;
    if (!restartOnActivate || !active || wasActive) return;
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play();
  }, [active, restartOnActivate]);

  useEffect(() => {
    return () => {
      if (loopTimerRef.current != null) window.clearTimeout(loopTimerRef.current);
      if (revealTimerRef.current != null) window.clearTimeout(revealTimerRef.current);
    };
  }, []);

  const handleEnded = () => {
    setIsFading(true);
    loopTimerRef.current = window.setTimeout(() => {
      const video = videoRef.current;
      if (video) {
        video.currentTime = 0;
        void video.play();
      }
      revealTimerRef.current = window.setTimeout(() => setIsFading(false), 100);
    }, 700);
  };

  return (
    <div className="absolute inset-0 bg-black" aria-hidden="true">
      <video
        ref={videoRef}
        className={`h-full w-full object-cover transition-opacity duration-700 ease-in-out ${
          isFading ? 'opacity-0' : 'opacity-100'
        }`}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={handleEnded}
      >
        <source src={src} type="video/mp4" />
      </video>
      <div className={`absolute inset-0 ${overlayClassName}`} />
      <div className="absolute inset-x-0 bottom-[-3.5rem] h-32 bg-[#06101a] blur-3xl" />
      <div className={`absolute inset-x-0 bottom-0 h-40 ${bottomGradientClassName}`} />
      <div className={`absolute inset-x-0 top-0 h-32 ${topGradientClassName}`} />
    </div>
  );
}

function AccentWord({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`spacemap-heading-accent ${className}`.trim()}>
      {children}
    </span>
  );
}

function HeroSlideShell({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute inset-0 transition-all duration-1000 ease-out ${
        active ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      {children}
    </div>
  );
}

function HeroActions() {
  return (
    <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
      <Link
        to="/tracker/"
        className="flex items-center gap-2 rounded-lg bg-[#8ed8ff] px-8 py-4 text-base font-semibold text-[#06101a] transition-colors hover:bg-[#b6e8ff]"
      >
        <Zap size={18} />
        Open tracker
      </Link>
      <Link
        to="/about"
        className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-8 py-4 text-base font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10"
      >
        <Eye size={18} />
        About SpaceMap
      </Link>
    </div>
  );
}

function LaunchCountdown({ deltaMs }: { deltaMs: number }) {
  const clamped = Math.max(0, deltaMs);
  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const units = [
    { label: 'Days', value: days },
    { label: 'Hours', value: hours },
    { label: 'Minutes', value: minutes },
    { label: 'Seconds', value: seconds },
  ];

  return (
    <div className="mt-6">
      <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/65">
        Countdown to 4:30 PM CDT
      </div>
      <div className="mt-4 grid max-w-[30rem] grid-cols-4 gap-3">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="rounded-[1.15rem] border border-white/14 bg-white/[0.07] px-3 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm"
          >
            <div className="font-mono text-2xl font-semibold text-white md:text-[2rem]">
              {unit.value.toString().padStart(2, '0')}
            </div>
            <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/60">
              {unit.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroGameSlideBackground({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#070d18]" aria-hidden="true">
      <HeroVideoBackground
        src={HERO_VIDEO_2_MP4_SRC}
        overlayClassName="bg-[#090c18]/60"
        topGradientClassName="bg-[#090c18]/34"
        bottomGradientClassName="bg-[#06101a]/74"
        active={active}
        restartOnActivate
      />
      <div className="spacemap-grain absolute inset-0 opacity-30" />
    </div>
  );
}

const HOMEPAGE_FEATURES = [
  {
    icon: Satellite,
    title: 'Track',
    desc: 'Follow satellites, stations, debris, and orbital paths from one live globe.',
  },
  {
    icon: Search,
    title: 'Find',
    desc: 'Search by object name, NORAD ID, or designator when you know what you want.',
  },
  {
    icon: Activity,
    title: 'Understand',
    desc: 'Read altitude, velocity, orbit class, local passes, and close approaches in context.',
  },
  {
    icon: Camera,
    title: 'Watch',
    desc: 'Open the ISS live feed and launch information without leaving the tracker.',
  },
];

export function HomePage() {
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setClockMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(
      () => setHeroSlideIndex((current) => (current + 1) % 2),
      HERO_SLIDE_INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  const gameLaunchDeltaMs = GAME_LAUNCH_TARGET_MS - clockMs;

  return (
    <div className="relative">
      {/* Hero Section: video spans full section behind text */}
      <section className="site-dark-hero relative flex min-h-[82svh] items-center justify-center overflow-hidden pb-24 pt-20">
        <div
          className={`absolute inset-0 z-0 transition-opacity duration-1000 ${
            heroSlideIndex === 0 ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <HeroVideoBackground active={heroSlideIndex === 0} />
        </div>
        <div
          className={`absolute inset-0 z-0 transition-opacity duration-1000 ${
            heroSlideIndex === 1 ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <HeroGameSlideBackground active={heroSlideIndex === 1} />
        </div>

        {/* Content overlay */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
          <div className="min-w-0 max-w-[22rem] text-center sm:max-w-[40rem] lg:max-w-[46rem] lg:text-left">
            <div className="mb-8 flex justify-center lg:justify-start">
              <img
                data-home-hero-logo="true"
                src={emblemSrc}
                alt="SpaceMap"
                className="h-20 w-20 drop-shadow-2xl"
                draggable={false}
              />
            </div>
            <div className="relative min-h-[37rem] sm:min-h-[39rem] lg:min-h-[35rem]">
              <HeroSlideShell active={heroSlideIndex === 0}>
                <div className="max-w-[44rem]">
                  <h1 className="spacemap-hero-display max-w-full text-[3rem] leading-[0.87] tracking-[0.01em] text-white sm:text-[4.15rem] md:text-[5.45rem] drop-shadow-lg">
                    <span className="block">See what&apos;s</span>
                    <span className="block bg-gradient-to-r from-[#8ed8ff] to-[#4d96e8] bg-clip-text text-transparent">
                      orbiting Earth.
                    </span>
                  </h1>
                  <p className="mx-auto mt-6 max-w-full text-base text-white/80 drop-shadow-md md:max-w-xl md:text-xl lg:mx-0">
                    Track satellites, stations, debris, launches, and close approaches from one
                    browser-based globe.
                  </p>
                  <HeroActions />
                </div>
              </HeroSlideShell>

              <HeroSlideShell active={heroSlideIndex === 1}>
                <div className="max-w-[38rem]">
                  <div className="text-xs font-semibold uppercase tracking-[0.32em] text-[#c8efff]">
                    Flight game preview
                  </div>
                  <h2 className="spacemap-hero-display mt-4 text-[2.85rem] leading-[0.9] text-white sm:text-[4.2rem] md:text-[5rem]">
                    {GAME_NAME}.
                  </h2>
                  <p className="mt-5 max-w-[31rem] text-base leading-relaxed text-white/78 md:text-lg">
                    A mission-based flight game about timing burns, reaching stable orbits, and
                    navigating cleanly through the geometry of space.
                  </p>
                  <div className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-[#bfe7ff]">
                    Launching August 21, 2026
                  </div>
                  <LaunchCountdown deltaMs={gameLaunchDeltaMs} />
                  <HeroActions />
                </div>
              </HeroSlideShell>
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 right-6 z-10 flex gap-2">
          {[0, 1].map((slide) => (
            <button
              key={slide}
              type="button"
              aria-label={`Show hero slide ${slide + 1}`}
              onClick={() => setHeroSlideIndex(slide)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                heroSlideIndex === slide ? 'w-10 bg-white/85' : 'w-4 bg-white/30 hover:bg-white/45'
              }`}
            />
          ))}
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10">
          <div className="h-8 w-5 rounded-full border-2 border-white/30 flex items-start justify-center pt-1.5">
            <div className="h-2 w-1 rounded-full bg-white/50" />
          </div>
        </div>
      </section>

      <section className="site-dark-hero relative z-10 border-b border-white/10 bg-[#06101a] py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-space-accent">
              ISS live
            </p>
            <h2 className="spacemap-heading-display mt-3 text-3xl leading-tight text-white md:text-5xl">
              Watch the <AccentWord className="text-space-accent">ISS</AccentWord> while you track it.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-space-dim">
              The station feed sits inside the tracker beside orbit, telemetry, and timeline
              controls, so the video has context instead of floating on its own.
            </p>
          </div>

          <div className="overflow-hidden rounded-lg bg-black">
            <div className="aspect-video w-full">
              <iframe
                title="ISS live preview"
                src={ISS_LIVE_EMBED}
                className="h-full w-full"
                frameBorder={0}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-space-accent">
                What it does
              </p>
              <h2 className="spacemap-heading-display text-3xl leading-tight text-[#1f2a36] md:text-5xl">
                One map for the things moving <AccentWord className="text-space-accent">above Earth</AccentWord>
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#6d6a61]">
                SpaceMap brings tracking, search, telemetry, live video, and local visibility into
                the same browser view.
              </p>
              <Link
                to="/features"
                className="mt-8 inline-flex items-center gap-2 font-semibold text-space-accent transition-colors hover:text-[#1f2a36]"
              >
                View features
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="divide-y divide-[#d8d2c8] border-y border-[#d8d2c8]">
              {HOMEPAGE_FEATURES.map((feature) => (
                <div key={feature.title} className="grid gap-4 py-6 sm:grid-cols-[3rem_minmax(0,1fr)]">
                  <feature.icon size={22} className="mt-1 text-space-accent" />
                  <div>
                    <h3 className="text-lg font-semibold text-[#1f2a36]">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#6d6a61]">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
