import * as Cesium from "cesium";

/**
 * Base-imagery layer catalog. All GIBS layers are auth-free and CORS-open, so
 * they work from any static host. Blue Marble and Black Marble are static
 * imagery; MODIS Terra is time-varying and we anchor to two days ago so the
 * tiles are guaranteed to be processed.
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

export const IMAGERY_LAYERS: readonly ImageryDef[] = [
  {
    id: "bluemarble",
    label: "Blue Marble",
    description: "NASA Blue Marble Next Generation — cloudless composite.",
    create: () =>
      new Cesium.WebMapTileServiceImageryProvider({
        url: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default/500m/{TileMatrix}/{TileRow}/{TileCol}.jpeg",
        layer: "BlueMarble_ShadedRelief_Bathymetry",
        style: "default",
        format: "image/jpeg",
        tileMatrixSetID: "500m",
        maximumLevel: 8,
        tileWidth: 512,
        tileHeight: 512,
        tilingScheme: new Cesium.GeographicTilingScheme(),
        credit: new Cesium.Credit("NASA GIBS · Blue Marble", true),
      }),
  },
  {
    id: "modis-terra",
    label: "MODIS Terra (recent)",
    description:
      "MODIS Terra true-color, two days ago. Real cloud cover, actual sea ice, current wildfires.",
    create: () =>
      new Cesium.WebMapTileServiceImageryProvider({
        url: `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${twoDaysAgoIso()}/250m/{TileMatrix}/{TileRow}/{TileCol}.jpg`,
        layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
        style: "default",
        format: "image/jpeg",
        tileMatrixSetID: "250m",
        maximumLevel: 9,
        tileWidth: 512,
        tileHeight: 512,
        tilingScheme: new Cesium.GeographicTilingScheme(),
        credit: new Cesium.Credit("NASA GIBS · MODIS Terra", true),
      }),
  },
  {
    id: "black-marble",
    label: "Black Marble (night)",
    description: "VIIRS Black Marble city lights — humanity glowing from orbit.",
    create: () =>
      new Cesium.WebMapTileServiceImageryProvider({
        url: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_Black_Marble/default/500m/{TileMatrix}/{TileRow}/{TileCol}.png",
        layer: "VIIRS_Black_Marble",
        style: "default",
        format: "image/png",
        tileMatrixSetID: "500m",
        maximumLevel: 8,
        tileWidth: 512,
        tileHeight: 512,
        tilingScheme: new Cesium.GeographicTilingScheme(),
        credit: new Cesium.Credit("NASA GIBS · VIIRS Black Marble", true),
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
