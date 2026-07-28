# SpaceMap — Project Context

## What it is

SpaceMap is a free, real-time satellite tracking web application. It renders 30,000+ orbiting objects (satellites, debris, spacecraft) on an interactive 3D globe in the browser. All computation runs client-side — nothing is uploaded, no account is required.

## Domain

spacemap.earth (deployed via GitHub Pages at codehost-commit.github.io/spacemap-website)

## Founder

Rahul Awasthi — solo developer and designer.

## Core value proposition

Mission-control-grade orbital awareness in a single browser tab, for free, with full privacy. No government contract or software license needed.

## Tech stack

- React 18 + TypeScript + Vite 5 + Tailwind CSS 3
- CesiumJS for the 3D globe and satellite rendering
- SGP4 propagation via Web Workers (all orbital math runs on the user's CPU)
- Data sources: Space-Track, CelesTrak, amateur observers (TLE/OMM formats)
- Canvas 2D animated hero globe on the marketing site (software sphere renderer with Earth texture, 2000 satellite particles, featured spacecraft)
- WebGL shader background across the site
- React Router v6, GitHub Actions CI/CD

## Site structure

- `/` — Home (hero with animated globe, 6 highlighted features, stats, CTA)
- `/features` — All 18 features in detail
- `/about` — Founder bio, how-it-works pipeline, capabilities list
- `/contact` — Contact form (saves to localStorage)
- `/tracker` — The actual satellite tracker app (CesiumJS)

## Key features

1. 3D Cesium Globe — full-resolution interactive Earth
2. 30,000+ tracked objects — full catalog, color-coded by orbit type
3. Instant search — by name, NORAD ID, or international designator
4. Conjunction detection — real-time closest-approach leaderboard
5. 100% client-side — SGP4 in Web Workers, zero data leaves your device
6. Time travel — scrub past/future at 0.1x to 1000x speed
7. Live ISS camera — HD external feed synced to ISS position
8. Local sky view — satellites visible from your coordinates with pass predictions
9. Telemetry panels — altitude, velocity, inclination, period, RAAN, eccentricity per object
10. Multi-layer overlays — density heatmaps, day/night terminator, borders, cities
11. Launch tracker — upcoming/recent launches with vehicle and payload info
12. Orbit trails — full-period paths and history trails
13. Orbit type filters — LEO, MEO, GEO, HEO, sub-synchronous toggles
14. Ground stations — tracking stations and launch sites on the globe
15. POV camera mode — first-person ride-along locked to any satellite
16. Sonar sweep — radar-pulse visualization of nearby objects
17. Timeline scrubber — persistent time control bar
18. Imagery picker — natural color, dark basemap, night lights

## Design language

- Dark space theme (#06101a base)
- Accent gradient: #4d96e8 to #8ed8ff
- Liquid glass header (frosted backdrop-filter on scroll)
- 3D depth effects (CSS perspective/translateZ on cards)
- Minimal, clean typography with system fonts

## Brand assets

- `frontend/public/brand/earth-map.jpg` — generated Earth texture (1024x512)
- `frontend/public/brand/founder.jpeg` — founder photo
- `frontend/src/assets/brand-emblem.png` — SpaceMap logo emblem
- `frontend/src/assets/brand-wordmark.png` — SpaceMap wordmark
- `frontend/public/models/` — 3D models (iss.glb, hubble.glb, jwst.glb, voyager.glb)

## Monorepo structure

```
SpaceMap backup/
  frontend/        — marketing site + tracker (React/Vite)
  backend/         — (minimal, most logic is client-side)
  shared/          — shared types/utilities
```
