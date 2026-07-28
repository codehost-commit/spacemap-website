// three.js is installed manually; this declaration silences TS if @types/three is missing
declare module "three" {
  export class Scene {
    add(...objects: any[]): void;
  }
  export class PerspectiveCamera {
    constructor(fov: number, aspect: number, near: number, far: number);
    position: Vector3;
    aspect: number;
    lookAt(x: number, y: number, z: number): void;
    updateProjectionMatrix(): void;
  }
  export class WebGLRenderer {
    constructor(params?: any);
    domElement: HTMLCanvasElement;
    setPixelRatio(value: number): void;
    setClearColor(color: number, alpha: number): void;
    setSize(width: number, height: number): void;
    render(scene: Scene, camera: PerspectiveCamera): void;
    dispose(): void;
  }
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
    applyAxisAngle(axis: Vector3, angle: number): this;
  }
  export class SphereGeometry {
    constructor(radius?: number, widthSegments?: number, heightSegments?: number);
    dispose(): void;
  }
  export class BufferGeometry {
    setFromPoints(points: Vector3[]): this;
    dispose(): void;
  }
  export class Mesh {
    constructor(geometry: any, material: any);
    position: Vector3;
    rotation: { x: number; y: number; z: number };
    material: any;
    add(...objects: any[]): void;
  }
  export class Line {
    constructor(geometry: any, material: any);
    rotation: { x: number; y: number; z: number };
  }
  export class ShaderMaterial {
    constructor(params?: any);
    dispose(): void;
  }
  export class MeshBasicMaterial {
    constructor(params?: any);
    color: { set(color: number): void };
    clone(): MeshBasicMaterial;
    dispose(): void;
  }
  export class LineBasicMaterial {
    constructor(params?: any);
    dispose(): void;
  }
  export class EllipseCurve {
    constructor(aX: number, aY: number, xRadius: number, yRadius: number, aStartAngle: number, aEndAngle: number, aClockwise: boolean, aRotation: number);
    getPoints(divisions: number): { x: number; y: number }[];
  }
  export const BackSide: number;
}
