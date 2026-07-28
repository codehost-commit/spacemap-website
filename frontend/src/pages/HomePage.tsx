import { Link } from "react-router-dom";
import { HeroGlobe } from "../components/HeroGlobe.js";
import {
  Globe,
  Satellite,
  Search,
  Shield,
  Clock,
  Zap,
  Eye,
  ArrowRight,
} from "lucide-react";
import emblemSrc from "../assets/brand-emblem.png";

const FEATURES = [
  {
    icon: Globe,
    title: "3D Cesium Globe",
    desc: "A full-resolution, interactive 3D Earth rendered with CesiumJS. Rotate, zoom, and fly to any point on the planet.",
  },
  {
    icon: Satellite,
    title: "30,000+ Tracked Objects",
    desc: "The full active catalog from Space-Track and CelesTrak. LEO, MEO, HEO, GEO, and sub-synchronous orbits, all color-coded.",
  },
  {
    icon: Search,
    title: "Instant Search",
    desc: "Find any satellite by name, NORAD ID, or international designator. Results appear as you type.",
  },
  {
    icon: Shield,
    title: "100% Client-Side",
    desc: "SGP4 propagation runs in Web Workers on your CPU. No data is uploaded, no account is required.",
  },
  {
    icon: Clock,
    title: "Time Travel",
    desc: "Scrub through time to replay past events or fast-forward into the future at up to 1000x speed.",
  },
  {
    icon: Eye,
    title: "Live ISS Camera",
    desc: "Stream the ISS external HD camera feed directly inside the tracker, synced to its real-time position.",
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
      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
        {/* Hero text + product image side by side */}
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
            <h1 className="text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl">
              See everything
              <br />
              <span className="bg-gradient-to-r from-[#8ed8ff] to-[#4d96e8] bg-clip-text text-transparent">
                above Earth.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-space-dim md:text-xl">
              Real-time orbital tracking for every satellite, piece of debris, and
              spacecraft, rendered on a 3D globe and powered entirely by your
              browser.
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
                className="flex items-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-base font-medium text-white transition-all hover:bg-white/10"
              >
                <Eye size={18} />
                Learn More
              </Link>
            </div>
          </div>

          {/* Right: animated 3D globe with satellite particles */}
          <div className="relative flex items-center justify-center">
            <HeroGlobe className="w-full aspect-square max-w-[580px]" />
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
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
              <div className="text-3xl font-bold text-space-accent md:text-4xl">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-space-dim">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid - top 6 */}
      <section id="features" className="relative z-10 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-space-accent mb-3">
              Features
            </p>
            <h2 className="text-3xl font-bold text-white md:text-5xl">
              Everything you need for orbital awareness
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-space-dim">
              From satellite search to conjunction analysis, SpaceMap gives you a
              mission-control experience in a single browser tab.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm transition-all hover:border-space-accent/30 hover:bg-white/10"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#4d96e8]/20 to-[#8ed8ff]/20 text-space-accent transition-transform group-hover:scale-110">
                  <f.icon size={22} />
                </div>
                <h3 className="text-base font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-space-dim">
                  {f.desc}
                </p>
              </div>
            ))}
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
