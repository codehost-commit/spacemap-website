import { Router } from "express";
import type { TleCatalog } from "../tle/catalog.js";
import type { Propagator } from "../propagation/propagator.js";

export function buildRoutes(catalog: TleCatalog, propagator: Propagator): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({
      ok: true,
      catalogSize: catalog.size,
      propagatorSize: propagator.size,
      serverTimeMs: Date.now(),
    });
  });

  /** Lightweight index: id + name + latest TLE epoch. */
  router.get("/satellites", (_req, res) => {
    const list = catalog.all.map((t) => ({
      noradId: t.noradId,
      name: t.name,
      epoch: t.epoch,
    }));
    res.json({ count: list.length, satellites: list });
  });

  /**
   * Full TLE catalog. The frontend downloads this once and propagates locally
   * in a Web Worker so motion is smooth at 60 FPS independent of network I/O.
   */
  router.get("/tles", (_req, res) => {
    res.json({ count: catalog.size, tles: catalog.all });
  });

  /** Raw TLE + name for one satellite — used by the client to compute trails locally. */
  router.get("/satellites/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "invalid id" });
    }
    const t = catalog.get(id);
    if (!t) return res.status(404).json({ error: "not found" });
    return res.json(t);
  });

  /** Full propagated telemetry for one satellite at "now". */
  router.get("/satellites/:id/telemetry", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "invalid id" });
    }
    const t = propagator.telemetry(id, new Date());
    if (!t) return res.status(404).json({ error: "not found or propagation failed" });
    return res.json(t);
  });

  return router;
}
