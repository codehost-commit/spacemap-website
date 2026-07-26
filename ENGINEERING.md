# SpaceMap Engineering Rules

- TypeScript throughout frontend and backend. No untyped JavaScript.
- Modular components. Keep files under ~400 lines; extract when they grow.
- No placeholder or hardcoded satellite positions. Every displayed value derives from propagated state.
- No simulated satellites except in tests, and they must be clearly labeled `MOCK-*`.
- All APIs must be swappable behind interfaces (data source, propagator, WebSocket transport).
- All major systems require error handling. Never let a fetch failure crash the render loop.
- Heavy calculations (SGP4 for thousands of satellites, conjunction search) run in workers, not the UI thread.
- Clean separation of layers:
  - `shared/`   — types and pure functions used by both sides
  - `backend/`  — data ingestion, storage, propagation, broadcast
  - `frontend/` — visualization, interaction, thin client of the backend
- Document every setup step in the root README.

## Design direction

The interface should feel like Google Earth crossed with a NASA mission-control console and a Bloomberg terminal. Dark space theme, minimal chrome, high information density, smooth 60 FPS animation, professional monospace/sans typography, responsive down to tablet width.

## Definition of "live"

The platform must never display hardcoded satellite positions. All positions come from live orbital data (TLE / OMM) propagated forward with SGP4. Rendering may run at 60 FPS by interpolating between propagator ticks; propagator ticks run as often as physics fidelity and CPU budget allow (target: every 1s for the full catalog).
