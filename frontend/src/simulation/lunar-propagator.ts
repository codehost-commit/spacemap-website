import type { LunarOrbiterOrbit } from './lunar-catalog.js';

/**
 * Two-body Keplerian propagator for Moon-orbiting spacecraft.
 *
 * Inputs are classical orbital elements in the Moon-centred *inertial*
 * frame (approximately J2000-mean-equator). Outputs come in two flavours:
 *   • inertialPosition — raw ECI-analogue Cartesian at time t.
 *   • bodyFixedPosition — the same, rotated by the Moon's rotation angle
 *     so the point lies in the same frame Cesium is rendering (i.e., the
 *     one the LRO WAC tiles are stitched into).
 *
 * The rotation model is a linearised IAU 2015 fit: W(d) = W0 + Ẇ · d,
 * where d is days since J2000 TDB (we use UTC — the ~70 s TDB−UTC gap
 * shifts the sub-earth longitude by less than 0.01° which is invisible).
 *
 * Kepler's equation is solved with three Newton iterations, which is
 * arcsecond-accurate up to e ≈ 0.9 — well above the eccentricities we
 * carry in the lunar catalogue.
 */

/** Selenocentric gravitational parameter, km³/s². */
const MU_MOON_KM3_S2 = 4902.800118;

/** J2000 epoch in Julian Date (2000-01-01 12:00 TT ≈ UTC for our purposes). */
const JD_J2000 = 2451545.0;

/** IAU 2015 Moon rotation model (mean-earth/polar-axis). Degrees. */
const MOON_W0_DEG = 38.3213;
const MOON_W_RATE_DEG_PER_DAY = 13.17635815;

const DEG = Math.PI / 180;

export interface Cartesian3 {
  x: number;
  y: number;
  z: number;
}

/** Convenience: build a Cartesian3 without allocating a Cesium type. */
function xyz(x: number, y: number, z: number): Cartesian3 {
  return { x, y, z };
}

/** Julian Date from a JS Date (UTC). */
function dateToJD(d: Date): number {
  return d.getTime() / 86_400_000 + 2440587.5;
}

/** Moon rotation angle W (radians) at the given time. */
export function moonRotationAngle(date: Date): number {
  const dSinceJ2000 = dateToJD(date) - JD_J2000;
  const wDeg = MOON_W0_DEG + MOON_W_RATE_DEG_PER_DAY * dSinceJ2000;
  return wDeg * DEG;
}

/**
 * Rotate an inertial-frame vector into the Moon body-fixed frame by −W
 * around the Z axis. Reverse of "unrotate the sky into the ground".
 */
export function rotateInertialToBodyFixed(p: Cartesian3, date: Date): Cartesian3 {
  const w = moonRotationAngle(date);
  const c = Math.cos(-w);
  const s = Math.sin(-w);
  return xyz(c * p.x - s * p.y, s * p.x + c * p.y, p.z);
}

/**
 * Mean motion n (rad/s) from semi-major axis (km).
 * n = sqrt(mu / a^3).
 */
export function meanMotion(a_km: number): number {
  return Math.sqrt(MU_MOON_KM3_S2 / (a_km * a_km * a_km));
}

/** Orbital period (seconds) — 2π / n. */
export function orbitalPeriodSec(a_km: number): number {
  return (2 * Math.PI) / meanMotion(a_km);
}

/**
 * Solve Kepler's equation E − e·sin E = M using Newton's method.
 * Three iterations gets arcsecond precision for e < 0.9.
 */
function solveKepler(M: number, e: number): number {
  let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
  for (let k = 0; k < 3; k++) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

/**
 * Propagate a Keplerian orbit to time `at` and return the position in the
 * Moon-centred inertial frame. Units: kilometres.
 */
export function inertialPosition(orbit: LunarOrbiterOrbit, at: Date): Cartesian3 {
  const epoch = new Date(orbit.epoch);
  const dtSec = (at.getTime() - epoch.getTime()) / 1000;

  const a = orbit.a_km;
  const e = orbit.e;
  const n = meanMotion(a);
  const M0 = orbit.m0_deg * DEG;
  let M = M0 + n * dtSec;
  M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  const E = solveKepler(M, e);

  // Position in the orbital plane (perifocal frame): x_p toward periapsis.
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const xp = a * (cosE - e);
  const yp = a * Math.sqrt(1 - e * e) * sinE;

  // Perifocal → inertial via 3-1-3 rotation: Rz(RAAN) · Rx(i) · Rz(argp).
  const O = orbit.raan_deg * DEG;
  const i = orbit.i_deg * DEG;
  const w = orbit.argp_deg * DEG;

  const cosO = Math.cos(O);
  const sinO = Math.sin(O);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);

  // Combined rotation matrix elements (perifocal → inertial):
  const R11 = cosO * cosW - sinO * sinW * cosI;
  const R12 = -cosO * sinW - sinO * cosW * cosI;
  const R21 = sinO * cosW + cosO * sinW * cosI;
  const R22 = -sinO * sinW + cosO * cosW * cosI;
  const R31 = sinW * sinI;
  const R32 = cosW * sinI;

  return xyz(R11 * xp + R12 * yp, R21 * xp + R22 * yp, R31 * xp + R32 * yp);
}

/**
 * Convenience — returns the Moon body-fixed position (in km) directly.
 * This is the frame Cesium is rendering the LRO tiles in.
 */
export function bodyFixedPosition(orbit: LunarOrbiterOrbit, at: Date): Cartesian3 {
  return rotateInertialToBodyFixed(inertialPosition(orbit, at), at);
}

/**
 * Snapshot of an orbit at a moment in time — the numbers a telemetry panel
 * or ground track wants without recomputing them.
 */
export interface OrbitSample {
  posBodyFixedKm: Cartesian3;
  posInertialKm: Cartesian3;
  altitudeKm: number;
  speedKmS: number;
  lat_deg: number;
  lon_deg: number;
  periodMin: number;
}

const MOON_RADIUS_KM = 1737.4;

/**
 * Sample a lunar orbit at `at` and return the full telemetry set. Speed is
 * computed by finite-difference over a small dt — cheaper and less
 * error-prone than deriving it analytically from the orbital elements.
 */
export function sampleOrbit(orbit: LunarOrbiterOrbit, at: Date): OrbitSample {
  const dtSec = 1;
  const now = inertialPosition(orbit, at);
  const later = inertialPosition(orbit, new Date(at.getTime() + dtSec * 1000));
  const speedKmS = Math.hypot(later.x - now.x, later.y - now.y, later.z - now.z) / dtSec;

  const bf = rotateInertialToBodyFixed(now, at);
  const rKm = Math.hypot(bf.x, bf.y, bf.z);
  const altitudeKm = rKm - MOON_RADIUS_KM;
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

/**
 * Sun direction as a unit vector in the ECI / J2000 mean-equator frame.
 * Low-precision Meeus formula — the same one Cesium uses internally for
 * its SunLight and the Earth terminator.
 *
 * This is the frame Cesium implicitly uses for lighting on custom
 * ellipsoids (it doesn't know a rotation model for the Moon, so its
 * shading treats body-fixed positions as if they were inertial). The
 * LunarTerminator overlays a line in this same frame so it aligns with
 * what Cesium is actually drawing on the surface.
 */
export function sunDirectionInertial(date: Date): Cartesian3 {
  const jd = dateToJD(date);
  const n = jd - JD_J2000;
  const L = ((280.46 + 0.9856474 * n) * Math.PI) / 180;
  const g = ((357.528 + 0.9856003 * n) * Math.PI) / 180;
  const lambda = L + ((1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * Math.PI) / 180;
  const eps = (23.439 * Math.PI) / 180;
  return xyz(Math.cos(lambda), Math.cos(eps) * Math.sin(lambda), Math.sin(eps) * Math.sin(lambda));
}

/**
 * Sun direction in the Moon body-fixed frame. Same as `sunDirectionInertial`
 * with the current Moon rotation angle W folded in — useful for isSunlit()
 * style checks against body-fixed positions where consistency between the
 * two vectors matters more than absolute frame correctness.
 */
export function sunDirectionMoonFixed(date: Date): Cartesian3 {
  return rotateInertialToBodyFixed(sunDirectionInertial(date), date);
}

/**
 * Is the point (on or above the Moon's surface) currently in sunlight?
 * A point is sunlit when its position vector has a positive dot product
 * with the sun direction (both in the same frame).
 */
export function isSunlit(posBodyFixedKm: Cartesian3, date: Date): boolean {
  const s = sunDirectionMoonFixed(date);
  return posBodyFixedKm.x * s.x + posBodyFixedKm.y * s.y + posBodyFixedKm.z * s.z > 0;
}
