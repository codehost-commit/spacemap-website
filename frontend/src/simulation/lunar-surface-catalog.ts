/**
 * Static catalog of every notable object humans have put on (or into) the
 * Moon. Part 3 of "Beyond Earth" — the surface-marker layer.
 *
 * Coordinates are selenographic (mean-earth / polar-axis frame), which is
 * the same frame the LRO WAC mosaic is stitched into, so a marker at
 * (lat, lon) sits exactly where the real hardware sits in the imagery.
 *
 * Data comes from NASA NSSDCA, ISRO / JAXA / CNSA / KARI mission pages,
 * and the Lunar Reconnaissance Orbiter Camera team's post-facto imagery
 * (which is why so many "last-metre" coordinates for recent landings are
 * accurate to tens of metres — LROC actually photographed the hardware).
 */

export type LunarSiteKind =
  /** Human landing site — the six Apollo missions. */
  | 'crewed'
  /** Successful robotic soft landing. Rovers folded in here too. */
  | 'lander'
  /** Failed / hard landing where the spacecraft was destroyed or lost. */
  | 'crash'
  /** Deliberate high-velocity impact (LCROSS, Ranger, etc.). */
  | 'impact';

export type LunarSiteAgency =
  | 'NASA'
  | 'USSR'
  | 'CNSA'
  | 'ISRO'
  | 'JAXA'
  | 'ISA'
  | 'ispace'
  | 'Astrobotic'
  | 'Firefly Aerospace'
  | 'Intuitive Machines';

export interface LunarSurfaceSite {
  id: string;
  name: string;
  agency: LunarSiteAgency;
  kind: LunarSiteKind;
  /** Selenographic latitude, degrees (positive north). */
  lat_deg: number;
  /** Selenographic longitude, degrees (positive east, range −180..180). */
  lon_deg: number;
  /** ISO date the landing / impact occurred. */
  date: string;
  /** Two-line summary shown in the info panel. */
  summary: string;
  /** Where the coordinates and story came from. */
  source: string;
}

/**
 * ~30 sites — the ones every space-history reader would want to see
 * pinned on a map. Ordered chronologically so scrolling the panel reads
 * like a timeline of lunar exploration.
 */
export const LUNAR_SURFACE_SITES: readonly LunarSurfaceSite[] = [
  // ─── 1966–1968: The first landers ────────────────────────────────────
  {
    id: 'luna-9',
    name: 'Luna 9',
    agency: 'USSR',
    kind: 'lander',
    lat_deg: 7.13,
    lon_deg: -64.37,
    date: '1966-02-03',
    summary:
      'First soft landing on any world beyond Earth — a 100 kg beach-ball probe in Oceanus Procellarum that survived by bouncing.',
    source: 'NASA NSSDCA 1966-006A.',
  },
  {
    id: 'surveyor-1',
    name: 'Surveyor 1',
    agency: 'NASA',
    kind: 'lander',
    lat_deg: -2.47,
    lon_deg: -43.32,
    date: '1966-06-02',
    summary: "America's first lunar soft landing — proved the surface would hold Apollo's weight.",
    source: 'NASA NSSDCA 1966-045A.',
  },
  {
    id: 'luna-13',
    name: 'Luna 13',
    agency: 'USSR',
    kind: 'lander',
    lat_deg: 18.87,
    lon_deg: -62.05,
    date: '1966-12-24',
    summary: 'Second Soviet soft landing; measured lunar soil density with a mechanical penetrometer.',
    source: 'NASA NSSDCA 1966-116A.',
  },
  {
    id: 'surveyor-3',
    name: 'Surveyor 3',
    agency: 'NASA',
    kind: 'lander',
    lat_deg: -3.01,
    lon_deg: -23.34,
    date: '1967-04-20',
    summary:
      'Landed in the Ocean of Storms — Apollo 12 astronauts walked over and cut off its TV camera two years later.',
    source: 'NASA NSSDCA 1967-035A; recovered parts on display at NASM.',
  },
  {
    id: 'surveyor-5',
    name: 'Surveyor 5',
    agency: 'NASA',
    kind: 'lander',
    lat_deg: 1.41,
    lon_deg: 23.18,
    date: '1967-09-11',
    summary: 'First in-situ chemical analysis of another world — alpha-scatter measurements of lunar regolith.',
    source: 'NASA NSSDCA 1967-084A.',
  },
  {
    id: 'surveyor-6',
    name: 'Surveyor 6',
    agency: 'NASA',
    kind: 'lander',
    lat_deg: 0.51,
    lon_deg: -1.39,
    date: '1967-11-10',
    summary: 'First spacecraft to lift off from another world — it briefly hopped 4 metres to test its engines.',
    source: 'NASA NSSDCA 1967-112A.',
  },
  {
    id: 'surveyor-7',
    name: 'Surveyor 7',
    agency: 'NASA',
    kind: 'lander',
    lat_deg: -41.01,
    lon_deg: -11.41,
    date: '1968-01-10',
    summary: 'Last of the Surveyors — a purely scientific mission to the rim of Tycho crater.',
    source: 'NASA NSSDCA 1968-001A.',
  },

  // ─── 1969–1972: Apollo ────────────────────────────────────────────────
  {
    id: 'apollo-11',
    name: 'Apollo 11 — Tranquility Base',
    agency: 'NASA',
    kind: 'crewed',
    lat_deg: 0.674,
    lon_deg: 23.473,
    date: '1969-07-20',
    summary: 'First humans on another world. Armstrong and Aldrin spent 21½ hours on the surface.',
    source: 'ALSJ / LROC imagery of the Eagle descent stage.',
  },
  {
    id: 'apollo-12',
    name: 'Apollo 12',
    agency: 'NASA',
    kind: 'crewed',
    lat_deg: -3.013,
    lon_deg: -23.422,
    date: '1969-11-19',
    summary:
      'Landed 183 m from Surveyor 3 — Conrad and Bean walked over to retrieve parts of it.',
    source: 'ALSJ / LROC images show both landers plus the traverse tracks.',
  },
  {
    id: 'apollo-14',
    name: 'Apollo 14',
    agency: 'NASA',
    kind: 'crewed',
    lat_deg: -3.645,
    lon_deg: -17.471,
    date: '1971-02-05',
    summary: "Shepard and Mitchell explored Fra Mauro; Shepard hit two golf balls on the way home.",
    source: 'ALSJ 14; LROC ascent-stage impact site catalogued.',
  },
  {
    id: 'apollo-15',
    name: 'Apollo 15',
    agency: 'NASA',
    kind: 'crewed',
    lat_deg: 26.132,
    lon_deg: 3.634,
    date: '1971-07-30',
    summary: 'First mission with the Lunar Roving Vehicle — Scott and Irwin drove 28 km through Hadley Rille.',
    source: 'ALSJ 15; LRV still parked here.',
  },
  {
    id: 'apollo-16',
    name: 'Apollo 16',
    agency: 'NASA',
    kind: 'crewed',
    lat_deg: -8.973,
    lon_deg: 15.501,
    date: '1972-04-21',
    summary: 'Only crewed mission to the lunar highlands — Descartes Formation, elevation 7.4 km above the mean sphere.',
    source: 'ALSJ 16.',
  },
  {
    id: 'apollo-17',
    name: 'Apollo 17 — Taurus-Littrow',
    agency: 'NASA',
    kind: 'crewed',
    lat_deg: 20.191,
    lon_deg: 30.772,
    date: '1972-12-11',
    summary: 'Last humans on the Moon. Cernan and Schmitt (a geologist) spent three days on the surface.',
    source: 'ALSJ 17; LROC imagery of descent stage, LRV, and boot prints.',
  },

  // ─── 1970s: Soviet sample returns and Lunokhods ───────────────────────
  {
    id: 'luna-16',
    name: 'Luna 16',
    agency: 'USSR',
    kind: 'lander',
    lat_deg: -0.68,
    lon_deg: 56.3,
    date: '1970-09-20',
    summary: 'First fully robotic lunar sample return — 101 g of Mare Fecunditatis regolith brought to Earth.',
    source: 'NASA NSSDCA 1970-072A.',
  },
  {
    id: 'luna-17',
    name: 'Luna 17 / Lunokhod 1',
    agency: 'USSR',
    kind: 'lander',
    lat_deg: 38.28,
    lon_deg: -35.0,
    date: '1970-11-17',
    summary:
      'Deployed Lunokhod 1 — the first rover on any celestial body. Drove 10.5 km over ~10 lunar days.',
    source: 'NASA NSSDCA 1970-095A; final resting place used as a laser-ranging target.',
  },
  {
    id: 'luna-20',
    name: 'Luna 20',
    agency: 'USSR',
    kind: 'lander',
    lat_deg: 3.53,
    lon_deg: 56.55,
    date: '1972-02-21',
    summary: 'Second successful Soviet sample return — 55 g from Apollonius highlands.',
    source: 'NASA NSSDCA 1972-007A.',
  },
  {
    id: 'luna-21',
    name: 'Luna 21 / Lunokhod 2',
    agency: 'USSR',
    kind: 'lander',
    lat_deg: 25.85,
    lon_deg: 30.45,
    date: '1973-01-15',
    summary:
      'Deployed Lunokhod 2 in Le Monnier crater — drove 39 km, a distance record unbroken until 2015.',
    source: 'NASA NSSDCA 1973-001A; auctioned lunar object.',
  },
  {
    id: 'luna-24',
    name: 'Luna 24',
    agency: 'USSR',
    kind: 'lander',
    lat_deg: 12.75,
    lon_deg: 62.2,
    date: '1976-08-18',
    summary:
      'Last mission of the Luna programme — drilled 2 m into Mare Crisium and returned 170 g. Nothing landed on the Moon for the next 37 years.',
    source: 'NASA NSSDCA 1976-081A.',
  },

  // ─── 2013+ : The modern era ──────────────────────────────────────────
  {
    id: 'change-3',
    name: "Chang'e 3 / Yutu",
    agency: 'CNSA',
    kind: 'lander',
    lat_deg: 44.12,
    lon_deg: -19.51,
    date: '2013-12-14',
    summary:
      "China's first lunar lander and rover — first soft landing since Luna 24, and the first non-Soviet/US soft landing.",
    source: 'CNSA; NASA NSSDCA 2013-070A.',
  },
  {
    id: 'change-4',
    name: "Chang'e 4 / Yutu-2",
    agency: 'CNSA',
    kind: 'lander',
    lat_deg: -45.44,
    lon_deg: 177.6,
    date: '2019-01-03',
    summary:
      "First soft landing on the Moon's far side — Von Kármán crater, relayed home via the Queqiao satellite at Earth-Moon L2.",
    source: 'CNSA; Yutu-2 still operating in 2026.',
  },
  {
    id: 'beresheet',
    name: 'Beresheet',
    agency: 'ISA',
    kind: 'crash',
    lat_deg: 32.5956,
    lon_deg: 19.3496,
    date: '2019-04-11',
    summary:
      "Israeli non-profit's attempt at a first private soft landing — a gyroscope failure caused an engine restart failure at 149 m altitude.",
    source: 'SpaceIL; LROC impact-site imagery.',
  },
  {
    id: 'chandrayaan-2-vikram',
    name: 'Chandrayaan-2 Vikram',
    agency: 'ISRO',
    kind: 'crash',
    lat_deg: -70.9,
    lon_deg: 22.7,
    date: '2019-09-06',
    summary:
      "India's first landing attempt — lost contact 2 km above surface after guidance divergence. LROC found the impact site.",
    source: 'ISRO; Shanmuga Subramanian / NASA LROC.',
  },
  {
    id: 'change-5',
    name: "Chang'e 5",
    agency: 'CNSA',
    kind: 'lander',
    lat_deg: 43.06,
    lon_deg: -51.92,
    date: '2020-12-01',
    summary:
      "First lunar sample return in 44 years — 1.7 kg of young volcanic basalt from Mons Rümker.",
    source: 'CNSA; NASA NSSDCA 2020-087A.',
  },
  {
    id: 'hakuto-r-m1',
    name: 'Hakuto-R Mission 1',
    agency: 'ispace',
    kind: 'crash',
    lat_deg: 47.58,
    lon_deg: 44.09,
    date: '2023-04-25',
    summary:
      "Japanese ispace lander misjudged its altitude over a crater rim, ran out of fuel at ~5 km and impacted Atlas crater.",
    source: 'ispace mission report; LROC before/after imagery.',
  },
  {
    id: 'chandrayaan-3',
    name: 'Chandrayaan-3 Vikram / Pragyan',
    agency: 'ISRO',
    kind: 'lander',
    lat_deg: -69.37,
    lon_deg: 32.32,
    date: '2023-08-23',
    summary:
      "India's first soft landing — closest any mission has landed to a lunar pole. Pragyan rover drove 100 m.",
    source: 'ISRO Chandrayaan-3 mission page.',
  },
  {
    id: 'slim',
    name: 'SLIM (Moon Sniper)',
    agency: 'JAXA',
    kind: 'lander',
    lat_deg: -13.316,
    lon_deg: 25.251,
    date: '2024-01-19',
    summary:
      "Japan's precision-landing demonstrator — landed within 55 m of its target inside Shioli crater, but tipped over on touchdown.",
    source: 'JAXA post-landing report.',
  },
  {
    id: 'im-1',
    name: 'IM-1 Odysseus',
    agency: 'Intuitive Machines',
    kind: 'crash',
    lat_deg: -80.13,
    lon_deg: 1.44,
    date: '2024-02-22',
    summary:
      'First US soft landing since Apollo 17 — but its laser altimeter had been safed and the lander tipped over on touchdown.',
    source: 'Intuitive Machines; NASA CLPS.',
  },
  {
    id: 'change-6',
    name: "Chang'e 6",
    agency: 'CNSA',
    kind: 'lander',
    lat_deg: -41.63,
    lon_deg: -153.98,
    date: '2024-06-01',
    summary:
      "First-ever sample return from the Moon's far side — 1.9 kg lifted from Apollo crater inside the South Pole–Aitken basin.",
    source: 'CNSA press briefings.',
  },
  {
    id: 'blue-ghost-1',
    name: 'Blue Ghost Mission 1',
    agency: 'Firefly Aerospace',
    kind: 'lander',
    lat_deg: 18.56,
    lon_deg: 61.81,
    date: '2025-03-02',
    summary:
      'First fully successful commercial lunar landing — Firefly Aerospace, upright in Mare Crisium under NASA CLPS.',
    source: 'Firefly Aerospace; NASA CLPS.',
  },
  {
    id: 'im-2',
    name: 'IM-2 Athena',
    agency: 'Intuitive Machines',
    kind: 'crash',
    lat_deg: -84.32,
    lon_deg: 6.63,
    date: '2025-03-06',
    summary:
      "Intuitive Machines' second attempt — closest landing ever to the south pole, but tipped over again and ran out of power.",
    source: 'Intuitive Machines; NASA CLPS.',
  },

  // ─── Deliberate impacts ──────────────────────────────────────────────
  {
    id: 'ranger-9',
    name: 'Ranger 9',
    agency: 'NASA',
    kind: 'impact',
    lat_deg: -12.83,
    lon_deg: -2.38,
    date: '1965-03-24',
    summary:
      'Last of the Rangers — beamed live TV as it plunged into Alphonsus crater, seen by ~15 million homes.',
    source: 'NASA NSSDCA 1965-023A.',
  },
  {
    id: 'lcross',
    name: 'LCROSS Centaur',
    agency: 'NASA',
    kind: 'impact',
    lat_deg: -84.68,
    lon_deg: -48.7,
    date: '2009-10-09',
    summary:
      "Deliberately crashed a spent Centaur upper stage into a permanently-shadowed crater at 2.5 km/s — the plume confirmed water ice in the Moon's south-pole regolith.",
    source: 'NASA LCROSS mission summary.',
  },
];

export const LUNAR_SITE_KIND_COLOR: Record<LunarSiteKind, string> = {
  crewed: '#ffdc7a',
  lander: '#8ed8ff',
  crash: '#ff8e8e',
  impact: '#c9a5ff',
};

export const LUNAR_SITE_KIND_LABEL: Record<LunarSiteKind, string> = {
  crewed: 'Crewed landing',
  lander: 'Robotic landing',
  crash: 'Crash / hard landing',
  impact: 'Deliberate impact',
};

export function findLunarSurfaceSite(id: string): LunarSurfaceSite | undefined {
  return LUNAR_SURFACE_SITES.find((s) => s.id === id);
}
