import type { Tle } from "@spacemap/shared";

/**
 * Fetches the whole TLE catalog from the backend. Retries with backoff so a
 * cold backend (still refreshing from CelesTrak) doesn't fail the app.
 */
export async function fetchTles(signal?: AbortSignal): Promise<Tle[]> {
  let attempt = 0;
  let delay = 500;
  while (attempt < 6) {
    try {
      const res = await fetch("/api/tles", { signal });
      if (!res.ok) throw new Error(`GET /api/tles → ${res.status}`);
      const body = (await res.json()) as { count: number; tles: Tle[] };
      if (body.tles.length > 0) return body.tles;
    } catch (err) {
      if (signal?.aborted) throw err;
      // fall through to retry
    }
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 2, 5000);
    attempt++;
  }
  throw new Error("TLE catalog unavailable after retries");
}
