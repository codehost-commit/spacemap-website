import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Tle } from '@spacemap/shared';
import { config } from '../config.js';
import { parseTleText } from './parse.js';

/**
 * TleSource abstraction lets us swap CelesTrak for Space-Track, a local
 * snapshot, or a higher-precision ephemeris provider without touching callers.
 */
export interface TleSource {
  fetchAll(): Promise<Tle[]>;
}

export class CelestrakSource implements TleSource {
  constructor(private readonly urls: string[] = config.tleSources) {}

  async fetchAll(): Promise<Tle[]> {
    const results = await Promise.allSettled(
      this.urls.map(async (url) => {
        const res = await fetch(url, { headers: { 'User-Agent': 'SpaceMap/0.1 (+dev)' } });
        if (!res.ok) throw new Error(`TLE fetch ${url} → ${res.status}`);
        return res.text();
      }),
    );

    const merged: Tle[] = [];
    const seen = new Set<number>();
    for (const r of results) {
      if (r.status === 'rejected') {
        console.warn('[tle] source failed:', r.reason);
        continue;
      }
      for (const tle of parseTleText(r.value)) {
        if (seen.has(tle.noradId)) continue;
        seen.add(tle.noradId);
        merged.push(tle);
      }
    }
    if (merged.length > 0) {
      await this.writeCache(merged);
    }
    return merged;
  }

  /** Read whatever's on disk if the network is down at boot. */
  async loadCache(): Promise<Tle[]> {
    try {
      const text = await readFile(config.cacheFile, 'utf8');
      return parseTleText(text);
    } catch {
      return [];
    }
  }

  private async writeCache(tles: Tle[]): Promise<void> {
    try {
      await mkdir(dirname(config.cacheFile), { recursive: true });
      const text = tles.map((t) => `${t.name}\n${t.line1}\n${t.line2}`).join('\n') + '\n';
      await writeFile(config.cacheFile, text, 'utf8');
    } catch (err) {
      console.warn('[tle] cache write failed:', err);
    }
  }
}
