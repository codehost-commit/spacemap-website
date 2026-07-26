import * as Cesium from "cesium";
import type { PropagationSnapshot } from "@spacemap/shared";

/**
 * First-person camera mounted on a satellite. Each frame the camera is set to
 * the satellite's ECEF position, oriented so that:
 *  - view direction is nadir (toward Earth's centre),
 *  - "up" on screen is the along-track direction (satellite motion vector).
 *
 * Because we place the camera exactly at the satellite and Cesium's default
 * controls interfere with that, we disable user camera input while POV is
 * active and restore it on exit.
 */
export class PovCamera {
  private noradId: number | null = null;
  private unsubPreRender: (() => void) | null = null;
  private savedCameraController: {
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
  } | null = null;

  constructor(
    private readonly viewer: Cesium.Viewer,
    private readonly getSnapshot: () => PropagationSnapshot | null,
  ) {}

  activate(noradId: number): void {
    if (this.noradId === noradId) return;
    if (this.noradId != null) this.deactivate(true);
    this.noradId = noradId;
    const cam = this.viewer.scene.camera;
    this.savedCamera = {
      position: Cesium.Cartesian3.clone(cam.position),
      direction: Cesium.Cartesian3.clone(cam.direction),
      up: Cesium.Cartesian3.clone(cam.up),
      right: Cesium.Cartesian3.clone(cam.right),
    };
    const controller = this.viewer.scene.screenSpaceCameraController;
    this.savedCameraController = {
      rotate: controller.enableRotate,
      translate: controller.enableTranslate,
      tilt: controller.enableTilt,
      zoom: controller.enableZoom,
      look: controller.enableLook,
    };
    controller.enableRotate = false;
    controller.enableTranslate = false;
    controller.enableTilt = false;
    controller.enableZoom = false;
    controller.enableLook = false;

    const disposer = this.viewer.scene.preRender.addEventListener(() => this.tick());
    this.unsubPreRender = disposer;
    // Trigger one immediate placement so the switch feels instant.
    this.tick();
  }

  deactivate(preserveController = false): void {
    if (this.unsubPreRender) {
      this.unsubPreRender();
      this.unsubPreRender = null;
    }
    if (this.savedCameraController && !preserveController) {
      const controller = this.viewer.scene.screenSpaceCameraController;
      controller.enableRotate = this.savedCameraController.rotate;
      controller.enableTranslate = this.savedCameraController.translate;
      controller.enableTilt = this.savedCameraController.tilt;
      controller.enableZoom = this.savedCameraController.zoom;
      controller.enableLook = this.savedCameraController.look;
    }
    this.savedCameraController = null;
    if (this.savedCamera && !preserveController) {
      const cam = this.viewer.scene.camera;
      cam.position = this.savedCamera.position;
      cam.direction = this.savedCamera.direction;
      cam.up = this.savedCamera.up;
      cam.right = this.savedCamera.right;
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
    // Linear scan — one satellite per frame is fine even at 30k catalog.
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

    // Nadir direction = -normalize(position).
    const rMag = Math.hypot(px, py, pz) || 1;
    const dirX = -px / rMag;
    const dirY = -py / rMag;
    const dirZ = -pz / rMag;

    // Along-track direction = normalize(velocity), then orthogonalize to dir.
    let ax = vx;
    let ay = vy;
    let az = vz;
    // Remove any radial component so "up" stays in the local horizontal plane.
    const alongDot = ax * dirX + ay * dirY + az * dirZ;
    ax -= alongDot * dirX;
    ay -= alongDot * dirY;
    az -= alongDot * dirZ;
    const aMag = Math.hypot(ax, ay, az) || 1;
    ax /= aMag;
    ay /= aMag;
    az /= aMag;

    const cam = this.viewer.scene.camera;
    // Push camera 1 metre back along -velocity so the satellite itself is not
    // clipped through and Cesium's own point is safely behind us.
    cam.setView({
      destination: new Cesium.Cartesian3(px - ax * 1, py - ay * 1, pz - az * 1),
      orientation: {
        direction: new Cesium.Cartesian3(dirX, dirY, dirZ),
        up: new Cesium.Cartesian3(ax, ay, az),
      },
    });
  }
}
