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
    // Use natural-earth imagery bundled with Cesium as a sensible default so
    // the app works without an Ion token. Callers can swap in higher-res
    // imagery later.
    baseLayer: Cesium.ImageryLayer.fromProviderAsync(
      Cesium.TileMapServiceImageryProvider.fromUrl(
        Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
      ),
    ),
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
