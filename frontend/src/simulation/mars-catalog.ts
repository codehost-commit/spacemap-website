/**
 * Placeholder catalog — the real active-orbiter roster lands in Part 2
 * (Mars Orbiters + Surface). Foundation ships with an empty list so
 * downstream imports resolve cleanly.
 */

export type MarsOrbiterKind = 'science' | 'weather' | 'communications' | 'crewed-precursor';
export type MarsOrbiterAgency = 'NASA' | 'ESA' | 'CNSA' | 'ISRO' | 'MBRSC' | 'JAXA';

export interface MarsOrbiterOrbit {
  a_km: number;
  e: number;
  i_deg: number;
  raan_deg: number;
  argp_deg: number;
  m0_deg: number;
  epoch: string;
}

export interface MarsOrbiter {
  id: string;
  name: string;
  agency: MarsOrbiterAgency;
  kind: MarsOrbiterKind;
  launched: string;
  operational: boolean;
  summary: string;
  source: string;
  orbit: MarsOrbiterOrbit;
}

export const MARS_ORBITERS: MarsOrbiter[] = [];

export const MARS_KIND_COLOR: Record<MarsOrbiterKind, string> = {
  science: '#ff8a5c',        // Mars-red accent
  weather: '#f4c04b',
  communications: '#8ed8ff',
  'crewed-precursor': '#d894ff',
};

export const MARS_KIND_LABEL: Record<MarsOrbiterKind, string> = {
  science: 'Science orbiter',
  weather: 'Weather / atmosphere',
  communications: 'Communications relay',
  'crewed-precursor': 'Crewed precursor',
};
