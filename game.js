import * as THREE from 'three';

/* =====================================================================
   SELENDANG HIJAU  -  Bab 1: Kaki Gunung
   Game horor 3D (Three.js) berlatar legenda Gunung Pandan, Bojonegoro.
   Semua tokoh fiksi.
   ===================================================================== */

const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
let seed = 20260920;
function R() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const rr = (a, b) => a + R() * (b - a);

const errBox = $('#err');
function showErr(m) { errBox.textContent = 'Error: ' + m; errBox.classList.add('on'); }
window.addEventListener('error', e => showErr(e.message || '?'));
window.addEventListener('unhandledrejection', e => showErr(String(e.reason)));

/* ---------- renderer ---------- */
const canvas = $('#gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch (e) {
  showErr('WebGL tidak tersedia di perangkat ini');
  throw e;
}
let PR = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(PR);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x6a4a52, 0.016);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 420);
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = (w / h) < 1.3 ? 72 : 62;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ---------- suasana (senja -> malam) ---------- */
const C = h => new THREE.Color(h);
const MOODS = {
  dusk: { top: C(0x1f2a52), fog: C(0x6a4a52), glow: C(0xff8a4a), sun: C(0xffb070), fogD: 0.016, hemiSky: C(0x8a7aa8), hemiGnd: C(0x3a2f2a), hemiI: 1.0, dirCol: C(0xff9a55), dirI: 2.4, exp: 1.0 },
  night: { top: C(0x060a18), fog: C(0x121a2a), glow: C(0x1a2a55), sun: C(0x9fb4ff), fogD: 0.028, hemiSky: C(0x4a5a8a), hemiGnd: C(0x101610), hemiI: 0.6, dirCol: C(0x7f95d8), dirI: 0.8, exp: 1.1 }
};
const SUN_DIR = [-0.55, 0.1, -0.83];
const LIGHT_DIR = [-0.6, 0.5, 0.25];
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    top: { value: C(0x1f2a52) }, fogc: { value: C(0x6a4a52) }, glow: { value: C(0xff8a4a) },
    sunc: { value: C(0xffb070) }, sdir: { value: new THREE.Vector3(SUN_DIR[0], SUN_DIR[1], SUN_DIR[2]).normalize() }
  },
  vertexShader: 'varying vec3 vd; void main(){ vd=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: [
    'uniform vec3 top; uniform vec3 fogc; uniform vec3 glow; uniform vec3 sunc; uniform vec3 sdir; varying vec3 vd;',
    'void main(){',
    ' vec3 d=normalize(vd); float h=max(d.y,0.0);',
    ' vec3 col=mix(fogc,top,smoothstep(0.0,0.6,h));',
    ' vec2 hz=normalize(d.xz+vec2(0.0001)); vec2 sz=normalize(sdir.xz);',
    ' float az=pow(max(dot(hz,sz),0.0),3.0);',
    ' col=mix(col,glow,az*exp(-h*5.0)*0.9);',
    ' float s=pow(max(dot(d,normalize(sdir)),0.0),400.0);',
    ' col+=sunc*s*3.0;',
    ' gl_FragColor=vec4(col,1.0);',
    ' #include <tonemapping_fragment>',
    ' #include <colorspace_fragment>',
    '}'
  ].join('\n')
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 14), skyMat);
sky.frustumCulled = false; sky.renderOrder = -10;
scene.add(sky);

const hemi = new THREE.HemisphereLight(0x8a7aa8, 0x3a2f2a, 1.0);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xff9a55, 2.4);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
dir.shadow.camera.left = -22; dir.shadow.camera.right = 22; dir.shadow.camera.top = 22; dir.shadow.camera.bottom = -22;
dir.shadow.camera.near = 1; dir.shadow.camera.far = 140; dir.shadow.camera.updateProjectionMatrix();
dir.shadow.bias = -0.0006; dir.shadow.normalBias = 0.04;
scene.add(dir); scene.add(dir.target);

let moodA = 'dusk', moodB = 'dusk', moodT = 0;
function applyMood() {
  const a = MOODS[moodA], b = MOODS[moodB], t = moodT;
  skyMat.uniforms.top.value.lerpColors(a.top, b.top, t);
  skyMat.uniforms.fogc.value.lerpColors(a.fog, b.fog, t);
  skyMat.uniforms.glow.value.lerpColors(a.glow, b.glow, t);
  skyMat.uniforms.sunc.value.lerpColors(a.sun, b.sun, t);
  scene.fog.color.lerpColors(a.fog, b.fog, t);
  scene.fog.density = lerp(a.fogD, b.fogD, t);
  hemi.color.lerpColors(a.hemiSky, b.hemiSky, t);
  hemi.groundColor.lerpColors(a.hemiGnd, b.hemiGnd, t);
  hemi.intensity = lerp(a.hemiI, b.hemiI, t);
  dir.color.lerpColors(a.dirCol, b.dirCol, t);
  dir.intensity = lerp(a.dirI, b.dirI, t);
  renderer.toneMappingExposure = lerp(a.exp, b.exp, t);
}
function setMood(name) { moodA = moodB = name; moodT = 0; applyMood(); }

/* ---------- dunia: medan ---------- */
const trailX = z => Math.sin(z * 0.07) * 2.2;
const HUT = { x: 10.5, z: -7 };
const GATE = { z: -28 }; GATE.x = trailX(GATE.z);
const START = { z: 16 }; START.x = trailX(START.z);

function terrainH(x, z) {
  const d = Math.hypot(x, z - 6);
  const flat = clamp((d - 34) / 24, 0, 1);
  let h = Math.sin(x * 0.09) * 1.6 + Math.cos(z * 0.11) * 1.4 + Math.sin((x + z) * 0.05) * 2.2;
  const m = clamp((-z - 34) / 60, 0, 1);
  return h * flat + m * m * 46 + m * 8 * flat;
}
function groundY(x, z) {
  const inHut = Math.abs(x - HUT.x) < 2.6 && Math.abs(z - HUT.z) < 2.1;
  return terrainH(x, z) + (inHut ? 0.3 : 0);
}

const stdMats = {};
function M(color, opts) {
  const key = color + (opts ? JSON.stringify(opts) : '');
  if (!stdMats[key]) stdMats[key] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 1, metalness: 0, flatShading: true }, opts || {}));
  return stdMats[key];
}
function addBox(parent, w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}

(function buildTerrain() {
  const g = new THREE.PlaneGeometry(260, 260, 90, 90);
  g.rotateX(-Math.PI / 2); g.translate(0, 0, -30);
  const pos = g.attributes.position, cols = [];
  const c1 = new THREE.Color(), c2 = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = terrainH(x, z);
    pos.setY(i, h);
    const n = Math.sin(x * 0.7) * Math.cos(z * 0.6) * 0.5 + 0.5;
    c1.setHex(0x3e5a2c); c2.setHex(0x6b6a3c); c1.lerp(c2, n);
    c2.setHex(0x263a26); c1.lerp(c2, clamp(h / 40, 0, 0.8));
    cols.push(c1.r, c1.g, c1.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.computeVertexNormals();
  const t = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  t.receiveShadow = true; scene.add(t);
  // siluet puncak gunung di kejauhan
  const peak = new THREE.Mesh(new THREE.ConeGeometry(80, 120, 7), new THREE.MeshStandardMaterial({ color: 0x1b2233, roughness: 1, flatShading: true }));
  peak.position.set(-10, 60, -190); scene.add(peak);
})();

(function buildTrail() {
  const pos = [], idx = [], N = 80, w = 1.7;
  for (let i = 0; i <= N; i++) {
    const z = 20 - i * 1.0, cx = trailX(z);
    pos.push(cx - w, terrainH(cx - w, z) + 0.06, z, cx + w, terrainH(cx + w, z) + 0.06, z);
  }
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x6b5237, roughness: 1, flatShading: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.receiveShadow = true; scene.add(m);
})();

/* ---------- tumbukan ---------- */
const circles = [];
const boxes = [];
const BOUNDS = { x0: -33, x1: 33, z0: -24.5, z1: 24 };
function collide(x, z, r, self) {
  x = clamp(x, BOUNDS.x0, BOUNDS.x1); z = clamp(z, BOUNDS.z0, BOUNDS.z1);
  for (let i = 0; i < circles.length; i++) {
    const c = circles[i], dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
    if (d < m && d > 1e-4) { x = c.x + dx / d * m; z = c.z + dz / d * m; }
  }
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) {
      const l = x - (b.x0 - r), rt = (b.x1 + r) - x, t = z - (b.z0 - r), bt = (b.z1 + r) - z, mn = Math.min(l, rt, t, bt);
      if (mn === l) x = b.x0 - r; else if (mn === rt) x = b.x1 + r; else if (mn === t) z = b.z0 - r; else z = b.z1 + r;
    }
  }
  for (let i = 0; i < ACT.length; i++) {
    const a = ACT[i]; if (a === self || !a.g.visible) continue;
    const dx = x - a.x, dz = z - a.z, d = Math.hypot(dx, dz), m = 0.45 + r;
    if (d < m && d > 1e-4) { x = a.x + dx / d * m; z = a.z + dz / d * m; }
  }
  return [x, z];
}

/* ---------- tumbuhan ---------- */
function blockedSpot(x, z) {
  if (Math.abs(x - trailX(z)) < 4.4 && z > -32 && z < 30) return true;
  if (Math.hypot(x - HUT.x, z - HUT.z) < 8) return true;
  if (Math.hypot(x - GATE.x, z - GATE.z) < 7) return true;
  return false;
}
(function buildForest() {
  const trunkG = new THREE.CylinderGeometry(0.18, 0.28, 5, 6); trunkG.translate(0, 2.5, 0);
  const crownG = new THREE.IcosahedronGeometry(2.3, 0); crownG.scale(1, 0.85, 1); crownG.translate(0, 6.0, 0);
  const crown2G = new THREE.IcosahedronGeometry(1.7, 0); crown2G.translate(0.9, 4.6, 0.4);
  const spots = [];
  for (let n = 0; n < 900 && spots.length < 140; n++) {
    const x = rr(-75, 75), z = rr(-95, 60);
    if (blockedSpot(x, z)) continue;
    if (z > 26 && Math.abs(x) < 30 && R() < 0.5) continue;
    spots.push([x, z]);
  }
  const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 1, flatShading: true }), spots.length);
  const crowns = new THREE.InstancedMesh(crownG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), spots.length);
  const crowns2 = new THREE.InstancedMesh(crown2G, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), spots.length);
  const o = new THREE.Object3D(), col = new THREE.Color();
  spots.forEach((s, i) => {
    const sc = rr(0.8, 1.5);
    o.position.set(s[0], terrainH(s[0], s[1]) - 0.1, s[1]); o.rotation.set(0, rr(0, 6.28), 0); o.scale.set(sc, sc * rr(0.9, 1.15), sc); o.updateMatrix();
    trunks.setMatrixAt(i, o.matrix); crowns.setMatrixAt(i, o.matrix); crowns2.setMatrixAt(i, o.matrix);
    col.setHex(0x2f4a2a).lerp(new THREE.Color(0x4a5e2e), R()); crowns.setColorAt(i, col); crowns2.setColorAt(i, col);
    if (Math.abs(s[0]) < 36 && s[1] > -32 && s[1] < 27) circles.push({ x: s[0], z: s[1], r: 0.55 * sc });
  });
  [trunks, crowns, crowns2].forEach(m => { m.frustumCulled = false; m.castShadow = false; scene.add(m); });

  // rumpun pandan
  const pos = [], idx = [];
  const blades = 11;
  for (let b = 0; b < blades; b++) {
    const a = b / blades * Math.PI * 2 + rr(-0.2, 0.2), len = rr(1.4, 2.2), lift = rr(0.9, 1.5), w = 0.17, seg = 4, base = pos.length / 3;
    for (let s = 0; s <= seg; s++) {
      const t = s / seg, r = len * t, y = 0.15 + lift * t * (1.25 - t) * 1.3, wd = w * (1 - t * 0.85);
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r, px = -Math.sin(a) * wd, pz = Math.cos(a) * wd;
      pos.push(cx - px, y, cz - pz, cx + px, y, cz + pz);
    }
    for (let s = 0; s < seg; s++) { const i = base + s * 2; idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); }
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pg.setIndex(idx); pg.computeVertexNormals();
  const pand = [];
  for (let n = 0; n < 600 && pand.length < 90; n++) {
    const x = rr(-40, 40), z = rr(-40, 34);
    if (Math.abs(x - trailX(z)) < 1.9 && z < 22) continue;
    if (Math.hypot(x - HUT.x, z - HUT.z) < 4) continue;
    pand.push([x, z]);
  }
  const pm = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ color: 0x5d8a36, side: THREE.DoubleSide, roughness: 0.9, flatShading: true }), pand.length);
  pand.forEach((s, i) => {
    const sc = rr(0.8, 1.6);
    o.position.set(s[0], terrainH(s[0], s[1]), s[1]); o.rotation.set(0, rr(0, 6.28), 0); o.scale.set(sc, sc, sc); o.updateMatrix();
    pm.setMatrixAt(i, o.matrix);
  });
  pm.frustumCulled = false; scene.add(pm);

  // batu
  const rg = new THREE.DodecahedronGeometry(0.6, 0);
  const rocks = new THREE.InstancedMesh(rg, new THREE.MeshStandardMaterial({ color: 0x555049, roughness: 1, flatShading: true }), 40);
  for (let i = 0; i < 40; i++) {
    const x = rr(-30, 30), z = rr(-30, 30), sc = rr(0.5, 1.6);
    o.position.set(x, terrainH(x, z) + 0.1, z); o.rotation.set(rr(0, 3), rr(0, 3), 0); o.scale.set(sc, sc * 0.6, sc); o.updateMatrix(); rocks.setMatrixAt(i, o.matrix);
  }
  rocks.frustumCulled = false; scene.add(rocks);
})();

/* kunang-kunang */
const flies = (function () {
  const n = 50, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = rr(-14, 14); pos[i * 3 + 1] = rr(0.6, 2.8); pos[i * 3 + 2] = rr(-30, 20); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.16, color: 0xd9ff9a, transparent: true, opacity: 0.9, depthWrite: false }));
  p.frustumCulled = false; scene.add(p); return p;
})();

/* ---------- bangunan ---------- */
function signTexture(lines, w, h, bg) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#d8c9a0'; x.lineWidth = 6; x.strokeRect(6, 6, w - 12, h - 12);
  x.fillStyle = '#efe6cc'; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach((t, i) => { x.font = (i === 0 ? 'bold 46px' : '30px') + ' Georgia, serif'; x.fillText(t, w / 2, h * (lines.length === 1 ? 0.5 : 0.36 + i * 0.32)); });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
const lamps = [];
function addLamp(x, y, z, intensity, dist) {
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc070 }));
  bulb.position.set(x, y, z); scene.add(bulb);
  const l = new THREE.PointLight(0xffa550, intensity, dist, 2); l.position.set(x, y, z); scene.add(l);
  lamps.push({ l, base: intensity }); return l;
}
(function buildHut() {
  const g = new THREE.Group(); g.position.set(HUT.x, terrainH(HUT.x, HUT.z), HUT.z); scene.add(g);
  const wood = 0x5a4229, dark = 0x3a2a1a, thatch = 0x7a6a3a;
  addBox(g, 5.4, 0.3, 4.4, wood, 0, 0.15, 0);
  [[-2.5, -2], [2.5, -2], [-2.5, 2], [2.5, 2]].forEach(p => addBox(g, 0.2, 2.9, 0.2, dark, p[0], 1.75, p[1]));
  addBox(g, 0.15, 2.5, 4.2, wood, 2.55, 1.55, 0);
  addBox(g, 5.2, 1.0, 0.12, wood, 0, 0.9, -2.05);
  addBox(g, 5.2, 1.0, 0.12, wood, 0, 0.9, 2.05);
  const r1 = addBox(g, 6.0, 0.14, 2.9, thatch, 0, 3.3, 1.05); r1.rotation.x = 0.42;
  const r2 = addBox(g, 6.0, 0.14, 2.9, thatch, 0, 3.3, -1.05); r2.rotation.x = -0.42;
  addBox(g, 1.5, 0.9, 0.7, dark, 1.3, 0.75, -1.1);
  addBox(g, 1.6, 0.4, 0.45, dark, -0.4, 0.5, 1.4);
  // senter di meja
  const sen = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, emissive: 0xffe9a0, emissiveIntensity: 0.6 }));
  sen.rotation.z = Math.PI / 2; sen.position.set(1.0, 1.25, -1.1); g.add(sen); window.__senter = sen;
  // papan nama
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.7), new THREE.MeshBasicMaterial({ map: signTexture(['POS JAGA', 'Gunung Pandan'], 512, 140, '#3a2a1a') }));
  sg.position.set(-2.75, 2.75, 0); sg.rotation.y = -Math.PI / 2; g.add(sg);
  addLamp(HUT.x - 2.4, terrainH(HUT.x, HUT.z) + 2.5, HUT.z + 0.4, 55, 22);
  const X = HUT.x, Z = HUT.z;
  boxes.push({ x0: X + 2.45, x1: X + 2.65, z0: Z - 2.1, z1: Z + 2.1 });
  boxes.push({ x0: X - 2.6, x1: X + 2.6, z0: Z - 2.12, z1: Z - 1.98 });
  boxes.push({ x0: X - 2.6, x1: X + 2.6, z0: Z + 1.98, z1: Z + 2.12 });
  boxes.push({ x0: X + 0.55, x1: X + 2.05, z0: Z - 1.45, z1: Z - 0.75 });
  boxes.push({ x0: X - 1.2, x1: X + 0.4, z0: Z + 1.17, z1: Z + 1.63 });
})();
(function buildGate() {
  const gx = GATE.x, gz = GATE.z, y = terrainH(gx, gz);
  const g = new THREE.Group(); g.position.set(gx, y, gz); scene.add(g);
  [-1, 1].forEach(s => {
    addBox(g, 1.3, 3.6, 1.3, 0x57534a, 3.2 * s, 1.8, 0);
    addBox(g, 1.8, 0.35, 1.8, 0x3f3c35, 3.2 * s, 3.75, 0);
    addBox(g, 1.0, 0.7, 1.0, 0x57534a, 3.2 * s, 4.3, 0);
    circles.push({ x: gx + 3.2 * s, z: gz, r: 1.0 });
  });
  addBox(g, 6.4, 0.25, 0.4, 0x3a2a1a, 0, 4.0, 0);
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.0), new THREE.MeshBasicMaterial({ map: signTexture(['GUNUNG PANDAN', 'Jalur Pendakian'], 640, 150, '#2c2a24') }));
  sg.position.set(0, 3.25, 0.25); g.add(sg);
  addLamp(gx + 2.3, y + 3.0, gz + 1.0, 30, 16);
})();

/* ---------- tokoh ---------- */
const ACT = [];
function person(o) {
  const g = new THREE.Group();
  const skin = M(o.skin || 0xc79a72);
  const topMat = new THREE.MeshStandardMaterial({ color: o.top, roughness: 1, flatShading: true });
  const body = new THREE.Group(); g.add(body);
  const add = (geo, mat, x, y, z, parent, shadow) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (shadow !== false) m.castShadow = true; (parent || g).add(m); return m; };
  add(new THREE.CapsuleGeometry(0.21, 0.5, 3, 8), topMat, 0, 1.12, 0, body);
  if (o.skirt) add(new THREE.CylinderGeometry(0.2, 0.31, 0.85, 8), M(o.skirt), 0, 0.5, 0, g);
  const legs = [], arms = [];
  [-1, 1].forEach(s => {
    const p = new THREE.Group(); p.position.set(0.1 * s, 0.85, 0); g.add(p);
    if (o.skirt) add(new THREE.CapsuleGeometry(0.07, 0.5, 3, 6), skin, 0, -0.45, 0, p);
    else add(new THREE.CapsuleGeometry(0.09, 0.55, 3, 6), M(o.bottom || 0x2a2f3a), 0, -0.4, 0, p);
    add(new THREE.BoxGeometry(0.14, 0.08, 0.24), M(0x1c1a18), 0, -0.82, 0.04, p);
    legs.push(p);
  });
  [-1, 1].forEach(s => {
    const p = new THREE.Group(); p.position.set(0.3 * s, 1.42, 0); body.add(p);
    add(new THREE.CapsuleGeometry(0.07, 0.5, 3, 6), topMat, 0, -0.3, 0, p);
    add(new THREE.SphereGeometry(0.075, 6, 5), skin, 0, -0.62, 0, p);
    arms.push(p);
  });
  const head = new THREE.Group(); head.position.y = 1.72; body.add(head);
  add(new THREE.SphereGeometry(0.17, 10, 8), skin, 0, 0, 0, head);
  [-1, 1].forEach(s => add(new THREE.SphereGeometry(0.022, 5, 4), M(0x111111), 0.06 * s, 0.02, 0.155, head, false));
  const hc = M(o.hair || 0x1a1410);
  if (o.hairStyle !== 'none') {
    add(new THREE.SphereGeometry(0.19, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), hc, 0, 0.03, -0.01, head);
    if (o.hairStyle === 'long') add(new THREE.CapsuleGeometry(0.11, 0.42, 3, 6), hc, 0, -0.22, -0.13, head);
    if (o.hairStyle === 'cap') add(new THREE.BoxGeometry(0.3, 0.03, 0.2), M(o.capColor || 0x224466), 0, 0.09, 0.2, head);
  }
  if (o.headband) add(new THREE.CylinderGeometry(0.195, 0.195, 0.07, 10), M(0x3b2416), 0, 0.09, 0, head);
  if (o.backpack) add(new THREE.BoxGeometry(0.38, 0.5, 0.2), M(o.backpack), 0, 1.15, -0.27, body);
  if (o.stick) add(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 5), M(0x5a4326), 0.42, 0.75, 0.12, g);
  if (o.lantern) add(new THREE.BoxGeometry(0.12, 0.16, 0.12), new THREE.MeshBasicMaterial({ color: 0xffc070 }), 0.3, 0.72, 0.1, g, false);
  if (o.stoop) body.rotation.x = 0.16;
  g.scale.setScalar(o.scale || 1);
  g.visible = false; scene.add(g);
  return { g, body, legs, arms, head, topMat };
}
function mkActor(name, p) {
  const a = { name, p, g: p.g, x: 0, z: 0, y: 0, face: 0, tx: null, tz: null, spd: 2, moving: false, ph: Math.random() * 6, follow: false, off: [0, 2], watch: false, headYaw: 0, seed: Math.random() * 6 };
  ACT.push(a); return a;
}
const raka = mkActor('Raka', person({ top: 0xb6e3a0, bottom: 0x2b3448, hair: 0x18120e, hairStyle: 'short', backpack: 0x7a3b22 }));
const dinda = mkActor('Dinda', person({ top: 0x8a2f3a, bottom: 0x2a2a34, hair: 0x120d0a, hairStyle: 'long', backpack: 0x33506b, scale: 0.95 }));
const bayu = mkActor('Bayu', person({ top: 0xd9782b, bottom: 0x3a4a3a, hair: 0x1a1410, hairStyle: 'cap', capColor: 0x224466, backpack: 0x2b2b2b, scale: 1.04 }));
const mbah = mkActor('Mbah Karto', person({ top: 0x2a2a35, skirt: 0x6b4a2a, skin: 0xb98a60, hair: 0xe6e6e0, hairStyle: 'short', headband: true, stick: true, lantern: true, stoop: true, scale: 0.97 }));

function place(a, x, z, face) { a.x = x; a.z = z; if (face !== undefined) a.face = face; a.tx = null; a.follow = false; a.g.visible = true; a.y = groundY(x, z); }
function faceTo(a, x, z) { a.face = Math.atan2(x - a.x, z - a.z); }
function updateActors(dt, t) {
  for (const a of ACT) {
    if (!a.g.visible) continue;
    if (a !== raka) {
      a.moving = false;
      if (a.follow) {
        const yy = camYaw, rx = Math.cos(yy), rz = -Math.sin(yy), bx = Math.sin(yy), bz = Math.cos(yy);
        const tx = raka.x + rx * a.off[0] + bx * a.off[1], tz = raka.z + rz * a.off[0] + bz * a.off[1];
        const d = Math.hypot(tx - a.x, tz - a.z);
        if (d > 0.7) { a.tx = tx; a.tz = tz; a.spd = clamp(d * 2.2, 1.5, 4.4); }
      }
      if (a.tx !== null) {
        const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
        if (d < 0.1) a.tx = null;
        else {
          const st = Math.min(d, a.spd * dt);
          const c = collide(a.x + dx / d * st, a.z + dz / d * st, 0.3, a);
          a.x = c[0]; a.z = c[1];
          a.face += angDiff(Math.atan2(dx, dz) - a.face) * Math.min(1, dt * 8); a.moving = true;
        }
      } else if (a.watch) {
        const want = Math.atan2(raka.x - a.x, raka.z - a.z);
        a.face += angDiff(want - a.face) * Math.min(1, dt * 3);
      }
    }
    a.y = lerp(a.y, groundY(a.x, a.z), Math.min(1, dt * 12));
    a.g.position.set(a.x, a.y, a.z); a.g.rotation.y = a.face;
    // animasi
    const P = a.p;
    a.ph += dt * (a.moving ? 8.5 : 0);
    const sw = a.moving ? 1 : 0;
    P.legs[0].rotation.x = Math.sin(a.ph) * 0.7 * sw; P.legs[1].rotation.x = -Math.sin(a.ph) * 0.7 * sw;
    P.arms[0].rotation.x = -Math.sin(a.ph) * 0.6 * sw; P.arms[1].rotation.x = Math.sin(a.ph) * 0.6 * sw;
    P.body.position.y = Math.abs(Math.sin(a.ph)) * 0.04 * sw + Math.sin(t * 1.6 + a.seed) * 0.006;
    if (a !== raka) {
      const rel = a.watch ? clamp(angDiff(Math.atan2(raka.x - a.x, raka.z - a.z) - a.face), -0.9, 0.9) : 0;
      a.headYaw = lerp(a.headYaw, rel, Math.min(1, dt * 4)); P.head.rotation.y = a.headYaw;
    }
  }
}

/* ---------- kamera ---------- */
let camYaw = 0, camPitch = 0.26, camDist = 5.2;
const CAMS = { p: [0, 4, 30], l: [0, 2, 0], rate: 6 };
let cineOn = null;
function cineTo(px, py, pz, lx, ly, lz, rate) { cineOn = { p: [px, py, pz], l: [lx, ly, lz], rate: rate || 2.4 }; }
function followCam() { cineOn = null; }
function frame2(a, b, dist, side, h) {
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
  const nx = -dz / l * (side || 1), nz = dx / l * (side || 1);
  const d = dist || 4.2;
  cineTo(mx + nx * d, groundY(mx, mz) + (h || 1.7), mz + nz * d, mx, groundY(mx, mz) + 1.3, mz, 2.6);
}
function updateCamera(dt) {
  let dp, dl, rate = 7;
  if (cineOn) { dp = cineOn.p; dl = cineOn.l; rate = cineOn.rate; }
  else {
    const cp = Math.cos(camPitch), sp = Math.sin(camPitch);
    dp = [raka.x + Math.sin(camYaw) * cp * camDist, raka.y + 1.5 + sp * camDist, raka.z + Math.cos(camYaw) * cp * camDist];
    dl = [raka.x, raka.y + 1.35, raka.z];
  }
  const k = 1 - Math.exp(-dt * rate);
  for (let i = 0; i < 3; i++) { CAMS.p[i] += (dp[i] - CAMS.p[i]) * k; CAMS.l[i] += (dl[i] - CAMS.l[i]) * k; }
  const gy = terrainH(CAMS.p[0], CAMS.p[2]) + 0.6;
  camera.position.set(CAMS.p[0], Math.max(CAMS.p[1], gy), CAMS.p[2]);
  camera.lookAt(CAMS.l[0], CAMS.l[1], CAMS.l[2]);
}
function snapCam() { const r = cineOn ? cineOn.rate : 0; if (cineOn) cineOn.rate = 100; for (let i = 0; i < 8; i++) updateCamera(0.5); if (cineOn) cineOn.rate = r; }

/* =====================  SUARA  ===================== */
const AU = { ctx: null, master: null, noise: null, on: true };
function auInit() {
  try {
    if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = AU.ctx = new AC();
    AU.master = c.createGain(); AU.master.gain.value = AU.on ? 0.6 : 0; AU.master.connect(c.destination);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    AU.noise = nb;
    const ws = c.createBufferSource(); ws.buffer = nb; ws.loop = true;
    const wf = c.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 420;
    const wg = c.createGain(); wg.gain.value = 0.1;
    const lf = c.createOscillator(); lf.frequency.value = 0.12; const lg = c.createGain(); lg.gain.value = 0.06;
    lf.connect(lg); lg.connect(wg.gain); ws.connect(wf); wf.connect(wg); wg.connect(AU.master); ws.start(); lf.start();
    const co = c.createOscillator(); co.type = 'sine'; co.frequency.value = 4400;
    const cg = c.createGain(); cg.gain.value = 0.005; co.connect(cg); cg.connect(AU.master); co.start();
    const cl = c.createOscillator(); cl.type = 'square'; cl.frequency.value = 7; const clg = c.createGain(); clg.gain.value = 0.005;
    cl.connect(clg); clg.connect(cg.gain); cl.start();
  } catch (e) { AU.ctx = null; }
}
function tone(f, d, type, v, f2, delay) {
  if (!AU.ctx || !AU.on) return;
  try {
    const c = AU.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + d + 0.03);
  } catch (e) { }
}
function noiseBurst(d, v, freq) {
  if (!AU.ctx || !AU.on || !AU.noise) return;
  try {
    const c = AU.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = AU.noise;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 700;
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(AU.master); s.start(t); s.stop(t + d + 0.03);
  } catch (e) { }
}
const sfx = {
  tick() { tone(1100, 0.02, 'square', 0.012); },
  step() { noiseBurst(0.09, 0.05, 600); },
  chime() { tone(523, 0.6, 'sine', 0.16); tone(659, 0.6, 'sine', 0.16, null, 0.25); tone(784, 1.0, 'sine', 0.16, null, 0.5); },
  note() { tone(880, 0.25, 'triangle', 0.1); },
  voice() { tone(520, 1.6, 'sine', 0.09, 400); tone(523, 1.6, 'sine', 0.05, 405, 0.05); noiseBurst(1.4, 0.06, 1400); tone(430, 1.3, 'sine', 0.06, 340, 0.5); }
};

/* =====================  DATA GAME & UI  ===================== */
const S = { flags: {}, notes: [], items: [] };
const SAVE_KEY = 'selendang_hijau_save';
function saveGame() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
const el = {
  dlg: $('#dlg'), who: $('#dlg .who'), txt: $('#dlg .txt'), card: $('#card'), ct: $('#card .ct'), cs: $('#card .cs'),
  fade: $('#fade'), act: $('#actBtn'), choices: $('#choices'), obj: $('#obj'), toast: $('#toast'), joy: $('#joy'), knob: $('#joy i'),
  panel: $('#panel'), notes: $('#notes'), noteList: $('#noteList'), rot: $('#rot')
};
let toastT = 0;
function toast(t, ms) { el.toast.textContent = t; el.toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.toast.classList.remove('on'), ms || 3200); }
function setObj(t) { if (!t) { el.obj.classList.remove('on'); return; } el.obj.textContent = t; el.obj.classList.add('on'); }
function addNote(t) { S.notes.push(t); sfx.note(); toast('Catatan baru di buku 📓'); saveGame(); }
function showPanel(html) { el.panel.innerHTML = html; el.panel.classList.add('on'); }
function hidePanel() { el.panel.classList.remove('on'); }

const WHO = { 'Narator': '#d8d2b8', 'Raka': '#8fd3ff', 'Dinda': '#ff9db0', 'Bayu': '#ffb35a', 'Mbah Karto': '#f2e2a0', 'Suara': '#c9a0ff' };
const DLG = { on: false, text: '', acc: 0, shown: 0, finished: false, tapped: false };
function dlgShow(who, text) {
  DLG.on = true; DLG.text = text; DLG.acc = 0; DLG.shown = 0; DLG.finished = false; DLG.tapped = false;
  el.who.textContent = who; el.who.style.color = WHO[who] || '#e6eadb';
  el.txt.textContent = ''; el.txt.className = 'txt' + (who === 'Narator' ? ' nar' : '');
  el.dlg.classList.remove('done'); el.dlg.classList.add('on');
}
function dlgHide() { DLG.on = false; el.dlg.classList.remove('on'); }
function dlgUpdate(dt) {
  if (!DLG.on || DLG.finished) return;
  DLG.acc += dt * 46;
  const n = Math.min(DLG.text.length, Math.floor(DLG.acc));
  if (n !== DLG.shown) { DLG.shown = n; el.txt.textContent = DLG.text.slice(0, n); if (n % 3 === 0) sfx.tick(); }
  if (n >= DLG.text.length) { DLG.finished = true; el.dlg.classList.add('done'); }
}
function dlgTap() {
  if (!DLG.on) return false;
  if (!DLG.finished) { DLG.acc = 1e6; DLG.shown = DLG.text.length; el.txt.textContent = DLG.text; DLG.finished = true; el.dlg.classList.add('done'); return true; }
  DLG.tapped = true; return true;
}

/* ---------- input ---------- */
const mv = { x: 0, y: 0 }; const keys = {};
let ctrl = 'none'; let joyId = null, joyO = null, lookId = null, lookP = null;
const touch = $('#touch');
touch.addEventListener('pointerdown', e => {
  if (state !== 'play') return;
  e.preventDefault(); auInit();
  if (DLG.on) { dlgTap(); return; }
  if (ctrl === 'none') return;
  try { touch.setPointerCapture(e.pointerId); } catch (_) { }
  if (e.clientX < window.innerWidth * 0.5) {
    if (joyId === null) {
      joyId = e.pointerId; joyO = { x: e.clientX, y: e.clientY };
      el.joy.style.left = (e.clientX - 55) + 'px'; el.joy.style.top = (e.clientY - 55) + 'px'; el.joy.classList.add('on'); el.knob.style.transform = 'translate(0px,0px)';
    }
  } else if (lookId === null) { lookId = e.pointerId; lookP = { x: e.clientX, y: e.clientY }; }
});
touch.addEventListener('pointermove', e => {
  if (e.pointerId === joyId) {
    const dx = e.clientX - joyO.x, dy = e.clientY - joyO.y, l = Math.hypot(dx, dy), Rr = 50, k = l > Rr ? Rr / l : 1;
    mv.x = dx * k / Rr; mv.y = -dy * k / Rr; el.knob.style.transform = 'translate(' + (dx * k) + 'px,' + (dy * k) + 'px)';
  } else if (e.pointerId === lookId) {
    const dx = e.clientX - lookP.x, dy = e.clientY - lookP.y; lookP.x = e.clientX; lookP.y = e.clientY;
    camYaw -= dx * 0.006; camPitch = clamp(camPitch + dy * 0.004, -0.05, 0.9);
  }
});
function endPtr(e) {
  if (e.pointerId === joyId) { joyId = null; mv.x = 0; mv.y = 0; el.joy.classList.remove('on'); }
  if (e.pointerId === lookId) lookId = null;
}
touch.addEventListener('pointerup', endPtr); touch.addEventListener('pointercancel', endPtr); touch.addEventListener('lostpointercapture', endPtr);
function resetInput() { joyId = null; lookId = null; mv.x = 0; mv.y = 0; el.joy.classList.remove('on'); for (const k in keys) keys[k] = false; }
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (e.key === ' ' || e.key === 'Enter') { if (!dlgTap()) doAction(); } });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
el.dlg.addEventListener('pointerdown', e => { e.preventDefault(); auInit(); dlgTap(); });
el.act.addEventListener('pointerdown', e => { e.preventDefault(); doAction(); });

/* =====================  RUNTIME SKENARIO  ===================== */
let SCRIPT = null, WAIT = null, LASTCHOICE = 0;
function startScript(g) { SCRIPT = g; WAIT = null; }
function stepScript(dt) {
  for (let guard = 0; guard < 60; guard++) {
    if (WAIT) { if (!WAIT.test(dt)) return; if (WAIT.done) WAIT.done(); WAIT = null; }
    if (!SCRIPT) return;
    let r;
    try { r = SCRIPT.next(); } catch (e) { showErr('skenario: ' + e.message); SCRIPT = null; return; }
    if (r.done) { SCRIPT = null; return; }
    WAIT = r.value || null; if (WAIT && WAIT.init) WAIT.init();
  }
}
const T = sec => { let t = 0; return { test: dt => ((t += dt) >= sec) }; };
const UNTIL = fn => ({ test: () => !!fn() });
const SAY = (who, text) => ({ init() { dlgShow(who, text); }, test: () => DLG.tapped, done() { dlgHide(); } });
const CARD = (t, s, sec) => { let k = 0; return { init() { el.ct.textContent = t; el.cs.textContent = s || ''; el.card.classList.add('on'); }, test: dt => ((k += dt) >= (sec || 3)), done() { el.card.classList.remove('on'); } }; };
const FADE = (black, sec) => { let k = 0; return { init() { el.fade.style.transition = 'opacity ' + (sec || 1) + 's'; el.fade.style.opacity = black ? '1' : '0'; }, test: dt => ((k += dt) >= (sec || 1)) }; };
const DO = fn => ({ init() { fn(); }, test: () => true });
function MOOD(name, sec) {
  let k = 0;
  return { init() { moodA = (moodT >= 0.5 ? moodB : moodA); moodB = name; moodT = 0; }, test: dt => { k += dt; moodT = clamp(k / sec, 0, 1); applyMood(); return k >= sec; }, done() { moodA = moodB = name; moodT = 0; applyMood(); } };
}
function CHOICE(opts) {
  return {
    init() {
      el.choices.innerHTML = ''; LASTCHOICE = -1;
      opts.forEach((t, i) => { const b = document.createElement('button'); b.textContent = t; b.addEventListener('pointerdown', ev => { ev.preventDefault(); LASTCHOICE = i; }); el.choices.appendChild(b); });
      el.choices.classList.add('on');
    },
    test: () => LASTCHOICE >= 0, done() { el.choices.classList.remove('on'); }
  };
}
let goal = null;
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 7, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.32, depthWrite: false, fog: false, side: THREE.DoubleSide }));
beam.visible = false; scene.add(beam);
function GOTO(x, z, r) { const g = { x, z, r, label: null, done: false }; return { init() { goal = g; }, test: () => g.done, done() { goal = null; el.act.classList.remove('on'); } }; }
function ACTION(label, x, z, r) { const g = { x, z, r, label, done: false }; return { init() { goal = g; }, test: () => g.done, done() { goal = null; el.act.classList.remove('on'); } }; }
function doAction() { if (goal && goal.label && el.act.classList.contains('on') && state === 'play') { goal.done = true; sfx.note(); } }

/* =====================  CERITA: BAB 1  ===================== */
const MK = { x: 6.2, z: -6.4 };
function* bab1() {
  ctrl = 'none'; setObj('');
  setMood('dusk');
  place(raka, START.x, START.z, Math.PI);
  place(dinda, START.x - 1.7, START.z + 2.0, Math.PI); dinda.watch = false;
  place(bayu, START.x + 1.8, START.z + 2.6, Math.PI);
  place(mbah, MK.x, MK.z, 0); faceTo(mbah, START.x, START.z); mbah.watch = true;
  camYaw = 0; camPitch = 0.26;
  cineTo(START.x + 2.0, 3.0, START.z + 7, 0, 16, -60, 0.4); snapCam();
  cineTo(START.x + 1.0, 2.6, START.z + 6.5, 0, 14, -60, 0.35);
  yield CARD('Bab 1', 'Kaki Gunung', 3);
  yield FADE(false, 1.6);
  yield SAY('Narator', 'Senja di kaki Gunung Pandan, Bojonegoro. Kabut tipis turun pelan dari lereng.');
  yield SAY('Raka', 'Akhirnya sampai juga. Lihat itu, puncaknya sudah tertutup awan.');
  yield SAY('Dinda', 'Serius mau naik sekarang? Sebentar lagi gelap.');
  yield SAY('Bayu', 'Justru itu serunya! Kita cuma kemah di pos dua. Lapor dulu ke juru kunci, yuk.');
  yield DO(() => { dinda.follow = true; dinda.off = [-1.6, 2.2]; bayu.follow = true; bayu.off = [1.7, 2.6]; followCam(); ctrl = 'walk'; setObj('Temui juru kunci di pos jaga (tanda emas).'); });
  yield GOTO(MK.x - 2.3, MK.z + 0.8, 2.3);
  yield DO(() => { ctrl = 'none'; resetInput(); setObj(''); dinda.follow = false; bayu.follow = false; faceTo(raka, mbah.x, mbah.z); faceTo(dinda, mbah.x, mbah.z); faceTo(bayu, mbah.x, mbah.z); dinda.watch = bayu.watch = true; frame2(raka, mbah, 4.4, 1, 1.6); });
  yield T(0.6);
  yield SAY('Mbah Karto', 'Nak, mau naik malam-malam begini?');
  yield SAY('Raka', 'Kami cuma mau kemah di pos dua, Mbah. Besok pagi turun lagi.');
  yield SAY('Mbah Karto', 'Gunung ini punya aturan. Dengarkan baik-baik, dan catat.');
  yield SAY('Mbah Karto', 'Pertama: jangan naik memakai pakaian hijau muda. Itu warna selendang Nyi Gendrosari. Beliau tidak suka ditiru.');
  yield DO(() => addNote('Jangan mendaki memakai pakaian hijau muda (warna selendang Nyi Gendrosari).'));
  yield SAY('Mbah Karto', 'Kedua: jangan ambil apa pun dari jalur, sekecil apa pun.');
  yield DO(() => addNote('Jangan mengambil apa pun dari jalur pendakian.'));
  yield SAY('Mbah Karto', 'Ketiga: kalau ada yang memanggil namamu dari dalam hutan, jangan menoleh dan jangan menjawab.');
  yield DO(() => addNote('Jika ada yang memanggil namamu dari hutan, jangan menoleh dan jangan menjawab.'));
  yield DO(() => { cineTo(raka.x + 1.5, raka.y + 1.9, raka.z + 3.2, raka.x, raka.y + 1.3, raka.z, 2.6); });
  yield SAY('Bayu', 'Eh, Raka... jaketmu.');
  yield SAY('Dinda', 'Itu hijau muda, kan?');
  yield SAY('Raka', 'Aku cuma bawa jaket ini...');
  yield CHOICE(['Balik jaketnya, pakai sisi abu-abu', 'Tetap pakai. Cuma cerita orang tua.']);
  if (LASTCHOICE === 0) {
    S.flags.jaketDibalik = true; raka.p.topMat.color.setHex(0x8a8f96); saveGame();
    yield DO(() => frame2(raka, mbah, 4.4, 1, 1.6));
    yield SAY('Mbah Karto', 'Bagus. Sisi dalamnya aman. Tapi jangan sampai terbuka.');
  } else {
    S.flags.jaketHijau = true; saveGame();
    yield DO(() => frame2(raka, mbah, 4.4, 1, 1.6));
    yield SAY('Mbah Karto', '...Kalau begitu, jangan bilang Mbah tidak memperingatkan.');
    yield SAY('Raka', 'Cuma mitos kok, Mbah.');
    yield SAY('Dinda', 'Raka...');
  }
  yield DO(() => { followCam(); ctrl = 'walk'; dinda.follow = true; bayu.follow = true; dinda.watch = bayu.watch = false; setObj('Ambil senter di meja pos jaga.'); });
  const TB = { x: HUT.x + 0.3, z: HUT.z - 0.6 };
  yield ACTION('Ambil senter', TB.x, TB.z, 1.9);
  yield DO(() => { ctrl = 'none'; resetInput(); setObj(''); S.items.push('Senter'); saveGame(); if (window.__senter) window.__senter.visible = false; sfx.chime(); toast('Mendapat: Senter 🔦'); });
  yield T(1.2);
  yield DO(() => { dinda.follow = false; bayu.follow = false; faceTo(raka, mbah.x, mbah.z); dinda.watch = bayu.watch = true; frame2(raka, mbah, 4.6, -1, 1.6); });
  yield SAY('Mbah Karto', 'Bawa ini juga. Bunga sesajen kecil. Kalau kalian sampai di petilasan, letakkan dengan hormat.');
  yield DO(() => { S.items.push('Bunga sesajen'); saveGame(); sfx.chime(); toast('Mendapat: Bunga sesajen 🌼'); });
  yield SAY('Mbah Karto', 'Hati-hati, Nak. Gunung ini baik pada yang tahu diri.');
  const GX = trailX(-23), GZ = -23;
  yield DO(() => { followCam(); ctrl = 'walk'; dinda.follow = true; bayu.follow = true; dinda.watch = bayu.watch = false; setObj('Berjalan ke gapura jalur pendakian.'); });
  yield GOTO(GX, GZ, 2.4);
  yield DO(() => { ctrl = 'none'; resetInput(); setObj(''); dinda.follow = false; bayu.follow = false; place(dinda, GX - 1.8, GZ + 1.8, Math.PI); place(bayu, GX + 1.8, GZ + 2.0, Math.PI); faceTo(raka, GATE.x, GATE.z - 8); raka.face = Math.PI; cineTo(GX + 0.5, raka.y + 1.6, GZ + 4.4, GATE.x, 3.2, GATE.z - 4, 1.6); });
  yield MOOD('night', 7);
  yield SAY('Narator', 'Langit padam. Kabut menebal di antara batang-batang jati. Tak ada suara selain angin.');
  yield DO(() => sfx.voice());
  yield T(1.8);
  yield SAY('Suara', '(samar, dari dalam hutan) ...Raka...');
  yield SAY('Dinda', 'Kamu dengar itu?');
  yield SAY('Bayu', 'Angin doang. Ayo jalan.');
  yield SAY('Raka', '(Catatanku... jangan menoleh. Jangan menjawab.)');
  yield CHOICE(['Menjawab: "Siapa di sana?"', 'Diam dan terus melangkah']);
  if (LASTCHOICE === 0) {
    S.flags.menjawab = true; saveGame();
    yield DO(() => sfx.voice());
    yield T(1.2);
    yield SAY('Suara', '(lebih dekat) ...Raka... kemarilah...');
    yield SAY('Bayu', 'Kamu ngomong sama siapa?');
    yield SAY('Narator', 'Sesuatu di dalam hutan telah tahu ke mana kalian akan pergi.');
  } else {
    S.flags.diam = true; saveGame();
    yield T(1.2);
    yield SAY('Narator', 'Suara itu berhenti. Entah kenapa, sunyi setelahnya terasa jauh lebih menakutkan.');
  }
  yield FADE(true, 2);
  yield CARD('Bersambung...', 'Bab 2: Pendakian Sore', 4);
  state = 'end'; ctrl = 'none';
  showPanel('<div class="board"><h1>Bab 1 selesai</h1><h2>Selendang Hijau</h2><p>Ini prototipe Bab 1. Bab 2 sampai 6 menyusul. Pilihanmu (jaket dan suara itu) sudah tersimpan untuk bab berikutnya.</p><button class="cta" data-do="new">Main lagi</button></div>');
}

/* =====================  ALUR APLIKASI  ===================== */
let state = 'title';
function showTitle() {
  state = 'title'; ctrl = 'none'; SCRIPT = null; WAIT = null; dlgHide(); setObj('');
  el.choices.classList.remove('on'); el.card.classList.remove('on'); el.act.classList.remove('on');
  el.fade.style.transition = 'none'; el.fade.style.opacity = '0';
  setMood('dusk');
  place(raka, START.x, START.z, Math.PI); place(dinda, START.x - 1.7, START.z + 2.0, Math.PI); place(bayu, START.x + 1.8, START.z + 2.6, Math.PI); place(mbah, MK.x, MK.z, 0); faceTo(mbah, START.x, START.z);
  cineTo(START.x + 6, 3.4, START.z + 8, 0, 12, -50, 3); snapCam();
  showPanel('<div class="board"><h1>Selendang Hijau</h1><h2>Horor Gunung Pandan</h2><p>Tiga pendaki, satu larangan yang dilanggar. Cerita fiksi berlatar legenda Gunung Pandan, Bojonegoro. Pakai earphone dan putar HP ke mendatar.</p><button class="cta" data-do="new">Mulai Bab 1</button></div>');
}
function startBab1() {
  resetInput(); hidePanel(); S.flags = {}; S.notes = []; S.items = []; state = 'play';
  el.fade.style.transition = 'none'; el.fade.style.opacity = '1';
  startScript(bab1());
}
el.panel.addEventListener('click', e => {
  auInit();
  const b = e.target.closest ? e.target.closest('[data-do]') : null; if (!b) return;
  const a = b.dataset.do;
  if (a === 'new') startBab1();
  else if (a === 'resume') { hidePanel(); state = 'play'; }
  else if (a === 'menu') showTitle();
});
function pauseGame() {
  if (state !== 'play') return;
  state = 'pause'; resetInput();
  showPanel('<div class="board"><h1>Dijeda</h1><p>Hutan menunggu dengan sabar.</p><button class="cta" data-do="resume">Lanjut</button><button class="cta alt" data-do="menu">Ke menu</button></div>');
}
$('#pauseBtn').addEventListener('click', pauseGame);
$('#muteBtn').addEventListener('click', () => { auInit(); AU.on = !AU.on; if (AU.master) AU.master.gain.value = AU.on ? 0.6 : 0; $('#muteBtn').textContent = AU.on ? '🔊' : '🔇'; });
$('#noteBtn').addEventListener('click', () => {
  el.noteList.innerHTML = S.notes.length ? S.notes.map(n => '<li>' + n + '</li>').join('') : '<li>Belum ada catatan.</li>';
  el.notes.classList.add('on');
});
$('#noteClose').addEventListener('click', () => el.notes.classList.remove('on'));
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
let ignoreRot = false;
$('#rotStay').addEventListener('click', () => { ignoreRot = true; el.rot.classList.remove('on'); });

/* =====================  UPDATE & LOOP  ===================== */
const vel = { x: 0, z: 0 };
let stepT = 0, clock = 0, avg = 0, avgN = 0;
function updatePlayer(dt) {
  let mx = 0, my = 0;
  if (ctrl === 'walk') {
    mx = mv.x; my = mv.y;
    if (keys.w || keys.arrowup) my += 1; if (keys.s || keys.arrowdown) my -= 1; if (keys.a || keys.arrowleft) mx -= 1; if (keys.d || keys.arrowright) mx += 1;
  }
  const len = Math.hypot(mx, my); if (len > 1) { mx /= len; my /= len; }
  const sy = Math.sin(camYaw), cy = Math.cos(camYaw);
  const tvx = (-sy * my + cy * mx) * 3.4, tvz = (-cy * my - sy * mx) * 3.4;
  const k = Math.min(1, dt * 9);
  vel.x += (tvx - vel.x) * k; vel.z += (tvz - vel.z) * k;
  const c = collide(raka.x + vel.x * dt, raka.z + vel.z * dt, 0.35, raka);
  raka.x = c[0]; raka.z = c[1];
  const sp = Math.hypot(vel.x, vel.z);
  raka.moving = sp > 0.6;
  if (raka.moving) raka.face += angDiff(Math.atan2(vel.x, vel.z) - raka.face) * Math.min(1, dt * 10);
  if (raka.moving && clock - stepT > 0.48) { stepT = clock; sfx.step(); }
}
function updateGoal(t) {
  if (!goal) { beam.visible = false; return; }
  beam.visible = true;
  beam.position.set(goal.x, groundY(goal.x, goal.z) + 3.5, goal.z); beam.scale.set(1 + 0.15 * Math.sin(t * 3), 1, 1 + 0.15 * Math.sin(t * 3));
  const d = Math.hypot(raka.x - goal.x, raka.z - goal.z);
  if (d <= goal.r) { if (goal.label) { el.act.textContent = goal.label; el.act.classList.add('on'); } else goal.done = true; }
  else el.act.classList.remove('on');
}
function autoPlay() {
  if (DLG.on && DLG.finished) DLG.tapped = true;
  if (el.choices.classList.contains('on')) LASTCHOICE = window.__CHOICE || 0;
  if (goal && !goal.done) { raka.x = goal.x; raka.z = goal.z; if (goal.label) { el.act.classList.add('on'); doAction(); } }
}
function update(dt) {
  clock += dt;
  if (window.__AUTO) autoPlay();
  stepScript(dt); dlgUpdate(dt);
  if (state === 'play') { updatePlayer(dt); }
  updateGoal(clock);
}
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const raw = Math.max(0, (now - last) / 1000), dt = Math.min(0.05, raw); last = now;
  const portrait = window.innerHeight > window.innerWidth * 1.02;
  el.rot.classList.toggle('on', portrait && !ignoreRot && state === 'play');
  if (state === 'play' && !(portrait && !ignoreRot)) update(dt);
  else if (state === 'title') clock += dt;
  updateActors(dt, clock);
  updateCamera(dt);
  // matahari/bulan dan bayangan mengikuti pemain
  dir.position.set(raka.x + LIGHT_DIR[0] * 60, raka.y + LIGHT_DIR[1] * 60, raka.z + LIGHT_DIR[2] * 60);
  dir.target.position.set(raka.x, raka.y, raka.z);
  sky.position.set(camera.position.x, camera.position.y, camera.position.z);
  for (const l of lamps) l.l.intensity = l.base * (0.93 + 0.07 * Math.sin(clock * 11) + (Math.random() < 0.02 ? -0.15 : 0));
  flies.rotation.y += dt * 0.05; flies.position.y = Math.sin(clock * 0.8) * 0.15;
  renderer.render(scene, camera);
  if (raw > 0 && raw < 0.5) {
    avg += raw; avgN++;
    if (avgN >= 60) {
      if (avg / avgN > 0.045) { if (PR > 0.9) { PR = Math.max(0.75, PR - 0.25); renderer.setPixelRatio(PR); resize(); } else if (renderer.shadowMap.enabled) { renderer.shadowMap.enabled = false; dir.castShadow = false; } }
      avg = 0; avgN = 0;
    }
  }
}
if (window.__DEBUG) window.__dbg = { S, raka, dinda, bayu, mbah, ACT, get state() { return state; }, get goal() { return goal; }, DLG, get ctrl() { return ctrl; }, camera };
showTitle();
requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });
