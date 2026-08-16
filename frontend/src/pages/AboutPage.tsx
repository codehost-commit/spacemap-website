function AccentWord({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`spacemap-heading-accent ${className}`.trim()}>{children}</span>;
}

const founderImg = (import.meta.env.BASE_URL || '/') + 'brand/founder.jpeg';
const aboutImage = (import.meta.env.BASE_URL || '/') + 'brand/about-image.png';

const HOW_IT_WORKS = [
  {
    title: 'It starts with public orbit data.',
    desc: 'SpaceMap pulls in public element sets and object records, then turns them into something the tracker can actually use.',
  },
  {
    title: 'Your browser keeps the positions moving.',
    desc: 'The orbit math runs locally, so when you search, follow, or step through time, the updates happen on your machine.',
  },
  {
    title: 'The map redraws from that same state.',
    desc: 'The globe, object panel, local sky, and close-approach views all stay tied to the same moving orbit instead of feeling split across separate tools.',
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
              I wanted a clearer way to look at orbit without needing specialized software or a
              messy stack of tabs. SpaceMap pulls the public data into one place so you can follow
              objects, check close approaches, watch the ISS feed, and keep the whole map in view.
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
              className="h-56 w-56 rounded-full object-cover md:h-64 md:w-64"
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
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-space-accent">
            What the site is doing
          </p>
          <h2 className="spacemap-heading-display mb-4 max-w-3xl text-3xl text-white">
            A simple version of what happens after you open it.
          </h2>
          <p className="mb-12 max-w-2xl text-space-dim">
            This is the plain version. The site loads public orbit data, keeps the positions
            updated in the browser, and uses that same motion everywhere else on the page.
          </p>

          <div className="divide-y divide-white/10 border-y border-white/10">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.title}
                className="grid gap-3 py-6 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]"
              >
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed text-space-dim">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder note */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="border-y border-white/10 py-10">
            <h3 className="mb-6 text-lg font-semibold text-white">Why I kept building it this way</h3>
            <div className="space-y-5 text-sm leading-relaxed text-space-dim md:text-[15px]">
              <p>
                Most space software feels like it was built either for specialists already inside
                the system or for organizations shopping through procurement. I wanted SpaceMap to
                feel different from the start: immediate, legible, and open to anyone curious
                enough to look up.
              </p>
              <p>
                That is why the heavy lifting runs locally, why the interface tries to show rather
                than crowd you, and why I keep cutting away anything that makes the project feel
                closed off. If someone wants to look up and understand what is in orbit, they
                should be able to do that without much friction.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
