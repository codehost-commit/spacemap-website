import type { Tle } from "@spacemap/shared";

/**
 * Direct CelesTrak endpoint used when the SpaceMap backend isn't running
 * (production static hosting, e.g. GitHub Pages). CelesTrak explicitly
 * allows browser fetches via `Access-Control-Allow-Origin: *`.
 */
const CELESTRAK_URL =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle";

/**
 * Fetch the TLE catalog. In dev, the Vite proxy exposes the local backend
 * on `/api/tles` which serves a warm-started, cached catalog. When that path
 * isn't reachable — GitHub Pages, offline preview, whatever — we fall back
 * to CelesTrak directly and parse the raw TLE text in the browser.
 */
export async function fetchTles(): Promise<Tle[]> {
  const viaBackend = await tryBackend();
  if (viaBackend && viaBackend.length > 0) return viaBackend;
  return await fetchFromCelestrak();
}

async function tryBackend(): Promise<Tle[] | null> {
  try {
    const res = await fetch("/api/tles", { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const body = (await res.json()) as { count: number; tles: Tle[] };
    return body.tles;
  } catch {
    return null;
  }
}

async function fetchFromCelestrak(): Promise<Tle[]> {
  const attempts = [CELESTRAK_URL];
  let lastErr: unknown;
  for (let i = 0; i < 4; i++) {
    for (const url of attempts) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`CelesTrak ${res.status}`);
        const text = await res.text();
        const tles = parseTleText(text);
        if (tles.length > 0) return tles;
        throw new Error("CelesTrak returned no TLEs");
      } catch (err) {
        lastErr = err;
      }
    }
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  throw new Error(
    `TLE catalog unavailable: ${lastErr instanceof Error ? lastErr.message : lastErr}`,
  );
}

/**
 * Parse a CelesTrak-style 3-line TLE text blob (name, line1, line2 repeating).
 * Copy of the backend parser so the frontend has no server dependency.
 */
export function parseTleText(text: string): Tle[] {
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
  const out: Tle[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i].trim();
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (!l1.startsWith("1 ") || !l2.startsWith("2 ")) {
      i -= 2;
      continue;
    }
    const noradId = Number(l1.slice(2, 7).trim());
    if (!Number.isFinite(noradId)) continue;
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
