import * as Cesium from 'cesium';

/**
 * NASA GIBS MODIS Terra true-color cloud overlay.
 *
 * Uses CorrectedReflectance which includes clouds as they actually appeared
 * in the most recent MODIS pass (~12h old). Rendered as a semi-transparent
 * overlay on top of the base imagery.
 *
 * Alpha fades with camera altitude:
 *   • Above ~8,000 km  → full opacity (MAX_ALPHA)
 *   • Below ~800 km    → fully transparent (you've "descended through" the clouds)
 *   • Between           → smooth interpolation
 *
 * This gives the effect of flying through a cloud layer.
 */

const MAX_ALPHA = 0.45;
const FADE_HIGH_M = 8_000_000; // full opacity above this
const FADE_LOW_M = 800_000;   // fully transparent below this
const UPDATE_INTERVAL_MS = 200; // throttle camera-height checks

function twoDaysAgoIso(): string {
  return new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
}

export class CloudOverlay {
  private layer: Cesium.ImageryLayer | null = null;
  private readonly viewer: Cesium.Viewer;
  private enabled = false;
  private preRenderDispose: (() => void) | null = null;
  private lastCheckMs = 0;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  setEnabled(on: boolean): void {
    if (on === this.enabled) return;
    this.enabled = on;
    if (on) {
      this.addLayer();
    } else {
      this.removeLayer();
    }
  }

  private addLayer(): void {
    if (this.layer) return;

    const time = twoDaysAgoIso();
    const url =
      `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/` +
      `MODIS_Terra_CorrectedReflectance_TrueColor/default/${time}/` +
      `250m/{z}/{y}/{x}.jpg`;

    const provider = new Cesium.UrlTemplateImageryProvider({
      url,
      tileWidth: 512,
      tileHeight: 512,
      minimumLevel: 0,
      maximumLevel: 7,
      tilingScheme: new Cesium.GeographicTilingScheme(),
      rectangle: Cesium.Rectangle.MAX_VALUE,
      credit: new Cesium.Credit('NASA GIBS · MODIS Terra clouds', true),
    });

    this.layer = new Cesium.ImageryLayer(provider, {
      alpha: MAX_ALPHA,
    });

    // Add on top of all existing imagery layers
    this.viewer.imageryLayers.add(this.layer);

    // Per-frame altitude-based alpha fade
    this.preRenderDispose = this.viewer.scene.preRender.addEventListener(() => {
      this.updateAlpha();
    });
  }

  private removeLayer(): void {
    if (this.preRenderDispose) {
      this.preRenderDispose();
      this.preRenderDispose = null;
    }
    if (this.layer) {
      try {
        this.viewer.imageryLayers.remove(this.layer);
      } catch {
        /* viewer may be torn down */
      }
      this.layer = null;
    }
  }

  private updateAlpha(): void {
    if (!this.layer) return;
    const now = performance.now();
    if (now - this.lastCheckMs < UPDATE_INTERVAL_MS) return;
    this.lastCheckMs = now;

    const carto = this.viewer.camera.positionCartographic;
    const altM = carto.height;

    let t: number;
    if (altM >= FADE_HIGH_M) {
      t = 1;
    } else if (altM <= FADE_LOW_M) {
      t = 0;
    } else {
      // Smooth ease: use a cubic curve for natural fade
      const linear = (altM - FADE_LOW_M) / (FADE_HIGH_M - FADE_LOW_M);
      t = linear * linear * (3 - 2 * linear); // smoothstep
    }

    this.layer.alpha = t * MAX_ALPHA;
  }

  destroy(): void {
    this.removeLayer();
  }
}
