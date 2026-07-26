import type { Tle } from "@spacemap/shared";
import { config } from "../config.js";
import { CelestrakSource } from "./source.js";

/**
 * In-memory TLE catalog with periodic refresh and disk-cache warm start.
 * Emits an event whenever the catalog is replaced so downstream services
 * (propagator, WS) can rebuild their state.
 */
export class TleCatalog {
  private tles = new Map<number, Tle>();
  private listeners = new Set<(tles: Tle[]) => void>();
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly source = new CelestrakSource()) {}

  /** All TLEs, sorted by NORAD id for stable iteration. */
  get all(): Tle[] {
    return [...this.tles.values()].sort((a, b) => a.noradId - b.noradId);
  }

  get size(): number {
    return this.tles.size;
  }

  get(noradId: number): Tle | undefined {
    return this.tles.get(noradId);
  }

  onUpdate(cb: (tles: Tle[]) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async start(): Promise<void> {
    // Warm start from cache so we can serve requests instantly.
    const cached = await this.source.loadCache();
    if (cached.length > 0) {
      this.replace(cached);
      console.log(`[tle] warm start from cache: ${cached.length} objects`);
    }
    await this.refresh();
    this.timer = setInterval(() => {
      this.refresh().catch((err) => console.error("[tle] refresh failed:", err));
    }, config.tleRefreshMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async refresh(): Promise<void> {
    try {
      const fetched = await this.source.fetchAll();
      if (fetched.length === 0) {
        console.warn("[tle] refresh returned 0 objects; keeping previous catalog");
        return;
      }
      this.replace(fetched);
      console.log(`[tle] refreshed: ${fetched.length} objects`);
    } catch (err) {
      console.error("[tle] refresh error:", err);
    }
  }

  private replace(tles: Tle[]): void {
    this.tles.clear();
    for (const t of tles) this.tles.set(t.noradId, t);
    for (const l of this.listeners) {
      try {
        l(tles);
      } catch (err) {
        console.error("[tle] listener error:", err);
      }
    }
  }
}
