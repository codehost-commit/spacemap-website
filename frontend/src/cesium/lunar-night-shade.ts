import * as Cesium from 'cesium';

/**
 * Night-side dimming for the Moon.
 *
 * The LRO WAC global mosaic Cesium is texturing the Moon with was stitched
 * from many individual observations, all radiometrically normalised so the
 * whole surface reads as uniformly-lit. That's beautiful for orientation,
 * but it means Cesium's SunLight has nothing dark to reveal — a real day/
 * night boundary never appears from the imagery alone, so the LunarTerminator
 * line looks like it's floating in the middle of a fully-lit disk.
 *
 * This class wraps the Moon in a slightly-larger transparent shell whose
 * fragment shader darkens fragments on the anti-sun hemisphere. Combined
 * with LunarTerminator (which draws the LINE at the boundary), you now get
 * both: the terminator line sits between actually-bright and actually-dark
 * surface, and time-warping the clock sweeps the shadow across the globe.
 *
 * Frame note (same as LunarTerminator): we use the INERTIAL sun direction,
 * not the Moon-fixed one. Cesium doesn't know a rotation model for our
 * custom Moon ellipsoid, so its transforms treat body-fixed vertex positions
 * as inertial. Using inertial-frame sun keeps the shading, the terminator
 * line, and Cesium's own SunLight shading all in the same frame.
 */

const MOON_R_M = 1_737_400;
const SHELL_R_M = MOON_R_M + 8_000; // 8 km above surface — well clear of terrain

export class LunarNightShade {
  private primitive: Cesium.Primitive | null = null;
  private enabled = false;
  private readonly scene: Cesium.Scene;

  constructor(private readonly viewer: Cesium.Viewer) {
    this.scene = viewer.scene;
  }

  setEnabled(v: boolean): void {
    if (v === this.enabled) return;
    this.enabled = v;
    if (!v) {
      this.clear();
      return;
    }
    this.build();
  }

  destroy(): void {
    this.clear();
  }

  private clear(): void {
    if (this.primitive) {
      try {
        this.scene.primitives.remove(this.primitive);
      } catch {
        /* viewer torn down */
      }
      this.primitive = null;
    }
  }

  private build(): void {
    // Fabric material: shade based on the angle between the surface normal
    // and Cesium's sun direction, both already in eye space. `normalEC` is
    // the vertex normal after view transform; `czm_lightDirectionEC` is the
    // sun-toward-fragment unit vector Cesium uses for its own shading. That
    // guarantees this shell darkens the same hemisphere Cesium considers
    // "night" — no frame-mismatch drift, no uniform bookkeeping.
    //
    // shade = dot(normal, light).
    //   > 0  → sunlit  (fully transparent)
    //   < 0  → night   (opaque-ish black)
    // smoothstep gives a soft ~15° penumbra so the boundary reads as a real
    // dusk line, not a hard clip.
    const material = new Cesium.Material({
      fabric: {
        type: 'MoonNightShade',
        source: `
          czm_material czm_getMaterial(czm_materialInput materialInput) {
            czm_material m = czm_getDefaultMaterial(materialInput);
            vec3 nEC = normalize(materialInput.normalEC);
            vec3 lightEC = normalize(czm_lightDirectionEC);
            float shade = dot(nEC, lightEC);
            float night = smoothstep(0.15, -0.15, shade);
            m.diffuse = vec3(0.0);
            m.alpha = night * 0.78;
            return m;
          }
        `,
      },
      translucent: true,
    });

    const primitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.EllipsoidGeometry({
          radii: new Cesium.Cartesian3(SHELL_R_M, SHELL_R_M, SHELL_R_M),
          vertexFormat: Cesium.MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat,
        }),
      }),
      appearance: new Cesium.MaterialAppearance({
        material,
        translucent: true,
        closed: true,
      }),
      asynchronous: false,
      // Identity model matrix — the shell sits at world origin, which for
      // our Moon-centred coord system is the Moon's centre.
      modelMatrix: Cesium.Matrix4.IDENTITY,
    });

    this.primitive = this.scene.primitives.add(primitive);
  }
}
