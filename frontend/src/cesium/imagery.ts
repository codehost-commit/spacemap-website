import * as Cesium from "cesium";

/**
 * Base-imagery layer catalog. All GIBS layers are auth-free and CORS-open, so
 * they work from any static host.
 *
 * NB: GIBS EPSG:4326 tile matrix sets have specific level counts per resolution
 * (500m → levels 0-6, 250m → 0-7, etc.). Exceeding maximumLevel causes 404s and
 * the tiles simply don't show — which shows up as "half the globe is black".
 * Using UrlTemplateImageryProvider here instead of WMTS keeps the URL exact and
 * predictable.
 */
export interface ImageryDef {
  id: string;
  label: string;
  description: string;
  create: () => Cesium.ImageryProvider | Promise<Cesium.ImageryProvider>;
}

function twoDaysAgoIso(): string {
  return new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
}

function gibsProvider(opts: {
  layer: string;
  time?: string;
  tileMatrixSet: string;
  ext: "jpg" | "png";
  maximumLevel: number;
  credit: string;
}): Cesium.UrlTemplateImageryProvider {
  const timeSegment = opts.time ? `${opts.time}/` : "";
  const url = `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/${opts.layer}/default/${timeSegment}${opts.tileMatrixSet}/{z}/{y}/{x}.${opts.ext}`;
  return new Cesium.UrlTemplateImageryProvider({
    url,
    tileWidth: 512,
    tileHeight: 512,
    minimumLevel: 0,
    maximumLevel: opts.maximumLevel,
    tilingScheme: new Cesium.GeographicTilingScheme(),
    rectangle: Cesium.Rectangle.MAX_VALUE,
    credit: new Cesium.Credit(opts.credit, true),
  });
}

export const IMAGERY_LAYERS: readonly ImageryDef[] = [
  {
    id: "bluemarble",
    label: "Blue Marble",
    description: "NASA Blue Marble Next Generation — cloudless composite.",
    create: () =>
      gibsProvider({
        layer: "BlueMarble_ShadedRelief_Bathymetry",
        tileMatrixSet: "500m",
        ext: "jpg",
        maximumLevel: 6, // 500m set has 7 levels total (0..6)
        credit: "NASA GIBS · Blue Marble",
      }),
  },
  {
    id: "modis-terra",
    label: "MODIS Terra (recent)",
    description:
      "MODIS Terra true-color, two days ago. Real cloud cover, actual sea ice, current wildfires.",
    create: () =>
      gibsProvider({
        layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
        time: twoDaysAgoIso(),
        tileMatrixSet: "250m",
        ext: "jpg",
        maximumLevel: 7, // 250m set has 8 levels total (0..7)
        credit: "NASA GIBS · MODIS Terra",
      }),
  },
  {
    id: "black-marble",
    label: "Black Marble (night)",
    description: "VIIRS Black Marble city lights — humanity glowing from orbit.",
    create: () =>
      gibsProvider({
        layer: "VIIRS_Black_Marble",
        tileMatrixSet: "500m",
        ext: "png",
        maximumLevel: 6,
        credit: "NASA GIBS · VIIRS Black Marble",
      }),
  },
  {
    id: "naturalearth",
    label: "Natural Earth (offline)",
    description: "Bundled Cesium fallback — works with no network.",
    create: async () =>
      Cesium.TileMapServiceImageryProvider.fromUrl(
        Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
      ),
  },
];

export const DEFAULT_IMAGERY_ID = "bluemarble";

/**
 * Swap the viewer's base imagery layer while leaving overlays (heatmap, etc.)
 * untouched. Called on boot and whenever the user picks a new layer.
 */
export class BaseImageryController {
  private current: Cesium.ImageryLayer | null = null;

  constructor(private readonly viewer: Cesium.Viewer) {}

  async apply(id: string): Promise<void> {
    const def = IMAGERY_LAYERS.find((d) => d.id === id) ?? IMAGERY_LAYERS[0];
    try {
      const provider = await Promise.resolve(def.create());
      const layer = new Cesium.ImageryLayer(provider);
      // Insert at bottom so overlays stay on top.
      this.viewer.imageryLayers.add(layer, 0);
      if (this.current) {
        this.viewer.imageryLayers.remove(this.current);
      }
      this.current = layer;
    } catch (err) {
      console.warn("[imagery] failed to apply", id, err);
    }
  }

  destroy(): void {
    if (this.current) {
      try {
        this.viewer.imageryLayers.remove(this.current);
      } catch {
        /* viewer already destroyed */
      }
      this.current = null;
    }
  }
}
