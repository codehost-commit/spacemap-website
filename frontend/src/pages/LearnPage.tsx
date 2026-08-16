import { Link } from 'react-router-dom';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { ArrowRight } from 'lucide-react';

function AccentWord({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`spacemap-heading-accent ${className}`.trim()}>{children}</span>;
}

const CONTENT_LINKS = [
  ['Orbit height', '#height'],
  ['TLEs', '#tles'],
  ['Prediction', '#prediction'],
  ['Seeing passes', '#passes'],
  ['Close approaches', '#conjunctions'],
  ['Formulas', '#formulas'],
] as const;

export function LearnPage() {
  return (
    <div className="relative pt-24">
      <section className="mx-auto max-w-6xl px-6 py-14 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)] lg:items-start">
          <div>
            <h1 className="spacemap-heading-display site-heading max-w-[10ch] text-5xl leading-[1.02] md:text-6xl lg:text-[4.9rem]">
              A plain guide to <AccentWord className="text-space-accent">orbit</AccentWord>
            </h1>
            <p className="site-copy mt-6 max-w-2xl text-base leading-relaxed md:text-lg">
              SpaceMap shows a lot at once. This page is the quieter version: the basic ideas
              behind the tracker, written for someone who wants to understand what they are seeing
              without turning it into a textbook.
            </p>
          </div>

          <nav className="lg:sticky lg:top-28">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-space-accent">
              On this page
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 lg:block lg:space-y-3">
              {CONTENT_LINKS.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="block text-sm font-semibold text-space-dim transition-colors hover:text-space-accent"
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-6 pb-24">
        <GuideSection
          id="height"
          eyebrow="Orbit height"
          title="Altitude changes almost everything"
        >
          <p>
            A satellite&apos;s height controls how fast it moves, how much of Earth it can see, how
            often it comes back overhead, and how long the orbit will last. Low orbit is busy and
            fast. Higher orbit is slower and sees more of the planet at once.
          </p>
          <p>
            The ISS is in low Earth orbit, so it circles Earth in roughly 90 minutes. Navigation
            satellites sit much higher. Geostationary satellites are higher still, far enough that
            they appear to hover over one longitude.
          </p>
          <DefinitionList
            items={[
              ['LEO', 'Low, fast, and crowded. Most crewed spacecraft and many imaging satellites are here.'],
              ['MEO', 'Higher and slower. Navigation constellations like GPS live here.'],
              ['GEO', 'High enough to match Earth&apos;s rotation and appear fixed from the ground.'],
              ['HEO', 'Stretched elliptical paths that spend more time over one part of Earth.'],
            ]}
          />
        </GuideSection>

        <GuideSection id="tles" eyebrow="TLEs" title="The tracker starts with public orbit records">
          <p>
            Most objects in SpaceMap begin as a TLE, short for Two-Line Element set. A TLE is not a
            live GPS signal from the satellite. It is a compact public description of an orbit at a
            particular moment.
          </p>
          <p>
            That moment is called the epoch. The farther you move away from the epoch, the more the
            prediction can drift. Fresh data matters because Earth&apos;s atmosphere, gravity, solar
            activity, and small modeling errors keep nudging real objects away from a perfect path.
          </p>
          <Equation math={String.raw`\text{TLE} \rightarrow \text{state at epoch} \rightarrow \text{predicted position}`} />
        </GuideSection>

        <GuideSection id="prediction" eyebrow="Prediction" title="How the tracker knows where something is">
          <p>
            SpaceMap uses SGP4, the standard propagation model for TLEs. Propagation just means
            taking the orbit record and asking where the object should be at another time.
          </p>
          <p>
            The tracker does that work locally. Your browser loads the catalog, runs the math in
            Web Workers, and draws the result on the globe. Search, telemetry, orbit paths, local
            sky, and conjunction checks all read from that same moving state.
          </p>
          <ProcessList
            items={[
              'Load public TLE and OMM data.',
              'Use SGP4 to estimate each object&apos;s position.',
              'Draw objects and orbit paths on the globe.',
              'Use that motion for search, passes, telemetry, and close approaches.',
            ]}
          />
        </GuideSection>

        <GuideSection id="passes" eyebrow="Visible passes" title="A satellite is easiest to see in reflected sunlight">
          <p>
            Satellites do not usually glow on their own. You see them when sunlight hits the object
            and reflects back down to you. The best moment is often after sunset or before sunrise:
            the sky around you is dark, but the satellite above you is still lit.
          </p>
          <p>
            A good pass also depends on elevation. A satellite low on the horizon is harder to see
            and travels through more atmosphere. A high pass is usually cleaner, brighter, and
            easier to follow.
          </p>
          <Equation math={String.raw`\text{smaller magnitude number} \Rightarrow \text{brighter object}`} />
        </GuideSection>

        <GuideSection id="conjunctions" eyebrow="Close approaches" title="A conjunction is a near miss, not automatically a collision">
          <p>
            Space is large, but orbit is crowded in certain bands. A conjunction means two objects
            pass close to each other. The useful questions are when the closest approach happens,
            how far apart the objects are, and how uncertain both predicted positions are.
          </p>
          <p>
            Collision probability is not just distance. A close pass with poor uncertainty can be
            more concerning than a neat-looking number suggests. SpaceMap treats conjunctions as a
            way to inspect risk, not as a dramatic warning label.
          </p>
          <Equation math={String.raw`P_c = \Pr(\text{collision within the uncertainty region})`} />
        </GuideSection>

        <GuideSection id="formulas" eyebrow="Formulas" title="A few equations worth knowing">
          <p>
            You do not need to memorize these. They are here because they explain why objects at
            different heights behave so differently.
          </p>
          <FormulaList />
        </GuideSection>

        <div className="mt-14 border-t border-white/10 pt-8">
          <p className="site-copy text-base leading-relaxed">
            The best way to learn the rest is to open the tracker, pick one object, and move time
            forward. Orbit starts making more sense once you can watch it happen.
          </p>
          <Link
            to="/tracker/"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-space-accent transition-colors hover:text-white"
          >
            Open tracker
            <ArrowRight size={16} />
          </Link>
        </div>
      </article>
    </div>
  );
}

function GuideSection({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32 border-t border-white/10 py-12 first:border-t-0 first:pt-0">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-space-accent">{eyebrow}</p>
      <h2 className="spacemap-heading-display site-heading mt-3 text-3xl leading-tight md:text-5xl">
        {title}
      </h2>
      <div className="site-copy mt-5 space-y-5 text-base leading-relaxed">{children}</div>
    </section>
  );
}

function DefinitionList({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="mt-7 divide-y divide-white/10 border-y border-white/10">
      {items.map(([term, definition]) => (
        <div key={term} className="grid gap-2 py-4 sm:grid-cols-[5rem_minmax(0,1fr)]">
          <div className="font-mono text-sm font-bold text-space-accent">{term}</div>
          <div
            className="text-sm leading-relaxed text-space-dim"
            dangerouslySetInnerHTML={{ __html: definition }}
          />
        </div>
      ))}
    </div>
  );
}

function ProcessList({ items }: { items: string[] }) {
  return (
    <ol className="mt-7 divide-y divide-white/10 border-y border-white/10">
      {items.map((item, index) => (
        <li key={item} className="grid gap-3 py-4 sm:grid-cols-[3rem_minmax(0,1fr)]">
          <span className="font-mono text-sm text-space-accent">
            {(index + 1).toString().padStart(2, '0')}
          </span>
          <span
            className="text-sm leading-relaxed text-space-dim"
            dangerouslySetInnerHTML={{ __html: item }}
          />
        </li>
      ))}
    </ol>
  );
}

function FormulaList() {
  const formulas = [
    {
      label: 'Orbital period',
      math: String.raw`T = 2\pi\sqrt{\frac{a^3}{\mu}}`,
      note: 'The time it takes to complete one orbit.',
    },
    {
      label: 'Circular velocity',
      math: String.raw`v = \sqrt{\frac{\mu}{r}}`,
      note: 'The speed for a circular orbit at radius r.',
    },
    {
      label: 'Escape velocity',
      math: String.raw`v_{\mathrm{esc}} = \sqrt{\frac{2\mu}{r}}`,
      note: 'The speed needed to stop being bound to Earth.',
    },
    {
      label: 'Apogee and perigee',
      math: String.raw`r_a = a(1 + e),\qquad r_p = a(1 - e)`,
      note: 'The highest and lowest points of an elliptical orbit.',
    },
  ];

  return (
    <div className="mt-7 divide-y divide-white/10 border-y border-white/10">
      {formulas.map((formula) => (
        <div key={formula.label} className="py-5">
          <div className="text-sm font-semibold text-white">{formula.label}</div>
          <Equation math={String.raw`\displaystyle ${formula.math}`} compact />
          <div className="mt-2 text-sm leading-relaxed text-space-dim">{formula.note}</div>
        </div>
      ))}
    </div>
  );
}

function Equation({ math, compact = false }: { math: string; compact?: boolean }) {
  return (
    <div
      className={`${compact ? 'mt-3' : 'mt-7'} overflow-x-auto border-l-2 border-space-accent/50 pl-4 text-sm text-space-accent md:text-base`}
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(math, {
          displayMode: true,
          throwOnError: false,
          strict: false,
          output: 'html',
        }),
      }}
    />
  );
}
