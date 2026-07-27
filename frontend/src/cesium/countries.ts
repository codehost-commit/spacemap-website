import * as Cesium from "cesium";

/**
 * Country outlines from Natural Earth 1:110m admin_0 GeoJSON, fetched at
 * build time by the deploy workflow and served from `${base}data/countries.geojson`.
 *
 * We render each Polygon / MultiPolygon ring as a single Polyline in a shared
 * PolylineCollection — one draw call regardless of country count. Elevated
 * ~5 km so borders don't z-fight with the globe surface.
 */
const OUTLINE_URL = `${import.meta.env.BASE_URL}data/countries.geojson`;
const OUTLINE_LIFT_M = 5000;
// Borders fade in only when the camera is within ~8000 km of the surface.
// Wider than that and the outlines just clutter the scene.
const MAX_VISIBLE_DISTANCE_M = 8_000_000;

interface Feature {
  type: "Feature";
  geometry:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] };
  properties?: unknown;
}
interface FeatureCollection {
  type: "FeatureCollection";
  features: Feature[];
}

export class Countries {
  private collection: Cesium.PolylineCollection | null = null;
  private enabled = false;
  private loading: Promise<FeatureCollection> | null = null;
  private cached: FeatureCollection | null = null;

  constructor(private readonly scene: Cesium.Scene) {}

  async setEnabled(v: boolean): Promise<void> {
    if (this.enabled === v) return;
    this.enabled = v;
    if (!v) {
      this.clear();
      return;
    }
    try {
      const data = await this.load();
      // If the toggle was flipped off during the fetch, bail.
      if (!this.enabled) return;
      this.build(data);
    } catch (err) {
      console.warn("[countries] failed to load", err);
    }
  }

  destroy(): void {
    this.clear();
  }

  private async load(): Promise<FeatureCollection> {
    if (this.cached) return this.cached;
    if (this.loading) return this.loading;
    this.loading = fetch(OUTLINE_URL).then(async (res) => {
      if (!res.ok) throw new Error(`GET ${OUTLINE_URL} → ${res.status}`);
      const data = (await res.json()) as FeatureCollection;
      this.cached = data;
      return data;
    });
    return this.loading;
  }

  private build(data: FeatureCollection): void {
    const col = this.scene.primitives.add(new Cesium.PolylineCollection());
    this.collection = col;
    const material = Cesium.Material.fromType("Color", {
      color: new Cesium.Color(0.75, 0.85, 1, 0.5),
    });
    const showCondition = new Cesium.DistanceDisplayCondition(
      0,
      MAX_VISIBLE_DISTANCE_M,
    );

    let ringCount = 0;
    for (const feature of data.features) {
      const geom = feature.geometry;
      if (!geom) continue;
      if (geom.type === "Polygon") {
        for (const ring of geom.coordinates) {
          const positions = ringPositions(ring);
          if (positions.length < 2) continue;
          col.add({
            positions,
            width: 1.0,
            material,
            distanceDisplayCondition: showCondition,
          });
          ringCount++;
        }
      } else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates) {
          for (const ring of poly) {
            const positions = ringPositions(ring);
            if (positions.length < 2) continue;
            col.add({
              positions,
              width: 1.0,
              material,
              distanceDisplayCondition: showCondition,
            });
            ringCount++;
          }
        }
      }
    }
    if (ringCount === 0) {
      console.warn("[countries] parsed 0 rings from GeoJSON");
    }
  }

  private clear(): void {
    if (this.collection) {
      try {
        this.scene.primitives.remove(this.collection);
      } catch {
        /* viewer torn down */
      }
      this.collection = null;
    }
  }
}

function ringPositions(ring: number[][]): Cesium.Cartesian3[] {
  const out: Cesium.Cartesian3[] = new Array(ring.length);
  for (let i = 0; i < ring.length; i++) {
    const [lon, lat] = ring[i];
    out[i] = Cesium.Cartesian3.fromDegrees(lon, lat, OUTLINE_LIFT_M);
  }
  return out;
}
