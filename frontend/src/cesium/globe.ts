import * as Cesium from 'cesium';

/**
 * Boot a Cesium Viewer configured for the SpaceMap aesthetic: dark, no chrome,
 * high-quality lighting, real sun/moon, star skybox, atmosphere.
 */
export function createViewer(container: HTMLElement): Cesium.Viewer {
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
    // No default base layer — BaseImageryController swaps in NASA GIBS
    // streaming tiles (or an offline fallback) immediately after boot.
    // Cast is only because Cesium's TS types are strict; runtime accepts false.
    baseLayer: false as unknown as false,
    skyBox: createStarSkyBox(),
    skyAtmosphere: new Cesium.SkyAtmosphere(),
  });

  const scene = viewer.scene;
  scene.globe.enableLighting = true;
  scene.globe.dynamicAtmosphereLighting = true;
  scene.globe.showGroundAtmosphere = true;
  scene.globe.atmosphereBrightnessShift = -0.05;
  if (scene.skyAtmosphere) {
    scene.skyAtmosphere.hueShift = -0.05;
  }
  scene.moon = new Cesium.Moon();
  const sun = new Cesium.Sun();
  // Bump the sun's built-in lens flare — Cesium's Sun sprite has a glow
  // multiplier that produces the classic "star with rays" halo. 1 is the
  // default; anything > 3 starts to feel like real sunlight through a lens.
  (sun as unknown as { glowFactor: number }).glowFactor = 4;
  scene.sun = sun;
  scene.backgroundColor = Cesium.Color.BLACK;
  scene.fog.enabled = true;
  // Real sun position drives day/night.
  scene.light = new Cesium.SunLight();

  viewer.clock.shouldAnimate = true;
  viewer.clock.multiplier = 1;
  const controller = scene.screenSpaceCameraController;
  controller.maximumMovementRatio = 0.08;
  controller.inertiaSpin = 0.82;
  controller.inertiaTranslate = 0.82;

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
