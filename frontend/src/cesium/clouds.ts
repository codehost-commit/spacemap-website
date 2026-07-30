import * as Cesium from 'cesium';

/**
 * NASA GIBS cloud overlay — uses the daily cloud-fraction grid product
 * rather than raw satellite swaths, so it's gap-filled globally.
 *
 * `MODIS_Terra_Cloud_Fraction_Day` and `MODIS_Aqua_Cloud_Fraction_Day` are
 * daily composites where every pixel has a value (0 = clear, 100 = overcast),
 * rendered as white-on-transparent PNG tiles. Stacking Terra + Aqua smooths
 * out the two overpass times into a single day's cloud cover.
 *
 * Alpha fades with camera altitude so the user "descends through" the deck:
 *   • Above ~8,000 km  → full opacity
 *   • Below ~800 km    → fully transparent
 *   • Between           → smoothstep interpolation
 */

const PER_LAYER_ALPHA = 0.55;
const FADE_HIGH_M = 8_000_000;
const FADE_LOW_M = 800_000;
const UPDATE_INTERVAL_MS = 200;

function recentDateIso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

function createGibsProvider(
  layer: string,
  time: string,
  tileMatrixSet: string,
  maximumLevel: number,
): Cesium.UrlTemplateImageryProvider {
  const url =
    `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/` +
    `${layer}/default/${time}/${tileMatrixSet}/{z}/{y}/{x}.png`;

  return new Cesium.UrlTemplateImageryProvider({
    url,
    tileWidth: 512,
    tileHeight: 512,
    minimumLevel: 0,
    maximumLevel,
    tilingScheme: new Cesium.GeographicTilingScheme(),
    rectangle: Cesium.Rectangle.MAX_VALUE,
    credit: new Cesium.Credit('NASA GIBS · MODIS cloud fraction', true),
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

    // Cloud fraction is published daily; use yesterday to guarantee availability.
    const time = recentDateIso(1);

    // Cloud fraction products use the 2km tile matrix, max zoom 5.
    const terraProvider = createGibsProvider(
      'MODIS_Terra_Cloud_Fraction_Day',
      time,
      '2km',
      5,
    );
    const aquaProvider = createGibsProvider(
      'MODIS_Aqua_Cloud_Fraction_Day',
      time,
      '2km',
      5,
    );

    this.terraLayer = new Cesium.ImageryLayer(terraProvider, {
      alpha: PER_LAYER_ALPHA,
    });
    this.aquaLayer = new Cesium.ImageryLayer(aquaProvider, {
      alpha: PER_LAYER_ALPHA,
    });

    // Push both on top of the base imagery.
    this.viewer.imageryLayers.add(this.terraLayer);
    this.viewer.imageryLayers.add(this.aquaLayer);

    // Per-frame altitude-based alpha fade.
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
      const linear = (altM - FADE_LOW_M) / (FADE_HIGH_M - FADE_LOW_M);
      t = linear * linear * (3 - 2 * linear); // smoothstep
    }

    const alpha = t * PER_LAYER_ALPHA;
    this.terraLayer.alpha = alpha;
    this.aquaLayer.alpha = alpha;
  }

  destroy(): void {
    this.removeLayers();
  }
}
