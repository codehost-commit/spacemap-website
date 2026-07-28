import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Lightweight Three.js Earth globe for the hero section.
 * Renders a stylised sphere with orbit rings and animated satellite dots.
 * All orbits are kept tight so satellites never leave the viewport.
 */
export function HeroGlobe({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0.3, 3.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Earth sphere with procedural shader
    const earthGeo = new THREE.SphereGeometry(1, 64, 64);
    const earthMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 deepNavy = vec3(0.024, 0.063, 0.106);
          vec3 midBlue = vec3(0.141, 0.361, 0.565);
          vec3 accentBlue = vec3(0.557, 0.847, 1.0);
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
          float lat = vPosition.y;
          float lon = atan(vPosition.x, vPosition.z);
          float landNoise = sin(lon * 3.0 + lat * 2.0) * cos(lat * 5.0 + lon * 4.0);
          landNoise += sin(lon * 7.0 - lat * 3.0) * 0.5;
          float landMask = smoothstep(0.1, 0.4, landNoise);
          vec3 surface = mix(deepNavy * 1.5, midBlue * 0.8, landMask * 0.6);
          vec3 rim = accentBlue * fresnel * 0.7;
          float diffuse = max(dot(vNormal, normalize(vec3(1.0, 0.5, 1.0))), 0.0);
          surface *= 0.4 + diffuse * 0.6;
          gl_FragColor = vec4(surface + rim, 1.0);
        }
      `,
      transparent: false,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    // Atmosphere glow
    const atmosGeo = new THREE.SphereGeometry(1.08, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          vec3 glowColor = vec3(0.302, 0.588, 0.91);
          gl_FragColor = vec4(glowColor, intensity * 0.5);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Orbit rings (kept tight: 1.2 to 1.45 radius so they stay fully in frame)
    const createOrbitRing = (
      radius: number,
      tiltX: number,
      tiltZ: number,
      color: number,
      opacity: number
    ) => {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
      const points = curve.getPoints(128);
      const geo = new THREE.BufferGeometry().setFromPoints(
        points.map((p) => new THREE.Vector3(p.x, 0, p.y))
      );
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      const ring = new THREE.Line(geo, mat);
      ring.rotation.x = tiltX;
      ring.rotation.z = tiltZ;
      return ring;
    };

    const ring1 = createOrbitRing(1.2, Math.PI * 0.35, -0.2, 0x4d96e8, 0.5);
    const ring2 = createOrbitRing(1.32, Math.PI * 0.42, 0.15, 0x8ed8ff, 0.35);
    const ring3 = createOrbitRing(1.45, Math.PI * 0.28, -0.35, 0xa7e2ff, 0.2);
    scene.add(ring1, ring2, ring3);

    // Multiple satellite dots on each orbit
    const satGeo = new THREE.SphereGeometry(0.025, 8, 8);
    interface SatDot {
      mesh: THREE.Mesh;
      radius: number;
      tiltX: number;
      tiltZ: number;
      speed: number;
      offset: number;
    }

    const satellites: SatDot[] = [];
    const orbitConfigs = [
      { radius: 1.2, tiltX: Math.PI * 0.35, tiltZ: -0.2, color: 0x8ed8ff },
      { radius: 1.32, tiltX: Math.PI * 0.42, tiltZ: 0.15, color: 0xa7e2ff },
      { radius: 1.45, tiltX: Math.PI * 0.28, tiltZ: -0.35, color: 0x4d96e8 },
    ];
    // 3 sats per orbit, evenly spaced
    for (const orbit of orbitConfigs) {
      for (let j = 0; j < 3; j++) {
        const mat = new THREE.MeshBasicMaterial({ color: orbit.color });
        const mesh = new THREE.Mesh(satGeo, mat);
        scene.add(mesh);
        satellites.push({
          mesh,
          radius: orbit.radius,
          tiltX: orbit.tiltX,
          tiltZ: orbit.tiltZ,
          speed: 0.3 + Math.random() * 0.25,
          offset: (j / 3) * Math.PI * 2,
        });
      }
    }

    // Grid dots on the globe surface
    const dotGeo = new THREE.SphereGeometry(0.008, 6, 6);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x8ed8ff, transparent: true, opacity: 0.4 });
    for (let lat = -80; lat <= 80; lat += 20) {
      for (let lon = 0; lon < 360; lon += 20) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = lon * (Math.PI / 180);
        const x = 1.005 * Math.sin(phi) * Math.cos(theta);
        const y = 1.005 * Math.cos(phi);
        const z = 1.005 * Math.sin(phi) * Math.sin(theta);
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(x, y, z);
        earth.add(dot);
      }
    }

    // Resize handler
    const onResize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);
    onResize();

    // Z-axis vector reused each frame
    const zAxis = new THREE.Vector3(0, 0, 1);

    // Animation loop
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = performance.now() * 0.001;

      earth.rotation.y = t * 0.08;

      ring1.rotation.y = t * 0.1;
      ring2.rotation.y = t * -0.07;
      ring3.rotation.y = t * 0.04;

      // Animate each satellite along its orbit
      for (const sat of satellites) {
        const angle = t * sat.speed + sat.offset;
        sat.mesh.position.set(
          sat.radius * Math.cos(angle),
          sat.radius * Math.sin(angle) * Math.sin(sat.tiltX),
          sat.radius * Math.sin(angle) * Math.cos(sat.tiltX)
        );
        sat.mesh.position.applyAxisAngle(zAxis, sat.tiltZ);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      earthGeo.dispose();
      earthMat.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
    };
  }, []);

  return <div ref={containerRef} className={className} />;
}
