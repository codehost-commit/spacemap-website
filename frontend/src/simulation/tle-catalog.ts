import type { Tle } from '@spacemap/shared';

/**
 * TLE loading strategy for the deployed site (Pages) and local dev:
 *
 *   1. In dev, try the local SpaceMap backend at `/api/tles` — instant, warm-
 *      started from disk. Skipped in production so we don't spam 404s.
 *   2. Try the bundled snapshot at `${base}data/tles.txt`. This file is
 *      fetched from CelesTrak *at build time* by the GitHub Actions workflow
 *      (server-side, so CORS doesn't apply) and shipped as a static asset.
 *   3. Try CelesTrak directly. Historically CORS-open, but the endpoint has
 *      recently started returning 403 to browser fetches. Left in as a
 *      best-effort refresh.
 *   4. Try a public CORS proxy over CelesTrak. Last resort — public proxies
 *      are flaky, but occasionally save the day.
 */

const CELESTRAK_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';
const CORS_PROXY_URL = 'https://corsproxy.io/?url=' + encodeURIComponent(CELESTRAK_URL);
const BUNDLED_URL = `${import.meta.env.BASE_URL}data/tles.txt`;
const IS_DEV = import.meta.env.DEV;

export async function fetchTles(): Promise<Tle[]> {
  const attempts: Array<{ label: string; run: () => Promise<Tle[]> }> = [];
  if (IS_DEV) attempts.push({ label: 'backend /api/tles', run: tryBackend });
  attempts.push({ label: 'bundled snapshot', run: tryBundled });
  attempts.push({ label: 'CelesTrak direct', run: tryCelestrak });
  attempts.push({ label: 'CORS proxy', run: tryProxy });

  const errors: string[] = [];
  for (const attempt of attempts) {
    try {
      const tles = await attempt.run();
      if (tles.length > 0) {
        console.info(`[tle] loaded ${tles.length} objects via ${attempt.label}`);
        return tles;
      }
      errors.push(`${attempt.label}: empty`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${attempt.label}: ${msg}`);
      console.warn(`[tle] ${attempt.label} failed:`, msg);
    }
  }
  throw new Error(
    `TLE catalog unavailable — tried ${errors.length} sources:\n  ${errors.join('\n  ')}`,
  );
}

async function tryBackend(): Promise<Tle[]> {
  const res = await fetch('/api/tles', { signal: AbortSignal.timeout(2500) });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const body = (await res.json()) as { count: number; tles: Tle[] };
  return body.tles;
}

async function tryBundled(): Promise<Tle[]> {
  const res = await fetch(BUNDLED_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const text = await res.text();
  const tles = parseTleText(text);
  if (tles.length === 0) throw new Error('no TLEs parsed');
  return tles;
}

async function tryCelestrak(): Promise<Tle[]> {
  const res = await fetch(CELESTRAK_URL);
  if (!res.ok) throw new Error(`status ${res.status}`);
  return parseTleText(await res.text());
}

async function tryProxy(): Promise<Tle[]> {
  const res = await fetch(CORS_PROXY_URL);
  if (!res.ok) throw new Error(`status ${res.status}`);
  return parseTleText(await res.text());
}

/**
 * Parse a CelesTrak-style 3-line TLE text blob (name, line1, line2 repeating).
 * Copy of the backend parser so the frontend has no server dependency.
 */
export function parseTleText(text: string): Tle[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter(Boolean);
  const out: Tle[] = [];
  const seen = new Set<number>();
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i].trim();
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (!l1.startsWith('1 ') || !l2.startsWith('2 ')) {
      i -= 2;
      continue;
    }
    const noradId = Number(l1.slice(2, 7).trim());
    if (!Number.isFinite(noradId)) continue;
    if (seen.has(noradId)) continue;
    seen.add(noradId);
    out.push({ noradId, name, line1: l1, line2: l2, epoch: parseTleEpoch(l1) });
  }
  return out;
}

function parseTleEpoch(line1: string): string {
  const yy = Number(line1.slice(18, 20));
  const dayOfYear = Number(line1.slice(20, 32));
  if (!Number.isFinite(yy) || !Number.isFinite(dayOfYear)) return new Date().toISOString();
  const fullYear = yy < 57 ? 2000 + yy : 1900 + yy;
  const ms = Date.UTC(fullYear, 0, 1) + (dayOfYear - 1) * 86_400_000;
  return new Date(ms).toISOString();
}
