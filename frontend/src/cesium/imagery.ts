import * as Cesium from 'cesium';

/**
 * Base-imagery catalog.
 *
 * Primary is ArcGIS World Imagery — same source Cesium itself falls back on
 * when Ion isn't configured. Very high resolution, CORS-open, no token, and
 * (unlike GIBS) doesn't care about picky WMTS URL conventions.
 *
 * GIBS layers are kept as alternates for the science / recent-photo vibe.
 * They are notoriously finicky: BlueMarble insists on `.jpeg` (not `.jpg`),
 * MODIS uses `.jpg`, VIIRS uses `.png`, and the maximumLevel must match the
 * tile matrix set exactly or you get 400s that render as a black hemisphere.
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

function gibs(opts: {
  layer: string;
  time?: string;
  tileMatrixSet: string;
  ext: 'jpg' | 'jpeg' | 'png';
  maximumLevel: number;
  credit: string;
}): Cesium.UrlTemplateImageryProvider {
  const timeSegment = opts.time ? `${opts.time}/` : '';
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
    id: 'arcgis',
    label: 'ArcGIS World Imagery',
    description: "ESRI's composite Bing / Maxar / USGS aerial imagery — best default quality.",
    create: async () =>
      Cesium.ArcGisMapServerImageryProvider.fromUrl(
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
        {
          enablePickFeatures: false,
        },
      ),
  },
  {
    id: 'bluemarble',
    label: 'NASA Blue Marble',
    description: "Classic cloudless composite from NASA's Blue Marble series.",
    create: () =>
      gibs({
        layer: 'BlueMarble_ShadedRelief_Bathymetry',
        tileMatrixSet: '500m',
        ext: 'jpeg',
        maximumLevel: 6,
        credit: 'NASA GIBS · Blue Marble',
      }),
  },
  {
    id: 'modis-terra',
    label: 'MODIS Terra (recent)',
    description: 'Real satellite photo from two days ago — actual cloud cover, sea ice, wildfires.',
    create: () =>
      gibs({
        layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
        time: twoDaysAgoIso(),
        tileMatrixSet: '250m',
        ext: 'jpg',
        maximumLevel: 7,
        credit: 'NASA GIBS · MODIS Terra',
      }),
  },
  {
    id: 'black-marble',
    label: 'Black Marble (night)',
    description: 'VIIRS Black Marble city lights — humanity glowing from orbit.',
    create: () =>
      gibs({
        layer: 'VIIRS_Black_Marble',
        tileMatrixSet: '500m',
        ext: 'png',
        maximumLevel: 6,
        credit: 'NASA GIBS · VIIRS Black Marble',
      }),
  },
  {
    id: 'naturalearth',
    label: 'Natural Earth (offline)',
    description: 'Bundled Cesium fallback — works with no network.',
    create: async () =>
      Cesium.TileMapServiceImageryProvider.fromUrl(
        Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII'),
      ),
  },
];

export const DEFAULT_IMAGERY_ID = 'arcgis';

export class BaseImageryController {
  private current: Cesium.ImageryLayer | null = null;

  constructor(private readonly viewer: Cesium.Viewer) {}

  async apply(id: string): Promise<void> {
    const def = IMAGERY_LAYERS.find((d) => d.id === id) ?? IMAGERY_LAYERS[0];
    try {
      const provider = await Promise.resolve(def.create());
      const layer = new Cesium.ImageryLayer(provider);
      this.viewer.imageryLayers.add(layer, 0);
      if (this.current) {
        this.viewer.imageryLayers.remove(this.current);
      }
      this.current = layer;
    } catch (err) {
      console.warn('[imagery] failed to apply', id, err);
    }
  }

  destroy(): void {
    if (this.current) {
      try {
        this.viewer.imageryLayers.remove(this.current);
      } catch {
        /* viewer torn down */
      }
      this.current = null;
    }
  }
}
