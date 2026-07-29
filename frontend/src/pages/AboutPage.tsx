import { Link } from 'react-router-dom';
import {
  Globe,
  Cpu,
  ShieldCheck,
  Satellite,
  Search,
  Activity,
  Clock,
  Eye,
  AlertTriangle,
  Radio,
  Orbit,
  Crosshair,
  BarChart3,
  Layers,
  Rocket,
} from 'lucide-react';
import emblemSrc from '../assets/brand-emblem.png';

const founderImg = (import.meta.env.BASE_URL || '/') + 'brand/founder.jpeg';

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: Satellite,
    title: 'Ingest & Parse',
    desc: 'TLE and OMM data is pulled from Space-Track, CelesTrak, and amateur observers. SpaceMap parses every element set into a propagation-ready format.',
  },
  {
    step: 2,
    icon: Cpu,
    title: 'Propagate Locally',
    desc: "SGP4 propagation runs in your browser using Web Workers. Every tracked object's position is computed at sub-second intervals, and nothing leaves your machine.",
  },
  {
    step: 3,
    icon: Globe,
    title: 'Render in 3D',
    desc: 'Positions are projected onto a Cesium globe in real time. Filter by orbit type, search by name, and fly the camera to any object instantly.',
  },
];

const CAPABILITIES = [
  { icon: Search, label: 'Instant search' },
  { icon: Activity, label: 'Conjunction detection' },
  { icon: Clock, label: 'Time travel' },
  { icon: Eye, label: 'Live ISS feed' },
  { icon: AlertTriangle, label: 'Risk scoring' },
  { icon: Radio, label: 'Signal tracking' },
  { icon: Orbit, label: 'Orbit visualization' },
  { icon: Crosshair, label: 'Local sky view' },
  { icon: BarChart3, label: 'Telemetry panels' },
  { icon: Layers, label: 'Multi-layer overlays' },
  { icon: ShieldCheck, label: '100% client-side' },
  { icon: Rocket, label: 'Launch tracker' },
];

export function AboutPage() {
  return (
    <div className="relative pt-24">
      {/* Header */}
      <section
        className="mx-auto max-w-4xl px-6 py-16 text-center"
        style={{ perspective: '1200px' }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-space-accent mb-4">
          About SpaceMap
        </p>
        <h1
          className="text-4xl font-bold leading-tight text-white md:text-6xl"
          style={{ transform: 'translateZ(40px)' }}
        >
          Built so tracking orbit{' '}
          <span className="bg-gradient-to-r from-[#8ed8ff] to-[#4d96e8] bg-clip-text text-transparent">
            never requires a clearance.
          </span>
        </h1>
      </section>

      {/* Founder */}
      <section className="mx-auto max-w-4xl px-6 py-16" style={{ perspective: '1000px' }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-space-accent mb-3 text-center">
          Meet the Founder
        </p>
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          The person behind SpaceMap
        </h2>

        <div className="flex flex-col items-center">
          <div className="relative group" style={{ transformStyle: 'preserve-3d' }}>
            <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-[#4d96e8] to-[#8ed8ff] opacity-20 blur-2xl transition-opacity group-hover:opacity-40" />
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#4d96e8] to-[#8ed8ff] opacity-50 blur-lg" />
            <img
              src={founderImg}
              alt="Rahul Awasthi"
              className="relative h-56 w-56 rounded-full border-4 border-white/10 object-cover shadow-[0_24px_70px_rgba(5,16,26,0.45)] transition-transform duration-500 group-hover:scale-[1.02] md:h-64 md:w-64"
              style={{ transform: 'translateZ(20px)' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <h3 className="mt-6 text-xl font-semibold text-white">Rahul Awasthi</h3>
          <p className="text-sm text-space-accent">Founder</p>
        </div>

        <div className="mt-10 mx-auto max-w-2xl">
          <p className="text-center text-space-dim leading-relaxed">
            SpaceMap was built with a simple conviction: the ability to see what's orbiting above
            you shouldn't require a government contract or a six-figure software license. After
            watching researchers, educators, and space enthusiasts struggle with fragmented data and
            clunky tools, I built SpaceMap to put a mission-control-grade experience into everyone's
            browser, entirely free. Your data stays on your device. Every computation runs locally.
            That transparency isn't a feature; it's the point.
          </p>
        </div>
      </section>

      {/* How it works with 3D card tilt */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-space-accent mb-3 text-center">
            Under the Hood
          </p>
          <h2 className="text-3xl font-bold text-white text-center mb-4">How it works</h2>
          <p className="text-center text-space-dim mb-16">
            Our own engine, running entirely on your machine.
          </p>

          <div className="grid gap-6 md:grid-cols-3" style={{ perspective: '800px' }}>
            {HOW_IT_WORKS.map((item, i) => (
              <div
                key={item.step}
                className="group rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all duration-500 hover:border-space-accent/30 hover:bg-white/10 hover:shadow-xl hover:shadow-[#4d96e8]/10"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `rotateY(${(i - 1) * 3}deg)`,
                  transition: 'transform 0.5s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform =
                    'rotateY(0deg) translateZ(20px) scale(1.03)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = `rotateY(${(i - 1) * 3}deg)`;
                }}
              >
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#4d96e8]/30 to-[#8ed8ff]/30 text-space-accent shadow-lg shadow-[#4d96e8]/10"
                  style={{ transform: 'translateZ(15px)' }}
                >
                  <span className="text-lg font-bold">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm leading-relaxed text-space-dim">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities with 3D floating effect */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div
            className="rounded-2xl border border-white/10 bg-white/5 p-10 backdrop-blur-sm relative overflow-hidden"
            style={{ transformStyle: 'preserve-3d', perspective: '600px' }}
          >
            {/* Decorative depth layers */}
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-[#4d96e8]/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-[#8ed8ff]/10 blur-3xl" />

            <div className="relative flex items-center gap-3 mb-6">
              <ShieldCheck size={20} className="text-space-accent" />
              <h3 className="text-lg font-semibold text-white">
                Full feature set, checked every frame
              </h3>
            </div>
            <p className="relative text-sm text-space-dim mb-8">
              SpaceMap doesn't cut corners. Every feature runs in real time, updating with each
              frame of the simulation. Here's what's packed into a single browser tab:
            </p>
            <div className="relative flex flex-wrap gap-3">
              {CAPABILITIES.map((cap, i) => (
                <span
                  key={cap.label}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-space-dim transition-all duration-300 hover:bg-white/15 hover:border-space-accent/30 hover:text-white hover:scale-105"
                  style={{
                    transform: `translateZ(${5 + (i % 3) * 5}px)`,
                  }}
                >
                  <cap.icon size={14} className="text-space-accent" />
                  {cap.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <img
            src={emblemSrc}
            alt="SpaceMap"
            className="mx-auto h-16 w-16 mb-8"
            draggable={false}
          />
          <h2 className="text-3xl font-bold text-white">Start tracking now</h2>
          <p className="mt-4 text-space-dim">No sign-up. No install. Just open the tracker.</p>
          <Link
            to="/tracker"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff] px-10 py-4 text-base font-semibold text-[#06101a] transition-all hover:shadow-xl hover:shadow-[#4d96e8]/30 hover:scale-105"
          >
            <Globe size={18} />
            Open SpaceMap
          </Link>
        </div>
      </section>
    </div>
  );
}
