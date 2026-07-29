import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ── math ─────────────────────────────────────────────────
function rotX(x: number, y: number, z: number, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x, y: y * c - z * s, z: y * s + z * c };
}
function rotY(x: number, y: number, z: number, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: x * c + z * s, y, z: -x * s + z * c };
}

// ── types ────────────────────────────────────────────────
interface Sat {
  r: number; inc: number; raan: number; phase: number;
  spd: number; color: string; sz: number;
}
interface FeaturedSat extends Sat {
  label: string;
}

// ── palette ──────────────────────────────────────────────
const PAL = [
  '#ff3040','#ff3040','#ff3040','#ff3040',
  '#ff6080','#ff6080','#ff6080',
  '#ffaa33',
  '#ffffff','#ffffff','#ffffff',
  '#55ddff',
  '#44dd66',
];

function makeSats(n: number): Sat[] {
  const out: Sat[] = [];
  for (let i = 0; i < n; i++) {
    const b = Math.random();
    let r: number, inc: number;
    if (b < 0.75) { r = 1.05 + Math.random() * 0.30; inc = (25 + Math.random() * 75) * Math.PI / 180; }
    else if (b < 0.88) { r = 1.40 + Math.random() * 0.25; inc = (25 + Math.random() * 65) * Math.PI / 180; }
    else if (b < 0.96) { r = 1.72 + Math.random() * 0.06; inc = Math.random() * 10 * Math.PI / 180; }
    else { r = 1.15 + Math.random() * 0.65; inc = (30 + Math.random() * 60) * Math.PI / 180; }
    if (Math.random() > 0.5) inc = Math.PI - inc;
    out.push({
      r, inc,
      raan: Math.random() * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
      spd: (0.10 + Math.random() * 0.10) / Math.pow(r, 1.5),
      color: PAL[Math.floor(Math.random() * PAL.length)],
      sz: 0.5 + Math.random() * 0.7,
    });
  }
  return out;
}

function makeFeatured(): FeaturedSat[] {
  return [
    { label: 'ISS', r: 1.08, inc: 51.6 * Math.PI / 180, raan: 0.3, phase: 0, spd: 0.20, color: '#ffffff', sz: 3.0 },
    { label: 'Hubble', r: 1.11, inc: 28.5 * Math.PI / 180, raan: 2.1, phase: Math.PI * 0.6, spd: 0.19, color: '#55ddff', sz: 2.5 },
    { label: 'JWST', r: 1.58, inc: 5 * Math.PI / 180, raan: 4.0, phase: Math.PI * 1.2, spd: 0.06, color: '#ffaa33', sz: 2.8 },
    { label: 'Voyager', r: 1.82, inc: 35 * Math.PI / 180, raan: 5.5, phase: Math.PI * 0.3, spd: 0.03, color: '#44dd66', sz: 2.2 },
  ];
}

// ── component ────────────────────────────────────────────
export function HeroGlobe({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Scene setup ──────────────────────────────────────
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 3.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0x06101a, 1);
    container.appendChild(renderer.domElement);

    // ── Controls ─────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.25;
    controls.minPolarAngle = Math.PI * 0.4;
    controls.maxPolarAngle = Math.PI * 0.6;
    controls.minDistance = 2.0;
    controls.maxDistance = 8.0;

    // ── Lighting — Sun on the LEFT ──────────────────────
    const ambientLight = new THREE.AmbientLight(0x2a3a4a, 1.0);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 2.0);
    sunLight.position.set(-8, 0, 2);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x4d96e8, 0.25);
    fillLight.position.set(4, 0, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x8ed8ff, 0.4);
    rimLight.position.set(0, 0, -6);
    scene.add(rimLight);

    // ── Sun visual indicator ─────────────────────────────
    const sunGeo = new THREE.SphereGeometry(0.12, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfff5e6,
      transparent: true,
      opacity: 0.9,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.copy(sunLight.position).normalize().multiplyScalar(12);
    scene.add(sunMesh);

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const gctx = glowCanvas.getContext('2d')!;
    const glowGrad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    glowGrad.addColorStop(0, 'rgba(255, 245, 230, 0.5)');
    glowGrad.addColorStop(0.2, 'rgba(255, 220, 180, 0.2)');
    glowGrad.addColorStop(0.5, 'rgba(255, 200, 150, 0.05)');
    glowGrad.addColorStop(1, 'rgba(255, 200, 150, 0)');
    gctx.fillStyle = glowGrad;
    gctx.fillRect(0, 0, 128, 128);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const glowSpriteMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sunGlow = new THREE.Sprite(glowSpriteMat);
    sunGlow.scale.set(5, 5, 1);
    sunGlow.position.copy(sunMesh.position);
    scene.add(sunGlow);

    // ── Earth ────────────────────────────────────────────
    const EARTH_RADIUS = 1.0;
    const TILT = 0.12;

    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 128, 128);

    const textureLoader = new THREE.TextureLoader();
    const earthMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.85,
      metalness: 0.05,
      emissive: new THREE.Color(0x112233),
      emissiveIntensity: 0.3,
    });

    // Texture sources in priority order
    const textureSources = [
      (import.meta.env.BASE_URL || '/') + 'brand/earth-map.jpg',
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57752/land_shallow_topo_2048.jpg',
    ];

    function tryLoadTexture(index: number) {
      if (index >= textureSources.length) return;
      textureLoader.load(
        textureSources[index],
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          earthMaterial.map = tex;
          earthMaterial.needsUpdate = true;
        },
        undefined,
        () => tryLoadTexture(index + 1),
      );
    }
    tryLoadTexture(0);

    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.rotation.z = TILT;

    // ── Atmosphere ───────────────────────────────────────
    const atmoGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.03, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x4d96e8) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float fresnel = pow(1.0 - dot(vNormal, vViewDir), 5.0);
          gl_FragColor = vec4(glowColor, fresnel * 0.35);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);

    // ── Earth group — tilts viewing angle so mid-latitudes face camera ──
    const earthGroup = new THREE.Group();
    earthGroup.rotation.x = 0.4;
    earthGroup.add(earth);
    earthGroup.add(atmosphere);
    scene.add(earthGroup);

    // ── Stars ────────────────────────────────────────────
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 2000;
    const starPositions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount; i++) {
      const r = 25 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({
      size: 0.012,
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    // ── Satellites ───────────────────────────────────────
    const sats = makeSats(2000);
    const satGeo = new THREE.BufferGeometry();
    const satPositions = new Float32Array(2000 * 3);
    const satColors = new Float32Array(2000 * 3);

    for (let i = 0; i < 2000; i++) {
      const c = new THREE.Color(sats[i].color);
      satColors[i * 3] = c.r;
      satColors[i * 3 + 1] = c.g;
      satColors[i * 3 + 2] = c.b;
    }

    satGeo.setAttribute('position', new THREE.BufferAttribute(satPositions, 3));
    satGeo.setAttribute('color', new THREE.BufferAttribute(satColors, 3));

    const satMat = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const satPoints = new THREE.Points(satGeo, satMat);
    scene.add(satPoints);

    // ── Featured Satellites ──────────────────────────────
    const featured = makeFeatured();
    const featuredMarkers: THREE.Mesh[] = [];
    const featuredOrbits: THREE.LineLoop[] = [];
    const trailLines: THREE.Line[] = [];
    const labelElements: HTMLDivElement[] = [];
    const trailHistories: THREE.Vector3[][] = featured.map(() => []);
    const TRAIL_LENGTH = 25;

    featured.forEach((f) => {
      const orbitPoints: THREE.Vector3[] = [];
      for (let i = 0; i <= 256; i++) {
        const angle = (i / 256) * Math.PI * 2;
        const x = f.r * Math.cos(angle);
        const z = f.r * Math.sin(angle);
        orbitPoints.push(new THREE.Vector3(x, 0, z));
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      orbitGeo.rotateX(f.inc);
      orbitGeo.rotateY(f.raan);
      orbitGeo.rotateX(TILT);

      const orbitMat = new THREE.LineBasicMaterial({
        color: f.color,
        transparent: true,
        opacity: 0.12,
      });
      const orbit = new THREE.LineLoop(orbitGeo, orbitMat);
      scene.add(orbit);
      featuredOrbits.push(orbit);

      const markerGeo = new THREE.SphereGeometry(0.018, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({ color: f.color });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      scene.add(marker);
      featuredMarkers.push(marker);

      const trailGeo = new THREE.BufferGeometry();
      const trailPositions = new Float32Array(TRAIL_LENGTH * 3);
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      const trailMat = new THREE.LineBasicMaterial({
        color: f.color,
        transparent: true,
        opacity: 0.2,
      });
      const trail = new THREE.Line(trailGeo, trailMat);
      scene.add(trail);
      trailLines.push(trail);

      const labelDiv = document.createElement('div');
      labelDiv.textContent = f.label;
      labelDiv.style.cssText = `
        position: absolute;
        color: ${f.color};
        font-size: 10px;
        font-weight: 700;
        font-family: system-ui, -apple-system, sans-serif;
        pointer-events: none;
        text-shadow: 0 0 4px ${f.color}80, 0 0 8px ${f.color}40;
        white-space: nowrap;
        transform: translate(-50%, -100%);
        margin-top: -8px;
        opacity: 0;
        transition: opacity 0.3s;
        letter-spacing: 0.05em;
      `;
      container.appendChild(labelDiv);
      labelElements.push(labelDiv);
    });

    // ── Animation ────────────────────────────────────────
    const clock = new THREE.Clock();
    let raf = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      earth.rotation.y = elapsed * 0.04;
      stars.rotation.y = elapsed * 0.0005;

      for (let i = 0; i < 2000; i++) {
        const s = sats[i];
        const angle = s.phase + elapsed * s.spd;
        let px = s.r * Math.cos(angle);
        let py = 0;
        let pz = s.r * Math.sin(angle);

        const r1 = rotX(px, py, pz, s.inc);
        px = r1.x; py = r1.y; pz = r1.z;

        const r2 = rotY(px, py, pz, s.raan);
        px = r2.x; py = r2.y; pz = r2.z;

        const r3 = rotX(px, py, pz, TILT);
        px = r3.x; py = r3.y; pz = r3.z;

        satPositions[i * 3] = px;
        satPositions[i * 3 + 1] = py;
        satPositions[i * 3 + 2] = pz;
      }
      satGeo.attributes.position.needsUpdate = true;

      const tempV = new THREE.Vector3();
      featured.forEach((f, i) => {
        const angle = f.phase + elapsed * f.spd;
        let px = f.r * Math.cos(angle);
        let py = 0;
        let pz = f.r * Math.sin(angle);

        const r1 = rotX(px, py, pz, f.inc);
        px = r1.x; py = r1.y; pz = r1.z;

        const r2 = rotY(px, py, pz, f.raan);
        px = r2.x; py = r2.y; pz = r2.z;

        const r3 = rotX(px, py, pz, TILT);
        px = r3.x; py = r3.y; pz = r3.z;

        featuredMarkers[i].position.set(px, py, pz);

        const pos = new THREE.Vector3(px, py, pz);
        trailHistories[i].unshift(pos.clone());
        if (trailHistories[i].length > TRAIL_LENGTH) trailHistories[i].pop();

        const tPositions = trailLines[i].geometry.attributes.position.array as Float32Array;
        for (let j = 0; j < TRAIL_LENGTH; j++) {
          if (j < trailHistories[i].length) {
            tPositions[j * 3] = trailHistories[i][j].x;
            tPositions[j * 3 + 1] = trailHistories[i][j].y;
            tPositions[j * 3 + 2] = trailHistories[i][j].z;
          } else {
            tPositions[j * 3] = px;
            tPositions[j * 3 + 1] = py;
            tPositions[j * 3 + 2] = pz;
          }
        }
        trailLines[i].geometry.attributes.position.needsUpdate = true;

        tempV.set(px, py, pz);
        tempV.project(camera);

        const x = (tempV.x * 0.5 + 0.5) * container.clientWidth;
        const y = (-tempV.y * 0.5 + 0.5) * container.clientHeight;

        const label = labelElements[i];
        label.style.left = `${x}px`;
        label.style.top = `${y}px`;

        const distFromCenter = Math.sqrt(px * px + py * py);
        const isBehind = pz < 0 && distFromCenter < EARTH_RADIUS * 0.95;
        const onScreen = tempV.z < 1 && x > 20 && x < container.clientWidth - 20 && y > 20 && y < container.clientHeight - 20;

        label.style.opacity = (!isBehind && onScreen) ? '0.85' : '0';
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ───────────────────────────────────────────
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      earthGeometry.dispose();
      earthMaterial.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      starsGeo.dispose();
      starsMat.dispose();
      satGeo.dispose();
      satMat.dispose();
      featuredOrbits.forEach(o => { o.geometry.dispose(); (o.material as THREE.Material).dispose(); });
      featuredMarkers.forEach(m => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      trailLines.forEach(t => { t.geometry.dispose(); (t.material as THREE.Material).dispose(); });
      labelElements.forEach(l => l.remove());
      sunGeo.dispose();
      sunMat.dispose();
      glowTex.dispose();
      glowSpriteMat.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'visible' }}
    />
  );
}