import * as Cesium from 'cesium';
import type { PropagationSnapshot } from '@spacemap/shared';

/**
 * First-person camera mounted on a satellite. Each frame the camera is set to
 * the satellite's ECEF position, oriented so that:
 *   - view direction is nadir (toward Earth's centre),
 *   - "up" on screen is the along-track direction (satellite motion vector).
 *
 * User input handling:
 *   - Cesium's standard pan/rotate/tilt are disabled (would pull the camera
 *     off the satellite).
 *   - Zoom uses the camera FOV instead of moving position, so the camera
 *     stays perfectly locked to the spacecraft. Wheel/pinch narrows or widens
 *     the lens between the configured MIN/MAX FOV.
 */
const DEFAULT_FOV_RAD = Math.PI / 3; // 60°
const MIN_FOV_RAD = (5 * Math.PI) / 180; // 5° — deep telephoto
const MAX_FOV_RAD = (110 * Math.PI) / 180; // 110° — wide fisheye-ish

export class PovCamera {
  private noradId: number | null = null;
  private unsubPreRender: (() => void) | null = null;
  private wheelListener: ((ev: WheelEvent) => void) | null = null;
  private savedController: {
    rotate: boolean;
    translate: boolean;
    tilt: boolean;
    zoom: boolean;
    look: boolean;
  } | null = null;
  private savedCamera: {
    position: Cesium.Cartesian3;
    direction: Cesium.Cartesian3;
    up: Cesium.Cartesian3;
    right: Cesium.Cartesian3;
    fov: number;
  } | null = null;
  private fov = DEFAULT_FOV_RAD;

  constructor(
    private readonly viewer: Cesium.Viewer,
    private readonly getSnapshot: () => PropagationSnapshot | null,
  ) {}

  activate(noradId: number): void {
    if (this.noradId === noradId) return;
    if (this.noradId != null) this.deactivate(true);
    this.noradId = noradId;
    this.fov = DEFAULT_FOV_RAD;

    const cam = this.viewer.scene.camera;
    const frustum = cam.frustum as Cesium.PerspectiveFrustum;
    this.savedCamera = {
      position: Cesium.Cartesian3.clone(cam.position),
      direction: Cesium.Cartesian3.clone(cam.direction),
      up: Cesium.Cartesian3.clone(cam.up),
      right: Cesium.Cartesian3.clone(cam.right),
      fov: frustum.fov ?? DEFAULT_FOV_RAD,
    };
    const controller = this.viewer.scene.screenSpaceCameraController;
    this.savedController = {
      rotate: controller.enableRotate,
      translate: controller.enableTranslate,
      tilt: controller.enableTilt,
      zoom: controller.enableZoom,
      look: controller.enableLook,
    };
    controller.enableRotate = false;
    controller.enableTranslate = false;
    controller.enableTilt = false;
    controller.enableZoom = false; // we handle wheel ourselves
    controller.enableLook = false;

    // Install FOV-zoom listener on the canvas. This is *in addition to* the
    // disabled Cesium zoom above — Cesium's is a position change, ours is a
    // lens change.
    const canvas = this.viewer.scene.canvas as HTMLCanvasElement;
    this.wheelListener = (ev: WheelEvent) => {
      if (this.noradId == null) return;
      ev.preventDefault();
      // Scale factor ~0.001 gives smooth zoom feel with typical mousewheel steps.
      const factor = Math.exp(ev.deltaY * 0.001);
      this.fov = Math.min(MAX_FOV_RAD, Math.max(MIN_FOV_RAD, this.fov * factor));
      (cam.frustum as Cesium.PerspectiveFrustum).fov = this.fov;
    };
    canvas.addEventListener('wheel', this.wheelListener, { passive: false });

    this.unsubPreRender = this.viewer.scene.preRender.addEventListener(() => this.tick());
    this.tick();
  }

  deactivate(preserve = false): void {
    if (this.unsubPreRender) {
      this.unsubPreRender();
      this.unsubPreRender = null;
    }
    if (this.wheelListener) {
      const canvas = this.viewer.scene.canvas as HTMLCanvasElement;
      canvas.removeEventListener('wheel', this.wheelListener);
      this.wheelListener = null;
    }
    if (this.savedController && !preserve) {
      const controller = this.viewer.scene.screenSpaceCameraController;
      controller.enableRotate = this.savedController.rotate;
      controller.enableTranslate = this.savedController.translate;
      controller.enableTilt = this.savedController.tilt;
      controller.enableZoom = this.savedController.zoom;
      controller.enableLook = this.savedController.look;
    }
    this.savedController = null;
    if (this.savedCamera && !preserve) {
      const cam = this.viewer.scene.camera;
      cam.position = this.savedCamera.position;
      cam.direction = this.savedCamera.direction;
      cam.up = this.savedCamera.up;
      cam.right = this.savedCamera.right;
      (cam.frustum as Cesium.PerspectiveFrustum).fov = this.savedCamera.fov;
    }
    this.savedCamera = null;
    this.noradId = null;
  }

  destroy(): void {
    if (this.noradId != null) this.deactivate();
  }

  private tick(): void {
    if (this.noradId == null) return;
    const snap = this.getSnapshot();
    if (!snap) return;
    let i = -1;
    for (let k = 0; k < snap.count; k++) {
      if (snap.ids[k] === this.noradId) {
        i = k;
        break;
      }
    }
    if (i < 0) return;

    const px = snap.ecefPos[i * 3];
    const py = snap.ecefPos[i * 3 + 1];
    const pz = snap.ecefPos[i * 3 + 2];
    const vx = snap.ecefVel[i * 3];
    const vy = snap.ecefVel[i * 3 + 1];
    const vz = snap.ecefVel[i * 3 + 2];

    const rMag = Math.hypot(px, py, pz) || 1;
    const dirX = -px / rMag;
    const dirY = -py / rMag;
    const dirZ = -pz / rMag;

    let ax = vx;
    let ay = vy;
    let az = vz;
    const alongDot = ax * dirX + ay * dirY + az * dirZ;
    ax -= alongDot * dirX;
    ay -= alongDot * dirY;
    az -= alongDot * dirZ;
    const aMag = Math.hypot(ax, ay, az) || 1;
    ax /= aMag;
    ay /= aMag;
    az /= aMag;

    const cam = this.viewer.scene.camera;
    cam.setView({
      destination: new Cesium.Cartesian3(px - ax * 1, py - ay * 1, pz - az * 1),
      orientation: {
        direction: new Cesium.Cartesian3(dirX, dirY, dirZ),
        up: new Cesium.Cartesian3(ax, ay, az),
      },
    });
    // setView resets frustum FOV to whatever was previously set on the camera
    // — reapply our tracked value so wheel zoom sticks.
    (cam.frustum as Cesium.PerspectiveFrustum).fov = this.fov;
  }
}
