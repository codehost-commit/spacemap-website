import * as satellite from "satellite.js";
import {
  classifyOrbit,
  type OrbitalElements,
  type SatelliteState,
  type SatelliteTelemetry,
  type Tle,
} from "@spacemap/shared";
import type { TleCatalog } from "../tle/catalog.js";

interface Record {
  tle: Tle;
  satrec: satellite.SatRec;
}

/**
 * SGP4 propagator over the whole catalog. Rebuilds satrecs whenever the
 * catalog is refreshed. propagateAll produces one SatelliteState per object.
 */
export class Propagator {
  private records = new Map<number, Record>();

  constructor(catalog: TleCatalog) {
    this.rebuild(catalog.all);
    catalog.onUpdate((tles) => this.rebuild(tles));
  }

  private rebuild(tles: Tle[]): void {
    const next = new Map<number, Record>();
    let bad = 0;
    for (const tle of tles) {
      try {
        const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
        if (satrec.error && satrec.error !== 0) {
          bad++;
          continue;
        }
        next.set(tle.noradId, { tle, satrec });
      } catch {
        bad++;
      }
    }
    this.records = next;
    if (bad > 0) console.warn(`[propagator] skipped ${bad} unparseable TLEs`);
  }

  get size(): number {
    return this.records.size;
  }

  /** Propagate the entire catalog to `date`. Malformed entries are skipped. */
  propagateAll(date: Date): SatelliteState[] {
    const gmst = satellite.gstime(date);
    const timeMs = date.getTime();
    const out: SatelliteState[] = [];
    for (const rec of this.records.values()) {
      const state = this.propagateOne(rec, date, gmst, timeMs);
      if (state) out.push(state);
    }
    return out;
  }

  propagate(noradId: number, date: Date): SatelliteState | null {
    const rec = this.records.get(noradId);
    if (!rec) return null;
    return this.propagateOne(rec, date, satellite.gstime(date), date.getTime());
  }

  telemetry(noradId: number, date: Date): SatelliteTelemetry | null {
    const rec = this.records.get(noradId);
    if (!rec) return null;
    const state = this.propagateOne(rec, date, satellite.gstime(date), date.getTime());
    if (!state) return null;
    const elements = extractElements(rec.satrec, state);
    return {
      meta: {
        noradId: rec.tle.noradId,
        name: rec.tle.name,
      },
      state,
      elements,
      relativisticOffsetSec: relativisticOffset(state, date),
      sunlit: isSunlit(state, date),
    };
  }

  private propagateOne(
    rec: Record,
    date: Date,
    gmst: number,
    timeMs: number,
  ): SatelliteState | null {
    const pv = satellite.propagate(rec.satrec, date);
    if (!pv || typeof pv.position === "boolean" || typeof pv.velocity === "boolean") {
      return null;
    }
    const posEci = pv.position;
    const velEci = pv.velocity;
    const geo = satellite.eciToGeodetic(posEci, gmst);
    const altKm = geo.height;
    if (!Number.isFinite(altKm) || altKm < -100 || altKm > 400_000) return null;
    const speed = Math.hypot(velEci.x, velEci.y, velEci.z);
    // satellite.js gives inclination in rad on satrec; e is dimensionless.
    const inclDeg = rad2deg(rec.satrec.inclo);
    const e = rec.satrec.ecco;
    return {
      noradId: rec.tle.noradId,
      position: [posEci.x, posEci.y, posEci.z],
      velocity: [velEci.x, velEci.y, velEci.z],
      latDeg: rad2deg(geo.latitude),
      lonDeg: normLon(rad2deg(geo.longitude)),
      altKm,
      speedKmS: speed,
      timeMs,
      orbitClass: classifyOrbit(altKm, inclDeg, e),
    };
  }
}

function rad2deg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function normLon(lon: number): number {
  let x = lon;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

function extractElements(satrec: satellite.SatRec, state: SatelliteState): OrbitalElements {
  const mu = 398_600.4418; // km^3/s^2
  const r = Math.hypot(...state.position);
  const v2 = state.speedKmS * state.speedKmS;
  // Specific orbital energy → semi-major axis.
  const energy = v2 / 2 - mu / r;
  const a = -mu / (2 * energy);
  const e = satrec.ecco;
  const apogee = a * (1 + e) - 6378.137;
  const perigee = a * (1 - e) - 6378.137;
  const periodMin = (2 * Math.PI * Math.sqrt(a ** 3 / mu)) / 60;
  return {
    inclinationDeg: rad2deg(satrec.inclo),
    raanDeg: rad2deg(satrec.nodeo),
    eccentricity: e,
    argPerigeeDeg: rad2deg(satrec.argpo),
    meanAnomalyDeg: rad2deg(satrec.mo),
    // satrec.no is mean motion in rad/min; convert to rev/day.
    meanMotionRevPerDay: (satrec.no * 60 * 24) / (2 * Math.PI),
    periodMinutes: periodMin,
    apogeeKm: apogee,
    perigeeKm: perigee,
  };
}

/**
 * Cumulative special+general relativistic clock offset in seconds, integrated
 * roughly from launch epoch to `date`. This is a first-order estimate suitable
 * for display; a rigorous implementation would integrate the exact orbit.
 */
function relativisticOffset(state: SatelliteState, date: Date): number {
  const c = 299_792.458; // km/s
  const mu = 398_600.4418; // km^3/s^2
  const rEarth = 6378.137;
  const r = rEarth + state.altKm;
  // SR term: -v^2 / (2 c^2) per second.
  const sr = -(state.speedKmS ** 2) / (2 * c * c);
  // GR term: +GM (1/rE - 1/r) / c^2 per second (positive → clock runs faster in weaker field).
  const gr = (mu * (1 / rEarth - 1 / r)) / (c * c);
  const perSecond = sr + gr;
  // Integrate from an arbitrary epoch (2000-01-01) for display purposes.
  const dtSec = (date.getTime() - Date.UTC(2000, 0, 1)) / 1000;
  return perSecond * dtSec;
}

/** Cheap sunlit check: dot product of satellite position with sun direction. */
function isSunlit(state: SatelliteState, date: Date): boolean {
  const sun = sunDirectionEci(date);
  const [x, y, z] = state.position;
  const r = Math.hypot(x, y, z);
  const dot = (x * sun.x + y * sun.y + z * sun.z) / r;
  if (dot >= 0) return true;
  // Behind Earth relative to sun — check if outside Earth's cylindrical shadow.
  const cross = Math.hypot(
    y * sun.z - z * sun.y,
    z * sun.x - x * sun.z,
    x * sun.y - y * sun.x,
  );
  return cross > 6378.137;
}

function sunDirectionEci(date: Date): { x: number; y: number; z: number } {
  // Low-precision solar position, good to ~0.01°. From Astronomical Almanac.
  const jd = date.getTime() / 86_400_000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = ((280.46 + 0.9856474 * n) * Math.PI) / 180;
  const g = ((357.528 + 0.9856003 * n) * Math.PI) / 180;
  const lambda = L + ((1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * Math.PI) / 180;
  const eps = (23.439 * Math.PI) / 180;
  return {
    x: Math.cos(lambda),
    y: Math.cos(eps) * Math.sin(lambda),
    z: Math.sin(eps) * Math.sin(lambda),
  };
}
