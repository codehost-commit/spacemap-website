import * as satellite from 'satellite.js';
import type { Tle } from '@spacemap/shared';
import { catalogObjectToSatRec } from './catalog-satrec.js';

/**
 * Module-level cache of TLEs + parsed SGP4 records, kept OUT of the React
 * store so 30k entries don't trigger re-renders. Fed once by Simulation.load
 * and read synchronously by anything that needs local telemetry: the orbit
 * ribbon, the telemetry panel, etc.
 */
const tles = new Map<number, Tle>();
const satrecs = new Map<number, satellite.SatRec>();

export function setLocalCatalog(items: Tle[], mode: 'replace' | 'append' = 'replace'): void {
  if (mode === 'replace') {
    tles.clear();
    satrecs.clear();
  }
  for (const t of items) {
    if (tles.has(t.noradId)) continue;
    tles.set(t.noradId, t);
    const sr = catalogObjectToSatRec(t);
    if (sr) satrecs.set(t.noradId, sr);
  }
}

export function getLocalTle(noradId: number): Tle | undefined {
  return tles.get(noradId);
}

export function getLocalSatRec(noradId: number): satellite.SatRec | undefined {
  return satrecs.get(noradId);
}

export function localCatalogSize(): number {
  return satrecs.size;
}
