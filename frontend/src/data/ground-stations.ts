/**
 * Ground infrastructure — antennas, launch pads, and a few notable amateur
 * stations. All coordinates from public sources (mainly Wikipedia); tier
 * drives display density, matching the pattern used by `data/cities.ts`.
 */
export type StationType = 'dsn' | 'launch' | 'tracking';

export interface GroundStation {
  name: string;
  lat: number;
  lon: number;
  type: StationType;
  tier: 1 | 2 | 3;
}

export const GROUND_STATIONS: readonly GroundStation[] = [
  // Deep Space Network — three sites spaced ~120° apart for 24 h coverage.
  { name: 'Goldstone DSN', lat: 35.4266, lon: -116.89, type: 'dsn', tier: 1 },
  { name: 'Madrid DSN', lat: 40.4292, lon: -4.2497, type: 'dsn', tier: 1 },
  { name: 'Canberra DSN', lat: -35.4014, lon: 148.9814, type: 'dsn', tier: 1 },

  // Tier-1 launch sites — the big active players.
  { name: 'Kennedy SC', lat: 28.5729, lon: -80.649, type: 'launch', tier: 1 },
  { name: 'Cape Canaveral SFS', lat: 28.4889, lon: -80.5778, type: 'launch', tier: 2 },
  { name: 'Baikonur', lat: 45.9646, lon: 63.3052, type: 'launch', tier: 1 },
  { name: 'Kourou (CSG)', lat: 5.236, lon: -52.7758, type: 'launch', tier: 1 },
  { name: 'Wenchang', lat: 19.6146, lon: 110.9553, type: 'launch', tier: 1 },
  { name: 'Vandenberg SFB', lat: 34.742, lon: -120.5724, type: 'launch', tier: 2 },
  { name: 'Tanegashima', lat: 30.3839, lon: 130.9689, type: 'launch', tier: 2 },
  { name: 'Sriharikota (SDSC)', lat: 13.7199, lon: 80.2304, type: 'launch', tier: 2 },
  { name: 'Plesetsk', lat: 62.9539, lon: 40.5726, type: 'launch', tier: 2 },
  { name: 'Jiuquan', lat: 40.9583, lon: 100.2917, type: 'launch', tier: 2 },
  { name: 'Xichang', lat: 28.2464, lon: 102.0257, type: 'launch', tier: 3 },
  { name: 'Taiyuan', lat: 38.8489, lon: 111.6086, type: 'launch', tier: 3 },
  { name: 'Boca Chica (Starbase)', lat: 25.9975, lon: -97.1553, type: 'launch', tier: 2 },
  { name: 'Rocket Lab LC-1 (Māhia)', lat: -39.2624, lon: 177.8659, type: 'launch', tier: 3 },
  { name: 'Uchinoura', lat: 31.2513, lon: 131.0787, type: 'launch', tier: 3 },
  { name: 'Naro (Goheung)', lat: 34.4318, lon: 127.535, type: 'launch', tier: 3 },
  { name: 'Vega LP (Kourou)', lat: 5.238, lon: -52.775, type: 'launch', tier: 3 },
  { name: 'Wallops', lat: 37.9402, lon: -75.4664, type: 'launch', tier: 3 },
  { name: 'Kodiak (PSCA)', lat: 57.4358, lon: -152.3374, type: 'launch', tier: 3 },

  // Amateur / notable tracking dishes.
  { name: 'Bochum Observatory', lat: 51.4818, lon: 7.216, type: 'tracking', tier: 3 },
  { name: 'Dwingeloo', lat: 52.8121, lon: 6.3969, type: 'tracking', tier: 3 },
  { name: 'Goonhilly', lat: 50.0483, lon: -5.1832, type: 'tracking', tier: 3 },
  { name: 'Jodrell Bank', lat: 53.2367, lon: -2.3067, type: 'tracking', tier: 2 },
  { name: 'Arecibo (former)', lat: 18.3442, lon: -66.7528, type: 'tracking', tier: 3 },
  { name: 'Effelsberg', lat: 50.5247, lon: 6.8836, type: 'tracking', tier: 3 },
  { name: 'Parkes', lat: -32.9986, lon: 148.2632, type: 'tracking', tier: 3 },
  { name: 'Green Bank', lat: 38.4331, lon: -79.8398, type: 'tracking', tier: 3 },
];
