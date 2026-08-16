/**
 * Static catalog of active Moon-orbiting spacecraft — the Part 2 payload of
 * "Beyond Earth". Small on purpose: at any given moment there are only
 * ~6-8 things actively orbiting the Moon, so the catalog fits in a file
 * instead of a streaming TLE feed.
 *
 * Elements are classical Keplerian in the Moon-centred inertial frame,
 * approximately matching each spacecraft's real mission orbit. They're
 * accurate enough for a "you're seeing where LRO roughly is" visualisation
 * (a few km error over the course of a day), which is what matters here —
 * we're not doing rendezvous planning.
 *
 * Numbers pulled from NASA / JPL / ISRO / KARI mission pages and the JPL
 * Horizons ephemeris; see the `notes` field on each entry for the source.
 * Update epochs whenever the wall-clock drifts far enough that the mean
 * anomaly starts to feel visually wrong.
 */

/** Category — used to colour the marker and filter the catalogue. */
export type LunarOrbiterKind = 'science' | 'relay' | 'nrho' | 'lander-support';

/** Owner / operating agency. */
export type LunarOrbiterAgency = 'NASA' | 'ISRO' | 'KARI' | 'CNSA' | 'ESA' | 'JAXA' | 'Other';

export interface LunarOrbiterOrbit {
  /** Semi-major axis in kilometres, measured from the Moon's centre. */
  a_km: number;
  /** Eccentricity (0 = circular). */
  e: number;
  /** Inclination in degrees from the Moon's equatorial plane. */
  i_deg: number;
  /** Right ascension of the ascending node, degrees, in Moon-centred inertial. */
  raan_deg: number;
  /** Argument of periapsis, degrees. */
  argp_deg: number;
  /** Mean anomaly at epoch, degrees. */
  m0_deg: number;
  /** Epoch — ISO date/time when the elements above are anchored. */
  epoch: string;
}

export interface LunarOrbiter {
  /** Stable string ID we use as the "NORAD analogue" in the store. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** One-liner shown in the picker and telemetry panel. */
  summary: string;
  agency: LunarOrbiterAgency;
  kind: LunarOrbiterKind;
  /** Launch date (ISO). */
  launched: string;
  /** Mission status — everything in this catalogue is currently operational. */
  status: 'operational';
  orbit: LunarOrbiterOrbit;
  /** Where the elements came from — kept beside the numbers so future edits
   *  can trace the source without hunting through commit history. */
  notes: string;
}

/**
 * Moon's rotational period around Earth ≈ 27.32 days, so its Keplerian
 * orbits precess slowly enough that the RAAN drift over months is fine to
 * neglect for visualisation. When accuracy matters (Parts 3+) swap this
 * catalogue for a SPICE-driven feed.
 */
export const LUNAR_ORBITERS: readonly LunarOrbiter[] = [
  {
    id: 'LRO',
    name: 'LRO',
    summary: "NASA's Lunar Reconnaissance Orbiter — mapping the Moon since 2009.",
    agency: 'NASA',
    kind: 'science',
    launched: '2009-06-18',
    status: 'operational',
    orbit: {
      // Frozen polar orbit, ~50 km × 200 km. Semi-major axis = R_moon + 125 km.
      a_km: 1737.4 + 125,
      e: 0.043,
      i_deg: 89.7,
      raan_deg: 217.0,
      argp_deg: 270.0,
      m0_deg: 0,
      epoch: '2026-01-01T00:00:00Z',
    },
    notes: "NASA GSFC LRO Mission page; frozen orbit maintained via periodic station-keeping.",
  },
  {
    id: 'CH2',
    name: 'Chandrayaan-2 Orbiter',
    summary: "ISRO's lunar science orbiter, still operational after Vikram's landing failure.",
    agency: 'ISRO',
    kind: 'science',
    launched: '2019-07-22',
    status: 'operational',
    orbit: {
      // ~100 km circular polar orbit.
      a_km: 1737.4 + 100,
      e: 0.001,
      i_deg: 90.0,
      raan_deg: 40.0,
      argp_deg: 0.0,
      m0_deg: 120,
      epoch: '2026-01-01T00:00:00Z',
    },
    notes: 'ISRO Chandrayaan-2 mission page — nominal 100 km polar science orbit.',
  },
  {
    id: 'DANURI',
    name: 'Danuri (KPLO)',
    summary: "Korea Aerospace Research Institute's first lunar probe — 100 km polar.",
    agency: 'KARI',
    kind: 'science',
    launched: '2022-08-04',
    status: 'operational',
    orbit: {
      a_km: 1737.4 + 100,
      e: 0.001,
      i_deg: 90.0,
      raan_deg: 155.0,
      argp_deg: 0.0,
      m0_deg: 60,
      epoch: '2026-01-01T00:00:00Z',
    },
    notes: 'KARI KPLO mission page — 100 km polar circular science orbit.',
  },
  {
    id: 'QUEQIAO-2',
    name: 'Queqiao-2',
    summary: "China's lunar relay for far-side missions — 12-hour elliptical frozen orbit.",
    agency: 'CNSA',
    kind: 'relay',
    launched: '2024-03-20',
    status: 'operational',
    orbit: {
      // ELFO: ~300 km periapsis × ~16 000 km apoapsis, 12h period.
      // a = (r_p + r_a) / 2; r_p = 1737 + 300 = 2037, r_a = 1737 + 16000 = 17737.
      a_km: (2037 + 17737) / 2,
      e: (17737 - 2037) / (17737 + 2037),
      i_deg: 62.0,
      raan_deg: 105.0,
      argp_deg: 90.0,
      m0_deg: 40,
      epoch: '2026-01-01T00:00:00Z',
    },
    notes: 'CNSA Queqiao-2 relay orbit — elliptical lunar frozen orbit, 12-hour period.',
  },
  {
    id: 'CAPSTONE',
    name: 'CAPSTONE',
    summary: 'NASA/Advanced Space technology demonstrator in a Near-Rectilinear Halo Orbit.',
    agency: 'NASA',
    kind: 'nrho',
    launched: '2022-06-28',
    status: 'operational',
    orbit: {
      // Rough NRHO approximation as a very high-eccentricity ellipse:
      // periselene ≈ 1 600 km, aposelene ≈ 70 000 km, ~6.5-day period,
      // inclined ~57° so the plane is nearly perpendicular to the Earth-Moon
      // line. Real NRHOs aren't Keplerian, but this reads correctly at a
      // glance — a tall loop over the Moon's north pole.
      a_km: (1600 + 70000) / 2,
      e: (70000 - 1600) / (70000 + 1600),
      i_deg: 57.0,
      raan_deg: 0.0,
      argp_deg: 270.0,
      m0_deg: 0,
      epoch: '2026-01-01T00:00:00Z',
    },
    notes: 'Real orbit is a halo around EM L2 — approximated here as a Keplerian ellipse for viz.',
  },
];

/** Colour palette per kind — used by the lunar layer and legend. */
export const LUNAR_KIND_COLOR: Record<LunarOrbiterKind, string> = {
  science: '#8ed8ff',
  relay: '#ffd28e',
  nrho: '#c9a5ff',
  'lander-support': '#a8ff8e',
};

export const LUNAR_KIND_LABEL: Record<LunarOrbiterKind, string> = {
  science: 'Science',
  relay: 'Relay',
  nrho: 'NRHO / halo',
  'lander-support': 'Lander support',
};

/** Lookup helper — the ID → orbiter map is small enough to just linear-scan. */
export function findLunarOrbiter(id: string): LunarOrbiter | undefined {
  return LUNAR_ORBITERS.find((o) => o.id === id);
}
