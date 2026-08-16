import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { createViewer } from '../cesium/globe.js';
import { SatelliteLayer } from '../cesium/satellite-layer.js';
import { OrbitTrail } from '../cesium/orbit-trail.js';
import { SonarSweep } from '../cesium/sonar-sweep.js';
import { HistoryTrails } from '../cesium/history-trails.js';
import { HeatmapLayer } from '../cesium/heatmap-layer.js';
import { FollowMode } from '../cesium/follow.js';
import { PovCamera } from '../cesium/pov-camera.js';
import { SatelliteModel } from '../cesium/satellite-model.js';
import { BaseImageryController } from '../cesium/imagery.js';
import { Terminator } from '../cesium/terminator.js';
import { Graticule } from '../cesium/graticule.js';
import { StarCatalog } from '../cesium/star-catalog.js';
import { Planets } from '../cesium/planets.js';
import { Countries } from '../cesium/countries.js';
import { Cities } from '../cesium/cities.js';
import { GroundStations } from '../cesium/ground-stations.js';
import { CloudOverlay } from '../cesium/clouds.js';
import { LunarSatellites, type LunarPickTag } from '../cesium/lunar-satellites.js';
import { LunarOrbitTrail } from '../cesium/lunar-orbit-trail.js';
import { LunarTerminator } from '../cesium/lunar-terminator.js';
import { MarsTerminator } from '../cesium/mars-terminator.js';
import {
  LunarSurfaceMarkers,
  type LunarSurfacePickTag,
} from '../cesium/lunar-surface-markers.js';
import { findLunarSurfaceSite } from '../simulation/lunar-surface-catalog.js';
import { Simulation, installSimulation } from '../simulation/simulation.js';
import { useStore } from '../state/store.js';
import { installFocusApi } from '../cesium/focus.js';
import { installClockControls } from '../simulation/clock-controls.js';
import { installNotificationWatcher } from '../simulation/notifications.js';
import { installSavedPersistence, loadSavedFromStorage } from '../state/saved.js';
import { getLocalTle } from '../simulation/catalog-store.js';
import { installKeyboardShortcuts } from '../simulation/keyboard.js';
import { installUrlState } from '../state/url-state.js';
import { registerInstruments } from '../admin/registry.js';
import { installInstrumentation } from '../admin/instrumentation.js';
import { getClockControls } from '../simulation/clock-controls.js';
import { findLunarOrbiter } from '../simulation/lunar-catalog.js';

/**
 * The Cesium canvas. Two personalities, chosen by the store's `body`:
 *
 *   Earth — satellite layer, orbit trails, follow / POV, countries, cities,
 *           clouds, ground stations, terminator, ISS cam, launches.
 *   Moon  — lunar orbiter layer, lunar orbit trail, lunar terminator, plus
 *           the star + planet backdrop and the graticule.
 *
 * When the store's `body` flips, TrackerPage remounts this component (via
 * a React key), which triggers the cleanup path in this effect and boots
 * a fresh viewer against the new body's ellipsoid + imagery + overlays.
 */
export function GlobeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const body = useStore.getState().body;
    const isEarth = body === 'earth';
    const isMoon = body === 'moon';
    const isMars = body === 'mars';
    const viewer = createViewer(containerRef.current, body);
    const imagery = new BaseImageryController(viewer);
    const stars = new StarCatalog(viewer);
    const planets = new Planets(viewer);
    const graticule = new Graticule(viewer.scene);

    // Earth-only systems.
    const layer = isEarth ? new SatelliteLayer(viewer.scene) : null;
    const orbitRibbon = isEarth ? new OrbitTrail(viewer.scene) : null;
    const sonar = isEarth ? new SonarSweep(viewer.scene) : null;
    const trails = isEarth ? new HistoryTrails(viewer.scene) : null;
    const heatmap = isEarth ? new HeatmapLayer(viewer) : null;
    const follow = isEarth && layer ? new FollowMode(viewer, layer) : null;
    const pov = isEarth ? new PovCamera(viewer, () => useStore.getState().snapshot) : null;
    const model = isEarth ? new SatelliteModel(viewer, () => useStore.getState().snapshot) : null;
    const terminator = isEarth ? new Terminator(viewer) : null;
    const countries = isEarth ? new Countries(viewer.scene) : null;
    const cities = isEarth ? new Cities(viewer.scene) : null;
    const groundStations = isEarth ? new GroundStations(viewer.scene) : null;
    const clouds = isEarth ? new CloudOverlay(viewer) : null;
    const sim = isEarth ? new Simulation(viewer) : null;

    // Moon-only systems.
    const lunarSats = isMoon ? new LunarSatellites(viewer) : null;
    const lunarTrail = isMoon ? new LunarOrbitTrail(viewer) : null;
    const lunarTerminator = isMoon ? new LunarTerminator(viewer) : null;
    // Mars-only systems (Part 1 = terminator only; orbiters + surface land in Part 2).
    const marsTerminator = isMars ? new MarsTerminator(viewer) : null;
    const lunarSurface = isMoon ? new LunarSurfaceMarkers(viewer) : null;

    const uninstallFocus = isEarth && layer ? installFocusApi(viewer, layer) : () => {};
    const uninstallClock = installClockControls(viewer);
    const uninstallSim = isEarth && sim ? installSimulation(sim) : () => {};
    if (isEarth) {
      loadSavedFromStorage();
    }
    const uninstallSaved = isEarth ? installSavedPersistence() : () => {};
    const uninstallNotifications = isEarth ? installNotificationWatcher() : () => {};
    const uninstallKeyboard = installKeyboardShortcuts();
    const uninstallUrl = installUrlState();

    const clock = getClockControls();
    const uninstallRegistry =
      isEarth && clock && layer && sim
        ? registerInstruments({ viewer, layer, sim, clock })
        : () => {};
    const uninstallInstrumentation = installInstrumentation();

    // Kick imagery + Earth-only cloud state as soon as the viewer is live.
    void imagery.apply(body, useStore.getState().imageryId);
    clouds?.setEnabled(useStore.getState().cloudsOn);

    // Loading-screen readiness: on Moon we don't gate on catalog / snapshot
    // (there is no Earth snapshot pipeline running), so we mark those as
    // "done" upfront and let the imagery-tile listener finish the sequence.
    if (isMoon || isMars) {
      useStore.setState({
        catalogStatus: 'ready',
        firstSnapshotReceived: true,
      });
    }

    let hadTiles = false;
    const tileHandler = viewer.scene.globe.tileLoadProgressEvent.addEventListener(
      (remaining: number) => {
        if (remaining > 0) hadTiles = true;
        if (hadTiles && remaining === 0) {
          useStore.getState().setImageryReady(true);
        }
      },
    );
    const imageryTimeout = setTimeout(() => {
      useStore.getState().setImageryReady(true);
    }, 8000);

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    let cameraMoving = false;
    const onMoveStart = viewer.camera.moveStart.addEventListener(() => {
      cameraMoving = true;
    });
    const onMoveEnd = viewer.camera.moveEnd.addEventListener(() => {
      cameraMoving = false;
    });

    const HOVER_PICK_OFFSETS: Array<[number, number]> = [
      [0, 0],
      [4, 0],
      [-4, 0],
      [0, 4],
      [0, -4],
      [3, 3],
      [-3, 3],
      [3, -3],
      [-3, -3],
    ];
    const CLICK_PICK_OFFSETS: Array<[number, number]> = [
      [0, 0],
      [4, 0],
      [-4, 0],
      [0, 4],
      [0, -4],
      [3, 3],
      [-3, 3],
      [3, -3],
      [-3, -3],
      [8, 0],
      [-8, 0],
      [0, 8],
      [0, -8],
      [6, 6],
      [-6, 6],
      [6, -6],
      [-6, -6],
      [12, 0],
      [-12, 0],
      [0, 12],
      [0, -12],
      [10, 10],
      [-10, 10],
      [10, -10],
      [-10, -10],
    ];
    const scratchPickPos = new Cesium.Cartesian2();

    /**
     * Multi-pick that understands both Earth NORAD numbers (numeric IDs on
     * satellite primitives) and lunar orbiter tags ({ lunar: true,
     * orbiterId } objects). Returns either a number, a string, or null.
     */
    type PickResult =
      | { kind: 'earth'; noradId: number }
      | { kind: 'moon-orbiter'; orbiterId: string }
      | { kind: 'moon-surface'; surfaceId: string }
      | null;
    const pickWithOffsets = (
      pos: Cesium.Cartesian2,
      offsets: Array<[number, number]>,
    ): PickResult => {
      for (const [dx, dy] of offsets) {
        scratchPickPos.x = pos.x + dx;
        scratchPickPos.y = pos.y + dy;
        const picked = viewer.scene.pick(scratchPickPos);
        if (!picked) continue;
        const rawId = picked.id ?? picked.primitive?.id;
        if (typeof rawId === 'number') return { kind: 'earth', noradId: rawId };
        if (rawId && typeof rawId === 'object' && (rawId as { lunar?: unknown }).lunar) {
          // Orbiter and surface tags both carry `lunar: true` — branch on
          // which optional ID field is present.
          const orbiterId = (rawId as LunarPickTag).orbiterId;
          if (typeof orbiterId === 'string') {
            return { kind: 'moon-orbiter', orbiterId };
          }
          const surfaceId = (rawId as LunarSurfacePickTag).surfaceId;
          if (typeof surfaceId === 'string') {
            return { kind: 'moon-surface', surfaceId };
          }
        }
      }
      return null;
    };
    const pickForClick = (pos: Cesium.Cartesian2) => pickWithOffsets(pos, CLICK_PICK_OFFSETS);
    const pickForHover = (pos: Cesium.Cartesian2) => pickWithOffsets(pos, HOVER_PICK_OFFSETS);

    handler.setInputAction((ev: { position: Cesium.Cartesian2 }) => {
      const hit = pickForClick(ev.position);
      if (!hit) return;
      const state = useStore.getState();
      if (hit.kind === 'earth' && isEarth) {
        if (
          state.pickCompareMode &&
          state.selectedNoradId != null &&
          hit.noradId !== state.selectedNoradId
        ) {
          state.setCompare(hit.noradId);
        } else {
          state.select(hit.noradId);
        }
      } else if (hit.kind === 'moon-orbiter' && isMoon) {
        state.setLunarSelection(hit.orbiterId);
      } else if (hit.kind === 'moon-surface' && isMoon) {
        state.setLunarSurfaceSelection(hit.surfaceId);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    let lastHoverMs = 0;
    const HOVER_INTERVAL_MS = 40;
    const tooltip = tooltipRef.current;
    handler.setInputAction((ev: { endPosition: Cesium.Cartesian2 }) => {
      if (cameraMoving) {
        if (tooltip) tooltip.style.display = 'none';
        return;
      }
      const now = performance.now();
      if (now - lastHoverMs < HOVER_INTERVAL_MS) return;
      lastHoverMs = now;
      const hit = pickForHover(ev.endPosition);

      // Route the hover to the layer that owns the picked primitive.
      if (hit?.kind === 'earth' && isEarth) {
        layer?.setHovered(hit.noradId);
        lunarSats?.setHovered(null);
        lunarSurface?.setHovered(null);
      } else if (hit?.kind === 'moon-orbiter' && isMoon) {
        lunarSats?.setHovered(hit.orbiterId);
        lunarSurface?.setHovered(null);
        layer?.setHovered(null);
      } else if (hit?.kind === 'moon-surface' && isMoon) {
        lunarSurface?.setHovered(hit.surfaceId);
        lunarSats?.setHovered(null);
        layer?.setHovered(null);
      } else {
        layer?.setHovered(null);
        lunarSats?.setHovered(null);
        lunarSurface?.setHovered(null);
      }
      viewer.scene.canvas.style.cursor = hit != null ? 'pointer' : '';

      if (tooltip) {
        if (hit?.kind === 'earth' && isEarth) {
          const state = useStore.getState();
          const name = state.indexByNorad.get(hit.noradId);
          const entry = state.catalogEntryByNorad.get(hit.noradId);
          const label = name ?? `#${hit.noradId}`;
          const typeBadge = entry?.objectType
            ? entry.objectType.replace('-', ' ').replace(/^\w/, (c) => c.toUpperCase())
            : '';
          tooltip.innerHTML = `<span style="font-weight:600">${label}</span>${
            typeBadge
              ? `<span style="opacity:0.5;margin-left:6px;font-size:10px">${typeBadge}</span>`
              : ''
          }`;
          tooltip.style.display = 'block';
          tooltip.style.left = `${ev.endPosition.x + 16}px`;
          tooltip.style.top = `${ev.endPosition.y - 12}px`;
        } else if (hit?.kind === 'moon-orbiter' && isMoon) {
          const orbiter = findLunarOrbiter(hit.orbiterId);
          if (orbiter) {
            tooltip.innerHTML =
              `<span style="font-weight:600">${orbiter.name}</span>` +
              `<span style="opacity:0.5;margin-left:6px;font-size:10px">${orbiter.agency}</span>`;
            tooltip.style.display = 'block';
            tooltip.style.left = `${ev.endPosition.x + 16}px`;
            tooltip.style.top = `${ev.endPosition.y - 12}px`;
          }
        } else if (hit?.kind === 'moon-surface' && isMoon) {
          const site = findLunarSurfaceSite(hit.surfaceId);
          if (site) {
            tooltip.innerHTML =
              `<span style="font-weight:600">${site.name}</span>` +
              `<span style="opacity:0.5;margin-left:6px;font-size:10px">${site.agency}</span>`;
            tooltip.style.display = 'block';
            tooltip.style.left = `${ev.endPosition.x + 16}px`;
            tooltip.style.top = `${ev.endPosition.y - 12}px`;
          }
        } else {
          tooltip.style.display = 'none';
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // Snapshot → Earth render loop.
    let lastTick = -1;
    const unsubSnapshot = isEarth
      ? useStore.subscribe((s) => {
          if (s.snapshot && s.snapshotTick !== lastTick && layer) {
            lastTick = s.snapshotTick;
            layer.update(
              s.snapshot,
              s.filter,
              s.objectFilter,
              s.objectTypeByNorad,
              s.selectedNoradId,
              viewer.scene.camera,
            );
            trails?.ingest(s.snapshot, s.filter);
            void heatmap?.ingest(s.snapshot);
          }
        })
      : () => {};

    let lastFilterRef: Set<unknown> | null = null;
    let lastObjectFilterRef: Set<unknown> | null = null;
    let lastSelection: number | null = null;
    let lastLunarSelection: string | null = null;
    let lastLunarSurfaceOn = useStore.getState().lunarSurfaceOn;
    let lastLunarSurfaceKindFilter = useStore.getState().lunarSurfaceKindFilter;
    let lastLunarSurfaceSelection: string | null = null;
    let lastCameraMode = 'orbit';
    let lastTrailMode = '';
    let lastHeatmap = false;
    let lastTerminator = false;
    let lastGraticule = false;
    let lastCountries = false;
    let lastCities = false;
    let lastGroundStations = false;
    let lastClouds = useStore.getState().cloudsOn;
    let lastImagery = useStore.getState().imageryId;

    // Prime lunar selection + trail so a body-swap that arrives with an
    // existing selection immediately paints the ribbon.
    if (isMoon) {
      const state0 = useStore.getState();
      lunarSats?.setSelected(state0.selectedLunarId);
      lunarTrail?.setFromOrbiterId(state0.trailMode === 'off' ? null : state0.selectedLunarId);
      lunarTerminator?.setEnabled(state0.terminatorOn);
      lunarSurface?.setEnabled(state0.lunarSurfaceOn);
      lunarSurface?.setKindFilter(state0.lunarSurfaceKindFilter);
      lunarSurface?.setSelected(state0.selectedLunarSurfaceId);
      lastLunarSelection = state0.selectedLunarId;
    }
    if (isMars) {
      marsTerminator?.setEnabled(useStore.getState().terminatorOn);
    }

    const unsubUi = useStore.subscribe((s) => {
      // Graticule + terminator work on either body.
      if (s.graticuleOn !== lastGraticule) {
        lastGraticule = s.graticuleOn;
        graticule.setEnabled(s.graticuleOn);
      }

      if (isMars) {
        if (s.terminatorOn !== lastTerminator) {
          lastTerminator = s.terminatorOn;
          marsTerminator?.setEnabled(s.terminatorOn);
        }
      }

      if (isMoon) {
        if (s.terminatorOn !== lastTerminator) {
          lastTerminator = s.terminatorOn;
          lunarTerminator?.setEnabled(s.terminatorOn);
        }
        if (s.selectedLunarId !== lastLunarSelection || s.trailMode !== lastTrailMode) {
          lastLunarSelection = s.selectedLunarId;
          lunarSats?.setSelected(s.selectedLunarId);
          const showTrail = s.trailMode !== 'off';
          lunarTrail?.setFromOrbiterId(showTrail ? s.selectedLunarId : null);
        }
        if (s.trailMode !== lastTrailMode) {
          lastTrailMode = s.trailMode;
        }
        if (s.lunarSurfaceOn !== lastLunarSurfaceOn) {
          lastLunarSurfaceOn = s.lunarSurfaceOn;
          lunarSurface?.setEnabled(s.lunarSurfaceOn);
        }
        if (s.lunarSurfaceKindFilter !== lastLunarSurfaceKindFilter) {
          lastLunarSurfaceKindFilter = s.lunarSurfaceKindFilter;
          lunarSurface?.setKindFilter(s.lunarSurfaceKindFilter);
        }
        if (s.selectedLunarSurfaceId !== lastLunarSurfaceSelection) {
          lastLunarSurfaceSelection = s.selectedLunarSurfaceId;
          lunarSurface?.setSelected(s.selectedLunarSurfaceId);
        }
        return;
      }

      if (!isEarth) return;

      if (s.filter !== lastFilterRef || s.objectFilter !== lastObjectFilterRef) {
        lastFilterRef = s.filter;
        lastObjectFilterRef = s.objectFilter;
        if (s.snapshot && layer) {
          layer.update(
            s.snapshot,
            s.filter,
            s.objectFilter,
            s.objectTypeByNorad,
            s.selectedNoradId,
            viewer.scene.camera,
          );
          trails?.ingest(s.snapshot, s.filter, { force: true });
        }
      }
      if (s.selectedNoradId !== lastSelection || s.trailMode !== lastTrailMode) {
        lastSelection = s.selectedNoradId;
        layer?.setSelected(s.selectedNoradId);
        const showRibbon = s.trailMode !== 'off' && s.selectedNoradId != null;
        if (orbitRibbon && sonar) {
          void updateOrbitRibbon(orbitRibbon, sonar, showRibbon ? s.selectedNoradId : null);
        }
        void model?.setFor(s.selectedNoradId);
        if (follow && pov && model) {
          applyCameraMode(follow, pov, model, s.cameraMode, s.selectedNoradId);
        }
      }
      if (s.cameraMode !== lastCameraMode) {
        lastCameraMode = s.cameraMode;
        if (follow && pov && model) {
          applyCameraMode(follow, pov, model, s.cameraMode, s.selectedNoradId);
        }
      }
      if (s.trailMode !== lastTrailMode) {
        lastTrailMode = s.trailMode;
        trails?.setEnabled(s.trailMode === 'visible');
      }
      if (s.heatmapOn !== lastHeatmap) {
        lastHeatmap = s.heatmapOn;
        void heatmap?.setEnabled(s.heatmapOn);
      }
      if (s.terminatorOn !== lastTerminator) {
        lastTerminator = s.terminatorOn;
        terminator?.setEnabled(s.terminatorOn);
      }
      if (s.countriesOn !== lastCountries) {
        lastCountries = s.countriesOn;
        void countries?.setEnabled(s.countriesOn);
      }
      if (s.citiesOn !== lastCities) {
        lastCities = s.citiesOn;
        cities?.setEnabled(s.citiesOn);
      }
      if (s.groundStationsOn !== lastGroundStations) {
        lastGroundStations = s.groundStationsOn;
        groundStations?.setEnabled(s.groundStationsOn);
      }
      if (s.cloudsOn !== lastClouds) {
        lastClouds = s.cloudsOn;
        clouds?.setEnabled(s.cloudsOn);
      }
      if (s.imageryId !== lastImagery) {
        lastImagery = s.imageryId;
        void imagery.apply(body, s.imageryId);
      }
    });

    sim?.start();
    void sim?.load();

    return () => {
      unsubSnapshot();
      unsubUi();
      handler.destroy();
      onMoveStart();
      onMoveEnd();
      tileHandler();
      clearTimeout(imageryTimeout);
      uninstallFocus();
      uninstallClock();
      uninstallSim();
      uninstallSaved();
      uninstallNotifications();
      uninstallKeyboard();
      uninstallUrl();
      uninstallRegistry();
      uninstallInstrumentation();
      pov?.destroy();
      follow?.destroy();
      model?.destroy();
      heatmap?.destroy();
      terminator?.destroy();
      graticule.destroy();
      countries?.destroy();
      cities?.destroy();
      groundStations?.destroy();
      clouds?.destroy();
      stars.destroy();
      planets.destroy();
      lunarTrail?.destroy();
      lunarTerminator?.destroy();
      marsTerminator?.destroy();
      lunarSurface?.destroy();
      lunarSats?.destroy();
      imagery.destroy();
      trails?.clear();
      orbitRibbon?.destroy();
      sonar?.destroy();
      layer?.clear();
      sim?.destroy();
      viewer.destroy();
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="cesium-container" />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-50 hidden whitespace-nowrap rounded-lg border border-white/15 bg-[#0a1625]/92 px-2.5 py-1.5 font-mono text-xs text-white shadow-lg backdrop-blur-md"
      />
    </div>
  );
}

function applyCameraMode(
  follow: FollowMode,
  pov: PovCamera,
  model: SatelliteModel,
  mode: string,
  selectedNoradId: number | null,
): void {
  model.setHidden(mode === 'pov');
  if (mode === 'follow') {
    pov.deactivate();
    follow.set(selectedNoradId);
  } else if (mode === 'pov') {
    follow.clear();
    if (selectedNoradId != null) pov.activate(selectedNoradId);
    else pov.deactivate();
  } else {
    pov.deactivate();
    follow.clear();
  }
}

async function updateOrbitRibbon(
  ribbon: OrbitTrail,
  sonar: SonarSweep,
  noradId: number | null,
): Promise<void> {
  if (noradId == null) {
    ribbon.clear();
    sonar.setFromTle(null);
    return;
  }
  const tle = getLocalTle(noradId);
  if (!tle) return;
  ribbon.setFromTle(tle);
  sonar.setFromTle(tle);
}
