import * as Cesium from "cesium";
import type { SatelliteLayer } from "./satellite-layer.js";

/**
 * Registers global helpers so components anywhere in the tree can drive the
 * camera without needing a viewer ref:
 *   - `window.spacemapFocus(noradId)` — fly to a satellite
 *   - `window.spacemapFocusLatLon(lat, lon, altKm)` — fly to a ground point
 */
export function installFocusApi(viewer: Cesium.Viewer, layer: SatelliteLayer): () => void {
  const focus = (noradId: number): void => {
    const pos = layer.positionOf(noradId);
    if (!pos) return;
    const r = Cesium.Cartesian3.magnitude(pos);
    const offset = new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-25), r * 1.15);
    viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(pos, 100), {
      offset,
      duration: 1.2,
    });
  };
  const focusLatLon = (lat: number, lon: number, altKm = 1500): void => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, altKm * 1000),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-70),
        roll: 0,
      },
      duration: 1.6,
    });
  };
  const w = window as unknown as {
    spacemapFocus?: (id: number) => void;
    spacemapFocusLatLon?: (lat: number, lon: number, altKm?: number) => void;
  };
  w.spacemapFocus = focus;
  w.spacemapFocusLatLon = focusLatLon;
  return () => {
    if (w.spacemapFocus === focus) delete w.spacemapFocus;
    if (w.spacemapFocusLatLon === focusLatLon) delete w.spacemapFocusLatLon;
  };
}
