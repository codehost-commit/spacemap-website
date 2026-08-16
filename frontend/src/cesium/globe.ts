import * as Cesium from 'cesium';
import { BODIES, bodyEllipsoid, hasIonToken, type BodyId } from './bodies.js';

/**
 * Boot a Cesium Viewer configured for the SpaceMap aesthetic.
 *
 * Earth  — dark, high-quality lighting, real sun/moon, star skybox, atmosphere.
 * Moon   — same lighting + stars, but no atmosphere shell, no lens sun (it
 *          washes out the LRO imagery), no "moon sprite" (we're standing on
 *          it), and a Moon-radius ellipsoid so surface positions actually
 *          land on the rendered globe instead of Earth-orbit altitude.
 */
export function createViewer(container: HTMLElement, body: BodyId = 'earth'): Cesium.Viewer {
  const def = BODIES[body];
  const ellipsoid = bodyEllipsoid(body);

  // Cesium 1.121 lets us seed the default ellipsoid before creating the
  // viewer — every downstream primitive that reads Ellipsoid.default (star
  // catalog, some polylines, distance display conditions) then picks up the
  // right radius. Reset back to WGS84 in destroy() would be ideal, but
  // GlobeCanvas fully tears the viewer down on body switch so it's moot.
  Cesium.Ellipsoid.default = ellipsoid;

  const viewer = new Cesium.Viewer(container, {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    // No default base layer — BaseImageryController swaps in the correct
    // imagery immediately after boot.
    baseLayer: false as unknown as false,
    skyBox: createStarSkyBox(),
    // Only Earth gets the ground-hugging atmosphere shell. On the Moon it
    // would render a bluish halo around a body that has no atmosphere.
    skyAtmosphere: def.hasAtmosphere ? new Cesium.SkyAtmosphere(ellipsoid) : false,
    globe: new Cesium.Globe(ellipsoid),
  });

  const scene = viewer.scene;
  scene.globe.baseColor = def.globeBaseColor;
  scene.globe.enableLighting = true;
  scene.globe.dynamicAtmosphereLighting = def.hasAtmosphere;
  scene.globe.showGroundAtmosphere = def.hasAtmosphere;
  if (def.hasAtmosphere) {
    scene.globe.atmosphereBrightnessShift = -0.05;
  }
  if (scene.skyAtmosphere) {
    scene.skyAtmosphere.hueShift = -0.05;
  }
  // Moon sprite makes sense in Earth view (it's the actual Moon in the
  // distance). On Moon view we're standing on it — a floating Moon sprite
  // would be surreal in the wrong way.
  scene.moon = def.id === 'earth' ? new Cesium.Moon() : (undefined as unknown as Cesium.Moon);
  const sun = new Cesium.Sun();
  // Bump the sun's built-in lens flare — Cesium's Sun sprite has a glow
  // multiplier that produces the classic "star with rays" halo. 1 is the
  // default; anything > 3 starts to feel like real sunlight through a lens.
  // On the Moon we tone this down: no atmosphere means the raw sun bloom
  // reads as a giant white blob dominating the frame.
  (sun as unknown as { glowFactor: number }).glowFactor = def.hasAtmosphere ? 4 : 1;
  scene.sun = sun;
  scene.backgroundColor = Cesium.Color.BLACK;
  scene.fog.enabled = def.hasAtmosphere;
  // Real sun position drives day/night — same on both bodies.
  scene.light = new Cesium.SunLight();

  viewer.clock.shouldAnimate = true;
  viewer.clock.multiplier = 1;
  const controller = scene.screenSpaceCameraController;
  controller.maximumMovementRatio = 0.08;
  controller.inertiaSpin = 0.82;
  controller.inertiaTranslate = 0.82;
  // Zoom limits: only apply body-radius-scaled clamps on non-Earth bodies —
  // otherwise Moon's much smaller sphere lets you scroll straight through it.
  // Earth keeps Cesium's built-in defaults so ground-level zoom still works
  // for looking at buildings / launch pads.
  if (def.id !== 'earth') {
    controller.minimumZoomDistance = def.radiusM * 0.02;
    controller.maximumZoomDistance = def.radiusM * 25;
  }

  // Fly the camera to the body's default home view instead of Cesium's
  // Earth-centric default, so switching to the Moon actually shows the Moon
  // filling the viewport.
  const [lon, lat] = def.homeLonLat;
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, def.homeAltitudeM, ellipsoid),
  });

  // 3-D terrain — loaded asynchronously so the viewer boots instantly on
  // the smooth ellipsoid and swaps in relief tiles when Ion answers. If no
  // token is configured (local dev without .env.local, PR builds), we stay
  // on the ellipsoid and everything else still works. A soft failure inside
  // the promise leaves the ellipsoid in place too — we log and move on.
  if (hasIonToken()) {
    // Quantised-mesh terrain (Earth's Cesium World Terrain).
    if (def.terrainIonAssetId !== undefined) {
      const assetId = def.terrainIonAssetId;
      console.info(`[globe] loading Ion terrain for ${def.id} (asset ${assetId})…`);
      Cesium.CesiumTerrainProvider.fromIonAssetId(assetId, { requestVertexNormals: true })
        .then((provider) => {
          if (viewer.isDestroyed()) return;
          viewer.scene.setTerrain(new Cesium.Terrain(Promise.resolve(provider)));
          console.info(`[globe] Ion terrain applied for ${def.id} — zoom in to see 3-D relief.`);
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(
            `[globe] terrain load failed for ${def.id} (asset ${assetId}): ${msg}. ` +
              `Add asset ${assetId} at ion.cesium.com/assetdepot if it isn't in your account.`,
          );
        });
    }

    // 3D Tileset (the Moon's "Cesium Moon" — a fully-textured lunar mesh).
    if (def.tilesetIonAssetId !== undefined) {
      const assetId = def.tilesetIonAssetId;
      console.info(`[globe] loading Ion 3D tileset for ${def.id} (asset ${assetId})…`);
      Cesium.Cesium3DTileset.fromIonAssetId(assetId)
        .then((tileset) => {
          if (viewer.isDestroyed()) return;
          viewer.scene.primitives.add(tileset);
          console.info(
            `[globe] Ion 3D tileset applied for ${def.id} — surface now real 3-D geometry.`,
          );
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(
            `[globe] 3D tileset load failed for ${def.id} (asset ${assetId}): ${msg}. ` +
              `Add asset ${assetId} at ion.cesium.com/assetdepot if it isn't in your account.`,
          );
        });
    }
  } else {
    console.info('[globe] no VITE_CESIUM_ION_TOKEN — falling back to smooth ellipsoid');
  }

  // Bloom — subtle glow on bright pixels (satellites, sun, bright stars).
  // Deliberately gentle: HDR mode + aggressive uniforms tonemap the base
  // imagery to near-black, so we stick to the LDR default framebuffer and
  // dial the bloom just past Cesium's defaults.
  try {
    const lib = Cesium.PostProcessStageLibrary as unknown as {
      createBloomStage?: () => Cesium.PostProcessStage;
    };
    const bloom = lib.createBloomStage?.();
    if (bloom) {
      bloom.enabled = true;
      const u = bloom.uniforms as Record<string, unknown>;
      u.contrast = 128;
      u.brightness = -0.25;
      u.glowOnly = false;
      u.delta = 1.2;
      u.sigma = 2.4;
      u.stepSize = 1.0;
      scene.postProcessStages.add(bloom);
    }
  } catch (err) {
    console.warn('[globe] bloom stage failed', err);
  }

  return viewer;
}

function createStarSkyBox(): Cesium.SkyBox {
  const base = Cesium.buildModuleUrl('Assets/Textures/SkyBox/');
  return new Cesium.SkyBox({
    sources: {
      positiveX: `${base}tycho2t3_80_px.jpg`,
      negativeX: `${base}tycho2t3_80_mx.jpg`,
      positiveY: `${base}tycho2t3_80_py.jpg`,
      negativeY: `${base}tycho2t3_80_my.jpg`,
      positiveZ: `${base}tycho2t3_80_pz.jpg`,
      negativeZ: `${base}tycho2t3_80_mz.jpg`,
    },
  });
}
