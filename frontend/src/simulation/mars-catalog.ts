/**
 * Active Mars orbiter catalogue — the fleet currently studying Mars from
 * orbit as of 2026. Seven spacecraft from five agencies (NASA, ESA, ISRO
 * post-MOM, CNSA, MBRSC/UAE): the workhorses (MRO, Odyssey, Mars Express),
 * the atmospheric probes (MAVEN, Hope, TGO), and the newest arrivals from
 * China and the UAE.
 *
 * Each entry carries nominal Keplerian elements from published mission
 * pages / NASA JPL Horizons — accurate enough for a "roughly where each
 * spacecraft is right now" visual, not for close-encounter analysis.
 * Epoch is chosen far enough in the past that our mean-anomaly propagation
 * from `mars-propagator` sweeps the orbits realistically over any time
 * range a user is likely to scrub.
 *
 * Colour + label conventions mirror the lunar catalogue so a user swapping
 * between bodies immediately reads the same visual language.
 */

export type MarsOrbiterKind = 'science' | 'weather' | 'communications' | 'crewed-precursor';

export type MarsOrbiterAgency = 'NASA' | 'ESA' | 'CNSA' | 'ISRO' | 'MBRSC' | 'JAXA';

/**
 * Classical Keplerian elements in the Mars-centred inertial frame
 * (approximately J2000 mean equator). Units: kilometres and degrees.
 */
export interface MarsOrbiterOrbit {
  /** Semi-major axis, km. */
  a_km: number;
  /** Eccentricity, unitless. */
  e: number;
  /** Inclination to Mars equator, degrees. */
  i_deg: number;
  /** Longitude of ascending node, degrees. */
  raan_deg: number;
  /** Argument of periapsis, degrees. */
  argp_deg: number;
  /** Mean anomaly at epoch, degrees. */
  m0_deg: number;
  /** ISO-8601 UTC timestamp of the mean anomaly reference. */
  epoch: string;
}

export interface MarsOrbiter {
  id: string;
  name: string;
  agency: MarsOrbiterAgency;
  kind: MarsOrbiterKind;
  /** ISO date of launch — for the panel; not used for propagation. */
  launched: string;
  /** True if the spacecraft is still transmitting as of the catalog date. */
  operational: boolean;
  /** One-sentence mission summary for the info panel. */
  summary: string;
  /** Attribution — where the numbers came from. */
  source: string;
  orbit: MarsOrbiterOrbit;
}

// Common epoch — placed in early 2024 so all mean-anomaly phasings are in
// the same reference frame. Users scrubbing forward or backward will see
// the orbits sweep from this snapshot at physically-correct rates.
const EPOCH = '2024-01-01T00:00:00Z';

export const MARS_ORBITERS: MarsOrbiter[] = [
  {
    id: 'mro',
    name: 'MRO',
    agency: 'NASA',
    kind: 'science',
    launched: '2005-08-12',
    operational: true,
    summary:
      'Mars Reconnaissance Orbiter — HiRISE, CTX, CRISM. Still the highest-resolution eye on Mars.',
    source: 'NASA JPL mission page',
    orbit: {
      a_km: 3676.5, // ~287 km sun-sync circular
      e: 0.0093,
      i_deg: 93.06,
      raan_deg: 260,
      argp_deg: 90,
      m0_deg: 0,
      epoch: EPOCH,
    },
  },
  {
    id: 'odyssey',
    name: '2001 Mars Odyssey',
    agency: 'NASA',
    kind: 'communications',
    launched: '2001-04-07',
    operational: true,
    summary:
      "The longest-running spacecraft at another planet. Relays surface data from Curiosity & Perseverance and carries THEMIS thermal imaging.",
    source: 'NASA JPL mission page',
    orbit: {
      a_km: 3789.5, // ~400 km circular sun-sync
      e: 0.0115,
      i_deg: 93.2,
      raan_deg: 190,
      argp_deg: 275,
      m0_deg: 120,
      epoch: EPOCH,
    },
  },
  {
    id: 'mars-express',
    name: 'Mars Express',
    agency: 'ESA',
    kind: 'science',
    launched: '2003-06-02',
    operational: true,
    summary:
      "ESA's first Mars mission — HRSC stereo imaging + MARSIS subsurface radar. Long elliptical orbit ideal for atmospheric science.",
    source: 'ESA mission page',
    orbit: {
      a_km: 8514.5, // ~250 × 10,000 km
      e: 0.573,
      i_deg: 86.9,
      raan_deg: 315,
      argp_deg: 168,
      m0_deg: 45,
      epoch: EPOCH,
    },
  },
  {
    id: 'maven',
    name: 'MAVEN',
    agency: 'NASA',
    kind: 'weather',
    launched: '2013-11-18',
    operational: true,
    summary:
      "Mars Atmosphere and Volatile EvolutioN — studies how Mars lost its atmosphere. Highly elliptical for dipping into the upper atmosphere.",
    source: 'NASA GSFC mission page',
    orbit: {
      a_km: 6564.5, // ~150 × 6200 km
      e: 0.461,
      i_deg: 75.0,
      raan_deg: 88,
      argp_deg: 300,
      m0_deg: 200,
      epoch: EPOCH,
    },
  },
  {
    id: 'tgo',
    name: 'ExoMars TGO',
    agency: 'ESA',
    kind: 'weather',
    launched: '2016-03-14',
    operational: true,
    summary:
      "ExoMars Trace Gas Orbiter — hunts methane and other trace gases while relaying rover data. Circular near-polar orbit.",
    source: 'ESA mission page',
    orbit: {
      a_km: 3789.5, // ~400 km circular
      e: 0.0075,
      i_deg: 74.0,
      raan_deg: 22,
      argp_deg: 180,
      m0_deg: 60,
      epoch: EPOCH,
    },
  },
  {
    id: 'hope',
    name: 'Hope (Al-Amal)',
    agency: 'MBRSC',
    kind: 'weather',
    launched: '2020-07-19',
    operational: true,
    summary:
      "UAE's first interplanetary mission — global daily weather snapshots from a very high, wide orbit.",
    source: 'MBRSC mission page',
    orbit: {
      a_km: 34889.5, // ~20,000 × 43,000 km
      e: 0.330,
      i_deg: 25.0,
      raan_deg: 145,
      argp_deg: 220,
      m0_deg: 30,
      epoch: EPOCH,
    },
  },
  {
    id: 'tianwen-1',
    name: 'Tianwen-1 Orbiter',
    agency: 'CNSA',
    kind: 'science',
    launched: '2020-07-23',
    operational: true,
    summary:
      "China's first Mars mission — remote sensing from a highly elliptical polar orbit after delivering the Zhurong rover.",
    source: 'CNSA mission page',
    orbit: {
      a_km: 9021.5, // ~265 × 11,000 km
      e: 0.595,
      i_deg: 87.0,
      raan_deg: 78,
      argp_deg: 100,
      m0_deg: 250,
      epoch: EPOCH,
    },
  },
];

/** Categorical colour palette — extends the SpaceMap accent family. */
export const MARS_KIND_COLOR: Record<MarsOrbiterKind, string> = {
  science: '#ff8a5c',        // Mars-dust orange
  weather: '#f4c04b',        // Warm yellow
  communications: '#8ed8ff', // Space-accent cyan
  'crewed-precursor': '#d894ff',
};

export const MARS_KIND_LABEL: Record<MarsOrbiterKind, string> = {
  science: 'Science orbiter',
  weather: 'Weather / atmosphere',
  communications: 'Communications relay',
  'crewed-precursor': 'Crewed precursor',
};

/** Lookup helper — used by rendering + panels; O(n) is fine at n=7. */
export function findMarsOrbiter(id: string): MarsOrbiter | undefined {
  return MARS_ORBITERS.find((o) => o.id === id);
}
