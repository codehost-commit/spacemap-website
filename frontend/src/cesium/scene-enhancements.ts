import * as Cesium from "cesium";
import countriesGeoJson from "../assets/countries.json";
import citiesGeoJson from "../assets/cities.json";
import stars from "../assets/stars.json";

export type VisualLayerId = "graticule" | "labels" | "terminator";

const STAR_SPHERE_RADIUS_M = 90_000_000;
const CITY_LIMIT = 110;
const COUNTRY_LABEL_LIMIT = 90;

export class SceneEnhancements {
  private readonly bloom: Cesium.PostProcessStageComposite;
  private readonly starField: StarField;
  private readonly terminator: SolarTerminator;
  private readonly graticule: GraticuleOverlay;
  private readonly labels: LabelsOverlay;
  private readonly onPreRender: (scene: Cesium.Scene, time: Cesium.JulianDate) => void;

  constructor(private readonly viewer: Cesium.Viewer) {
    const { scene } = viewer;
    scene.highDynamicRange = true;
    scene.postProcessStages.fxaa.enabled = true;

    this.bloom = scene.postProcessStages.bloom;
    this.bloom.enabled = true;
    const bloomUniforms = this.bloom.uniforms as Record<string, number>;
    bloomUniforms.contrast = 128;
    bloomUniforms.brightness = -0.08;
    bloomUniforms.glowOnly = 0;
    bloomUniforms.delta = 1.1;
    bloomUniforms.sigma = 2.4;
    bloomUniforms.stepSize = 4.0;

    this.starField = new StarField(scene);
    this.terminator = new SolarTerminator(scene);
    this.graticule = new GraticuleOverlay(scene);
    this.labels = new LabelsOverlay(viewer);

    this.onPreRender = (_scene, time) => {
      this.starField.update(time);
      this.terminator.update(time);
    };
    scene.preRender.addEventListener(this.onPreRender);
  }

  setLayerEnabled(layer: VisualLayerId, enabled: boolean): void {
    if (layer === "graticule") this.graticule.setEnabled(enabled);
    else if (layer === "labels") this.labels.setEnabled(enabled);
    else this.terminator.setEnabled(enabled);
  }

  destroy(): void {
    this.viewer.scene.preRender.removeEventListener(this.onPreRender);
    this.labels.destroy();
    this.graticule.destroy();
    this.terminator.destroy();
    this.starField.destroy();
    this.bloom.enabled = false;
  }
}

class StarField {
  private readonly points: Cesium.PointPrimitiveCollection;
  private readonly modelMatrix = new Cesium.Matrix4();

  constructor(private readonly scene: Cesium.Scene) {
    this.points = scene.primitives.add(new Cesium.PointPrimitiveCollection());
    for (const star of stars as number[][]) {
      const [ra, dec, mag, ci] = star;
      const cosDec = Math.cos(dec);
      const position = new Cesium.Cartesian3(
        STAR_SPHERE_RADIUS_M * cosDec * Math.cos(ra),
        STAR_SPHERE_RADIUS_M * cosDec * Math.sin(ra),
        STAR_SPHERE_RADIUS_M * Math.sin(dec),
      );
      this.points.add({
        position,
        color: starColor(ci),
        pixelSize: magnitudeToPixelSize(mag),
        scaleByDistance: new Cesium.NearFarScalar(1.0, 1.15, 1.0e9, 0.65),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
    }
  }

  update(time: Cesium.JulianDate): void {
    const rotation = Cesium.Transforms.computeIcrfToFixedMatrix(time);
    if (rotation) {
      this.points.modelMatrix = Cesium.Matrix4.fromRotationTranslation(
        rotation,
        Cesium.Cartesian3.ZERO,
        this.modelMatrix,
      );
    }
  }

  destroy(): void {
    this.scene.primitives.remove(this.points);
  }
}

class SolarTerminator {
  private readonly lines: Cesium.PolylineCollection;
  private readonly polyline: Cesium.Polyline;
  private enabled = true;

  constructor(private readonly scene: Cesium.Scene) {
    this.lines = scene.primitives.add(new Cesium.PolylineCollection());
    this.polyline = this.lines.add({
      positions: [],
      width: 1.8,
      material: Cesium.Color.fromCssColorString("#8ac6ff").withAlpha(0.75),
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.lines.show = enabled;
  }

  update(time: Cesium.JulianDate): void {
    if (!this.enabled) return;
    const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
    const sunInertial = Cesium.Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(
      time,
      new Cesium.Cartesian3(),
    );
    let sunFixed = sunInertial;
    if (icrfToFixed) {
      sunFixed = Cesium.Matrix3.multiplyByVector(
        icrfToFixed,
        sunInertial,
        new Cesium.Cartesian3(),
      );
    }
    const normal = Cesium.Cartesian3.normalize(sunFixed, new Cesium.Cartesian3());
    const seed =
      Math.abs(Cesium.Cartesian3.dot(normal, Cesium.Cartesian3.UNIT_Z)) > 0.92
        ? Cesium.Cartesian3.UNIT_Y
        : Cesium.Cartesian3.UNIT_Z;
    const tangent = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.cross(seed, normal, new Cesium.Cartesian3()),
      new Cesium.Cartesian3(),
    );
    const bitangent = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.cross(normal, tangent, new Cesium.Cartesian3()),
      new Cesium.Cartesian3(),
    );

    const positions: Cesium.Cartesian3[] = [];
    for (let i = 0; i <= 256; i++) {
      const theta = (i / 256) * Cesium.Math.TWO_PI;
      const a = Cesium.Cartesian3.multiplyByScalar(
        tangent,
        Math.cos(theta),
        new Cesium.Cartesian3(),
      );
      const b = Cesium.Cartesian3.multiplyByScalar(
        bitangent,
        Math.sin(theta),
        new Cesium.Cartesian3(),
      );
      const point = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.add(a, b, new Cesium.Cartesian3()),
        new Cesium.Cartesian3(),
      );
      positions.push(
        Cesium.Cartesian3.multiplyByScalar(point, 6_395_000, new Cesium.Cartesian3()),
      );
    }
    this.polyline.positions = positions;
  }

  destroy(): void {
    this.scene.primitives.remove(this.lines);
  }
}

class GraticuleOverlay {
  private readonly lines: Cesium.PolylineCollection;

  constructor(private readonly scene: Cesium.Scene) {
    this.lines = scene.primitives.add(new Cesium.PolylineCollection());
    this.lines.show = false;
    const color = Cesium.Color.fromCssColorString("#4fc3f7").withAlpha(0.22);

    for (let lon = -180; lon < 180; lon += 15) {
      this.lines.add({
        positions: sampleMeridian(lon),
        width: lon % 45 === 0 ? 1.3 : 0.9,
        material: color,
      });
    }
    for (let lat = -75; lat <= 75; lat += 15) {
      if (lat === 0) continue;
      this.lines.add({
        positions: sampleParallel(lat),
        width: lat % 45 === 0 ? 1.25 : 0.85,
        material: color,
      });
    }
    this.lines.add({
      positions: sampleParallel(0),
      width: 1.4,
      material: Cesium.Color.fromCssColorString("#8bd8ff").withAlpha(0.32),
    });
  }

  setEnabled(enabled: boolean): void {
    this.lines.show = enabled;
  }

  destroy(): void {
    this.scene.primitives.remove(this.lines);
  }
}

class LabelsOverlay {
  private readonly countrySource = new Cesium.GeoJsonDataSource("countries");
  private readonly countryLabels: Cesium.LabelCollection;
  private readonly cityLabels: Cesium.LabelCollection;
  private readonly cityPoints: Cesium.PointPrimitiveCollection;

  constructor(private readonly viewer: Cesium.Viewer) {
    this.countryLabels = viewer.scene.primitives.add(new Cesium.LabelCollection());
    this.cityLabels = viewer.scene.primitives.add(new Cesium.LabelCollection());
    this.cityPoints = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
    this.countrySource.show = false;
    this.countryLabels.show = false;
    this.cityLabels.show = false;
    this.cityPoints.show = false;
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.countrySource.load(countriesGeoJson as object, {
      stroke: Cesium.Color.fromCssColorString("#58c2ff").withAlpha(0.5),
      fill: Cesium.Color.TRANSPARENT,
      strokeWidth: 1.1,
      clampToGround: false,
    });
    await this.viewer.dataSources.add(this.countrySource);

    const countries = ((countriesGeoJson as any).features as any[])
      .filter((feature) => Number(feature.properties?.LABELRANK ?? 99) <= 5)
      .sort((a, b) => Number(a.properties.LABELRANK) - Number(b.properties.LABELRANK))
      .slice(0, COUNTRY_LABEL_LIMIT);
    for (const feature of countries) {
      const lon = Number(feature.properties?.LABEL_X);
      const lat = Number(feature.properties?.LABEL_Y);
      const name = String(feature.properties?.NAME_LONG ?? feature.properties?.NAME ?? "");
      if (!Number.isFinite(lon) || !Number.isFinite(lat) || !name) continue;
      this.countryLabels.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 14_000),
        text: name.toUpperCase(),
        fillColor: Cesium.Color.fromCssColorString("#c6e9ff").withAlpha(0.85),
        font: '500 11px "IBM Plex Mono", monospace',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineColor: Cesium.Color.fromCssColorString("#041119").withAlpha(0.95),
        outlineWidth: 3,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(4.0e6, 2.2e7),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
    }

    const cities = ((citiesGeoJson as any).features as any[])
      .filter((feature) => {
        const props = feature.properties ?? {};
        return props.worldcity === 1 || Number(props.labelrank ?? 99) <= 2;
      })
      .sort((a, b) => Number(a.properties?.labelrank ?? 99) - Number(b.properties?.labelrank ?? 99))
      .slice(0, CITY_LIMIT);
    for (const feature of cities) {
      const [lon, lat] = feature.geometry?.coordinates ?? [];
      const name = String(feature.properties?.nameascii ?? feature.properties?.name ?? "");
      if (!Number.isFinite(lon) || !Number.isFinite(lat) || !name) continue;
      this.cityPoints.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 800),
        color: Cesium.Color.fromCssColorString("#9fe4ff").withAlpha(0.9),
        pixelSize: 3,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
      this.cityLabels.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 5_000),
        text: name,
        fillColor: Cesium.Color.fromCssColorString("#dcf4ff").withAlpha(0.92),
        font: '400 12px "IBM Plex Sans", sans-serif',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineColor: Cesium.Color.fromCssColorString("#031017").withAlpha(0.95),
        outlineWidth: 3,
        pixelOffset: new Cesium.Cartesian2(8, -10),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(200_000, 7.5e6),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
    }
  }

  setEnabled(enabled: boolean): void {
    this.countrySource.show = enabled;
    this.countryLabels.show = enabled;
    this.cityLabels.show = enabled;
    this.cityPoints.show = enabled;
  }

  destroy(): void {
    void this.viewer.dataSources.remove(this.countrySource, true);
    this.viewer.scene.primitives.remove(this.countryLabels);
    this.viewer.scene.primitives.remove(this.cityLabels);
    this.viewer.scene.primitives.remove(this.cityPoints);
  }
}

function sampleMeridian(longitudeDeg: number): Cesium.Cartesian3[] {
  const positions: Cesium.Cartesian3[] = [];
  for (let lat = -90; lat <= 90; lat += 2) {
    positions.push(Cesium.Cartesian3.fromDegrees(longitudeDeg, lat, 1_000));
  }
  return positions;
}

function sampleParallel(latitudeDeg: number): Cesium.Cartesian3[] {
  const positions: Cesium.Cartesian3[] = [];
  for (let lon = -180; lon <= 180; lon += 2) {
    positions.push(Cesium.Cartesian3.fromDegrees(lon, latitudeDeg, 1_000));
  }
  return positions;
}

function magnitudeToPixelSize(magnitude: number): number {
  return Cesium.Math.clamp(5.4 - magnitude * 0.55, 1.15, 4.6);
}

function starColor(colorIndex: number | null): Cesium.Color {
  if (colorIndex == null || !Number.isFinite(colorIndex)) {
    return Cesium.Color.WHITE.withAlpha(0.88);
  }
  if (colorIndex < -0.05) return Cesium.Color.fromCssColorString("#c9e6ff").withAlpha(0.9);
  if (colorIndex < 0.35) return Cesium.Color.fromCssColorString("#f5fbff").withAlpha(0.9);
  if (colorIndex < 0.8) return Cesium.Color.fromCssColorString("#fff3cf").withAlpha(0.9);
  if (colorIndex < 1.4) return Cesium.Color.fromCssColorString("#ffd39a").withAlpha(0.88);
  return Cesium.Color.fromCssColorString("#ffb37a").withAlpha(0.86);
}
