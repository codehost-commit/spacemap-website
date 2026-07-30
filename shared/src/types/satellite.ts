/** Orbital regime used for coloring trails and filtering. */
export type OrbitClass = 'LEO' | 'MEO' | 'GEO' | 'HEO' | 'POLAR' | 'SSO' | 'UNKNOWN';
export type CatalogObjectType = 'payload' | 'rocket-body' | 'debris' | 'unknown';
export type CatalogSourceProvider =
  | 'celestrak-gp'
  | 'celestrak-supgp'
  | 'celestrak-tle'
  | 'spacemap-bundled-tle'
  | 'unknown';
export type CatalogElementSource = 'gp' | 'supgp' | 'tle' | 'none';

/** Static, slow-changing satellite metadata. */
export interface SatelliteMeta {
  noradId: number;
  name: string;
  intlDesignator?: string;
  country?: string;
  launchDate?: string;
  operator?: string;
  missionType?: string;
  constellation?: string;
  objectType?: CatalogObjectType;
  opsStatusCode?: string;
  decayDate?: string;
}

/** Public catalog object backed by GP JSON or a legacy TLE fallback. */
export interface Tle {
  noradId: number;
  name: string;
  /** Epoch of the element set in ISO 8601. */
  epoch: string;
  /** Legacy TLE lines when available. Optional for GP/OMM-first records. */
  line1?: string;
  line2?: string;
  intlDesignator?: string;
  objectType?: CatalogObjectType;
  opsStatusCode?: string;
  owner?: string;
  launchDate?: string;
  decayDate?: string;
  sourceGroups?: string[];
  sourceFeeds?: string[];
  sourceProvider?: CatalogSourceProvider;
  sourcePriority?: number;
  elementSource?: CatalogElementSource;
  propagatable?: boolean;
  classificationType?: string;
  /** GP/OMM orbital fields. */
  meanMotion?: number;
  eccentricity?: number;
  inclinationDeg?: number;
  raanDeg?: number;
  argPerigeeDeg?: number;
  meanAnomalyDeg?: number;
  bstar?: number;
  meanMotionDot?: number;
  meanMotionDDot?: number;
  ephemerisType?: number;
  revAtEpoch?: number;
}

export interface CatalogChunkFile {
  id: string;
  label: string;
  count: number;
  propagatableCount: number;
  objects: Tle[];
}

export interface CatalogChunkManifest {
  fetchedAt: number;
  totalCount: number;
  propagatableCount: number;
  metadataOnlyCount: number;
  chunks: Array<{
    id: string;
    label: string;
    count: number;
    propagatableCount: number;
    path: string;
  }>;
}

/** Instantaneous propagated state of one satellite. */
export interface SatelliteState {
  noradId: number;
  /** ECI position in km. */
  position: [number, number, number];
  /** ECI velocity in km/s. */
  velocity: [number, number, number];
  /** Geodetic subpoint. */
  latDeg: number;
  lonDeg: number;
  /** Altitude above WGS-84 ellipsoid in km. */
  altKm: number;
  /** Speed magnitude in km/s. */
  speedKmS: number;
  /** Sample time in unix ms. */
  timeMs: number;
  orbitClass: OrbitClass;
}

/** Derived orbital elements returned with detailed telemetry. */
export interface OrbitalElements {
  inclinationDeg: number;
  raanDeg: number;
  eccentricity: number;
  argPerigeeDeg: number;
  meanAnomalyDeg: number;
  meanMotionRevPerDay: number;
  periodMinutes: number;
  apogeeKm: number;
  perigeeKm: number;
}

/**
 * Structure-of-arrays snapshot for a batch of propagated satellites. Cheap to
 * send across a worker boundary; the Nth slot in each array describes the same
 * satellite (identified by ids[N]).
 */
export interface PropagationSnapshot {
  timeMs: number;
  count: number;
  ids: Int32Array;
  /** ECI positions in km. Length = count * 3. */
  eciPos: Float32Array;
  /** ECEF positions in metres, ready for Cesium.Cartesian3. Length = count * 3. */
  ecefPos: Float32Array;
  /** ECEF velocity in m/s. Length = count * 3. */
  ecefVel: Float32Array;
  /** [lat°, lon°, altKm] per satellite. Length = count * 3. */
  geodetic: Float32Array;
  /** Speed magnitude in km/s. */
  speed: Float32Array;
  /** Orbit-class index into ORBIT_CLASSES. */
  orbitClass: Uint8Array;
}

/** Result of a two-satellite conjunction analysis. */
export interface ConjunctionResult {
  aId: number;
  bId: number;
  /** Time-of-closest-approach in unix ms. */
  tcaMs: number;
  /** Predicted miss distance at TCA (km). */
  missKm: number;
  /** Relative speed at TCA (km/s). */
  relSpeedKmS: number;
  /** Separation right now (km). */
  currentSepKm: number;
  /** Instantaneous relative speed now (km/s). */
  currentRelSpeedKmS: number;
  /** Rough probability of collision using a Gaussian positional model. */
  probabilityOfCollision: number;
  /** 0 (safe) – 100 (imminent collision). Derived from miss distance + Pc. */
  severity: number;
  /** Search window bounds in unix ms, so the UI can label appropriately. */
  windowStartMs: number;
  windowEndMs: number;
}

export interface SatelliteTelemetry {
  meta: SatelliteMeta;
  state: SatelliteState;
  elements: OrbitalElements;
  /** Special + general relativistic clock offset, seconds since epoch. */
  relativisticOffsetSec: number;
  sunlit: boolean;
}
