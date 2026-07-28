import * as Cesium from 'cesium';
import type { SatelliteLayer } from './satellite-layer.js';

/**
 * Manages "follow satellite" camera lock via a hidden Cesium entity whose
 * position is read live from the satellite layer. Cesium's trackedEntity
 * pipeline gives us free spring-damped camera motion and user rotation.
 */
export class FollowMode {
  private entity: Cesium.Entity | null = null;
  private noradId: number | null = null;

  constructor(
    private readonly viewer: Cesium.Viewer,
    private readonly layer: SatelliteLayer,
  ) {}

  set(noradId: number | null): void {
    if (noradId === this.noradId) return;
    this.noradId = noradId;
    if (noradId == null) {
      this.clear();
      return;
    }
    if (this.entity) this.viewer.entities.remove(this.entity);
    const capturedId = noradId;
    this.entity = this.viewer.entities.add({
      id: `follow-${capturedId}`,
      position: new Cesium.CallbackPositionProperty(
        ((_time: Cesium.JulianDate, result?: Cesium.Cartesian3) => {
          const pos = this.layer.positionOf(capturedId);
          if (!pos) return undefined;
          return Cesium.Cartesian3.clone(pos, result ?? new Cesium.Cartesian3());
        }) as unknown as Cesium.CallbackPositionProperty.Callback,
        false,
        Cesium.ReferenceFrame.FIXED,
      ),
      // Default camera offset when tracked. Cesium interprets this in the
      // entity's local ENU frame — so this places the camera ~4000 km "back"
      // and 1500 km "up" from the satellite, giving a chase-cam view where
      // the orbit reads as a visible curve instead of a straight line pointed
      // straight down.
      viewFrom: new Cesium.Cartesian3(-4_000_000, -2_500_000, 1_500_000),
      // Invisible point — the entity exists purely to anchor the camera.
      point: {
        pixelSize: 0,
        color: Cesium.Color.TRANSPARENT,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    this.viewer.trackedEntity = this.entity;
  }

  clear(): void {
    if (this.viewer.trackedEntity === this.entity) {
      this.viewer.trackedEntity = undefined;
    }
    if (this.entity) {
      this.viewer.entities.remove(this.entity);
      this.entity = null;
    }
    this.noradId = null;
  }

  destroy(): void {
    this.clear();
  }
}
