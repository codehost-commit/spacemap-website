import * as satellite from "satellite.js";
import {
  classifyOrbit,
  type OrbitalElements,
  type SatelliteState,
  type SatelliteTelemetry,
} from "@spacemap/shared";
import { getLocalSatRec, getLocalTle } from "./catalog-store.js";

/**
 * Client-side port of the backend telemetry endpoint. Runs entirely in the
 * browser so SpaceMap works on GitHub Pages / any static host — no server
 * round-trip needed to populate the telemetry panel.
 */
export function computeTelemetry(noradId: number, at: Date): SatelliteTelemetry | null {
  const satrec = getLocalSatRec(noradId);
  const tle = getLocalTle(noradId);
  if (!satrec || !tle) return null;

  const pv = satellite.propagate(satrec, at);
  if (!pv || typeof pv.position === "boolean" || typeof pv.velocity === "boolean") return null;
  const gmst = satellite.gstime(at);
  const geo = satellite.eciToGeodetic(pv.position, gmst);
  const altKm = geo.height;
  if (!Number.isFinite(altKm)) return null;

  const inclDeg = rad2deg(satrec.inclo);
  const eccentricity = satrec.ecco;
  const state: SatelliteState = {
    noradId,
    position: [pv.position.x, pv.position.y, pv.position.z],
    velocity: [pv.velocity.x, pv.velocity.y, pv.velocity.z],
    latDeg: rad2deg(geo.latitude),
    lonDeg: normLon(rad2deg(geo.longitude)),
    altKm,
    speedKmS: Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z),
    timeMs: at.getTime(),
    orbitClass: classifyOrbit(altKm, inclDeg, eccentricity),
  };

  const elements = extractElements(satrec, state);
  return {
    meta: { noradId, name: tle.name },
    state,
    elements,
    relativisticOffsetSec: relativisticOffset(state, at),
    sunlit: isSunlit(state, at),
  };
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
    meanMotionRevPerDay: (satrec.no * 60 * 24) / (2 * Math.PI),
    periodMinutes: periodMin,
    apogeeKm: apogee,
    perigeeKm: perigee,
  };
}

function relativisticOffset(state: SatelliteState, date: Date): number {
  const c = 299_792.458;
  const mu = 398_600.4418;
  const rEarth = 6378.137;
  const r = rEarth + state.altKm;
  const sr = -(state.speedKmS ** 2) / (2 * c * c);
  const gr = (mu * (1 / rEarth - 1 / r)) / (c * c);
  const perSecond = sr + gr;
  const dtSec = (date.getTime() - Date.UTC(2000, 0, 1)) / 1000;
  return perSecond * dtSec;
}

function isSunlit(state: SatelliteState, date: Date): boolean {
  const sun = sunDirectionEci(date);
  const [x, y, z] = state.position;
  const r = Math.hypot(x, y, z);
  const dot = (x * sun.x + y * sun.y + z * sun.z) / r;
  if (dot >= 0) return true;
  const cross = Math.hypot(
    y * sun.z - z * sun.y,
    z * sun.x - x * sun.z,
    x * sun.y - y * sun.x,
  );
  return cross > 6378.137;
}

function sunDirectionEci(date: Date): { x: number; y: number; z: number } {
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
