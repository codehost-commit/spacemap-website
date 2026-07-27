import * as Cesium from "cesium";

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
  scene.sun = new Cesium.Sun();
  scene.backgroundColor = Cesium.Color.BLACK;
  scene.fog.enabled = true;
  // Real sun position drives day/night.
  scene.light = new Cesium.SunLight();

  viewer.clock.shouldAnimate = true;
  viewer.clock.multiplier = 1;

  // Enable HDR framebuffer — required for bloom to look right on bright
  // satellites without washing out the imagery. Falls back gracefully on
  // devices where HDR isn't supported.
  try {
    (scene as unknown as { highDynamicRange: boolean }).highDynamicRange = true;
  } catch {
    /* older Cesium / unsupported context */
  }

  // Bloom + HDR — real starlight glow on satellites and the sun. The uniforms
  // here favour selective glow (bright pixels only) so ocean/land don't blur.
  try {
    const lib = Cesium.PostProcessStageLibrary as unknown as {
      createBloomStage?: () => Cesium.PostProcessStage;
    };
    const bloom = lib.createBloomStage?.();
    if (bloom) {
      bloom.enabled = true;
      const u = bloom.uniforms as Record<string, unknown>;
      // Bright-pixel threshold: only pixels above `brightness` bloom. Negative
      // values effectively lower the threshold — good for our dim points.
      u.contrast = 160;
      u.brightness = -0.5;
      u.glowOnly = false;
      // Gaussian blur radius controls how far the glow spreads.
      u.delta = 1.6;
      u.sigma = 3.4;
      u.stepSize = 1.5;
      scene.postProcessStages.add(bloom);
    }
  } catch (err) {
    console.warn("[globe] bloom stage failed", err);
  }

  return viewer;
}

function createStarSkyBox(): Cesium.SkyBox {
  const base = Cesium.buildModuleUrl("Assets/Textures/SkyBox/");
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
