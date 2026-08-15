import {
  Cpu,
  Globe,
  Satellite,
  ShieldCheck,
} from 'lucide-react';

function AccentWord({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`spacemap-heading-accent ${className}`.trim()}>{children}</span>;
}

const founderImg = (import.meta.env.BASE_URL || '/') + 'brand/founder.jpeg';
const aboutImage = (import.meta.env.BASE_URL || '/') + 'brand/about-image.png';

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
      <section className="mx-auto max-w-6xl px-6 py-14 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)] lg:items-center">
          <div>
            <h1 className="spacemap-heading-display site-heading max-w-[10ch] text-5xl leading-[1.02] md:text-6xl lg:text-[4.9rem]">
              Why I built <AccentWord className="text-space-accent">SpaceMap</AccentWord>
            </h1>
            <p className="site-copy mt-6 max-w-2xl text-base leading-relaxed md:text-lg">
              SpaceMap turns raw orbital data into something readable, visual, and immediate:
              real-time tracking, conjunction analysis, live video, local sky ranking, and launch
              awareness, all inside one browser tab.
            </p>
          </div>

          <img
            src={aboutImage}
            alt="SpaceMap globe view showing orbital tracks around Earth."
            className="w-full h-auto rounded-[1.5rem]"
            draggable={false}
          />
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
            I built SpaceMap because I kept coming back to the same frustration: it was oddly hard
            to just see what was in orbit in a way that felt clear and usable. A lot of the tools I
            found were fragmented, overly technical, or made for institutions instead of ordinary
            people. I wanted something that felt more open and more immediate, where you could
            explore orbit in a normal browser without expensive software or a wall of friction. The
            decision to keep it local came from the same place. What you do here stays on your
            device, and that feels like the right way to build it.
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
