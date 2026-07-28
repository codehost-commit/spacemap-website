export const config = {
  port: Number(process.env.PORT ?? 4000),
  /**
   * CelesTrak "active" group — payloads currently on-orbit and tracked.
   * Swap or extend at runtime via the TLE_SOURCES env var (comma-separated URLs).
   */
  tleSources: (
    process.env.TLE_SOURCES ?? 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  /** How often to re-fetch TLE data. CelesTrak asks for >=2h between fetches. */
  tleRefreshMs: Number(process.env.TLE_REFRESH_MS ?? 4 * 60 * 60 * 1000),
  /** How often the propagator emits a new batch of positions over the WS. */
  broadcastIntervalMs: Number(process.env.BROADCAST_INTERVAL_MS ?? 1000),
  /** Local cache file so a restart doesn't require an immediate re-fetch. */
  cacheFile: process.env.TLE_CACHE_FILE ?? './data/tle-cache/active.tle',
};
