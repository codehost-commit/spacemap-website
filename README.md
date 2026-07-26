# SpaceMap — Orbital Nexus

Real-time, browser-based satellite intelligence and visualization. **Phases 1 – 4 shipped.**

## Feature matrix

| Feature                                    | Status | Where |
| ------------------------------------------ | ------ | ----- |
| Realistic 3D Earth (day/night, atmosphere, stars) | ✅ | `frontend/src/cesium/globe.ts` |
| Live TLE ingest + disk cache (CelesTrak) | ✅ | `backend/src/tle/*` |
| SGP4 propagation for the full catalog (client-side, Web Worker) | ✅ | `frontend/src/workers/propagator.worker.ts` |
| Points colored by orbit class (LEO/MEO/GEO/HEO/POLAR/SSO) | ✅ | `frontend/src/cesium/satellite-layer.ts` |
| Click-to-select + live telemetry panel | ✅ | `frontend/src/components/TelemetryPanel.tsx` |
| Orbital ribbon for selected satellite (±½ period) | ✅ | `frontend/src/cesium/orbit-trail.ts` |
| **Time controls** (pause, 1×/5×/10×/25×/100×/1000×, reverse, jump-to-time) | ✅ | `frontend/src/components/TimeControls.tsx` |
| **Filters** by orbit class | ✅ | `frontend/src/components/FilterPanel.tsx` |
| **Search** by name or NORAD id → camera fly-to | ✅ | `frontend/src/components/SearchBox.tsx` |
| **Follow mode** — camera locks to a satellite | ✅ | `frontend/src/cesium/follow.ts` |
| **Historical trails** — per-satellite ring buffer polylines | ✅ | `frontend/src/cesium/history-trails.ts` |
| **Density heatmap** overlay | ✅ | `frontend/src/cesium/heatmap-layer.ts` |
| **Conjunction analysis** (TCA, miss distance, rel. velocity, Pc, severity) | ✅ | `frontend/src/workers/propagator.worker.ts`, `ConjunctionPanel.tsx` |
| **Nearest neighbors** — live top-K for selected satellite | ✅ | `frontend/src/state/snapshot-util.ts` |
| **Relativistic clock offset** — displayed in telemetry | ✅ | `backend/src/propagation/propagator.ts` |
| **Saved satellites** — starred list persisted to localStorage | ✅ | `frontend/src/state/saved.ts`, `SavedList.tsx` |
| **ISS live camera** panel + live telemetry | ✅ | `frontend/src/components/IssCamera.tsx` |
| **Local sky view** — topocentric passes from browser geolocation | ✅ | `LocalSkyView.tsx` |
| **Browser notifications** — ISS pass, saved-sat pass, close conjunction | ✅ | `frontend/src/simulation/notifications.ts` |
| **Satellite POV** — first-person camera mounted on a satellite | ✅ | `frontend/src/cesium/pov-camera.ts` |
| GPU instancing, distributed compute | Phase 5 | — |

## Layout

```
spacemap/
├── shared/     TypeScript types + orbit classifier shared by client and server
├── backend/    Node/Express/WS: CelesTrak TLE fetch, SGP4 propagation, live broadcast
└── frontend/   React + Vite + CesiumJS: 3D globe, live points, telemetry panel
```

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer

## First-time setup

```bash
npm install
```

This installs all workspaces (`shared`, `backend`, `frontend`) in one pass.

## Run in development

```bash
npm run dev
```

That starts the backend on <http://localhost:4000> and the frontend on <http://localhost:5173>. The Vite dev server proxies `/api` and `/ws` to the backend, so you only need to open the frontend URL.

On first boot, the backend fetches the CelesTrak "active" TLE catalog (~10k satellites) and caches it to `backend/data/tle-cache/active.tle`. Subsequent restarts warm-start from cache instantly and re-fetch every 4 hours.

## Individual workspace commands

```bash
npm run dev:backend      # backend only (tsx watch)
npm run dev:frontend     # frontend only (vite)
npm run typecheck        # tsc --noEmit across all workspaces
npm run build            # production build (shared → backend → frontend)
npm run smoke -w backend # offline propagator sanity check (uses a bundled ISS TLE)
```

## Configuration

Environment variables consumed by the backend (all optional):

| Var                    | Default                                                                            | Purpose                                              |
| ---------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `PORT`                 | `4000`                                                                             | HTTP + WS port                                       |
| `TLE_SOURCES`          | `https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle`             | Comma-separated TLE URLs; multiple sources are merged |
| `TLE_REFRESH_MS`       | `14400000` (4h)                                                                    | Refresh interval — CelesTrak asks for ≥ 2h           |
| `BROADCAST_INTERVAL_MS`| `1000`                                                                             | How often the propagator emits a positions batch     |
| `TLE_CACHE_FILE`       | `./data/tle-cache/active.tle`                                                      | Warm-start cache path                                |

## API

- `GET  /api/health`                     — process + catalog health
- `GET  /api/satellites`                 — index of `{ noradId, name, epoch }`
- `GET  /api/tles`                       — full TLE catalog (consumed once by the frontend for client-side propagation)
- `GET  /api/satellites/:id`             — raw TLE for one satellite
- `GET  /api/satellites/:id/telemetry`   — full propagated telemetry (orbital elements + relativity + sunlit flag)
- `WS   /ws`                             — reserved for future push events (conjunction alerts, catalog refreshes)

## Architecture notes

**Propagation runs in the browser.** The backend serves the TLE catalog once via `GET /api/tles`; from then on a Web Worker (`propagator.worker.ts`) computes every satellite's position on demand, driven by the Cesium clock. This means:

- Motion is smooth at 60 FPS with no network I/O per frame.
- Time controls (pause / speed / reverse / jump) work by mutating `viewer.clock` — the worker just propagates to whatever time is asked.
- Network isn't in the critical path for animation; you can go offline after the first load.

The backend's `GET /api/satellites/:id/telemetry` still supplies rich orbital elements + relativity for the selected satellite (refreshed every 2 s).

## How to use the UI

- **Click** any dot to select it. The right panel fills with live geodetic + ECI + orbital elements.
- **Search** at the top: type name or NORAD id, pick a result — camera flies to it.
- **Camera modes** in the telemetry panel: `Orbit` (free camera), `Follow` (Cesium tracks the satellite), `POV` (first-person from the satellite looking nadir).
- **Star (★)** in the telemetry header saves the satellite to your local list (bottom of the right rail).
- **Compare with…** in the telemetry panel — click it, then click any other satellite (or pick from the "nearest neighbours" list) to run a full 24 h conjunction search: TCA, miss distance, relative velocity, Pc, and a severity meter.
- **Filter panel** (top-left) toggles orbit classes on/off. Trail modes: Off / Selected-only / Visible (up to ~1200 sats).
- **Density heatmap** overlay checkbox rebuilds every ~4 s.
- **Right rail icons** — ISS live camera, local sky view (uses browser geolocation), saved satellites, browser notifications toggle.
- **Time controls** (bottom): ⏸/▶, speed buttons up to 1000×, ⇄ to reverse, "Now" to snap to real UTC, "Jump…" to type a target UTC.

## Conjunction engine

The conjunction search runs entirely in the propagator Web Worker:

1. **Coarse sweep** over the requested window (default 24 h at 60 s steps) — records the sample with the smallest 3-D ECI separation.
2. **Golden-section refine** around that minimum, tolerance 500 ms.
3. Reports TCA, miss distance, relative velocity at TCA, current separation and relative velocity, a Pc estimate (Gaussian model with 300 m combined 1σ uncertainty and 20 m combined hard-body radius), and a 0-100 severity score.

Nearest neighbours are computed on the main thread from the current propagator snapshot (linear scan over ~30k satellites — O(N) once per selection).

## Notifications

Opt-in via the 🔔 icon on the right rail. Cooldown per event is 15 min. Fires on:

- **ISS overhead** at ≥ 10° elevation (uses browser geolocation).
- **Any saved satellite** passing overhead at ≥ 20° elevation.
- **Close conjunction** on the currently selected + compared pair when severity ≥ 60.

## What's next (per the roadmap)

- **Phase 5** — GPU instancing, spatial indexing (BVH for global conjunction leaderboards), distributed compute, WebXR viewing

See `ENGINEERING.md` for coding rules and the definition of "live".
