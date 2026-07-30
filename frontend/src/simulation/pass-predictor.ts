import * as satellite from 'satellite.js';
import { getLocalSatRec } from './catalog-store.js';

/**
 * Visible satellite pass predictor.
 *
 * A pass is "visible" when ALL three conditions hold simultaneously:
 *   1. Satellite is above the observer's horizon (elevation > minElev)
 *   2. Satellite is sunlit (not in Earth's shadow)
 *   3. Observer is in darkness or civil twilight (sun below ~-6 degrees)
 *
 * After computing raw passes, we filter by weather (cloud cover from
 * Open-Meteo) and moon brightness.
 */

export interface VisiblePass {
  noradId: number;
  name: string;
  riseTime: Date;
  peakTime: Date;
  setTime: Date;
  peakElevDeg: number;
  riseAzDeg: number;
  setAzDeg: number;
  peakAzDeg: number;
  magnitude: 'bright' | 'moderate' | 'dim';
  durationSec: number;
  /** 0-100 cloud cover at the hour of the pass */
  cloudCoverPct: number | null;
  /** true = pass is likely not visible due to clouds */
  weatherBlocked: boolean;
  /** true = pass might be washed out by moon brightness */
  moonWashout: boolean;
}

interface ObserverLoc {
  latDeg: number;
  lonDeg: number;
  altKm: number;
}

const DEG = Math.PI / 180;
const EARTH_R = 6378.137;
const STEP_SEC = 30; // coarse sweep step
const FINE_STEP_SEC = 5; // refinement step around peak
const PREDICT_HOURS = 24;

// ── Solar position (low-precision, good enough for twilight checks) ──────────

function solarElevationDeg(date: Date, latDeg: number, lonDeg: number): number {
  const jd = date.getTime() / 86_400_000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * DEG;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG;
  const eps = 23.439 * DEG;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const gmst = (280.46061837 + 360.98564736629 * n) % 360;
  const lha = (gmst + lonDeg) * DEG - ra;
  const lat = latDeg * DEG;
  const sinEl = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(lha);
  return Math.asin(sinEl) / DEG;
}

// ── Moon illumination fraction (simplified) ──────────────────────────────────

function moonIlluminationFraction(date: Date): number {
  // Approximate synodic month = 29.53 days. Phase 0 = new moon, 0.5 = full.
  const jd = date.getTime() / 86_400_000 + 2440587.5;
  const daysSinceKnownNew = jd - 2451550.1; // Jan 6, 2000 new moon
  const phase = ((daysSinceKnownNew / 29.53) % 1 + 1) % 1;
  return (1 - Math.cos(2 * Math.PI * phase)) / 2;
}

// ── Satellite sunlit check ───────────────────────────────────────────────────

function isSatSunlit(eciPos: { x: number; y: number; z: number }, date: Date): boolean {
  const jd = date.getTime() / 86_400_000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = ((280.46 + 0.9856474 * n) * Math.PI) / 180;
  const g = ((357.528 + 0.9856003 * n) * Math.PI) / 180;
  const lambda = L + ((1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * Math.PI) / 180;
  const eps = (23.439 * Math.PI) / 180;
  const sunX = Math.cos(lambda);
  const sunY = Math.cos(eps) * Math.sin(lambda);
  const sunZ = Math.sin(eps) * Math.sin(lambda);

  const { x, y, z } = eciPos;
  const r = Math.hypot(x, y, z);
  const dot = (x * sunX + y * sunY + z * sunZ) / r;
  if (dot >= 0) return true;
  const cross = Math.hypot(
    y * sunZ - z * sunY,
    z * sunX - x * sunZ,
    x * sunY - y * sunX,
  );
  return cross > EARTH_R;
}

// ── Look-angle computation ───────────────────────────────────────────────────

interface LookAngle {
  elevDeg: number;
  azDeg: number;
  rangeKm: number;
}

function lookAngle(
  obs: ObserverLoc,
  eciPos: { x: number; y: number; z: number },
  gmst: number,
): LookAngle {
  const latR = obs.latDeg * DEG;
  const lonR = obs.lonDeg * DEG;
  const f = 1 / 298.257223563;
  const e2 = 2 * f - f * f;
  const sinLat = Math.sin(latR);
  const cosLat = Math.cos(latR);
  const N = EARTH_R / Math.sqrt(1 - e2 * sinLat * sinLat);
  const h = obs.altKm;

  // Observer ECEF
  const obsEcef = {
    x: (N + h) * cosLat * Math.cos(lonR),
    y: (N + h) * cosLat * Math.sin(lonR),
    z: (N * (1 - e2) + h) * sinLat,
  };

  // Sat ECI → ECEF via GMST rotation
  const cosG = Math.cos(gmst);
  const sinG = Math.sin(gmst);
  const satEcef = {
    x: cosG * eciPos.x + sinG * eciPos.y,
    y: -sinG * eciPos.x + cosG * eciPos.y,
    z: eciPos.z,
  };

  const dx = satEcef.x - obsEcef.x;
  const dy = satEcef.y - obsEcef.y;
  const dz = satEcef.z - obsEcef.z;

  // ENU
  const sinLon = Math.sin(lonR);
  const cosLon = Math.cos(lonR);
  const east = -sinLon * dx + cosLon * dy;
  const north = -sinLat * cosLon * dx - sinLat * sinLon * dy + cosLat * dz;
  const up = cosLat * cosLon * dx + cosLat * sinLon * dy + sinLat * dz;

  const range = Math.hypot(east, north, up);
  const elev = Math.asin(up / range) / DEG;
  let az = Math.atan2(east, north) / DEG;
  if (az < 0) az += 360;

  return { elevDeg: elev, azDeg: az, rangeKm: range };
}

// ── Main predictor ───────────────────────────────────────────────────────────

interface RawPassPoint {
  date: Date;
  elevDeg: number;
  azDeg: number;
  sunlit: boolean;
  observerDark: boolean;
}

/**
 * Predict visible passes for a set of NORAD IDs over the next 24 hours.
 * Only returns passes where the satellite is sunlit while the observer
 * is in at least civil twilight.
 */
export function predictPasses(
  noradIds: number[],
  nameMap: Map<number, string>,
  obs: ObserverLoc,
  minElevDeg = 10,
): VisiblePass[] {
  const now = new Date();
  const endMs = now.getTime() + PREDICT_HOURS * 3600_000;
  const results: VisiblePass[] = [];

  for (const noradId of noradIds) {
    const satrec = getLocalSatRec(noradId);
    if (!satrec) continue;

    // Coarse sweep to find above-horizon + sunlit + observer-dark windows
    let inPass = false;
    let passPoints: RawPassPoint[] = [];

    for (let ms = now.getTime(); ms <= endMs; ms += STEP_SEC * 1000) {
      const date = new Date(ms);
      const pv = satellite.propagate(satrec, date);
      if (!pv || typeof pv.position === 'boolean') continue;

      const gmst = satellite.gstime(date);
      const la = lookAngle(obs, pv.position, gmst);
      const sunlit = isSatSunlit(pv.position, date);
      const sunElev = solarElevationDeg(date, obs.latDeg, obs.lonDeg);
      const observerDark = sunElev < -2; // allow civil twilight

      const aboveHorizon = la.elevDeg >= 0;

      if (aboveHorizon) {
        if (!inPass) {
          inPass = true;
          passPoints = [];
        }
        passPoints.push({
          date,
          elevDeg: la.elevDeg,
          azDeg: la.azDeg,
          sunlit,
          observerDark,
        });
      } else if (inPass) {
        // Pass ended — check if any points were visible
        const visiblePoints = passPoints.filter((p) => p.sunlit && p.observerDark && p.elevDeg >= minElevDeg);
        if (visiblePoints.length > 0) {
          const peak = visiblePoints.reduce((a, b) => (b.elevDeg > a.elevDeg ? b : a));
          const rise = visiblePoints[0];
          const set = visiblePoints[visiblePoints.length - 1];
          const durationSec = (set.date.getTime() - rise.date.getTime()) / 1000;

          results.push({
            noradId,
            name: nameMap.get(noradId) ?? `#${noradId}`,
            riseTime: rise.date,
            peakTime: peak.date,
            setTime: set.date,
            peakElevDeg: peak.elevDeg,
            riseAzDeg: rise.azDeg,
            setAzDeg: set.azDeg,
            peakAzDeg: peak.azDeg,
            magnitude: peak.elevDeg > 60 ? 'bright' : peak.elevDeg > 30 ? 'moderate' : 'dim',
            durationSec,
            cloudCoverPct: null,
            weatherBlocked: false,
            moonWashout: false,
          });
        }
        inPass = false;
        passPoints = [];
      }
    }
  }

  // Sort by time
  results.sort((a, b) => a.riseTime.getTime() - b.riseTime.getTime());
  return results;
}

// ── Weather overlay (Open-Meteo, free, no API key) ───────────────────────────

interface HourlyWeather {
  time: string[];
  cloud_cover: number[];
}

let weatherCache: { lat: number; lon: number; data: HourlyWeather; fetchedAt: number } | null = null;

export async function fetchWeather(
  latDeg: number,
  lonDeg: number,
): Promise<HourlyWeather | null> {
  // Cache for 30 min, reuse if same location (within 0.1 deg)
  if (
    weatherCache &&
    Math.abs(weatherCache.lat - latDeg) < 0.1 &&
    Math.abs(weatherCache.lon - lonDeg) < 0.1 &&
    Date.now() - weatherCache.fetchedAt < 30 * 60_000
  ) {
    return weatherCache.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latDeg.toFixed(4)}&longitude=${lonDeg.toFixed(4)}&hourly=cloud_cover&forecast_days=2&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const data: HourlyWeather = {
      time: json.hourly.time,
      cloud_cover: json.hourly.cloud_cover,
    };
    weatherCache = { lat: latDeg, lon: lonDeg, data, fetchedAt: Date.now() };
    return data;
  } catch {
    return null;
  }
}

/**
 * Enrich passes with weather data and moon washout.
 */
export function applyWeatherFilter(
  passes: VisiblePass[],
  weather: HourlyWeather | null,
): VisiblePass[] {
  const moonIllum = moonIlluminationFraction(new Date());
  const moonBright = moonIllum > 0.75;

  return passes.map((pass) => {
    let cloudCoverPct: number | null = null;

    if (weather) {
      // Find the closest hour in weather data to the peak time
      const peakMs = pass.peakTime.getTime();
      let bestIdx = 0;
      let bestDiff = Infinity;
      for (let i = 0; i < weather.time.length; i++) {
        const diff = Math.abs(new Date(weather.time[i]).getTime() - peakMs);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      }
      cloudCoverPct = weather.cloud_cover[bestIdx];
    }

    return {
      ...pass,
      cloudCoverPct,
      weatherBlocked: cloudCoverPct != null && cloudCoverPct > 70,
      moonWashout: moonBright && pass.magnitude === 'dim',
    };
  });
}
