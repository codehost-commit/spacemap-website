import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Animated hero globe with ~3 000 orbiting satellite particles.
 * Mimics the look of the real SpaceMap tracker: color-coded dots
 * (red, pink, white, orange, cyan, green) swarming around Earth
 * in LEO / MEO / GEO-like shells. Fully animated every frame.
 */
export function HeroGlobe({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    /* ── renderer & scene ─────────────────────────────── */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0.4, 3.6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    /* ── Earth sphere (procedural ocean + land shader) ── */
    const earthGeo = new THREE.SphereGeometry(1, 64, 64);
    const earthMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main(){
          vNormal = normalize(normalMatrix * normal);
          vPos    = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main(){
          float lat = vPos.y;
          float lon = atan(vPos.x, vPos.z);
          float n1  = sin(lon*3.0+lat*2.0)*cos(lat*5.0+lon*4.0);
          float n2  = sin(lon*7.0-lat*3.0)*0.5;
          float land = smoothstep(0.1, 0.4, n1+n2);

          vec3 ocean = vec3(0.04,0.12,0.22);
          vec3 green = vec3(0.08,0.18,0.10);
          vec3 col   = mix(ocean, green, land*0.7);

          float diff = max(dot(vNormal, normalize(vec3(1.0,0.5,1.0))),0.0);
          col *= 0.35 + diff*0.65;

          float fres = pow(1.0 - abs(dot(vNormal,vec3(0,0,1))), 2.5);
          col += vec3(0.30,0.59,0.91) * fres * 0.55;

          gl_FragColor = vec4(col,1.0);
        }`,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    /* ── atmosphere glow ──────────────────────────────── */
    const atmosGeo = new THREE.SphereGeometry(1.12, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main(){
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
      fragmentShader: `
        varying vec3 vNormal;
        void main(){
          float i = pow(0.62 - dot(vNormal, vec3(0,0,1)), 2.0);
          gl_FragColor = vec4(0.30,0.59,0.91, i*0.45);
        }`,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(atmosGeo, atmosMat));

    /* ── satellite particles ──────────────────────────── */
    const SAT_COUNT = 3000;

    // Colors matching the real tracker
    const palette = [
      new THREE.Color(0.95, 0.20, 0.25), // red
      new THREE.Color(0.95, 0.20, 0.25),
      new THREE.Color(1.00, 0.45, 0.55), // pink
      new THREE.Color(1.00, 0.45, 0.55),
      new THREE.Color(1.00, 0.70, 0.30), // orange
      new THREE.Color(1.00, 1.00, 1.00), // white
      new THREE.Color(1.00, 1.00, 1.00),
      new THREE.Color(0.30, 0.85, 1.00), // cyan
      new THREE.Color(0.20, 0.80, 0.35), // green
      new THREE.Color(0.30, 0.30, 1.00), // blue
    ];

    // Per-satellite orbital parameters
    const orbitR   = new Float32Array(SAT_COUNT);
    const incl     = new Float32Array(SAT_COUNT);
    const raan     = new Float32Array(SAT_COUNT);
    const phase    = new Float32Array(SAT_COUNT);
    const spd      = new Float32Array(SAT_COUNT);

    const positions = new Float32Array(SAT_COUNT * 3);
    const colors    = new Float32Array(SAT_COUNT * 3);
    const sizes     = new Float32Array(SAT_COUNT);

    for (let i = 0; i < SAT_COUNT; i++) {
      const bucket = Math.random();
      if (bucket < 0.70) {
        orbitR[i] = 1.08 + Math.random() * 0.35;           // LEO
      } else if (bucket < 0.85) {
        orbitR[i] = 1.50 + Math.random() * 0.30;           // MEO
      } else if (bucket < 0.95) {
        orbitR[i] = 1.85 + Math.random() * 0.08;           // GEO
      } else {
        orbitR[i] = 1.20 + Math.random() * 0.80;           // HEO
      }

      // Inclination
      if (bucket >= 0.85 && bucket < 0.95) {
        incl[i] = (Math.random() * 15) * Math.PI / 180;    // GEO near-equatorial
      } else {
        incl[i] = (20 + Math.random() * 80) * Math.PI / 180;
      }
      if (Math.random() > 0.5) incl[i] = Math.PI - incl[i];

      raan[i]  = Math.random() * Math.PI * 2;
      phase[i] = Math.random() * Math.PI * 2;
      spd[i]   = (0.15 + Math.random() * 0.15) / Math.pow(orbitR[i], 1.5);

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = 2.0 + Math.random() * 2.5;
    }

    const satGeo = new THREE.BufferGeometry();
    satGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    satGeo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
    satGeo.setAttribute("size",     new THREE.BufferAttribute(sizes, 1));

    const satMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main(){
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mv.z);
          gl_Position  = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        void main(){
          float d = length(gl_PointCoord - 0.5) * 2.0;
          if(d > 1.0) discard;
          float alpha = 1.0 - smoothstep(0.0, 1.0, d);
          vec3 col = vColor + vec3(0.3) * (1.0 - d);
          gl_FragColor = vec4(col, alpha * 0.85);
        }`,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
    });

    const satPoints = new THREE.Points(satGeo, satMat);
    scene.add(satPoints);

    /* ── faint orbit guide rings ──────────────────────── */
    const makeRing = (r: number, col: number, opacity: number) => {
      const pts: THREE.Vector3[] = [];
      for (let a = 0; a <= 128; a++) {
        const t = (a / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(r * Math.cos(t), 0, r * Math.sin(t)));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const m = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity });
      return new THREE.Line(g, m);
    };

    const geoRing = makeRing(1.89, 0xccaa33, 0.35);
    geoRing.rotation.x = Math.PI * 0.08;
    scene.add(geoRing);

    const leoRing = makeRing(1.30, 0x4d96e8, 0.12);
    leoRing.rotation.x = Math.PI * 0.45;
    leoRing.rotation.z = -0.2;
    scene.add(leoRing);

    /* ── resize ───────────────────────────────────────── */
    const onResize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);
    onResize();

    /* ── animation loop ───────────────────────────────── */
    let raf = 0;
    const _v  = new THREE.Vector3();
    const _q1 = new THREE.Quaternion();
    const _q2 = new THREE.Quaternion();
    const _xA = new THREE.Vector3(1, 0, 0);
    const _yA = new THREE.Vector3(0, 1, 0);

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = performance.now() * 0.001;

      earth.rotation.y = t * 0.06;
      geoRing.rotation.y = t * 0.02;
      leoRing.rotation.y = t * 0.03;

      // Update satellite positions every frame
      const pos = satGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < SAT_COUNT; i++) {
        const angle = phase[i] + t * spd[i];
        const r = orbitR[i];

        _v.set(r * Math.cos(angle), 0, r * Math.sin(angle));

        _q1.setFromAxisAngle(_xA, incl[i]);
        _q2.setFromAxisAngle(_yA, raan[i]);
        _q2.multiply(_q1);
        _v.applyQuaternion(_q2);

        pos.array[i * 3]     = _v.x;
        pos.array[i * 3 + 1] = _v.y;
        pos.array[i * 3 + 2] = _v.z;
      }
      pos.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    /* ── cleanup ──────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        container.removeChild(renderer.domElement);
      }
      earthGeo.dispose();
      earthMat.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
      satGeo.dispose();
      satMat.dispose();
    };
  }, []);

  return <div ref={containerRef} className={className} />;
}
