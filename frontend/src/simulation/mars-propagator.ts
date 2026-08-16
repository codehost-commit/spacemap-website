import type { MarsOrbiterOrbit } from './mars-catalog.js';

/**
 * Two-body Keplerian propagator for Mars-orbiting spacecraft — the Mars
 * twin of lunar-propagator.ts. Same numerical approach (Newton on Kepler,
 * 3-1-3 perifocal→inertial rotation), just with Mars constants substituted.
 *
 * The rotation model is the IAU 2015 fit for Mars:
 *   W(d) = 176.630° + 350.891982443297° · d
 * where d = days since J2000 (TDB, but UTC is close enough for a viewer).
 * That's ~360.99°/day → the sidereal Mars rotation period of 24h 37m 22s.
 */

/** Areocentric (Mars-centred) gravitational parameter, km³/s². */
const MU_MARS_KM3_S2 = 42_828.375816;

/** J2000 epoch (2000-01-01 12:00 TT ≈ UTC for our purposes). */
const JD_J2000 = 2_451_545.0;

/** IAU 2015 Mars rotation model — degrees, degrees/day. */
const MARS_W0_DEG = 176.630;
const MARS_W_RATE_DEG_PER_DAY = 350.891982443297;

const DEG = Math.PI / 180;

export interface Cartesian3 {
  x: number;
  y: number;
  z: number;
}

function xyz(x: number, y: number, z: number): Cartesian3 {
  return { x, y, z };
}

function dateToJD(d: Date): number {
  return d.getTime() / 86_400_000 + 2_440_587.5;
}

/** Mars rotation angle W (radians) at the given time. */
export function marsRotationAngle(date: Date): number {
  const dSinceJ2000 = dateToJD(date) - JD_J2000;
  return (MARS_W0_DEG + MARS_W_RATE_DEG_PER_DAY * dSinceJ2000) * DEG;
}

export function rotateInertialToBodyFixed(p: Cartesian3, date: Date): Cartesian3 {
  const w = marsRotationAngle(date);
  const c = Math.cos(-w);
  const s = Math.sin(-w);
  return xyz(c * p.x - s * p.y, s * p.x + c * p.y, p.z);
}

export function meanMotion(a_km: number): number {
  return Math.sqrt(MU_MARS_KM3_S2 / (a_km * a_km * a_km));
}

export function orbitalPeriodSec(a_km: number): number {
  return (2 * Math.PI) / meanMotion(a_km);
}

function solveKepler(M: number, e: number): number {
  let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
  for (let k = 0; k < 3; k++) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

export function inertialPosition(orbit: MarsOrbiterOrbit, at: Date): Cartesian3 {
  const epoch = new Date(orbit.epoch);
  const dtSec = (at.getTime() - epoch.getTime()) / 1000;

  const a = orbit.a_km;
  const e = orbit.e;
  const n = meanMotion(a);
  const M0 = orbit.m0_deg * DEG;
  let M = M0 + n * dtSec;
  M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  const E = solveKepler(M, e);

  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const xp = a * (cosE - e);
  const yp = a * Math.sqrt(1 - e * e) * sinE;

  const O = orbit.raan_deg * DEG;
  const i = orbit.i_deg * DEG;
  const w = orbit.argp_deg * DEG;

  const cosO = Math.cos(O);
  const sinO = Math.sin(O);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);

  const R11 = cosO * cosW - sinO * sinW * cosI;
  const R12 = -cosO * sinW - sinO * cosW * cosI;
  const R21 = sinO * cosW + cosO * sinW * cosI;
  const R22 = -sinO * sinW + cosO * cosW * cosI;
  const R31 = sinW * sinI;
  const R32 = cosW * sinI;

  return xyz(R11 * xp + R12 * yp, R21 * xp + R22 * yp, R31 * xp + R32 * yp);
}

export function bodyFixedPosition(orbit: MarsOrbiterOrbit, at: Date): Cartesian3 {
  return rotateInertialToBodyFixed(inertialPosition(orbit, at), at);
}

export interface OrbitSample {
  posBodyFixedKm: Cartesian3;
  posInertialKm: Cartesian3;
  altitudeKm: number;
  speedKmS: number;
  lat_deg: number;
  lon_deg: number;
  periodMin: number;
}

const MARS_RADIUS_KM = 3389.5;

export function sampleOrbit(orbit: MarsOrbiterOrbit, at: Date): OrbitSample {
  const dtSec = 1;
  const now = inertialPosition(orbit, at);
  const later = inertialPosition(orbit, new Date(at.getTime() + dtSec * 1000));
  const speedKmS = Math.hypot(later.x - now.x, later.y - now.y, later.z - now.z) / dtSec;

  const bf = rotateInertialToBodyFixed(now, at);
  const rKm = Math.hypot(bf.x, bf.y, bf.z);
  const altitudeKm = rKm - MARS_RADIUS_KM;
  const lat_deg = (Math.asin(bf.z / rKm) * 180) / Math.PI;
  const lon_deg = (Math.atan2(bf.y, bf.x) * 180) / Math.PI;

  return {
    posBodyFixedKm: bf,
    posInertialKm: now,
    altitudeKm,
    speedKmS,
    lat_deg,
    lon_deg,
    periodMin: orbitalPeriodSec(orbit.a_km) / 60,
  };
}
