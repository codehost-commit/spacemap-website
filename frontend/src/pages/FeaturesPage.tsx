import { Link } from "react-router-dom";
import {
  Globe,
  Satellite,
  Search,
  Activity,
  Shield,
  Clock,
  Zap,
  Eye,
  MapPin,
  Camera,
  Layers,
  BarChart3,
  Rocket,
  Radio,
  Crosshair,
  Timer,
  Orbit,
  SlidersHorizontal,
} from "lucide-react";

const ALL_FEATURES = [
  {
    icon: Globe,
    title: "3D Cesium Globe",
    desc: "A full-resolution, interactive 3D Earth rendered with CesiumJS. Rotate, zoom, and fly to any point on the planet with smooth camera transitions.",
  },
  {
    icon: Satellite,
    title: "30,000+ Tracked Objects",
    desc: "Pull the full active catalog from Space-Track, CelesTrak, and amateur observers. LEO, MEO, HEO, GEO, and sub-synchronous orbits are all covered and color-coded.",
  },
  {
    icon: Search,
    title: "Instant Search",
    desc: "Find any satellite by name, NORAD ID, or international designator. Results appear as you type and clicking one flies the camera directly to it.",
  },
  {
    icon: Activity,
    title: "Conjunction Detection",
    desc: "A real-time leaderboard ranks the closest predicted approaches by miss distance. Each pair links to a detail view showing time-to-closest-approach and relative velocity.",
  },
  {
    icon: Shield,
    title: "100% Client-Side",
    desc: "SGP4 propagation runs in Web Workers on your CPU. No orbital data is uploaded, no account is required, and every computation stays on your machine.",
  },
  {
    icon: Clock,
    title: "Time Travel",
    desc: "Scrub a timeline to replay past events or fast-forward into the future. Adjust the simulation speed from 0.1x to 1000x and watch orbital mechanics play out.",
  },
  {
    icon: Eye,
    title: "Live ISS Camera",
    desc: "Stream the International Space Station's external HD camera feed directly inside the tracker, synced to the ISS's real-time position on the globe.",
  },
  {
    icon: Crosshair,
    title: "Local Sky View",
    desc: "Enter your coordinates and see which satellites are currently visible above your location, with pass predictions, elevation angles, and brightness estimates.",
  },
  {
    icon: BarChart3,
    title: "Telemetry Panels",
    desc: "Select any object to open a detailed telemetry readout: altitude, velocity, inclination, period, RAAN, eccentricity, and drag parameters updated every frame.",
  },
  {
    icon: Layers,
    title: "Multi-Layer Overlays",
    desc: "Toggle heatmaps showing orbital density, the day/night terminator, latitude/longitude graticules, country borders, and major city markers.",
  },
  {
    icon: Rocket,
    title: "Launch Tracker",
    desc: "Upcoming and recent launches are listed with provider, vehicle, payload, and target orbit. Each entry links to the corresponding objects once they appear in the catalog.",
  },
  {
    icon: Orbit,
    title: "Orbit Trails & History",
    desc: "Render full-period orbit paths for any selected satellite, or enable history trails to see where objects have been over the last few hours.",
  },
  {
    icon: SlidersHorizontal,
    title: "Orbit Type Filters",
    desc: "Filter the view by orbit regime: LEO, MEO, GEO, HEO, sub-synchronous, or show everything. Toggle categories on and off to focus on what matters.",
  },
  {
    icon: MapPin,
    title: "Ground Stations",
    desc: "A curated set of tracking stations and launch sites is plotted on the globe with labels, giving spatial context to the objects overhead.",
  },
  {
    icon: Camera,
    title: "POV Camera Mode",
    desc: "Lock the camera to a satellite and ride along in first-person, watching the Earth rotate beneath you at orbital speed.",
  },
  {
    icon: Radio,
    title: "Sonar Sweep Effect",
    desc: "A visual radar-sweep animation pulses outward from your selected object, highlighting nearby satellites within a configurable radius.",
  },
  {
    icon: Timer,
    title: "Timeline Scrubber",
    desc: "A persistent scrubber bar at the bottom of the screen lets you drag through time while seeing every tracked object reposition in real time.",
  },
  {
    icon: Globe,
    title: "Imagery Picker",
    desc: "Switch between multiple globe imagery layers: natural color, dark basemap, or high-contrast night lights to suit your analysis needs.",
  },
];

export function FeaturesPage() {
  return (
    <div className="relative pt-24">
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-space-accent mb-4">
            Full Feature Set
          </p>
          <h1 className="text-4xl font-bold text-white md:text-5xl">
            Everything SpaceMap can do
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-space-dim">
            From real-time satellite tracking to conjunction detection, every
            tool you need for orbital awareness is built into a single browser tab.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ALL_FEATURES.map((f) => (
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

        {/* CTA */}
        <div className="mt-20 text-center">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#4d96e8]/10 to-[#8ed8ff]/5 p-12 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              See it all in action
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-space-dim">
              No account needed. No downloads. Open the tracker and explore.
            </p>
            <Link
              to="/tracker"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff] px-10 py-4 text-base font-semibold text-[#06101a] transition-all hover:shadow-xl hover:shadow-[#4d96e8]/30 hover:scale-105"
            >
              <Zap size={18} />
              Launch Tracker
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
