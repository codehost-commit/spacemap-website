import * as satellite from 'satellite.js';
import sgp4init from 'satellite.js/lib/propagation/sgp4init.js';
import type { SatRec } from 'satellite.js';
import type { Tle } from '@spacemap/shared';

const MINUTES_PER_DAY = 1440;
const TWO_PI = Math.PI * 2;
const SGP4_EPOCH_OFFSET = 2433281.5;

export function catalogObjectToSatRec(entry: Tle): SatRec | null {
  if (entry.line1 && entry.line2) {
    try {
      const satrec = satellite.twoline2satrec(entry.line1, entry.line2);
      return satrec.error ? null : satrec;
    } catch {
      return null;
    }
  }

  if (
    !Number.isFinite(entry.meanMotion) ||
    !Number.isFinite(entry.eccentricity) ||
    !Number.isFinite(entry.inclinationDeg) ||
    !Number.isFinite(entry.raanDeg) ||
    !Number.isFinite(entry.argPerigeeDeg) ||
    !Number.isFinite(entry.meanAnomalyDeg)
  ) {
    return null;
  }
  const meanMotion = entry.meanMotion ?? Number.NaN;
  const eccentricity = entry.eccentricity ?? Number.NaN;
  const inclinationDeg = entry.inclinationDeg ?? Number.NaN;
  const raanDeg = entry.raanDeg ?? Number.NaN;
  const argPerigeeDeg = entry.argPerigeeDeg ?? Number.NaN;
  const meanAnomalyDeg = entry.meanAnomalyDeg ?? Number.NaN;

  const epoch = new Date(entry.epoch);
  if (!Number.isFinite(epoch.getTime())) return null;
  const epochYear = epoch.getUTCFullYear();
  const yearStart = Date.UTC(epochYear, 0, 1);
  const epochDays = (epoch.getTime() - yearStart) / 86_400_000 + 1;
  const satrec = {
    error: 0,
    satnum: String(entry.noradId),
    epochyr: epochYear,
    epochdays: epochDays,
    jdsatepoch: julianDate(epoch),
    ndot: entry.meanMotionDot ?? 0,
    nddot: entry.meanMotionDDot ?? 0,
    bstar: entry.bstar ?? 0,
    inclo: satellite.degreesToRadians(inclinationDeg),
    nodeo: satellite.degreesToRadians(raanDeg),
    ecco: eccentricity,
    argpo: satellite.degreesToRadians(argPerigeeDeg),
    mo: satellite.degreesToRadians(meanAnomalyDeg),
    no: (meanMotion * TWO_PI) / MINUTES_PER_DAY,
  } as SatRec;

  try {
    sgp4init(satrec, {
      opsmode: 'i',
      satn: String(entry.noradId),
      epoch: satrec.jdsatepoch - SGP4_EPOCH_OFFSET,
      xbstar: satrec.bstar,
      xecco: satrec.ecco,
      xargpo: satrec.argpo,
      xinclo: satrec.inclo,
      xmo: satrec.mo,
      xno: satrec.no,
      xnodeo: satrec.nodeo,
    });
    return satrec.error ? null : satrec;
  } catch {
    return null;
  }
}

function julianDate(date: Date): number {
  return date.getTime() / 86_400_000 + 2440587.5;
}
