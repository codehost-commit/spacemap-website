import * as Cesium from 'cesium';
import { sunDirectionInertial } from '../simulation/lunar-propagator.js';

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

const REFRESH_MS = 250; // 4 Hz — smooth enough to track fast time-warp
const MOON_R_M = 1_737_400;
const SHELL_R_M = MOON_R_M + 8_000; // 8 km above surface — well clear of terrain

export class LunarNightShade {
  private primitive: Cesium.Primitive | null = null;
  private uniforms: { sunDirection: Cesium.Cartesian3 } | null = null;
  private lastUpdateMs = 0;
  private enabled = false;
  private tickDispose: (() => void) | null = null;
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
    this.tickDispose = this.scene.preRender.addEventListener(() => this.tick());
    this.tick();
  }

  destroy(): void {
    this.tickDispose?.();
    this.tickDispose = null;
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
    this.uniforms = null;
  }

  private build(): void {
    // Uniform holder — we mutate this object each frame and the shader reads
    // its current values via the fabric uniform binding below.
    const uniforms = { sunDirection: new Cesium.Cartesian3(1, 0, 0) };
    this.uniforms = uniforms;

    // Fabric material: shade based on angle between surface normal and sun.
    // Positive dot = sunlit (transparent). Negative dot = night (opaque-ish
    // black). The smoothstep gives a soft ~15° penumbra so the boundary
    // feels physical, not like a hard clip.
    const material = new Cesium.Material({
      fabric: {
        type: 'MoonNightShade',
        uniforms: {
          sunDirection: uniforms.sunDirection,
        },
        source: `
          czm_material czm_getMaterial(czm_materialInput materialInput) {
            czm_material m = czm_getDefaultMaterial(materialInput);
            vec3 n = normalize(materialInput.positionToEyeEC == vec3(0.0)
              ? vec3(1.0, 0.0, 0.0)
              : normalize(materialInput.normalEC));
            // materialInput.normalEC is in eye space — we want a body-fixed
            // comparison instead. Use positionMC (model coords = world coords
            // here since modelMatrix is identity) as an outward-pointing normal.
            vec3 nWorld = normalize(materialInput.positionMC);
            vec3 sun = normalize(sunDirection);
            float shade = dot(nWorld, sun);
            // shade > 0 sunlit, shade < 0 night. Soft ramp: fully transparent
            // above +0.1, fully opaque below −0.1, blended in between.
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

  private tick(): void {
    if (!this.enabled || !this.uniforms) return;
    const now = performance.now();
    if (now - this.lastUpdateMs < REFRESH_MS) return;
    this.lastUpdateMs = now;

    const date = Cesium.JulianDate.toDate(this.viewer.clock.currentTime);
    const sun = sunDirectionInertial(date);
    // Mutate in place — the fabric uniform binding reads the same Cartesian3
    // reference we handed it at build time, so no rebind is needed.
    this.uniforms.sunDirection.x = sun.x;
    this.uniforms.sunDirection.y = sun.y;
    this.uniforms.sunDirection.z = sun.z;
  }
}
