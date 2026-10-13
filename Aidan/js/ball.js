/* =========================================================
   THE BALL — one realistic 3D soccer ball (Three.js)
   A single sphere with procedurally generated panel maps
   (color / bump / roughness): 12 dark pentagons + 20 white
   hexagons, found per pixel as a spherical Voronoi of the
   truncated icosahedron's face centres. Rendered into a fixed,
   transparent canvas and positioned in screen pixels by main.js.
   ========================================================= */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const PANEL_WHITE = [244, 242, 235];
const PANEL_DARK = [22, 52, 66];     // deep ocean, close to classic black
const SEAM = [70, 78, 80];

/** Face centres of a truncated icosahedron: 12 pentagons (icosahedron vertices) then 20 hexagons. */
function faceCenters() {
  const phi = (1 + Math.sqrt(5)) / 2, ip = 1 / phi;
  const pent = [], hex = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    pent.push([0, a, b * phi], [a, b * phi, 0], [a * phi, 0, b]);
    hex.push([0, a * ip, b * phi], [a * ip, b * phi, 0], [a * phi, 0, b * ip]);
  }
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) hex.push([a, b, c]);
  const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
  return { centers: [...pent, ...hex].map(norm), pentCount: pent.length };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function buildMaps(size) {
  const W = size, H = size / 2;
  const color = makeCanvas(W, H), bump = makeCanvas(W, H), rough = makeCanvas(W, H);
  const cc = color.getContext('2d'), bc = bump.getContext('2d'), rc = rough.getContext('2d');
  const cImg = cc.createImageData(W, H), bImg = bc.createImageData(W, H), rImg = rc.createImageData(W, H);
  const { centers, pentCount } = faceCenters();
  const n = centers.length;
  const cx = new Float32Array(n), cy = new Float32Array(n), cz = new Float32Array(n);
  centers.forEach((c, i) => { cx[i] = c[0]; cy[i] = c[1]; cz[i] = c[2]; });
  const PENT_BIAS = 0.022;           // shrinks the pentagons toward true proportions
  const SEAM_W = 0.016;              // seam half-width in dot-product units

  for (let py = 0; py < H; py++) {
    // Matches THREE.SphereGeometry's UV layout (canvas row 0 = top of the sphere)
    const theta = Math.PI * (py + 0.5) / H, st = Math.sin(theta), ct = Math.cos(theta);
    for (let px = 0; px < W; px++) {
      const ph = 2 * Math.PI * (px + 0.5) / W;
      const x = -Math.cos(ph) * st, y = ct, z = Math.sin(ph) * st;
      let d1 = -9, d2 = -9, k1 = 0;
      for (let i = 0; i < n; i++) {
        const d = x * cx[i] + y * cy[i] + z * cz[i] - (i < pentCount ? PENT_BIAS : 0);
        if (d > d1) { d2 = d1; d1 = d; k1 = i; } else if (d > d2) d2 = d;
      }
      const edge = d1 - d2;                                   // 0 on a seam, grows toward a panel centre
      const seam = Math.max(0, 1 - edge / SEAM_W);            // 1 on the seam line, 0 inside the panel
      const s2 = seam * seam * (3 - 2 * seam);
      const base = k1 < pentCount ? PANEL_DARK : PANEL_WHITE;
      const o = (py * W + px) * 4;
      cImg.data[o] = base[0] + (SEAM[0] - base[0]) * s2;
      cImg.data[o + 1] = base[1] + (SEAM[1] - base[1]) * s2;
      cImg.data[o + 2] = base[2] + (SEAM[2] - base[2]) * s2;
      cImg.data[o + 3] = 255;
      // Bump: seams recessed, panels gently pillowed
      const pillow = Math.min(1, edge / 0.12);
      const bv = 60 + 150 * pillow * (1 - s2);
      bImg.data[o] = bImg.data[o + 1] = bImg.data[o + 2] = bv; bImg.data[o + 3] = 255;
      // Roughness: seams matte, panels satin
      const rv = 110 + 120 * s2;
      rImg.data[o] = rImg.data[o + 1] = rImg.data[o + 2] = rv; rImg.data[o + 3] = 255;
    }
  }
  cc.putImageData(cImg, 0, 0); bc.putImageData(bImg, 0, 0); rc.putImageData(rImg, 0, 0);

  // Fine material speckle so the surface doesn't read as flat vector
  const speck = Math.floor(W * H * 0.002);
  for (let i = 0; i < speck; i++) {
    const x = Math.random() * W, y = Math.random() * H, s = 1 + Math.random() * 1.5;
    cc.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(20,40,50,0.05)';
    cc.fillRect(x, y, s, s);
  }

  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  return { map: tex(color, true), bumpMap: tex(bump, false), roughnessMap: tex(rough, false) };
}

export function createBall({ canvas, quality = 'high' }) {
  const low = quality === 'low';
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const FOV = 28, DIST = 12;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, DIST);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xfff7e6, 2.4);
  key.position.set(3, 6, 7);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd9ffef, 0.5);
  fill.position.set(-5, -2, 4);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));

  const maps = buildMaps(low ? 1024 : 1536);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: maps.map,
    bumpMap: maps.bumpMap,
    bumpScale: low ? 0.8 : 1.1,
    roughnessMap: maps.roughnessMap,
    roughness: 0.55,
    metalness: 0.0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.35,
    envMapIntensity: 0.85,
  });
  const geometry = new THREE.SphereGeometry(1, low ? 48 : 96, low ? 32 : 64);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.set(0.4, -0.6, 0.15);
  const tilt = new THREE.Group();
  tilt.add(mesh);
  scene.add(tilt);

  let vw = 1, vh = 1, worldH = 1, worldW = 1;
  function resize() {
    vw = window.innerWidth; vh = window.innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    worldH = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * DIST;
    worldW = worldH * camera.aspect;
  }
  resize();

  const state = { x: -9999, y: -9999, r: 40, squash: 1, visible: true, alpha: 1, targetTiltX: 0, targetTiltY: 0 };
  const Z = new THREE.Vector3(0, 0, 1), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
  let idleSpin = 0.32;
  let needsRender = true;

  return {
    resize,
    /** Screen-space placement. r = radius in CSS px. */
    setScreen(x, y, r, squash = 1) {
      state.x = x; state.y = y; state.r = r; state.squash = squash;
      needsRender = true;
    },
    setVisible(v) { if (state.visible !== v) { state.visible = v; needsRender = true; } },
    setAlpha(a) { a = THREE.MathUtils.clamp(a, 0, 1); if (material.opacity !== a) { material.transparent = a < 1; material.opacity = a; needsRender = true; } },
    /** Rolling spin: dx/dy in CSS px since last frame. */
    roll(dx, dy) {
      const r = Math.max(8, state.r);
      if (dx) mesh.rotateOnWorldAxis(Z, -dx / r);
      if (dy) mesh.rotateOnWorldAxis(X, dy / r * 0.6);
      if (dx || dy) needsRender = true;
    },
    /** Gentle reaction to the cursor: tilt toward it. */
    lookToward(nx, ny) { state.targetTiltX = ny * 0.35; state.targetTiltY = nx * 0.35; },
    setIdleSpin(v) { idleSpin = v; },
    update(dt) {
      if (!state.visible) { renderer.clear(); return; }
      mesh.rotateOnWorldAxis(Y, idleSpin * dt);
      tilt.rotation.x += (state.targetTiltX - tilt.rotation.x) * Math.min(1, dt * 4);
      tilt.rotation.y += (state.targetTiltY - tilt.rotation.y) * Math.min(1, dt * 4);
      const px = (state.x / vw - 0.5) * worldW;
      const py = -(state.y / vh - 0.5) * worldH;
      tilt.position.set(px, py, 0);
      const s = (state.r / vh) * worldH;
      tilt.scale.set(s / Math.sqrt(state.squash), s * state.squash, s);
      renderer.render(scene, camera);
      needsRender = false;
    },
    dispose() {
      geometry.dispose(); material.dispose();
      Object.values(maps).forEach(t => t.dispose());
      renderer.dispose();
    },
  };
}
