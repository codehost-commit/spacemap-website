/**
 * Notable objects on the Martian surface — the twin of the lunar surface
 * catalogue. Every entity that ever softly landed or crashed on Mars,
 * grouped so the map reads as an atlas of exploration.
 *
 * Coordinates are areocentric lat/lon (planetocentric), the same convention
 * NASA MGS and MRO use. Positive longitudes east; positive latitudes north.
 * Cross-checked against USGS Mars nomenclature + NASA Planetary Data System
 * landing coordinates — accurate to hundreds of metres for post-2000 sites.
 */

export type MarsSiteKind = 'rover' | 'lander' | 'crash';

export type MarsSiteAgency = 'NASA' | 'ESA' | 'CNSA' | 'ROSCOSMOS';

export interface MarsSurfaceSite {
  id: string;
  name: string;
  kind: MarsSiteKind;
  agency: MarsSiteAgency;
  /** ISO date of landing / impact. */
  date: string;
  /** Areocentric latitude (° N positive). */
  lat_deg: number;
  /** Areocentric longitude (° E positive, 0–360 wrapped to −180…+180). */
  lon_deg: number;
  /** Named region (Chryse Planitia, Gale Crater, …) for the info panel. */
  region: string;
  /** One-sentence summary. */
  summary: string;
  /** Attribution — where the coordinates came from. */
  source: string;
}

export const MARS_SURFACE_SITES: MarsSurfaceSite[] = [
  // ── ACTIVE ROVERS ─────────────────────────────────────────────────────
  {
    id: 'perseverance',
    name: 'Perseverance + Ingenuity',
    kind: 'rover',
    agency: 'NASA',
    date: '2021-02-18',
    lat_deg: 18.4447,
    lon_deg: 77.4508,
    region: 'Jezero Crater',
    summary:
      "Astrobiology rover caching samples for eventual return. Delivered the Ingenuity helicopter, the first powered flight on another world.",
    source: 'NASA JPL',
  },
  {
    id: 'curiosity',
    name: 'Curiosity',
    kind: 'rover',
    agency: 'NASA',
    date: '2012-08-06',
    lat_deg: -4.5895,
    lon_deg: 137.4417,
    region: 'Gale Crater',
    summary:
      "Nuclear-powered rover investigating past habitability. Confirmed Gale Crater once held a long-lived freshwater lake.",
    source: 'NASA JPL',
  },
  {
    id: 'zhurong',
    name: 'Zhurong',
    kind: 'rover',
    agency: 'CNSA',
    date: '2021-05-14',
    lat_deg: 25.066,
    lon_deg: 109.925,
    region: 'Utopia Planitia',
    summary:
      "China's first Mars rover — delivered by Tianwen-1. Went into hibernation mid-2022 and has not resumed operations.",
    source: 'CNSA',
  },
  {
    id: 'spirit',
    name: 'Spirit (MER-A)',
    kind: 'rover',
    agency: 'NASA',
    date: '2004-01-04',
    lat_deg: -14.5684,
    lon_deg: 175.4726,
    region: 'Gusev Crater',
    summary:
      "First of the twin MER rovers. Operated for six years — 20× its 90-day design life — before getting stuck in soft soil.",
    source: 'NASA JPL',
  },
  {
    id: 'opportunity',
    name: 'Opportunity (MER-B)',
    kind: 'rover',
    agency: 'NASA',
    date: '2004-01-25',
    lat_deg: -1.9462,
    lon_deg: -5.5271,
    region: 'Meridiani Planum',
    summary:
      "Spirit's twin. Roved 45 km over 14 years, confirming past liquid water on the Martian surface, until a 2018 dust storm ended communications.",
    source: 'NASA JPL',
  },

  // ── STATIONARY LANDERS ────────────────────────────────────────────────
  {
    id: 'insight',
    name: 'InSight',
    kind: 'lander',
    agency: 'NASA',
    date: '2018-11-26',
    lat_deg: 4.5024,
    lon_deg: 135.6234,
    region: 'Elysium Planitia',
    summary:
      "Seismometer that detected 1,300+ Marsquakes, mapping the planet's interior for the first time. Ended December 2022 as dust smothered the panels.",
    source: 'NASA JPL',
  },
  {
    id: 'viking-1',
    name: 'Viking 1 Lander',
    kind: 'lander',
    agency: 'NASA',
    date: '1976-07-20',
    lat_deg: 22.4728,
    lon_deg: -47.9679,
    region: 'Chryse Planitia',
    summary:
      "The first spacecraft to successfully operate on the Martian surface. Ran biology experiments and returned images for six years.",
    source: 'NASA NSSDCA',
  },
  {
    id: 'viking-2',
    name: 'Viking 2 Lander',
    kind: 'lander',
    agency: 'NASA',
    date: '1976-09-03',
    lat_deg: 47.9679,
    lon_deg: 134.2929,
    region: 'Utopia Planitia',
    summary:
      "Viking 1's twin, landed on the far side of Mars a month later. Recorded the first Martian frost from ground level.",
    source: 'NASA NSSDCA',
  },
  {
    id: 'pathfinder',
    name: 'Mars Pathfinder + Sojourner',
    kind: 'lander',
    agency: 'NASA',
    date: '1997-07-04',
    lat_deg: 19.13,
    lon_deg: -33.22,
    region: 'Ares Vallis',
    summary:
      "Airbag-landed technology demo that delivered Sojourner — the first successful rover on Mars. Operated for three months.",
    source: 'NASA JPL',
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    kind: 'lander',
    agency: 'NASA',
    date: '2008-05-25',
    lat_deg: 68.2188,
    lon_deg: -125.7492,
    region: 'Vastitas Borealis',
    summary:
      "Confirmed water ice just below the north-polar regolith and observed snowfall from Martian clouds.",
    source: 'NASA JPL',
  },
  {
    id: 'beagle-2',
    name: 'Beagle 2',
    kind: 'lander',
    agency: 'ESA',
    date: '2003-12-25',
    lat_deg: 11.5265,
    lon_deg: 90.4295,
    region: 'Isidis Planitia',
    summary:
      "ESA's first lander. Touched down safely but two of its four solar-panel petals failed to deploy — MRO finally imaged the intact lander in 2015.",
    source: 'ESA / NASA HiRISE',
  },
  {
    id: 'mars-3',
    name: 'Mars 3 Lander',
    kind: 'lander',
    agency: 'ROSCOSMOS',
    date: '1971-12-02',
    lat_deg: -45.0,
    lon_deg: 158.0,
    region: 'Terra Sirenum',
    summary:
      "The first spacecraft to soft-land on Mars. Transmitted for 14.5 seconds before communications were lost, likely due to a raging dust storm.",
    source: 'NASA NSSDCA',
  },

  // ── CRASH SITES ───────────────────────────────────────────────────────
  {
    id: 'schiaparelli',
    name: 'Schiaparelli EDM',
    kind: 'crash',
    agency: 'ESA',
    date: '2016-10-19',
    lat_deg: -2.05,
    lon_deg: 6.21,
    region: 'Meridiani Planum',
    summary:
      "ExoMars entry-descent demonstrator. A navigation glitch caused it to release its parachute early and impact at 540 km/h.",
    source: 'ESA / NASA HiRISE',
  },
  {
    id: 'mars-polar-lander',
    name: 'Mars Polar Lander',
    kind: 'crash',
    agency: 'NASA',
    date: '1999-12-03',
    lat_deg: -76.0,
    lon_deg: 165.0,
    region: 'Planum Australe',
    summary:
      "Lost during descent — sensor noise mimicked touchdown, cutting the engines while still ~40 m above the surface.",
    source: 'NASA JPL',
  },
  {
    id: 'mars-2',
    name: 'Mars 2 Lander',
    kind: 'crash',
    agency: 'ROSCOSMOS',
    date: '1971-11-27',
    lat_deg: -45.0,
    lon_deg: 47.0,
    region: 'Hellas Planitia',
    summary:
      "The first human-made object on Mars — arriving by impact when its parachute system failed during a global dust storm.",
    source: 'NASA NSSDCA',
  },
  {
    id: 'mars-6',
    name: 'Mars 6 Lander',
    kind: 'crash',
    agency: 'ROSCOSMOS',
    date: '1974-03-12',
    lat_deg: -23.9,
    lon_deg: -19.5,
    region: 'Margaritifer Terra',
    summary:
      "Returned atmospheric-profile data during descent — the first-ever from Mars — then went silent moments before touchdown.",
    source: 'NASA NSSDCA',
  },
];

export const MARS_SITE_KIND_COLOR: Record<MarsSiteKind, string> = {
  rover: '#ffb75c',       // brighter orange for active-ish objects
  lander: '#8ed8ff',      // cyan — matches lunar landers
  crash: '#ff7c8a',       // coral-red for lost missions
};

export const MARS_SITE_KIND_LABEL: Record<MarsSiteKind, string> = {
  rover: 'Rovers',
  lander: 'Stationary landers',
  crash: 'Crash sites',
};

export function findMarsSurfaceSite(id: string): MarsSurfaceSite | undefined {
  return MARS_SURFACE_SITES.find((s) => s.id === id);
}
