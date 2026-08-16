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

/**
 * The Cesium canvas. Everything Earth-specific — satellite layer, orbit
 * trails, follow / POV camera modes, countries, cities, clouds, ground
 * stations, terminator — only spins up when the active body is Earth. When
 * the store's `body` flips to 'moon' the whole component is remounted (via
 * a React `key={body}` on the parent), which triggers this effect's cleanup
 * and boots a fresh viewer against the Moon ellipsoid + LRO WAC imagery.
 */
export function GlobeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const body = useStore.getState().body;
    const isEarth = body === 'earth';
    const viewer = createViewer(containerRef.current, body);
    const imagery = new BaseImageryController(viewer);
    const stars = new StarCatalog(viewer);
    const planets = new Planets(viewer);
    // Graticule works for any spherical body — the equator/prime-meridian
    // idea is universal, so we keep it available on the Moon too.
    const graticule = new Graticule(viewer.scene);

    // Earth-only systems. Moon view intentionally leaves these null; they
    // depend on Earth satellite data, WGS-84 coordinates, or Earth-specific
    // cartography that would just clutter the lunar globe.
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

    // Admin console instrumentation — shared refs + engine event stream.
    // Only meaningful when the Earth simulation is running.
    const clock = getClockControls();
    const uninstallRegistry =
      isEarth && clock && layer && sim
        ? registerInstruments({ viewer, layer, sim, clock })
        : () => {};
    const uninstallInstrumentation = installInstrumentation();

    // Apply the initial imagery layer immediately so users see something even
    // while TLEs download (or, on the Moon, while LRO tiles stream in).
    void imagery.apply(body, useStore.getState().imageryId);
    clouds?.setEnabled(useStore.getState().cloudsOn);

    // Track initial-tile-load completion so the loading screen can dismiss
    // once the globe is actually rendered. Cesium fires
    // tileLoadProgressEvent(remaining) whenever the queue changes; we set
    // "imagery ready" the first time it drops to 0 after being > 0. Timeout
    // fallback in case the imagery layer never reports any tiles.
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

    // Multi-pick: try the exact pixel first, then spiral outward through a
    // ring of nearby pixels so tiny satellite dots are actually catchable.
    //
    // Each pick call is a full re-render into Cesium's pick framebuffer +
    // pixel read — measured at ~6 ms/pick on Apple ANGLE + MSAA. So the
    // spiral length materially affects hover FPS. We split into two:
    //   • HOVER — tight 9-point spiral (~5 px catch radius). Cheap enough
    //     that hover feels instant, with early-exit on first hit so empty
    //     sky costs just one pick.
    //   • CLICK — full 25-point spiral (~14 px catch radius). Users
    //     initiate clicks intentionally, so paying 160 ms once is fine.
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
    const pickWithOffsets = (
      pos: Cesium.Cartesian2,
      offsets: Array<[number, number]>,
    ): number | null => {
      for (const [dx, dy] of offsets) {
        scratchPickPos.x = pos.x + dx;
        scratchPickPos.y = pos.y + dy;
        const picked = viewer.scene.pick(scratchPickPos);
        const id =
          picked && typeof picked.id === 'number'
            ? picked.id
            : picked?.primitive && typeof picked.primitive.id === 'number'
              ? picked.primitive.id
              : null;
        if (id != null) return id; // early exit — first hit wins
      }
      return null;
    };
    const pickForClick = (pos: Cesium.Cartesian2) => pickWithOffsets(pos, CLICK_PICK_OFFSETS);
    const pickForHover = (pos: Cesium.Cartesian2) => pickWithOffsets(pos, HOVER_PICK_OFFSETS);

    // Only wire picking on Earth — nothing pickable exists on the Moon in
    // Part 1. Satellites and surface markers land in Parts 2 & 3.
    if (isEarth) {
      handler.setInputAction((ev: { position: Cesium.Cartesian2 }) => {
        const id = pickForClick(ev.position);
        if (id == null) return;
        const state = useStore.getState();
        if (
          state.pickCompareMode &&
          state.selectedNoradId != null &&
          id !== state.selectedNoradId
        ) {
          state.setCompare(id);
        } else {
          state.select(id);
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      // Hover — throttled multi-pick + layer.setHovered so the nearest satellite
      // gets a visible ring. Users get a preview of what will be selected on click.
      // Also shows a lightweight name tooltip next to the cursor.
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
        const id = pickForHover(ev.endPosition);
        layer?.setHovered(id);
        viewer.scene.canvas.style.cursor = id != null ? 'pointer' : '';

        if (tooltip) {
          if (id != null) {
            const state = useStore.getState();
            const name = state.indexByNorad.get(id);
            const entry = state.catalogEntryByNorad.get(id);
            const label = name ?? `#${id}`;
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
          } else {
            tooltip.style.display = 'none';
          }
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }

    // Snapshot → render loop. Only wired on Earth — the propagator produces
    // Earth-ECEF positions that would land inside the Moon's core.
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

    // UI state → derived overlays. Also Earth-only for Part 1.
    let lastFilterRef: Set<unknown> | null = null;
    let lastObjectFilterRef: Set<unknown> | null = null;
    let lastSelection: number | null = null;
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
    const unsubUi = useStore.subscribe((s) => {
      // Body switch: remount is driven by React `key={body}` on the parent,
      // not by this subscriber. Nothing to do here.

      // Graticule works on either body.
      if (s.graticuleOn !== lastGraticule) {
        lastGraticule = s.graticuleOn;
        graticule.setEnabled(s.graticuleOn);
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
        // Apply highlight instantly so the user sees feedback on click without
        // waiting for the next propagator snapshot.
        layer?.setSelected(s.selectedNoradId);
        // Only show the orbit ribbon when trail mode is 'selected' or 'visible'
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
  // In POV of the selected sat, hide the model — otherwise the camera sits
  // inside the mesh and we render the interior.
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
