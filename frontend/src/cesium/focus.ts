import * as Cesium from "cesium";
import type { SatelliteLayer } from "./satellite-layer.js";

/**
 * Registers a `window.spacemapFocus(noradId)` helper the search box can call
 * to fly the camera to a satellite. Keeping the API outside React avoids
 * threading a viewer ref through the component tree.
 */
export function installFocusApi(viewer: Cesium.Viewer, layer: SatelliteLayer): () => void {
  const focus = (noradId: number): void => {
    const pos = layer.positionOf(noradId);
    if (!pos) return;
    // Aim the camera at the satellite from a sensible standoff distance based
    // on its geocentric radius so LEO and GEO both frame nicely.
    const r = Cesium.Cartesian3.magnitude(pos);
    const offset = new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-25), r * 1.15);
    viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(pos, 100), {
      offset,
      duration: 1.2,
    });
  };
  const w = window as unknown as { spacemapFocus?: (id: number) => void };
  w.spacemapFocus = focus;
  return () => {
    if (w.spacemapFocus === focus) delete w.spacemapFocus;
  };
}
