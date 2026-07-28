import { Link } from "react-router-dom";
import { HeroGlobe } from "../components/HeroGlobe.js";
import {
  Globe,
  Satellite,
  Search,
  Activity,
  Shield,
  Clock,
  Zap,
  Eye,
} from "lucide-react";
import emblemSrc from "../assets/brand-emblem.png";

const FEATURES = [
  {
    icon: Globe,
    title: "3D Globe Visualization",
    desc: "Every tracked satellite rendered on a real-time Cesium globe with sub-second refresh.",
  },
  {
    icon: Satellite,
    title: "Full Catalog Coverage",
    desc: "Access 30,000+ objects from Space-Track, CelesTrak, and amateur observers, updated continuously.",
  },
  {
    icon: Search,
    title: "Instant Search",
    desc: "Find any satellite by name, NORAD ID, or designation. Fly the camera to it in one click.",
  },
  {
    icon: Activity,
    title: "Conjunction Alerts",
    desc: "See potential close approaches ranked by risk. A leaderboard shows the most dangerous pairs.",
  },
  {
    icon: Shield,
    title: "Runs Locally",
    desc: "Propagation, filtering, and rendering all happen in your browser. Nothing is uploaded.",
  },
  {
    icon: Clock,
    title: "Time Travel",
    desc: "Scrub the timeline to replay past events or fast-forward to predict future orbits.",
  },
];

const STATS = [
  { value: "30,000+", label: "Tracked objects" },
  { value: "<1s", label: "Refresh interval" },
  { value: "100%", label: "Client-side" },
  { value: "0", label: "Data uploaded" },
];

export function HomePage() {
  return (
    <div className="relative">
      {/* ── Hero Section ── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
        {/* 3D Globe */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <HeroGlobe className="h-[80vh] w-[80vh] max-h-[700px] max-w-[700px] opacity-60" />
        </div>

        {/* Hero text */}
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <div className="mb-8 flex justify-center">
            <img
              src={emblemSrc}
              alt="SpaceMap"
              className="h-20 w-20 drop-shadow-2xl"
              draggable={false}
            />
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl">
            See everything
            <br />
            <span className="bg-gradient-to-r from-[#8ed8ff] to-[#4d96e8] bg-clip-text text-transparent">
              above Earth.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-space-dim md:text-xl">
            Real-time orbital tracking for every satellite, piece of debris, and
            spacecraft — rendered on a 3D globe, powered entirely by your
            browser.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/tracker"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff] px-8 py-4 text-base font-semibold text-[#06101a] transition-all hover:shadow-xl hover:shadow-[#4d96e8]/30 hover:scale-105"
            >
              <Zap size={18} />
              Launch Tracker
            </Link>
            <Link
              to="/about"
              className="flex items-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-base font-medium text-white transition-all hover:bg-white/10"
            >
              <Eye size={18} />
              Learn More
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="h-8 w-5 rounded-full border-2 border-white/30 flex items-start justify-center pt-1.5">
            <div className="h-2 w-1 rounded-full bg-white/50" />
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="relative z-10 border-y border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-space-accent md:text-4xl">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-space-dim">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ── */}
      <section id="features" className="relative z-10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-space-accent mb-3">
              Capabilities
            </p>
            <h2 className="text-3xl font-bold text-white md:text-5xl">
              Built for orbital awareness
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-space-dim">
              From satellite search to conjunction analysis, SpaceMap gives you a
              mission-control experience in a browser tab.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all hover:border-space-accent/30 hover:bg-white/10"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#4d96e8]/20 to-[#8ed8ff]/20 text-space-accent transition-transform group-hover:scale-110">
                  <f.icon size={24} />
                </div>
                <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-space-dim">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#4d96e8]/10 to-[#8ed8ff]/5 p-12 backdrop-blur-sm md:p-16">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Ready to explore orbit?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-space-dim">
              No account needed. No downloads. Just open the tracker and start
              exploring.
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
