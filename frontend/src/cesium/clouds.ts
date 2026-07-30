import * as Cesium from 'cesium';

/**
 * NASA GIBS MODIS cloud overlay — stacks Terra + Aqua corrected-reflectance
 * layers so their orbital swaths fill each other's gaps. Terra crosses the
 * equator ~10:30 AM, Aqua ~1:30 PM; combined they cover most of the sunlit
 * hemisphere each day.
 *
 * Alpha fades with camera altitude so you "descend through" the cloud deck:
 *   • Above ~8,000 km  → full combined opacity
 *   • Below ~800 km    → fully transparent
 *   • Between           → smoothstep interpolation
 */

const PER_LAYER_ALPHA = 0.32; // each layer's max alpha (combined ~0.55 where they overlap)
const FADE_HIGH_M = 8_000_000;
const FADE_LOW_M = 800_000;
const UPDATE_INTERVAL_MS = 200;

function recentDateIso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

function createGibsProvider(layer: string, time: string): Cesium.UrlTemplateImageryProvider {
  const url =
    `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/` +
    `${layer}/default/${time}/250m/{z}/{y}/{x}.jpg`;

  return new Cesium.UrlTemplateImageryProvider({
    url,
    tileWidth: 512,
    tileHeight: 512,
    minimumLevel: 0,
    maximumLevel: 7,
    tilingScheme: new Cesium.GeographicTilingScheme(),
    rectangle: Cesium.Rectangle.MAX_VALUE,
    credit: new Cesium.Credit('NASA GIBS · MODIS cloud cover', true),
  });
}

export class CloudOverlay {
  private terraLayer: Cesium.ImageryLayer | null = null;
  private aquaLayer: Cesium.ImageryLayer | null = null;
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
      this.addLayers();
    } else {
      this.removeLayers();
    }
  }

  private addLayers(): void {
    if (this.terraLayer) return;

    // Use 2 days ago — GIBS needs processing time, and older dates have
    // more complete coverage. Terra and Aqua together fill most swath gaps.
    const time = recentDateIso(2);

    const terraProvider = createGibsProvider(
      'MODIS_Terra_CorrectedReflectance_TrueColor',
      time,
    );
    const aquaProvider = createGibsProvider(
      'MODIS_Aqua_CorrectedReflectance_TrueColor',
      time,
    );

    this.terraLayer = new Cesium.ImageryLayer(terraProvider, {
      alpha: PER_LAYER_ALPHA,
    });
    this.aquaLayer = new Cesium.ImageryLayer(aquaProvider, {
      alpha: PER_LAYER_ALPHA,
    });

    // Add both on top of existing imagery
    this.viewer.imageryLayers.add(this.terraLayer);
    this.viewer.imageryLayers.add(this.aquaLayer);

    // Per-frame altitude-based alpha fade
    this.preRenderDispose = this.viewer.scene.preRender.addEventListener(() => {
      this.updateAlpha();
    });
  }

  private removeLayers(): void {
    if (this.preRenderDispose) {
      this.preRenderDispose();
      this.preRenderDispose = null;
    }
    try {
      if (this.terraLayer) this.viewer.imageryLayers.remove(this.terraLayer);
      if (this.aquaLayer) this.viewer.imageryLayers.remove(this.aquaLayer);
    } catch {
      /* viewer may be torn down */
    }
    this.terraLayer = null;
    this.aquaLayer = null;
  }

  private updateAlpha(): void {
    if (!this.terraLayer || !this.aquaLayer) return;
    const now = performance.now();
    if (now - this.lastCheckMs < UPDATE_INTERVAL_MS) return;
    this.lastCheckMs = now;

    const altM = this.viewer.camera.positionCartographic.height;

    let t: number;
    if (altM >= FADE_HIGH_M) {
      t = 1;
    } else if (altM <= FADE_LOW_M) {
      t = 0;
    } else {
      // Smoothstep for natural fade
      const linear = (altM - FADE_LOW_M) / (FADE_HIGH_M - FADE_LOW_M);
      t = linear * linear * (3 - 2 * linear);
    }

    const alpha = t * PER_LAYER_ALPHA;
    this.terraLayer.alpha = alpha;
    this.aquaLayer.alpha = alpha;
  }

  destroy(): void {
    this.removeLayers();
  }
}
