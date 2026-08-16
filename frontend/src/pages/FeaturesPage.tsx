import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  Clock,
  Crosshair,
  MapPin,
  Radio,
  Satellite,
  Search,
  Shield,
} from 'lucide-react';

const TRACKER_IMAGE_SRC = `${import.meta.env.BASE_URL || '/'}brand/tracker-hero.png`;
const FEATURE_IMAGE_2_SRC = `${import.meta.env.BASE_URL || '/'}brand/feature-image2.png`;
const FEATURE_IMAGE_3_SRC = `${import.meta.env.BASE_URL || '/'}brand/feature-image3.png`;

const CONTENT_LINKS = [
  ['Tracker view', '#tracker-view'],
  ['What it shows', '#what-it-shows'],
  ['How you use it', '#how-you-use-it'],
  ['Examples', '#examples'],
  ['Why it is usable', '#why-it-is-usable'],
] as const;

function AccentWord({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`spacemap-heading-accent ${className}`.trim()}>{children}</span>;
}

const WHAT_IT_SHOWS = [
  {
    icon: Satellite,
    title: 'Objects in orbit',
    body: 'Satellites, debris, rocket bodies, stations, and payloads appear around the same Earth instead of living in separate lists.',
  },
  {
    icon: Search,
    title: 'Search that expects real IDs',
    body: 'Search by name, NORAD ID, or international designator when you already know what you are looking for.',
  },
  {
    icon: Radio,
    title: 'Close approaches',
    body: 'Conjunction results show probability, miss distance, relative speed, and time of closest approach in one place.',
  },
  {
    icon: Camera,
    title: 'ISS video',
    body: 'The live station feed can sit beside the orbit view, so the video has context instead of being a separate tab.',
  },
];

const HOW_TO_USE = [
  'Search for a satellite, station, rocket body, or NORAD ID.',
  'Open an object and check its orbit, altitude, speed, owner, and current position.',
  'Follow it around Earth, switch to POV, or jump back to the wider globe.',
  'Check local passes, close approaches, launches, and the ISS feed without leaving the tracker.',
];

const WHY_USABLE = [
  {
    icon: Clock,
    title: 'It stays fast',
    body: 'The tracker is built for quick checks: open it, search, follow an object, and move on.',
  },
  {
    icon: Shield,
    title: 'No account first',
    body: 'You can use the map in the browser without signing in or installing anything.',
  },
  {
    icon: Crosshair,
    title: 'Context stays visible',
    body: 'The object, orbit path, Earth, local sky, and related panels stay close enough to make sense together.',
  },
];

function ScreenshotFrame({
  title,
  note,
  imageSrc,
}: {
  title: string;
  note: string;
  imageSrc?: string;
}) {
  return (
    <figure>
      {imageSrc ? (
        <img src={imageSrc} alt="" className="block h-auto w-full" draggable={false} />
      ) : (
        <div className="flex aspect-[16/10] items-center justify-center bg-[#f1eee8] px-8 text-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#356d97]">
              Screenshot slot
            </div>
            <div className="mt-3 text-lg font-semibold text-[#1f2a36]">{title}</div>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#6d6a61]">{note}</p>
          </div>
        </div>
      )}
      <figcaption className="mt-3 text-sm leading-relaxed text-[#6d6a61]">{note}</figcaption>
    </figure>
  );
}

function FeatureImageCallout({
  eyebrow,
  title,
  body,
  imageSrc,
  reverse = false,
  imageClassName = 'object-cover object-center',
}: {
  eyebrow: string;
  title: string;
  body: string;
  imageSrc: string;
  reverse?: boolean;
  imageClassName?: string;
}) {
  return (
    <div
      className={`grid gap-6 lg:items-start ${
        reverse
          ? 'lg:grid-cols-[minmax(17rem,0.48fr)_minmax(0,1fr)]'
          : 'lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.48fr)]'
      }`}
    >
      {reverse && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-space-accent">
            {eyebrow}
          </p>
          <h3 className="spacemap-heading-display text-2xl leading-tight md:text-4xl">{title}</h3>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[#6d6a61]">{body}</p>
        </div>
      )}

      <div className="aspect-[23/10] overflow-hidden">
        <img src={imageSrc} alt="" className={`block h-full w-full ${imageClassName}`} draggable={false} />
      </div>

      {!reverse && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-space-accent">
            {eyebrow}
          </p>
          <h3 className="spacemap-heading-display text-2xl leading-tight md:text-4xl">{title}</h3>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[#6d6a61]">{body}</p>
        </div>
      )}
    </div>
  );
}

export function FeaturesPage() {
  return (
    <div className="relative pt-24 text-[#1f2a36]">
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)] lg:items-start">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-space-accent">
              Features
            </p>
            <h1 className="spacemap-heading-display max-w-4xl text-4xl leading-tight md:text-6xl">
              Here is what is actually in the <AccentWord className="text-space-accent">tracker</AccentWord>.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#6d6a61]">
              SpaceMap is centered on one thing: opening a live orbital map and making sense of what is
              moving around Earth. These are the parts I kept coming back to while building it.
            </p>
            <div className="mt-9">
              <Link
                to="/tracker/"
                className="inline-flex items-center gap-2 rounded-lg bg-[#8ed8ff] px-6 py-3 text-sm font-semibold text-[#06101a] transition-colors hover:bg-[#b6e8ff]"
              >
                Open tracker
                <ArrowRight size={16} />
              </Link>
            </div>
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

      <section id="tracker-view" className="scroll-mt-32 border-y border-[#d8d2c8] bg-[#f1eee8]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <ScreenshotFrame
            imageSrc={TRACKER_IMAGE_SRC}
            title="Tracker globe"
            note="Current tracker globe with many orbital objects visible around Earth."
          />
        </div>
      </section>

      <section id="what-it-shows" className="scroll-mt-32 mx-auto max-w-6xl px-6 py-18">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)]">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-space-accent">
              What it shows
            </p>
            <h2 className="spacemap-heading-display text-3xl leading-tight md:text-5xl">
              The map keeps the important things close together.
            </h2>
          </div>
          <div className="divide-y divide-[#d8d2c8] border-y border-[#d8d2c8]">
            {WHAT_IT_SHOWS.map((item) => (
              <div key={item.title} className="grid gap-4 py-6 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
                <item.icon size={21} className="mt-1 text-space-accent" />
                <div>
                  <h3 className="text-lg font-semibold text-[#1f2a36]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6d6a61]">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-you-use-it" className="scroll-mt-32 border-y border-[#d8d2c8] bg-[#f7f5f0]">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-18 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:items-start">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-space-accent">
              How you use it
            </p>
            <h2 className="spacemap-heading-display text-3xl leading-tight md:text-5xl">
              Search, open, follow, check.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#6d6a61]">
              The tracker should not make you learn a new workflow before you can use it. You can
              search for an object, open its orbit, and follow it live.
            </p>
          </div>
          <ol className="divide-y divide-[#d8d2c8] border-y border-[#d8d2c8]">
            {HOW_TO_USE.map((step, index) => (
              <li key={step} className="grid gap-4 py-5 sm:grid-cols-[3rem_minmax(0,1fr)]">
                <span className="font-mono text-sm font-semibold text-space-accent">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-base leading-relaxed text-[#1f2a36]">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="examples" className="scroll-mt-32 mx-auto max-w-6xl px-6 pb-24 pt-18">
        <div className="space-y-16">
          <FeatureImageCallout
            eyebrow="Selected object"
            title="Open a satellite and keep the orbit in view."
            body="A selected object keeps its live panel, orbit path, and surrounding traffic on the same screen. Search by NORAD ID, open the object, and follow it without losing the rest of the map."
            imageSrc={FEATURE_IMAGE_2_SRC}
            imageClassName="object-cover object-left"
          />
          <FeatureImageCallout
            eyebrow="ISS feed"
            title="Watch the station without leaving the map."
            body="The ISS camera, crew list, and live orbital context can stay together, so the video does not turn into a detached embed or a separate page."
            imageSrc={FEATURE_IMAGE_3_SRC}
            imageClassName="object-cover object-left"
            reverse
          />
        </div>
      </section>

      <section id="why-it-is-usable" className="scroll-mt-32 border-t border-[#d8d2c8]">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-18 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-space-accent">
              Why it is usable
            </p>
            <h2 className="spacemap-heading-display text-3xl leading-tight md:text-5xl">
              It keeps you in one browser tab.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {WHY_USABLE.map((item) => (
              <div key={item.title} className="border-t border-[#d8d2c8] pt-5">
                <item.icon size={21} className="text-space-accent" />
                <h3 className="mt-4 text-lg font-semibold text-[#1f2a36]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6d6a61]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="border-t border-[#d8d2c8] pt-8">
          <Link
            to="/tracker/"
            className="inline-flex items-center gap-2 rounded-lg bg-[#8ed8ff] px-6 py-3 text-sm font-semibold text-[#06101a] transition-colors hover:bg-[#b6e8ff]"
          >
            Open tracker
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
