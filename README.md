<div align="center">

# SpaceMap — Orbital Nexus

**Real-time, browser-based satellite intelligence.**
Live 3D globe · SGP4 propagation for the full public catalog · time controls · conjunction analysis · first-person satellite POV — all 100% in the browser, no backend required.

[![Deploy to Pages](https://github.com/YOUR-USERNAME/SpaceMap/actions/workflows/deploy.yml/badge.svg)](https://github.com/YOUR-USERNAME/SpaceMap/actions/workflows/deploy.yml)

### 🌍  [Open the live demo →](https://YOUR-USERNAME.github.io/SpaceMap/)

*(replace `YOUR-USERNAME` with your GitHub username after the first deploy)*

</div>

---

## What it does

SpaceMap renders every active Earth-orbiting satellite from the CelesTrak "active" TLE catalog (~10 – 30k objects) as a live 3D scene. Every visible dot is propagated with SGP4 in a Web Worker driven by Cesium's clock, so scrubbing / pausing / accelerating time — up to **1000×**, in either direction — moves the entire catalog through orbit in lockstep.

<table>
  <tr>
    <td><b>Phase 1 — Core</b><br/>Cesium globe · TLE ingest · SGP4 · telemetry · orbit ribbon</td>
    <td><b>Phase 2 — Visualization</b><br/>Time controls · filters · search · follow · history trails · density heatmap</td>
  </tr>
  <tr>
    <td><b>Phase 3 — Physics</b><br/>Conjunction search · Pc estimation · nearest-neighbours · relativistic Δt · orbital analytics</td>
    <td><b>Phase 4 — User</b><br/>Saved satellites · ISS live cam · local sky view · browser notifications · <b>first-person satellite POV</b></td>
  </tr>
</table>

## Live demo (GitHub Pages)

The site is a single-page app. GitHub Actions builds it on every push to `main` and deploys `frontend/dist/` to Pages:

1. Fork or clone this repo.
2. On GitHub, open **Settings → Pages** and set **Source = "GitHub Actions"**.
3. Push to `main`. The `.github/workflows/deploy.yml` workflow runs `npm install`, `npm run build -w frontend` with `VITE_BASE_URL=/${repo-name}/`, then publishes.
4. Your site appears at `https://<user>.github.io/<repo-name>/`.

At runtime the frontend fetches TLEs **directly from CelesTrak** (`gp.php?GROUP=active&FORMAT=tle` — CORS-enabled) and propagates locally, so no backend is required for Pages. If you also run the optional backend for dev work, the frontend will prefer it for its warm-started cache.

## Feature matrix

| Feature | Where |
| --- | --- |
| Realistic 3D Earth (day/night, atmosphere, stars, moon, sun-lit) | [`frontend/src/cesium/globe.ts`](frontend/src/cesium/globe.ts) |
| TLE ingest — CelesTrak direct fetch (Pages) or backend proxy (dev) | [`frontend/src/simulation/tle-catalog.ts`](frontend/src/simulation/tle-catalog.ts) |
| SGP4 propagation for the full catalog in a Web Worker | [`frontend/src/workers/propagator.worker.ts`](frontend/src/workers/propagator.worker.ts) |
| Points coloured by orbit class (LEO/MEO/GEO/HEO/POLAR/SSO) | [`frontend/src/cesium/satellite-layer.ts`](frontend/src/cesium/satellite-layer.ts) |
| Live telemetry panel — computed 100% in the browser | [`frontend/src/simulation/client-telemetry.ts`](frontend/src/simulation/client-telemetry.ts) |
| Time controls: pause, 1× → 1000×, reverse, jump-to-time | [`frontend/src/components/TimeControls.tsx`](frontend/src/components/TimeControls.tsx) |
| Search by name / NORAD id → camera fly-to | [`frontend/src/components/SearchBox.tsx`](frontend/src/components/SearchBox.tsx) |
| Filters by orbit class + trail-mode toggle + density heatmap | [`FilterPanel.tsx`](frontend/src/components/FilterPanel.tsx), [`history-trails.ts`](frontend/src/cesium/history-trails.ts), [`heatmap-layer.ts`](frontend/src/cesium/heatmap-layer.ts) |
| Follow / POV camera modes | [`follow.ts`](frontend/src/cesium/follow.ts), [`pov-camera.ts`](frontend/src/cesium/pov-camera.ts) |
| Conjunction analysis — TCA + miss + Pc + severity | [`propagator.worker.ts`](frontend/src/workers/propagator.worker.ts), [`ConjunctionPanel.tsx`](frontend/src/components/ConjunctionPanel.tsx) |
| Nearest neighbours (top-K by ECI distance) | [`snapshot-util.ts`](frontend/src/state/snapshot-util.ts) |
| Saved satellites (localStorage) | [`saved.ts`](frontend/src/state/saved.ts), [`SavedList.tsx`](frontend/src/components/SavedList.tsx) |
| ISS live camera + telemetry | [`IssCamera.tsx`](frontend/src/components/IssCamera.tsx) |
| Local sky view (geolocation + topocentric passes) | [`LocalSkyView.tsx`](frontend/src/components/LocalSkyView.tsx) |
| Browser notifications (ISS / saved / conjunction) | [`notifications.ts`](frontend/src/simulation/notifications.ts) |

## How to use the UI

- **Click** any dot to select it. The right panel shows live geodetic + ECI + orbital elements + relativistic Δt.
- **Search** (top-center): type name or NORAD id, pick a result — camera flies to it.
- **Camera modes** in the telemetry panel: `Orbit` (free), `Follow` (Cesium tracks the satellite), `POV` (first-person, nadir-pointing, up = along-track).
- **Star (★)** in the telemetry header saves the satellite; the ★ toolbar button opens the saved list.
- **Compare with…** starts a two-satellite conjunction analysis over the next 24 h.
- **Filter panel** (top-left) toggles orbit classes and trail modes.
- **Right rail icons** — ISS live camera, local sky view, saved satellites, browser notifications toggle.
- **Time controls** (bottom): ⏸/▶, 1× / 5× / 10× / 25× / 100× / 1000×, ⇄ reverse, "Now", "Jump…".

## Repo layout

```
spacemap/
├── shared/     Types + orbit classifier — used by client and (optional) server
├── backend/    Optional dev-only Node/Express/WS: CelesTrak cache + SGP4 for /api endpoints
├── frontend/   React + Vite + CesiumJS SPA — the actual deliverable
└── .github/workflows/deploy.yml   Pages build + publish
```

## Local development

```bash
git clone https://github.com/<you>/SpaceMap.git
cd SpaceMap
npm install
npm run dev            # backend :4000, frontend :5173
```

Open <http://localhost:5173>. In dev the Vite proxy forwards `/api` and `/ws` to the backend; the frontend prefers the backend for its warm-started TLE cache. Without the backend, it falls back to CelesTrak directly.

### Individual workspace commands

```bash
npm run dev:backend      # backend only (tsx watch)
npm run dev:frontend     # frontend only (vite)
npm run typecheck        # tsc --noEmit across all workspaces
npm run build            # production build (shared → backend → frontend)
npm run smoke -w backend # offline propagator sanity check (bundled ISS TLE)
```

### Deploying to GitHub Pages manually

Same as CI, if you want to test locally:

```bash
VITE_BASE_URL=/SpaceMap/ npm run build -w frontend
# frontend/dist/ is now Pages-ready
```

## Architecture notes

**Everything user-facing runs in the browser.** The backend exists only to speed up dev with a warm-started TLE cache; production hosting is a static bundle.

- **TLE catalog**: `simulation/tle-catalog.ts` first tries `/api/tles` with a 2.5 s timeout (dev mode). On failure it falls back to `https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle` (CORS-enabled).
- **Propagation**: a dedicated Web Worker (`workers/propagator.worker.ts`) holds parsed satrecs and answers `propagate(t)` requests with a transferable structure-of-arrays snapshot. The main thread writes those directly into a Cesium `PointPrimitiveCollection`.
- **Time**: `Cesium.clock` is the sole source of simulation time. Every UI knob (speed, pause, jump, reverse) is a mutation on `viewer.clock`.
- **Telemetry**: `simulation/client-telemetry.ts` mirrors the backend telemetry endpoint using local satrecs — orbital elements, apogee/perigee, mean motion, relativistic Δt, sunlit flag.

## Conjunction engine

Runs inside the propagator worker. Coarse sweep over the search window (default 24 h at 60 s), then golden-section refine to 500 ms. Reports TCA, miss distance, relative velocity at TCA, current separation, Pc (Gaussian model with 300 m combined 1σ uncertainty, 20 m HBR), and a 0-100 severity meter.

Nearest neighbours are a linear scan over the current snapshot on the main thread (O(N)).

## Notifications

Opt-in via the 🔔 icon on the right rail. Per-event cooldown 15 min. Fires on:

- ISS overhead ≥ 10° elevation (uses browser geolocation).
- Any saved satellite passing overhead ≥ 20° elevation.
- Close conjunction on the currently selected pair when severity ≥ 60.

## Engineering rules

See [`ENGINEERING.md`](ENGINEERING.md). Highlights:

- No hard-coded satellite positions — everything comes from propagated TLEs.
- Heavy math (SGP4 on the whole catalog, conjunction search) lives in the Web Worker.
- Clean layering: `shared/` types & pure functions · `backend/` optional server · `frontend/` SPA.
- All I/O has error handling; a fetch failure never crashes the render loop.
