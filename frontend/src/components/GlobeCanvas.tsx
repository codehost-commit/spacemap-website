import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import { createViewer } from "../cesium/globe.js";
import { SatelliteLayer } from "../cesium/satellite-layer.js";
import { OrbitTrail } from "../cesium/orbit-trail.js";
import { HistoryTrails } from "../cesium/history-trails.js";
import { HeatmapLayer } from "../cesium/heatmap-layer.js";
import { FollowMode } from "../cesium/follow.js";
import { PovCamera } from "../cesium/pov-camera.js";
import { Simulation, installSimulation } from "../simulation/simulation.js";
import { useStore } from "../state/store.js";
import { installFocusApi } from "../cesium/focus.js";
import { installClockControls } from "../simulation/clock-controls.js";
import { installNotificationWatcher } from "../simulation/notifications.js";
import { installSavedPersistence, loadSavedFromStorage } from "../state/saved.js";
import { getLocalTle } from "../simulation/catalog-store.js";
import { SceneEnhancements } from "../cesium/scene-enhancements.js";

export function GlobeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const viewer = createViewer(containerRef.current);
    const layer = new SatelliteLayer(viewer.scene);
    const orbitRibbon = new OrbitTrail(viewer.scene);
    const trails = new HistoryTrails(viewer.scene);
    const heatmap = new HeatmapLayer(viewer);
    const follow = new FollowMode(viewer, layer);
    const pov = new PovCamera(viewer, () => useStore.getState().snapshot);
    const sim = new Simulation(viewer);
    const enhancements = new SceneEnhancements(viewer);

    const uninstallFocus = installFocusApi(viewer, layer);
    const uninstallClock = installClockControls(viewer);
    const uninstallSim = installSimulation(sim);
    loadSavedFromStorage();
    const uninstallSaved = installSavedPersistence();
    const uninstallNotifications = installNotificationWatcher();
    const initialLayers = useStore.getState().visualLayers;
    enhancements.setLayerEnabled("graticule", initialLayers.has("graticule"));
    enhancements.setLayerEnabled("labels", initialLayers.has("labels"));
    enhancements.setLayerEnabled("terminator", initialLayers.has("terminator"));

    // Click → select or pick compare partner.
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((ev: { position: Cesium.Cartesian2 }) => {
      const picks = viewer.scene.drillPick(ev.position);
      const picked = picks.find(
        (entry) =>
          typeof entry?.id === "number" ||
          (entry?.primitive && typeof entry.primitive.id === "number"),
      );
      const id =
        picked && typeof picked.id === "number"
          ? picked.id
          : picked?.primitive && typeof picked.primitive.id === "number"
            ? picked.primitive.id
            : null;
      if (id == null) return;
      const state = useStore.getState();
      if (state.pickCompareMode && state.selectedNoradId != null && id !== state.selectedNoradId) {
        state.setCompare(id);
      } else {
        state.select(id);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Snapshot → render loop.
    let lastTick = -1;
    const unsubSnapshot = useStore.subscribe((s) => {
      if (s.snapshot && s.snapshotTick !== lastTick) {
        lastTick = s.snapshotTick;
        layer.update(s.snapshot, s.filter, s.selectedNoradId);
        trails.ingest(s.snapshot, s.filter);
        void heatmap.ingest(s.snapshot);
      }
    });

    // UI state → derived overlays.
    let lastFilterRef: Set<unknown> | null = null;
    let lastSelection: number | null = null;
    let lastCameraMode = "orbit";
    let lastTrailMode = "";
    let lastHeatmap = false;
    let lastVisualLayers: Set<unknown> | null = null;
    const unsubUi = useStore.subscribe((s) => {
      if (s.filter !== lastFilterRef) {
        lastFilterRef = s.filter;
        if (s.snapshot) {
          layer.update(s.snapshot, s.filter, s.selectedNoradId);
          trails.ingest(s.snapshot, s.filter);
        }
      }
      if (s.selectedNoradId !== lastSelection) {
        lastSelection = s.selectedNoradId;
        void updateOrbitRibbon(orbitRibbon, s.selectedNoradId);
        // Retarget the active camera mode.
        applyCameraMode(follow, pov, s.cameraMode, s.selectedNoradId);
      }
      if (s.cameraMode !== lastCameraMode) {
        lastCameraMode = s.cameraMode;
        applyCameraMode(follow, pov, s.cameraMode, s.selectedNoradId);
      }
      if (s.trailMode !== lastTrailMode) {
        lastTrailMode = s.trailMode;
        trails.setEnabled(s.trailMode === "visible");
      }
      if (s.heatmapOn !== lastHeatmap) {
        lastHeatmap = s.heatmapOn;
        void heatmap.setEnabled(s.heatmapOn);
      }
      if (s.visualLayers !== lastVisualLayers) {
        lastVisualLayers = s.visualLayers;
        enhancements.setLayerEnabled("graticule", s.visualLayers.has("graticule"));
        enhancements.setLayerEnabled("labels", s.visualLayers.has("labels"));
        enhancements.setLayerEnabled("terminator", s.visualLayers.has("terminator"));
      }
    });

    sim.start();
    void sim.load();

    return () => {
      unsubSnapshot();
      unsubUi();
      handler.destroy();
      uninstallFocus();
      uninstallClock();
      uninstallSim();
      uninstallSaved();
      uninstallNotifications();
      pov.destroy();
      follow.destroy();
      heatmap.destroy();
      trails.clear();
      orbitRibbon.clear();
      enhancements.destroy();
      layer.clear();
      sim.destroy();
      viewer.destroy();
    };
  }, []);

  return <div ref={containerRef} className="cesium-container" />;
}

function applyCameraMode(
  follow: FollowMode,
  pov: PovCamera,
  mode: string,
  selectedNoradId: number | null,
): void {
  if (mode === "follow") {
    pov.deactivate();
    follow.set(selectedNoradId);
  } else if (mode === "pov") {
    follow.clear();
    if (selectedNoradId != null) pov.activate(selectedNoradId);
    else pov.deactivate();
  } else {
    pov.deactivate();
    follow.clear();
  }
}

async function updateOrbitRibbon(ribbon: OrbitTrail, noradId: number | null): Promise<void> {
  if (noradId == null) {
    ribbon.clear();
    return;
  }
  const tle = getLocalTle(noradId);
  if (!tle) return;
  ribbon.setFromTle(tle, new Date());
}
