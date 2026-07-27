import * as Cesium from "cesium";
import countriesJson from "../assets/countries.json";
import citiesJson from "../assets/cities.json";
import starsJson from "../assets/stars.json";

export type VisualLayerId = "graticule" | "labels" | "terminator";

const STAR_RADIUS_M = 75_000_000;
const STAR_COUNT = 3200;
const COUNTRY_LABEL_LIMIT = 80;
const CITY_LABEL_LIMIT = 80;

export class SceneEnhancements {
  private readonly starField: StarField;
  private readonly terminator: TerminatorOverlay;
  private readonly graticule: GraticuleOverlay;
  private readonly labels: LabelsOverlay;
  private readonly onPreRender: (scene: Cesium.Scene, time: Cesium.JulianDate) => void;

  constructor(private readonly viewer: Cesium.Viewer) {
    const scene = viewer.scene;
    scene.skyBox = undefined;
    scene.backgroundColor = Cesium.Color.BLACK;
    scene.highDynamicRange = true;
    scene.postProcessStages.fxaa.enabled = true;

    const bloom = scene.postProcessStages.bloom;
    bloom.enabled = true;
    bloom.uniforms.contrast = 128;
    bloom.uniforms.brightness = -0.1;
    bloom.uniforms.glowOnly = false;
    bloom.uniforms.delta = 1.05;
    bloom.uniforms.sigma = 2.1;
    bloom.uniforms.stepSize = 3.2;

    this.starField = new StarField(scene);
    this.terminator = new TerminatorOverlay(scene);
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
  }
}

class StarField {
  private readonly points: Cesium.PointPrimitiveCollection;
  private readonly modelMatrix = new Cesium.Matrix4();

  constructor(private readonly scene: Cesium.Scene) {
    this.points = scene.primitives.add(
      new Cesium.PointPrimitiveCollection({
        blendOption: Cesium.BlendOption.OPAQUE_AND_TRANSLUCENT,
      }),
    );
    for (const star of (starsJson as number[][]).slice(0, STAR_COUNT)) {
      const [ra, dec, mag, colorIndex] = star;
      const cosDec = Math.cos(dec);
      this.points.add({
        position: new Cesium.Cartesian3(
          STAR_RADIUS_M * cosDec * Math.cos(ra),
          STAR_RADIUS_M * cosDec * Math.sin(ra),
          STAR_RADIUS_M * Math.sin(dec),
        ),
        color: starColor(colorIndex),
        pixelSize: starSize(mag),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
    }
  }

  update(time: Cesium.JulianDate): void {
    const rotation = Cesium.Transforms.computeIcrfToFixedMatrix(time);
    if (!rotation) return;
    this.points.modelMatrix = Cesium.Matrix4.fromRotationTranslation(
      rotation,
      Cesium.Cartesian3.ZERO,
      this.modelMatrix,
    );
  }

  destroy(): void {
    this.scene.primitives.remove(this.points);
  }
}

class TerminatorOverlay {
  private readonly lines: Cesium.PolylineCollection;
  private readonly polyline: Cesium.Polyline;
  private enabled = true;

  constructor(private readonly scene: Cesium.Scene) {
    this.lines = scene.primitives.add(new Cesium.PolylineCollection());
    this.polyline = this.lines.add({
      positions: [],
      width: 1.6,
      material: Cesium.Material.fromType("Color", {
        color: Cesium.Color.fromCssColorString("#89d4ff").withAlpha(0.72),
      }),
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
      Math.abs(Cesium.Cartesian3.dot(normal, Cesium.Cartesian3.UNIT_Z)) > 0.9
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
    for (let i = 0; i <= 192; i++) {
      const theta = (i / 192) * Cesium.Math.TWO_PI;
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
      positions.push(Cesium.Cartesian3.multiplyByScalar(point, 6_390_000, point));
    }

    this.polyline.positions = positions;
  }

  destroy(): void {
    this.scene.primitives.remove(this.lines);
  }
}

class GraticuleOverlay {
  private readonly primitive: Cesium.Primitive;

  constructor(private readonly scene: Cesium.Scene) {
    const instances: Cesium.GeometryInstance[] = [];
    for (let lon = -180; lon < 180; lon += 15) {
      instances.push(
        new Cesium.GeometryInstance({
          geometry: new Cesium.PolylineGeometry({
            positions: sampleMeridian(lon),
            width: lon % 45 === 0 ? 1.2 : 0.8,
            vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT,
          }),
        }),
      );
    }
    for (let lat = -75; lat <= 75; lat += 15) {
      instances.push(
        new Cesium.GeometryInstance({
          geometry: new Cesium.PolylineGeometry({
            positions: sampleParallel(lat),
            width: lat === 0 ? 1.25 : lat % 45 === 0 ? 1.1 : 0.75,
            vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT,
          }),
        }),
      );
    }

    this.primitive = scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: instances,
        appearance: new Cesium.PolylineMaterialAppearance({
          material: Cesium.Material.fromType("Color", {
            color: Cesium.Color.fromCssColorString("#58bff8").withAlpha(0.23),
          }),
        }),
        asynchronous: false,
        allowPicking: false,
        show: false,
      }),
    );
  }

  setEnabled(enabled: boolean): void {
    this.primitive.show = enabled;
  }

  destroy(): void {
    this.scene.primitives.remove(this.primitive);
  }
}

class LabelsOverlay {
  private readonly countrySource = new Cesium.GeoJsonDataSource("countries");
  private readonly countryLabels: Cesium.LabelCollection;
  private readonly cityLabels: Cesium.LabelCollection;
  private ready = false;

  constructor(private readonly viewer: Cesium.Viewer) {
    this.countryLabels = viewer.scene.primitives.add(new Cesium.LabelCollection());
    this.cityLabels = viewer.scene.primitives.add(new Cesium.LabelCollection());
    this.countryLabels.show = false;
    this.cityLabels.show = false;
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.countrySource.load(countriesJson as object, {
      stroke: Cesium.Color.fromCssColorString("#58bff8").withAlpha(0.45),
      fill: Cesium.Color.TRANSPARENT,
      strokeWidth: 1.0,
      clampToGround: false,
    });
    await this.viewer.dataSources.add(this.countrySource);
    this.countrySource.show = false;

    for (const feature of ((countriesJson as any).features as any[])
      .filter((entry) => Number(entry.properties?.LABELRANK ?? 99) <= 4)
      .sort((a, b) => Number(a.properties?.LABELRANK ?? 99) - Number(b.properties?.LABELRANK ?? 99))
      .slice(0, COUNTRY_LABEL_LIMIT)) {
      const lon = Number(feature.properties?.LABEL_X);
      const lat = Number(feature.properties?.LABEL_Y);
      const name = String(feature.properties?.NAME_LONG ?? feature.properties?.NAME ?? "");
      if (!Number.isFinite(lon) || !Number.isFinite(lat) || !name) continue;
      this.countryLabels.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 15_000),
        text: name.toUpperCase(),
        font: '500 11px "IBM Plex Mono", monospace',
        fillColor: Cesium.Color.fromCssColorString("#ccecff").withAlpha(0.82),
        outlineColor: Cesium.Color.fromCssColorString("#041018").withAlpha(0.95),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(3.5e6, 2.2e7),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
    }

    for (const feature of ((citiesJson as any).features as any[])
      .filter((entry) => {
        const props = entry.properties ?? {};
        return props.worldcity === 1 || Number(props.labelrank ?? 99) <= 2;
      })
      .sort((a, b) => Number(a.properties?.labelrank ?? 99) - Number(b.properties?.labelrank ?? 99))
      .slice(0, CITY_LABEL_LIMIT)) {
      const [lon, lat] = feature.geometry?.coordinates ?? [];
      const name = String(feature.properties?.nameascii ?? feature.properties?.name ?? "");
      if (!Number.isFinite(lon) || !Number.isFinite(lat) || !name) continue;
      this.cityLabels.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 6_000),
        text: name,
        font: '400 12px "IBM Plex Sans", sans-serif',
        fillColor: Cesium.Color.fromCssColorString("#e8f7ff").withAlpha(0.9),
        outlineColor: Cesium.Color.fromCssColorString("#031018").withAlpha(0.95),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -8),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(180_000, 7.5e6),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
    }
    this.ready = true;
  }

  setEnabled(enabled: boolean): void {
    this.countrySource.show = enabled;
    this.countryLabels.show = enabled;
    this.cityLabels.show = enabled;
  }

  destroy(): void {
    if (this.ready) void this.viewer.dataSources.remove(this.countrySource, true);
    this.viewer.scene.primitives.remove(this.countryLabels);
    this.viewer.scene.primitives.remove(this.cityLabels);
  }
}

function sampleMeridian(longitudeDeg: number): Cesium.Cartesian3[] {
  const positions: Cesium.Cartesian3[] = [];
  for (let lat = -90; lat <= 90; lat += 3) {
    positions.push(Cesium.Cartesian3.fromDegrees(longitudeDeg, lat, 1_000));
  }
  return positions;
}

function sampleParallel(latitudeDeg: number): Cesium.Cartesian3[] {
  const positions: Cesium.Cartesian3[] = [];
  for (let lon = -180; lon <= 180; lon += 3) {
    positions.push(Cesium.Cartesian3.fromDegrees(lon, latitudeDeg, 1_000));
  }
  return positions;
}

function starSize(magnitude: number): number {
  return Cesium.Math.clamp(4.6 - magnitude * 0.52, 1.0, 3.8);
}

function starColor(colorIndex: number | null): Cesium.Color {
  if (colorIndex == null || !Number.isFinite(colorIndex)) {
    return Cesium.Color.WHITE.withAlpha(0.8);
  }
  if (colorIndex < -0.05) return Cesium.Color.fromCssColorString("#cce7ff").withAlpha(0.84);
  if (colorIndex < 0.35) return Cesium.Color.fromCssColorString("#f9fcff").withAlpha(0.84);
  if (colorIndex < 0.85) return Cesium.Color.fromCssColorString("#fff0cf").withAlpha(0.82);
  if (colorIndex < 1.45) return Cesium.Color.fromCssColorString("#ffd39e").withAlpha(0.8);
  return Cesium.Color.fromCssColorString("#ffb47e").withAlpha(0.78);
}
