import * as Cesium from 'cesium';

/**
 * Celestial-body registry — Part 1 of the "Beyond Earth" work.
 *
 * Each body describes everything the viewer needs to render its globe:
 * the physical ellipsoid, a very-high-resolution imagery layer, a nice
 * default camera pose, and which Earth-specific overlays should be hidden.
 *
 * The Moon layer uses NASA Moon Trek's LRO WAC global mosaic — the same
 * dataset every serious lunar map you've seen is built on. It's ~100 m /px
 * at full zoom, streamed as EPSG:4326 WMTS tiles, and looks stunning on
 * a Cesium globe with the atmosphere and sea-level clouds turned off.
 *
 * Terrain is opt-in: if a VITE_CESIUM_ION_TOKEN is set at build time we
 * pull Cesium World Terrain (Ion asset 1) for Earth and the LOLA lunar
 * DEM (Ion asset 2684829) for the Moon. Without a token both bodies fall
 * back to a smooth ellipsoid (the default EllipsoidTerrainProvider).
 */

export type BodyId = 'earth' | 'moon';

export interface BodyDef {
  id: BodyId;
  label: string;
  short: string; // one-line marketing sentence for the switcher tooltip
  radiusM: number; // spherical radius; we build an isotropic Ellipsoid from it
  imagery: () => Cesium.ImageryProvider;
  /** Cesium Ion asset ID for this body's 3-D terrain. Loaded when a token exists. */
  terrainIonAssetId?: number;
  /** Height (metres) the camera should sit above the surface on first view. */
  homeAltitudeM: number;
  /** Rough centre the camera should look at when first switching in. */
  homeLonLat: [number, number];
  /** Colour used behind unloaded tiles — hides seams on slow networks. */
  globeBaseColor: Cesium.Color;
  /** Whether the atmosphere shell, sun/moon sprites, and lighting apply. */
  hasAtmosphere: boolean;
}

// Radii in metres — IAU 2015 / IAU 2000 mean values.
const EARTH_RADIUS_M = 6_378_137;
const MOON_RADIUS_M = 1_737_400;

/**
 * Seed Cesium's Ion token once, at module load. Vite inlines the env var at
 * build time; the GitHub Actions workflow injects it from a repo secret so
 * the token never lives in git. Missing token is a soft failure — every
 * downstream Ion call resolves without terrain, which is exactly what
 * `createViewer` handles below.
 *
 * Restricting the token to the deploy origin (Ion → Access Tokens → Allowed
 * URLs) is what actually makes it safe to ship in the browser bundle.
 */
const ION_TOKEN = (import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined) ?? '';
if (ION_TOKEN) {
  Cesium.Ion.defaultAccessToken = ION_TOKEN;
}

export function hasIonToken(): boolean {
  return ION_TOKEN.length > 0;
}

function earthImagery(): Cesium.ImageryProvider {
  // Placeholder — the real Earth imagery pipeline lives in imagery.ts and
  // gets swapped by BaseImageryController. This one exists only so a bare
  // createViewer(earth) call still shows *something* if the controller is
  // ever bypassed.
  return new Cesium.UrlTemplateImageryProvider({
    url:
      'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    credit: new Cesium.Credit('Esri, Maxar, Earthstar Geographics', true),
    maximumLevel: 19,
  });
}

/**
 * NASA Moon Trek — LRO WAC Global Mosaic, 303 pixels per degree, in
 * equirectangular (EPSG:4326) WMTS tiles. Level 0 = 2×1 tiles, standard
 * 256 px tile size, JPEG. Public, CORS-friendly, no auth.
 *
 * Note: Trek returns 200-with-blank for out-of-bounds tiles rather than 404,
 * so Cesium never sees an error — it just renders black off the edge. That
 * matches the tiling scheme exactly, so nothing extra to configure.
 */
function moonImagery(): Cesium.ImageryProvider {
  return new Cesium.UrlTemplateImageryProvider({
    url:
      'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    tileWidth: 256,
    tileHeight: 256,
    minimumLevel: 0,
    maximumLevel: 7,
    tilingScheme: new Cesium.GeographicTilingScheme({
      ellipsoid: new Cesium.Ellipsoid(MOON_RADIUS_M, MOON_RADIUS_M, MOON_RADIUS_M),
    }),
    rectangle: Cesium.Rectangle.MAX_VALUE,
    credit: new Cesium.Credit(
      'NASA / GSFC / Arizona State University — LRO WAC Global Mosaic (Moon Trek)',
      true,
    ),
  });
}

export const BODIES: Record<BodyId, BodyDef> = {
  earth: {
    id: 'earth',
    label: 'Earth',
    short: '30,000+ tracked objects — the SpaceMap you already know.',
    radiusM: EARTH_RADIUS_M,
    imagery: earthImagery,
    // Cesium World Terrain — the canonical global 3-D relief mesh from Ion.
    terrainIonAssetId: 1,
    homeAltitudeM: 20_000_000,
    homeLonLat: [0, 15],
    globeBaseColor: Cesium.Color.fromCssColorString('#0a1a2a'),
    hasAtmosphere: true,
  },
  moon: {
    id: 'moon',
    label: 'Moon',
    short: 'LRO WAC global mosaic — 100 m/pixel, streamed from NASA Moon Trek.',
    radiusM: MOON_RADIUS_M,
    imagery: moonImagery,
    // No Moon terrain for now — the LOLA Ion asset (2684829) returns 404 on
    // its tile requests, and the LRO WAC imagery already carries strong
    // baked-in crater shadows that read as 3-D relief at all zoom levels.
    // Earth still gets Cesium World Terrain via terrainIonAssetId = 1.
    // Moon is ~3.6× smaller than Earth; a proportionally-tighter default
    // altitude keeps it filling the viewport instead of shrinking away.
    homeAltitudeM: 5_500_000,
    homeLonLat: [0, 0],
    globeBaseColor: Cesium.Color.fromCssColorString('#1a1a1c'),
    hasAtmosphere: false,
  },
};

export function bodyEllipsoid(id: BodyId): Cesium.Ellipsoid {
  // Earth is an oblate spheroid — WGS-84 is the accepted reference and every
  // WMTS imagery layer / satellite ECEF stream assumes it. Substituting a
  // sphere here silently breaks tile matching and geolocation. Only bodies
  // we don't have a canonical geoid for (like the Moon in Part 1) get a
  // isotropic ellipsoid built from a mean radius.
  if (id === 'earth') return Cesium.Ellipsoid.WGS84;
  const r = BODIES[id].radiusM;
  return new Cesium.Ellipsoid(r, r, r);
}
