import { Link } from 'react-router-dom';
import {
  Activity,
  Camera,
  Cpu,
  Crosshair,
  Globe,
  Layers,
  Radio,
  Rocket,
  Satellite,
  ShieldCheck,
} from 'lucide-react';
import emblemSrc from '../assets/brand-emblem.png';

function AccentWord({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`spacemap-heading-accent ${className}`.trim()}>{children}</span>;
}

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

export function AboutPage() {
  return (
    <div className="relative pt-24">
      {/* Header */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)] lg:items-center">
          <div>
            <h1 className="spacemap-heading-display mt-6 text-4xl text-white md:text-6xl">
              Built so tracking <AccentWord className="text-space-accent">orbit</AccentWord>{' '}
              <span className="bg-gradient-to-r from-[#8ed8ff] to-[#4d96e8] bg-clip-text text-transparent">
                never requires a clearance.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-space-dim md:text-lg">
              SpaceMap turns raw orbital data into something readable, visual, and immediate:
              real-time tracking, conjunction analysis, live video, local sky ranking, and launch
              awareness, all inside one browser tab.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-[#0d1520]/88 p-7">
            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-space-accent">
                    In practice
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-white">What the product is built around</div>
                </div>
                <img src={emblemSrc} alt="SpaceMap" className="h-12 w-12" draggable={false} />
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Activity, label: 'Collision watch' },
                  { icon: Camera, label: 'ISS live feed' },
                  { icon: Crosshair, label: 'Closest to you' },
                  { icon: Rocket, label: 'Launch countdowns' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-space-accent">
                      <item.icon size={18} />
                    </div>
                    <div className="mt-4 text-sm font-semibold text-white">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-2 text-sm text-space-dim">
                <div>Client-side propagation in the browser.</div>
                <div>Layered 3D globe for seeing tracks and position together.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-space-accent mb-3 text-center">
          Meet the Founder
        </p>
        <h2 className="spacemap-heading-display mb-12 text-center text-3xl text-white">
          The person behind <AccentWord className="text-space-accent">SpaceMap</AccentWord>
        </h2>

        <div className="flex flex-col items-center">
          <div className="relative">
            <img
              src={founderImg}
              alt="Rahul Awasthi"
              className="h-56 w-56 rounded-full border-4 border-white/10 object-cover shadow-[0_18px_40px_rgba(5,16,26,0.32)] md:h-64 md:w-64"
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

      {/* How it works */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-space-accent mb-3 text-center">
            Under the Hood
          </p>
          <h2 className="spacemap-heading-display mb-4 text-center text-3xl text-white">
            How it <AccentWord className="text-space-accent">works</AccentWord>
          </h2>
          <p className="text-center text-space-dim mb-16">
            SpaceMap runs in the browser and computes positions on your machine.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#4d96e8]/30 to-[#8ed8ff]/30 text-space-accent shadow-lg shadow-[#4d96e8]/10">
                  <span className="text-lg font-bold">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm leading-relaxed text-space-dim">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder note */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div
            className="rounded-[1.5rem] border border-white/10 bg-[#0d1520]/88 p-10"
          >
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck size={20} className="text-space-accent" />
              <h3 className="text-lg font-semibold text-white">
                Why I kept building it this way
              </h3>
            </div>
            <div className="space-y-5 text-sm leading-relaxed text-space-dim md:text-[15px]">
              <p>
                Most space software feels like it was built either for specialists already inside
                the system or for organizations shopping through procurement. I wanted SpaceMap to
                feel different from the start: immediate, legible, and open to anyone curious
                enough to look up.
              </p>
              <p>
                That is why the heavy lifting runs locally, why the interface tries to show rather
                than overwhelm, and why the product keeps pushing toward public understanding
                instead of institutional gatekeeping. If orbit is part of our world now, then
                seeing it should not require expensive software or a technical clearance.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
