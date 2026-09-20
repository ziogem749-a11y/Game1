import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

/* =====================================================================
   SELENDANG HIJAU  -  Bab 1: Kaki Gunung
   Game horor 3D (Three.js) berlatar legenda Gunung Pandan, Bojonegoro.
   Semua tokoh fiksi.
   ===================================================================== */

const $ = s => document.querySelector(s);
// Bahan Lambert jauh lebih ringan daripada Standard di HP; roughness/metalness tidak dipakai.
function LMat(p) { const q = Object.assign({}, p); delete q.roughness; delete q.metalness; return new THREE.MeshLambertMaterial(q); }
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
const PR_HI = Math.min(window.devicePixelRatio || 1, 1.5), PR_MAX = Math.min(window.devicePixelRatio || 1, 1.25);
let QUAL = 'auto'; try { QUAL = localStorage.getItem('sh_qual') || 'auto'; } catch (e) { }
let PR = QUAL === 'low' ? 0.75 : (QUAL === 'high' ? PR_HI : PR_MAX);
renderer.setPixelRatio(PR);
renderer.shadowMap.enabled = QUAL === 'high';
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x6a4a52, 0.016);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 520);
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
dir.castShadow = QUAL === 'high';
dir.shadow.mapSize.set(1024, 1024);
dir.shadow.camera.left = -22; dir.shadow.camera.right = 22; dir.shadow.camera.top = 22; dir.shadow.camera.bottom = -22;
dir.shadow.camera.near = 1; dir.shadow.camera.far = 140; dir.shadow.camera.updateProjectionMatrix();
dir.shadow.bias = -0.0006; dir.shadow.normalBias = 0.04;
scene.add(dir); scene.add(dir.target);

let BRIGHT = 1; try { BRIGHT = parseFloat(localStorage.getItem('sh_bright')) || 1; } catch (e) { }
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
  renderer.toneMappingExposure = lerp(a.exp, b.exp, t) * BRIGHT;
  envApply(a, b, t);
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
  const m = clamp((-z - 34) / 90, 0, 1);
  return h * flat + m * m * 46 + m * 8 * flat;
}
function groundY(x, z) {
  if (x > 400) return 0;
  const inHut = Math.abs(x - HUT.x) < 2.6 && Math.abs(z - HUT.z) < 2.1;
  return terrainH(x, z) + (inHut ? 0.3 : 0);
}

const stdMats = {};
function M(color, opts) {
  const key = color + (opts ? JSON.stringify(opts) : '');
  if (!stdMats[key]) stdMats[key] = LMat(Object.assign({ color, roughness: 1, metalness: 0, flatShading: true }, opts || {}));
  return stdMats[key];
}
function addBox(parent, w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}

const PEAKS = [];   // kerucut gunung polos (disembunyikan bila gunung.glb termuat)
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
  const t = new THREE.Mesh(g, LMat({ vertexColors: true, roughness: 1, flatShading: true }));
  t.receiveShadow = true; scene.add(t);
  // siluet puncak gunung di kejauhan
  const peak = new THREE.Mesh(new THREE.ConeGeometry(80, 120, 7), LMat({ color: 0x1b2233, roughness: 1, flatShading: true }));
  peak.position.set(-10, 60, -190); scene.add(peak); PEAKS.push(peak);
})();

(function buildTrail() {
  const pos = [], idx = [], N = 170, w = 1.7;
  for (let i = 0; i <= N; i++) {
    const z = 20 - i * 1.0, cx = trailX(z);
    pos.push(cx - w, terrainH(cx - w, z) + 0.06, z, cx + w, terrainH(cx + w, z) + 0.06, z);
  }
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, LMat({ color: 0x6b5237, roughness: 1, flatShading: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.receiveShadow = true; scene.add(m);
})();

/* ---------- tumbukan ---------- */
const circles = [];
const boxes = [];
const TREE_SPOTS = [], BLOBS = [];   // titik pohon dunia + pohon 'bulat' cadangan (disembunyikan bila pohon asli termuat)
const BOUNDS = { x0: -33, x1: 33, z0: -24.5, z1: 24 };
function collide(x, z, r, self) {
  x = clamp(x, BOUNDS.x0, BOUNDS.x1); z = clamp(z, BOUNDS.z0, BOUNDS.z1);
  if (CORR.mode === 'trail') { const cx = trailX(z); x = cx + clamp(x - cx, -CORR.w, CORR.w); }
  else if (CORR.mode === 'poly' && CORR.pts) { const q = nearOnPoly(CORR.pts, x, z), d = Math.hypot(x - q[0], z - q[1]); if (d > CORR.w) { x = q[0] + (x - q[0]) / d * CORR.w; z = q[1] + (z - q[1]) / d * CORR.w; } }
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
  if (z <= -32 && z > -150 && Math.abs(x - trailX(z)) < 22) return true;
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
  const trunks = new THREE.InstancedMesh(trunkG, LMat({ color: 0x4a3826, roughness: 1, flatShading: true }), spots.length);
  const crowns = new THREE.InstancedMesh(crownG, LMat({ color: 0xffffff, roughness: 1, flatShading: true }), spots.length);
  const crowns2 = new THREE.InstancedMesh(crown2G, LMat({ color: 0xffffff, roughness: 1, flatShading: true }), spots.length);
  const o = new THREE.Object3D(), col = new THREE.Color();
  spots.forEach((s, i) => {
    const sc = rr(0.8, 1.5);
    o.position.set(s[0], terrainH(s[0], s[1]) - 0.1, s[1]); o.rotation.set(0, rr(0, 6.28), 0); o.scale.set(sc, sc * rr(0.9, 1.15), sc); o.updateMatrix();
    trunks.setMatrixAt(i, o.matrix); crowns.setMatrixAt(i, o.matrix); crowns2.setMatrixAt(i, o.matrix);
    col.setHex(0x2f4a2a).lerp(new THREE.Color(0x4a5e2e), R()); crowns.setColorAt(i, col); crowns2.setColorAt(i, col);
    let cc = null; if (Math.abs(s[0]) < 36 && s[1] > -32 && s[1] < 27) { cc = { x: s[0], z: s[1], r: 0.55 * sc }; circles.push(cc); }
    TREE_SPOTS.push({ x: s[0], z: s[1], c: cc });
  });
  [trunks, crowns, crowns2].forEach(m => { m.frustumCulled = false; m.castShadow = false; scene.add(m); BLOBS.push(m); });

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
  const pm = new THREE.InstancedMesh(pg, LMat({ color: 0x5d8a36, side: THREE.DoubleSide, roughness: 0.9, flatShading: true }), pand.length);
  pand.forEach((s, i) => {
    const sc = rr(0.8, 1.6);
    o.position.set(s[0], terrainH(s[0], s[1]), s[1]); o.rotation.set(0, rr(0, 6.28), 0); o.scale.set(sc, sc, sc); o.updateMatrix();
    pm.setMatrixAt(i, o.matrix);
  });
  pm.frustumCulled = false; scene.add(pm);

  // batu
  const rg = new THREE.DodecahedronGeometry(0.6, 0);
  const rocks = new THREE.InstancedMesh(rg, LMat({ color: 0x555049, roughness: 1, flatShading: true }), 40);
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
  const sen = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.3, 8), LMat({ color: 0x2a2a2a, emissive: 0xffe9a0, emissiveIntensity: 0.6 }));
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
  const topMat = LMat({ color: o.top, roughness: 1, flatShading: true });
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
// ---- pendamping (Dinda & Bayu): arah gerak pemain dihaluskan, dipakai untuk menaruh mereka di samping/depan ----
const PH = { hx: 0, hz: -1, sp: 0, idleT: 0 };
// Sifat tiap pendamping: 'far' = jarak dari pemain sebelum mulai menyusul, 'near' = jarak berhenti,
// 'spd' = kecepatan relatif terhadap pemain, 'react' = jeda sebelum mulai berjalan, 'roam' = radius berkeliaran saat pemain diam.
const PERS = { Dinda: { far: 4.8, near: 2.9, spd: 0.9, react: 0.8, roam: 3.0 }, Bayu: { far: 4.2, near: 2.3, spd: 0.97, react: 0.4, roam: 4.0 } };
function followLoose(a, dt, t) {
  const P = PERS[a.name] || { far: 4.5, near: 2.5, spd: 0.92, react: 0.7, roam: 3 };
  if (a.fs === undefined) { a.fs = 'idle'; a.rt = 0.5; a.wT = 1 + Math.random() * 2; a.lookT = 1; a.fj = 1; a.so = 1.5; a.bo = 1.5; }
  const dx = raka.x - a.x, dz = raka.z - a.z, dp = Math.hypot(dx, dz);
  if (a.fs === 'idle') {
    if (dp > P.far * a.fj) {
      a.rt -= dt * (dp > 7 ? 5 : 1);                // jeda dulu sebelum menyusul, seperti orang sungguhan (kalau sudah sangat jauh, langsung menyusul)
      if (a.rt <= 0) { a.fs = 'walk'; a.so = (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 2.0); a.bo = -0.5 + Math.random() * 3.2; a.tx = null; }
    } else {
      a.rt = P.react * (0.6 + Math.random() * 0.8);
      a.wT -= dt;                                   // dekat pemain: berdiri, kadang bergeser pelan
      if (a.tx === null && a.wT <= 0) {
        const ang = Math.random() * 6.283, r = 1.5 + Math.random() * (P.roam - 1.5);
        a.tx = raka.x + Math.cos(ang) * r; a.tz = raka.z + Math.sin(ang) * r; a.spd = 0.9; a.wT = 4 + Math.random() * 6;
      }
    }
    a.lookT -= dt;                                  // sesekali menoleh ke sekitar atau ke pemain
    if (a.lookT <= 0) { a.lookYaw = Math.random() < 0.5 ? Math.atan2(dx, dz) : a.face + (Math.random() - 0.5) * 3.0; a.lookT = 2 + Math.random() * 4; }
  } else {
    a.lookYaw = undefined;
    const fx = PH.hx, fz = PH.hz;
    a.tx = raka.x + (-fz) * a.so - fx * a.bo; a.tz = raka.z + fx * a.so - fz * a.bo;   // menuju sekitar pemain, bukan tepat di belakangnya
    a.spd = clamp(PH.sp * P.spd + Math.max(0, dp - P.near) * 0.6, 1.0, 5.2);
    if (dp < P.near || Math.hypot(a.tx - a.x, a.tz - a.z) < 0.5) { a.fs = 'idle'; a.tx = null; a.wT = 1.5 + Math.random() * 3; a.fj = 0.8 + Math.random() * 0.5; a.rt = P.react; }
  }
}
function updateHeading(dt) {
  const sp = Math.hypot(vel.x, vel.z); PH.sp = sp;
  if (sp > 0.8) {
    const k = Math.min(1, dt * 3); PH.hx += (vel.x / sp - PH.hx) * k; PH.hz += (vel.z / sp - PH.hz) * k;
    const l = Math.hypot(PH.hx, PH.hz) || 1; PH.hx /= l; PH.hz /= l; PH.idleT = 0;
  } else PH.idleT += dt;
}
function updateActors(dt, t) {
  updateHeading(dt);
  for (const a of ACT) {
    if (!a.g.visible) continue;
    if (a !== raka) {
      a.moving = false;
      if (a.follow) followLoose(a, dt, t);
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
      } else if (a.follow && a.lookYaw !== undefined) {
        a.face += angDiff(a.lookYaw - a.face) * Math.min(1, dt * 1.3);   // menoleh santai saat berdiri
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
    if (a.mixer) {
      const want = (a.moving && a.acts.walk) ? 'walk' : 'idle';
      if (want !== a.cur && a.acts[want]) { const from = a.acts[a.cur], to = a.acts[want]; to.reset().play(); if (from) from.crossFadeTo(to, 0.25, false); a.cur = want; }
      if (a.acts.walk && a.cur === 'walk') a.acts.walk.timeScale = clamp((a === raka ? Math.hypot(vel.x, vel.z) : a.spd) / 1.7, 0.6, 2.3);
      a.mixer.update(dt);
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
  const gy = groundY(CAMS.p[0], CAMS.p[2]) + 0.6;
  let sx = 0, sy = 0;
  if (shakeT > 0) { const q = Math.min(shakeT, 1); sx = (Math.random() - 0.5) * q * 0.3; sy = (Math.random() - 0.5) * q * 0.22; shakeT = Math.max(0, shakeT - dt * 1.5); }
  camera.position.set(CAMS.p[0] + sx, Math.max(CAMS.p[1], gy) + sy, CAMS.p[2]);
  camera.lookAt(CAMS.l[0], CAMS.l[1], CAMS.l[2]);
}
function snapCam() { const r = cineOn ? cineOn.rate : 0; if (cineOn) cineOn.rate = 100; for (let i = 0; i < 8; i++) updateCamera(0.5); if (cineOn) cineOn.rate = r; }

/* =====================  SUARA  ===================== */
const AU = { ctx: null, master: null, noise: null, on: true, dread: null };
function auInit() {
  try {
    if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = AU.ctx = new AC();
    AU.master = c.createGain(); AU.master.gain.value = AU.on ? 0.6 : 0; AU.master.connect(c.destination);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    AU.noise = nb;
    const dg = c.createGain(); dg.gain.value = 0; const d1 = c.createOscillator(); d1.type = 'sawtooth'; d1.frequency.value = 38; const df = c.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 90; d1.connect(df); df.connect(dg); dg.connect(AU.master); d1.start(); AU.dread = dg;
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
const S = { flags: {}, notes: [], items: [], finds: [] };
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
  if (ctrl === 'look') { if (lookId === null) { lookId = e.pointerId; lookP = { x: e.clientX, y: e.clientY }; } return; }
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
function CHOICE(opts, secs) {
  let k = 0;
  return {
    init() {
      el.choices.innerHTML = ''; LASTCHOICE = -1;
      opts.forEach((t, i) => { const b = document.createElement('button'); b.textContent = t; b.addEventListener('pointerdown', ev => { ev.preventDefault(); LASTCHOICE = i; }); el.choices.appendChild(b); });
      el.choices.classList.add('on');
    },
    test: dt => { if (LASTCHOICE >= 0) return true; if (secs) { k += dt; if (k >= secs) return true; } return false; },
    done() { el.choices.classList.remove('on'); }
  };
}
let goal = null;
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 7, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.32, depthWrite: false, fog: false, side: THREE.DoubleSide }));
beam.visible = false; scene.add(beam);
function GOTO(x, z, r, quiet) { const g = { x, z, r, label: null, done: false, quiet: !!quiet }; return { init() { goal = g; }, test: () => g.done, done() { goal = null; el.act.classList.remove('on'); } }; }
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
    S.flags.jaketDibalik = true; setRakaTop(0x8a8f96); saveGame();
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
  yield* bab2();
}

/* =====================  BAB 2: TATA LETAK & SISTEM DASAR  ===================== */
const POS1 = { z: -46 }; POS1.x = trailX(POS1.z) + 5.4;          // Pos 1 (pondok di kanan jalur)
const MTREE = { z: -52 }; MTREE.x = trailX(MTREE.z) - 2.6;        // pohon tempat Bayu mengikat pita merah
const SIDE0 = { z: -72 }; SIDE0.x = trailX(SIDE0.z) - 3.2;        // awal jalan setapak samping (kiri jalur)
const SIDE = [[-5, -3], [-11, -4], [-17, -8], [-22, -14], [-26, -20], [-29, -27]].map(p => [SIDE0.x + p[0], SIDE0.z + p[1]]);
function nearOnPoly(pts, x, z) {
  let best = null, bd = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1), qx = a[0] + dx * t, qz = a[1] + dz * t, d = Math.hypot(x - qx, z - qz);
    if (d < bd) { bd = d; best = [qx, qz]; }
  }
  return best || [pts[0][0], pts[0][1]];
}
const CORR = { mode: 'none', w: 3.4, pts: null };
let darkK = 0;
MOODS.deep = { top: C(0x05070f), fog: C(0x0a0f18), glow: C(0x101a2a), sun: C(0x5f74a8), fogD: 0.043, hemiSky: C(0x3a4a70), hemiGnd: C(0x0a0c10), hemiI: 0.55, dirCol: C(0x6f86c8), dirI: 0.55, exp: 1.15 };
MOODS.petil = { top: C(0x061014), fog: C(0x0b1614), glow: C(0x123a30), sun: C(0x7fe0c0), fogD: 0.036, hemiSky: C(0x3a6a58), hemiGnd: C(0x0a1410), hemiI: 0.5, dirCol: C(0x7fcfb0), dirI: 0.35, exp: 1.2 };
Object.assign(sfx, {
  heart(k) { tone(58, 0.22, 'sine', 0.35 * k + 0.08, 38); },
  sting() { tone(1400, 0.9, 'sawtooth', 0.07, 900); tone(1480, 0.9, 'square', 0.05, 950, 0.02); noiseBurst(0.7, 0.14, 2500); },
  snap() { noiseBurst(0.05, 0.2, 3000); tone(900, 0.04, 'square', 0.04); },
  whisper() { noiseBurst(1.5, 0.09, 1800); tone(310, 1.3, 'sine', 0.03, 220); tone(660, 1.2, 'sine', 0.02, 520, 0.15); },
  stepsBehind(n, vol) { for (let i = 0; i < n; i++) setTimeout(() => noiseBurst(0.09, 0.12 * (vol || 0.5), 480), i * (480 + (i % 3) * 90)); },
  hum() { [392, 370, 330, 349, 330, 294].forEach((f, i) => tone(f, 0.75, 'sine', 0.05, null, i * 0.8)); },
  owl() { tone(380, 0.5, 'sine', 0.1, 320); tone(360, 0.6, 'sine', 0.1, 300, 0.7); }
});
function resetWorld() {
  TIMERS.length = 0; setB2Lights(false); CORR.mode = 'none'; CORR.pts = null;
  BOUNDS.x0 = -33; BOUNDS.x1 = 33; BOUNDS.z0 = -24.5; BOUNDS.z1 = 24;
  clearing.visible = false; hideFig(); wispS.on = false; wisp.visible = false; dLamp.visible = false; brace.visible = false; braceGlow.visible = false;
  showTapes(0); scarfMesh.visible = true; bayuScarf.visible = false; dindaScarf.visible = false; photoMesh.visible = true;
  fear = 0; fearBase = 0; darkK = 0; shakeT = 0; fearEl.style.opacity = '0';
  setRakaTop(0xb6e3a0);
}
function startBab2() {
  resetInput(); hidePanel(); resetWorld();
  if (!S.finds) S.finds = []; S.finds.length = 0;
  state = 'play'; el.fade.style.transition = 'none'; el.fade.style.opacity = '1';
  startScript(bab2());
}

/* =====================  DUNIA BAB 2: JALUR YANG BERBISIK  ===================== */
const lampMain = new THREE.PointLight(0xffa550, 0, 24, 2); lampMain.visible = false; scene.add(lampMain);
const spirit = new THREE.PointLight(0x7fffc0, 0, 16, 2); spirit.visible = false; scene.add(spirit);
const lampB = { l: lampMain, base: 0 }; lamps.push(lampB);
const flash = new THREE.SpotLight(0xfff0d0, 0, 38, 0.5, 0.65, 2); flash.visible = false; flash.castShadow = false;
scene.add(flash); scene.add(flash.target);

const glowTex = (function () {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(170,255,210,0.55)'); g.addColorStop(1, 'rgba(170,255,210,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
function mkGlow(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  s.scale.set(size, size, 1); return s;
}
function mkTreeGeos(scale) {
  const trunkG = new THREE.CylinderGeometry(0.16, 0.26, 5.5, 6); trunkG.translate(0, 2.75, 0);
  const crownG = new THREE.IcosahedronGeometry(2.1, 0); crownG.scale(1, 0.9, 1); crownG.translate(0, 6.4, 0);
  return [trunkG, crownG];
}
function mkPandanGeo() {
  const pos = [], idx = [], blades = 10;
  for (let b = 0; b < blades; b++) {
    const a = b / blades * Math.PI * 2 + rr(-0.2, 0.2), len = rr(1.3, 2.1), lift = rr(0.9, 1.4), w = 0.16, seg = 4, base = pos.length / 3;
    for (let s = 0; s <= seg; s++) {
      const t = s / seg, r = len * t, y = 0.15 + lift * t * (1.25 - t) * 1.3, wd = w * (1 - t * 0.85);
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r, px = -Math.sin(a) * wd, pz = Math.cos(a) * wd;
      pos.push(cx - px, y, cz - pz, cx + px, y, cz + pz);
    }
    for (let s = 0; s < seg; s++) { const i = base + s * 2; idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); }
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pg.setIndex(idx); pg.computeVertexNormals();
  return pg;
}

/* hutan lebat di kiri-kanan jalur */
(function buildTrailForest() {
  const g2 = mkTreeGeos(), spots = [];
  for (let z = -30; z > -138; z -= 1.4) {
    [-1, 1].forEach(sd => { if (R() < 0.88) spots.push([trailX(z) + sd * (4.5 + R() * 3.8), z + rr(-0.6, 0.6)]); });
    if (R() < 0.4) spots.push([trailX(z) + (R() < 0.5 ? -1 : 1) * (9 + R() * 7), z]);
  }
  const ok = spots.filter(s => {
    const q = nearOnPoly([[SIDE0.x, SIDE0.z]].concat(SIDE), s[0], s[1]);
    if (Math.hypot(s[0] - q[0], s[1] - q[1]) < 4.6) return false;
    if (Math.hypot(s[0] - POS1.x, s[1] - POS1.z) < 4.6) return false;
    if (Math.hypot(s[0] - MTREE.x, s[1] - MTREE.z) < 1.6) return false;
    if (Math.hypot(s[0] - trailX(-66) - 1.9, s[1] + 66) < 2.4) return false;
    return true;
  });
  const trunks = new THREE.InstancedMesh(g2[0], LMat({ color: 0x3a2b1c, roughness: 1, flatShading: true }), ok.length);
  const crowns = new THREE.InstancedMesh(g2[1], LMat({ color: 0xffffff, roughness: 1, flatShading: true }), ok.length);
  const o = new THREE.Object3D(), col = new THREE.Color();
  ok.forEach((s, i) => {
    const sc = rr(0.9, 1.7); TREE_SPOTS.push({ x: s[0], z: s[1], c: null });
    o.position.set(s[0], terrainH(s[0], s[1]) - 0.1, s[1]); o.rotation.set(0, rr(0, 6.28), 0); o.scale.set(sc, sc * rr(0.9, 1.3), sc); o.updateMatrix();
    trunks.setMatrixAt(i, o.matrix); crowns.setMatrixAt(i, o.matrix);
    col.setHex(0x22391f).lerp(new THREE.Color(0x3a4a26), R()); crowns.setColorAt(i, col);
  });
  [trunks, crowns].forEach(m => { m.frustumCulled = false; scene.add(m); BLOBS.push(m); });
  // semak pandan di tepi jalur
  const pg = mkPandanGeo(), pand = [];
  for (let n = 0; n < 500 && pand.length < 80; n++) {
    const z = rr(-135, -30), sd = R() < 0.5 ? -1 : 1, x = trailX(z) + sd * rr(2.3, 6.5);
    const q = nearOnPoly([[SIDE0.x, SIDE0.z]].concat(SIDE), x, z);
    if (Math.hypot(x - q[0], z - q[1]) < 2.4) continue;
    pand.push([x, z]);
  }
  const pm = new THREE.InstancedMesh(pg, LMat({ color: 0x4f7a30, side: THREE.DoubleSide, roughness: 0.9, flatShading: true }), pand.length);
  pand.forEach((s, i) => { const sc = rr(0.8, 1.5); o.position.set(s[0], terrainH(s[0], s[1]), s[1]); o.rotation.set(0, rr(0, 6.28), 0); o.scale.set(sc, sc, sc); o.updateMatrix(); pm.setMatrixAt(i, o.matrix); });
  pm.frustumCulled = false; scene.add(pm);
})();

/* jalur samping menuju petilasan */
(function buildSidePath() {
  const pts = [[SIDE0.x, SIDE0.z]].concat(SIDE), pos = [], idx = [], w = 0.9;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const nx = -dz, nz = dx, x = pts[i][0], z = pts[i][1];
    pos.push(x - nx * w, terrainH(x - nx * w, z - nz * w) + 0.06, z - nz * w, x + nx * w, terrainH(x + nx * w, z + nz * w) + 0.06, z + nz * w);
  }
  for (let i = 0; i < pts.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, LMat({ color: 0x3e3020, roughness: 1, flatShading: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.receiveShadow = true; scene.add(m);
})();

/* Pos 1 */
let posPaper = null;
(function buildPos1() {
  const y = terrainH(POS1.x, POS1.z), g = new THREE.Group(); g.position.set(POS1.x, y, POS1.z); scene.add(g);
  const wood = 0x4d3a24, dark = 0x2e2216, thatch = 0x6a5c34;
  [[-1.7, -1.4], [1.7, -1.4], [-1.7, 1.4], [1.7, 1.4]].forEach(p => addBox(g, 0.16, 2.6, 0.16, dark, p[0], 1.3, p[1]));
  addBox(g, 3.8, 0.12, 3.1, wood, 0, 0.06, 0);
  const r1 = addBox(g, 4.3, 0.12, 2.2, thatch, 0, 2.95, 0.95); r1.rotation.x = 0.4;
  const r2 = addBox(g, 4.3, 0.12, 2.2, thatch, 0, 2.95, -0.95); r2.rotation.x = -0.4;
  addBox(g, 0.12, 1.2, 3.0, wood, 1.75, 1.0, 0);
  addBox(g, 0.5, 0.1, 2.4, wood, 1.35, 0.55, 0);
  addBox(g, 0.4, 0.5, 2.4, dark, 1.35, 0.3, 0);
  posPaper = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), LMat({ color: 0xe6dcbc, emissive: 0x5a5030, emissiveIntensity: 0.6, roughness: 1, side: THREE.DoubleSide }));
  posPaper.rotation.x = -Math.PI / 2; posPaper.position.set(1.3, 0.62, 0.3); g.add(posPaper);
  // papan nama di tepi jalur
  const sx = trailX(POS1.z) + 2.3;
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.9, 0.14), M(dark)); post.position.set(sx, terrainH(sx, POS1.z) + 0.95, POS1.z + 0.5); scene.add(post);
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.7), new THREE.MeshBasicMaterial({ map: signTexture(['POS 1', 'G. Pandan 1,2 km'], 512, 240, '#33291b') }));
  sg.position.set(sx, terrainH(sx, POS1.z) + 1.7, POS1.z + 0.6); sg.rotation.y = 0.35; scene.add(sg);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb060 })); bulb.position.set(-0.6, 2.3, 0); g.add(bulb);
  POS1.lampY = y + 2.3; POS1.lampX = POS1.x - 0.6;
  const X = POS1.x, Z = POS1.z;
  boxes.push({ x0: X + 1.05, x1: X + 1.65, z0: Z - 1.2, z1: Z + 1.2 });
  [[-1.7, -1.4], [1.7, -1.4], [-1.7, 1.4], [1.7, 1.4]].forEach(p => circles.push({ x: X + p[0], z: Z + p[1], r: 0.2 }));
})();
POS1.read = { x: POS1.x - 0.6, z: POS1.z + 0.4 };

/* pohon penanda + pita merah */
const tapes = [];
(function buildMarkerTree() {
  const y = terrainH(MTREE.x, MTREE.z), g = new THREE.Group(); g.position.set(MTREE.x, y, MTREE.z); scene.add(g);
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 4.6, 7), M(0x3a2b1c)); t.position.y = 2.3; t.castShadow = true; g.add(t);
  const c = new THREE.Mesh(new THREE.IcosahedronGeometry(2.0, 0), LMat({ color: 0x24391f, roughness: 1, flatShading: true })); c.position.y = 5.4; g.add(c); BLOBS.push(c);
  for (let i = 0; i < 4; i++) {
    const a = -1.2 - i * 0.7, tp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.05), LMat({ color: 0xd11a1a, emissive: 0x550808, roughness: 1 }));
    tp.position.set(Math.cos(a) * 0.36, 1.5 + i * 0.22, Math.sin(a) * 0.36 * -1); tp.rotation.y = -a + Math.PI / 2; tp.visible = false; g.add(tp); tapes.push(tp);
  }
  circles.push({ x: MTREE.x, z: MTREE.z, r: 0.5 });
})();
function showTapes(n) { tapes.forEach((t, i) => { t.visible = i < n; }); }

/* selendang di ranting */
function mkScarf(w, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 1, 6), LMat({ color: 0xbfeec4, emissive: 0x6fcf8f, emissiveIntensity: 0.75, roughness: 1, side: THREE.DoubleSide, flatShading: true }));
  return m;
}
const SCARF = { x: trailX(-66) + 1.9, z: -66 };
const scarfTree = new THREE.Group(); scarfTree.position.set(SCARF.x, terrainH(SCARF.x, SCARF.z), SCARF.z); scene.add(scarfTree);
const scarfMesh = mkScarf(0.34, 1.3); scarfMesh.position.set(-0.55, 1.75, 0); scarfTree.add(scarfMesh);
(function () {
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 2.6, 5), M(0x2e2216)); t.position.y = 1.3; scarfTree.add(t);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.2, 4), M(0x2e2216)); b.rotation.z = Math.PI / 2 - 0.15; b.position.set(-0.55, 2.45, 0); scarfTree.add(b);
  scarfMesh.position.set(-1.0, 1.85, 0);
})();

/* gelang benang */
const BRACE = { x: trailX(-58) + 2.3, z: -58 };
const brace = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 12), LMat({ color: 0x7fe89f, emissive: 0x3fbf6f, emissiveIntensity: 0.9, roughness: 1 }));
brace.rotation.x = -Math.PI / 2 + 0.3; brace.position.set(BRACE.x, terrainH(BRACE.x, BRACE.z) + 0.16, BRACE.z); brace.visible = false; scene.add(brace);
const braceGlow = mkGlow(0x9fffbf, 1.0); braceGlow.position.copy(brace.position); braceGlow.visible = false; scene.add(braceGlow);

/* senter Dinda yang jatuh */
const dLamp = new THREE.Group(); dLamp.visible = false; scene.add(dLamp);
(function () {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.26, 8), LMat({ color: 0x8a2f3a, emissive: 0xffe9a0, emissiveIntensity: 0.7 })); c.rotation.z = Math.PI / 2; dLamp.add(c);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.2, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
  beam.rotation.z = -Math.PI / 2; beam.position.x = 2.3; dLamp.add(beam);
})();
{ const q = SIDE[0]; dLamp.position.set(SIDE0.x - 1.0, terrainH(SIDE0.x - 1.0, SIDE0.z + 0.5) + 0.14, SIDE0.z + 0.5); dLamp.rotation.y = Math.atan2(-(q[1] - SIDE0.z), q[0] - SIDE0.x) ; }

/* sosok berselendang */
const fig = (function () {
  const g = new THREE.Group(), dark = LMat({ color: 0x07090a, roughness: 1, flatShading: true });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  add(new THREE.CylinderGeometry(0.16, 0.42, 1.55, 8), dark, 0, 0.8, 0);
  add(new THREE.CylinderGeometry(0.2, 0.16, 0.5, 8), dark, 0, 1.7, 0);
  add(new THREE.SphereGeometry(0.15, 8, 6), LMat({ color: 0x151c19, roughness: 1 }), 0, 2.08, 0);
  const hair = add(new THREE.CapsuleGeometry(0.2, 1.15, 3, 8), dark, 0, 1.72, 0.1); hair.scale.set(1, 1, 0.55);
  add(new THREE.CapsuleGeometry(0.05, 0.9, 3, 6), dark, -0.27, 1.55, 0.06);
  add(new THREE.CapsuleGeometry(0.05, 0.9, 3, 6), dark, 0.27, 1.55, 0.06);
  const scarf = mkScarf(0.36, 1.8); scarf.position.set(0.2, 1.5, -0.06); scarf.rotation.z = 0.1; g.add(scarf);
  g.scale.setScalar(1.12); g.visible = false; scene.add(g);
  return { g, scarf };
})();
let figOn = false;
function showFig(x, z) { fig.g.position.set(x, groundY(x, z), z); fig.g.visible = true; figOn = true; }
function hideFig() { fig.g.visible = false; figOn = false; }

/* cahaya hijau penuntun */
const wisp = mkGlow(0xffffff, 1.9); wisp.visible = false; scene.add(wisp);
const wispS = { x: 0, z: 0, tx: 0, tz: 0, on: false };

/* selendang di tokoh */
const bayuScarf = mkScarf(0.22, 0.9); bayuScarf.position.set(0.16, 1.05, -0.3); bayuScarf.visible = false; bayu.g.add(bayuScarf);
const dindaScarf = mkScarf(0.5, 1.0); dindaScarf.position.set(0, 1.28, -0.23); dindaScarf.visible = false; dinda.g.add(dindaScarf);

/* petilasan (beringin + altar) di ruang terpisah */
const CL = { x: 600, z: -600 };
const clearing = new THREE.Group(); clearing.position.set(CL.x, 0, CL.z); clearing.visible = false; scene.add(clearing);
const clFlames = [], clSmoke = { pts: null, n: 30 };
let photoMesh = null;
(function buildClearing() {
  const g = clearing;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(34, 36), LMat({ color: 0x223226, roughness: 1, flatShading: true })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
  const bt = new THREE.Group(); bt.position.set(-3, 0, -10); g.add(bt);
  const bark = M(0x2b2219);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.3, 9, 9), bark); trunk.position.y = 4.5; trunk.castShadow = true; bt.add(trunk);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, r = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.7, 4, 5), bark); r.position.set(Math.cos(a) * 2.3, 1.5, Math.sin(a) * 2.3); r.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); bt.add(r); }
  [[0, 12, 0, 6.5], [-5, 11, 2, 5], [5, 11.5, -1, 5.5], [0, 13.5, 4, 4.5], [2, 11, -5, 5]].forEach(c => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(c[3], 0), LMat({ color: 0x1b2e20, roughness: 1, flatShading: true })); m.position.set(c[0], c[1], c[2]); bt.add(m);
  });
  for (let i = 0; i < 34; i++) { const a = rr(0, 6.28), r = rr(1.6, 7), h = rr(4, 9), m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, h, 4), M(0x3a2e22)); m.position.set(Math.cos(a) * r, 9.5 - h / 2, Math.sin(a) * r); bt.add(m); }
  // altar
  const al = new THREE.Group(); al.position.set(0, 0, -5.4); g.add(al);
  addBox(al, 3.6, 0.35, 3.6, 0x4a4842, 0, 0.17, 0); addBox(al, 2.2, 0.5, 2.2, 0x55534b, 0, 0.6, 0);
  addBox(al, 0.5, 1.3, 0.4, 0x3a3934, 0, 1.5, 0); addBox(al, 2.3, 0.06, 2.3, 0xd6b23a, 0, 0.88, 0); addBox(al, 0.62, 0.5, 0.5, 0xeeeee6, 0, 1.2, 0.02);
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 4), M(0x6a4a2a)); s.position.set(-0.7 + i * 0.16, 1.12, 0.75); s.rotation.x = -0.12; al.add(s);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 3), new THREE.MeshBasicMaterial({ color: 0xff7a30 })); tip.position.set(-0.7 + i * 0.16, 1.33, 0.73); al.add(tip);
  }
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + 0.3, cx = Math.cos(a) * 1.5, cz = Math.sin(a) * 1.5;
    const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.18, 6), M(0xe8e0c8)); cd.position.set(cx, 0.44, cz); al.add(cd);
    const f = mkGlow(0xffa050, 0.8); f.position.set(cx, 0.68, cz); al.add(f); clFlames.push({ s: f, ph: i * 1.7, k: 1 });
  }
  // bunga
  const fg = new THREE.CircleGeometry(0.11, 5); fg.rotateX(-Math.PI / 2);
  const fl = new THREE.InstancedMesh(fg, LMat({ color: 0xffffff, emissive: 0x1a1a1a, roughness: 1, side: THREE.DoubleSide }), 90);
  const o = new THREE.Object3D(), col = new THREE.Color();
  for (let i = 0; i < 90; i++) { const a = rr(0, 6.28), r = rr(2.2, 4.2); o.position.set(Math.cos(a) * r, 0.04, -5.4 + Math.sin(a) * r); o.rotation.set(0, rr(0, 6), 0); o.scale.set(1, 1, 1); o.updateMatrix(); fl.setMatrixAt(i, o.matrix); col.setHex(R() < 0.6 ? 0xf2f0e6 : 0xf2c94a); fl.setColorAt(i, col); }
  fl.frustumCulled = false; g.add(fl);
  // foto
  photoMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.36), LMat({ color: 0xefe6c8, emissive: 0x6a5f38, emissiveIntensity: 0.7, roughness: 1, side: THREE.DoubleSide }));
  photoMesh.rotation.x = -Math.PI / 2; photoMesh.rotation.z = 0.5; photoMesh.position.set(1.9, 0.05, -3.3); g.add(photoMesh);
  // asap dupa
  const sp = new Float32Array(clSmoke.n * 3); for (let i = 0; i < clSmoke.n; i++) { sp[i * 3] = -0.6 + rr(0, 0.6); sp[i * 3 + 1] = 1.3 + rr(0, 2.6); sp[i * 3 + 2] = -4.6; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  clSmoke.pts = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.28, color: 0xaaaaaa, transparent: true, opacity: 0.22, depthWrite: false })); clSmoke.pts.frustumCulled = false; g.add(clSmoke.pts);
  // pohon melingkar
  const g2 = mkTreeGeos(), N = 46;
  const tr = new THREE.InstancedMesh(g2[0], LMat({ color: 0x33261a, roughness: 1, flatShading: true }), N);
  const cr = new THREE.InstancedMesh(g2[1], LMat({ color: 0xffffff, roughness: 1, flatShading: true }), N);
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2 + rr(-0.05, 0.05), r = rr(24, 34), sc = rr(1.0, 1.7); TREE_SPOTS.push({ x: CL.x + Math.cos(a) * r, z: CL.z + Math.sin(a) * r, c: null }); o.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); o.rotation.set(0, rr(0, 6), 0); o.scale.set(sc, sc * rr(0.9, 1.3), sc); o.updateMatrix(); tr.setMatrixAt(i, o.matrix); cr.setMatrixAt(i, o.matrix); col.setHex(0x1f3322).lerp(new THREE.Color(0x33452a), R()); cr.setColorAt(i, col); }
  [tr, cr].forEach(m => { m.frustumCulled = false; g.add(m); BLOBS.push(m); });
  const pgm = new THREE.InstancedMesh(mkPandanGeo(), LMat({ color: 0x3f6a2a, side: THREE.DoubleSide, roughness: 0.9, flatShading: true }), 26);
  for (let i = 0; i < 26; i++) { const a = rr(0, 6.28), r = rr(9, 21), sc = rr(0.8, 1.5); o.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 4); o.rotation.set(0, rr(0, 6), 0); o.scale.set(sc, sc, sc); o.updateMatrix(); pgm.setMatrixAt(i, o.matrix); }
  pgm.frustumCulled = false; g.add(pgm);
  circles.push({ x: CL.x - 3, z: CL.z - 10, r: 2.9 });
  boxes.push({ x0: CL.x - 1.85, x1: CL.x + 1.85, z0: CL.z - 7.25, z1: CL.z - 3.55 });
})();

/* ---------- rasa takut, senter, sosok, penuntun ---------- */
const fearEl = document.createElement('div');
Object.assign(fearEl.style, { position: 'fixed', left: '0', top: '0', right: '0', bottom: '0', pointerEvents: 'none', zIndex: '6', opacity: '0', background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 38%, rgba(30,0,0,0.9) 100%)', transition: 'opacity .3s' });
if (document.body) document.body.appendChild(fearEl);
let b2on = false, fear = 0, fearBase = 0, hbT = 0, flashOn = false, flashBase = 300, flickT = 0, humT = 6, scareT = 14, ambientOn = false, spiritFixed = 0, spiritX = 0, spiritY = 0, spiritZ = 0;
const TIMERS = [];
function later(sec, fn) { TIMERS.push({ t: sec, fn }); }
function runTimers(dt) { for (let i = TIMERS.length - 1; i >= 0; i--) { const q = TIMERS[i]; q.t -= dt; if (q.t <= 0) { TIMERS.splice(i, 1); q.fn(); } } }
function addFear(v) { fear = clamp(fear + v, 0, 1); }
function flicker(sec) { flickT = Math.max(flickT, sec); }
function lookingBack() { if (window.__FORCELOOK) return true; if (cineOn) return false; return Math.cos(camYaw) < -0.45; }
function setB2Lights(on) {
  lamps[0].l.visible = !on; lamps[1].l.visible = !on;
  lampMain.visible = on; spirit.visible = on; flash.visible = on;
  b2on = on; if (!on) { fear = 0; fearBase = 0; flashOn = false; darkK = 0; spiritFixed = 0; ambientOn = false; lampB.base = 0; }
}
function updateB2(dt, t) {
  runTimers(dt);
  if (fig.mixer && figOn) fig.mixer.update(dt);
  const active = b2on && (state === 'play' || state === 'end');
  fear = Math.max(fearBase, fear - dt * 0.012);
  fearEl.style.opacity = (b2on ? clamp(fear * 0.95, 0, 0.95) : 0).toFixed(3);
  if (AU.dread && AU.ctx) AU.dread.gain.setTargetAtTime(b2on ? fear * 0.12 : 0, AU.ctx.currentTime, 0.4);
  if (active && fear > 0.32) { hbT -= dt; if (hbT <= 0) { sfx.heart(fear); hbT = 1.05 - 0.5 * fear; } }
  if (!b2on) return;
  // senter dari tangan Raka, arah mengikuti kamera
  if (flashOn) {
    let k = 1;
    if (fear > 0.45) k -= (fear - 0.45) * 0.9 * (0.5 + 0.5 * Math.sin(t * 23 + Math.sin(t * 7) * 3));
    if (flickT > 0) { flickT -= dt; k *= (Math.sin(t * 61) > 0.15 ? 1 : 0.04); }
    flash.intensity = flashBase * Math.max(0, k) * (1 - darkK);
    const dx = -Math.sin(camYaw), dy = -0.11, dz = -Math.cos(camYaw), l = Math.hypot(dx, dy, dz) || 1;
    const sy = Math.sin(camYaw), cy = Math.cos(camYaw);
    const ox = raka.x + cy * 0.32, oy = raka.y + 1.25, oz = raka.z - sy * 0.32;
    flash.position.set(ox, oy, oz); flash.target.position.set(ox + dx / l * 12, oy + dy / l * 12, oz + dz / l * 12);
  } else flash.intensity = 0;
  // sosok berselendang
  if (figOn) {
    fig.scarf.rotation.y = Math.sin(t * 1.7) * 0.35; fig.scarf.rotation.x = Math.sin(t * 1.1) * 0.12;
    const want = Math.atan2(raka.x - fig.g.position.x, raka.z - fig.g.position.z);
    fig.g.rotation.y += angDiff(want - fig.g.rotation.y) * Math.min(1, dt * 2);
    spirit.position.set(fig.g.position.x, fig.g.position.y + 1.6, fig.g.position.z); spirit.intensity = 14 + Math.sin(t * 9) * 2;
  } else if (wispS.on) {
    const dx = wispS.tx - wispS.x, dz = wispS.tz - wispS.z, d = Math.hypot(dx, dz);
    if (d > 0.05) { const st = Math.min(d, 4.2 * dt); wispS.x += dx / d * st; wispS.z += dz / d * st; }
    const wy = groundY(wispS.x, wispS.z) + 1.5 + Math.sin(t * 2.2) * 0.25;
    wisp.position.set(wispS.x, wy, wispS.z); wisp.scale.setScalar(1.7 + Math.sin(t * 5) * 0.25);
    spirit.position.set(wispS.x, wy, wispS.z); spirit.intensity = 11 + Math.sin(t * 6) * 2;
  } else if (spiritFixed > 0) { spirit.position.set(spiritX, spiritY, spiritZ); spirit.intensity = spiritFixed * (0.9 + 0.1 * Math.sin(t * 3.1)); }
  else spirit.intensity = 0;
  // selendang bergoyang
  scarfMesh.rotation.y = Math.sin(t * 1.3) * 0.4; scarfMesh.rotation.x = Math.sin(t * 0.9) * 0.1;
  bayuScarf.rotation.y = Math.sin(t * 1.6) * 0.3; dindaScarf.rotation.y = Math.sin(t * 1.4) * 0.3;
  braceGlow.scale.setScalar(0.9 + Math.sin(t * 3) * 0.15);
  // petilasan: lilin & asap
  if (clearing.visible) {
    clFlames.forEach(f => { f.s.scale.setScalar((0.7 + Math.sin(t * 9 + f.ph) * 0.08 + (Math.random() < 0.05 ? 0.1 : 0)) * f.k); });
    const p = clSmoke.pts.geometry.attributes.position;
    for (let i = 0; i < clSmoke.n; i++) { let y = p.getY(i) + dt * 0.35; if (y > 4.2) y = 1.3; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t + i) * dt * 0.05); }
    p.needsUpdate = true;
  }
  if (active && ambientOn && ctrl === 'walk') {
    scareT -= dt;
    if (scareT <= 0) {
      scareT = rr(12, 24); const r = Math.floor(Math.random() * 4);
      if (r === 0) { sfx.snap(); addFear(0.03); } else if (r === 1) sfx.owl(); else if (r === 2) { sfx.whisper(); addFear(0.05); } else sfx.stepsBehind(5, 0.5);
    }
  }
  if (active && S.flags.bayuHum && bayu.g.visible) { humT -= dt; if (humT <= 0) { sfx.hum(); humT = rr(13, 20); } }
}

/* =====================  CERITA: BAB 2  ===================== */
const ZA = -33, ZB = -98;
function addFind(title, text) { S.finds.push(title + ': ' + text); sfx.note(); toast('Temuan baru di buku 📓'); saveGame(); }
function tpTrail(z) {
  const x = trailX(z); raka.x = x; raka.z = z; raka.y = groundY(x, z); vel.x = vel.z = 0;
  [[dinda, -1.5, 2.4], [bayu, 1.6, 2.9]].forEach(p => { const a = p[0]; a.x = x + p[1]; a.z = z + p[2]; a.y = groundY(a.x, a.z); a.tx = null; });
  camYaw = 0; snapCam();
}
function* blink(fn) { yield FADE(true, 0.22); yield DO(fn); yield T(0.25); yield FADE(false, 0.5); }
function* walkOn(obj) { yield DO(() => { followCam(); ctrl = 'walk'; dinda.follow = true; bayu.follow = true; dinda.watch = bayu.watch = false; dinda.off = [-1.5, 2.3]; bayu.off = [1.6, 2.8]; if (obj) setObj(obj); }); }
function* stopWalk() { yield DO(() => { ctrl = 'none'; resetInput(); setObj(''); dinda.follow = false; bayu.follow = false; }); }
function DIM(a, sec) { let k = 0; return { init() { el.fade.style.transition = 'opacity ' + sec + 's'; el.fade.style.opacity = String(a); }, test: dt => ((k += dt) >= sec) }; }
function LOOKGUARD(secs, onBreak) {
  let k = 0, back = 0, broken = false;
  return {
    init() { setObj('Jangan menoleh. Jangan menjawab.'); followCam(); ctrl = 'look'; resetInput(); },
    test: dt => { k += dt; if (!broken && lookingBack()) { back += dt; if (back > 0.3) { broken = true; S.flags.menoleh = (S.flags.menoleh || 0) + 1; if (onBreak) onBreak(); } } else if (!broken) back = Math.max(0, back - dt); return k >= secs; },
    done() { setObj(''); ctrl = 'none'; resetInput(); }
  };
}
function figBehind() {
  const z = raka.z + 5.5, x = trailX(z); showFig(x, z); sfx.sting(); addFear(0.32); flicker(1.4); G_shake(0.6);
  later(1.7, () => { hideFig(); flicker(0.6); });
}
let shakeT = 0; function G_shake(v) { shakeT = Math.max(shakeT, v); }

function* bab2() {
  ctrl = 'none'; setObj(''); dlgHide(); resetInput(); TIMERS.length = 0;
  el.fade.style.transition = 'none'; el.fade.style.opacity = '1';
  if (!S.finds) S.finds = [];
  yield DO(() => {
    setB2Lights(true); flashOn = true; ambientOn = false; fearBase = 0.05; fear = 0.05; darkK = 0;
    CORR.mode = 'trail'; CORR.w = 3.4; BOUNDS.x0 = -260; BOUNDS.x1 = 260; BOUNDS.z0 = -140; BOUNDS.z1 = 30;
    hideFig(); wispS.on = false; wisp.visible = false; dLamp.visible = false; brace.visible = false; braceGlow.visible = false; clearing.visible = false;
    showTapes(0); scarfMesh.visible = true; bayuScarf.visible = false; dindaScarf.visible = false; S.flags.bayuHum = false;
    posPaper.visible = true; lampB.base = 42; lampMain.position.set(POS1.lampX, POS1.lampY, POS1.z);
    clFlames.forEach(f => { f.k = 1; });
    setMood('deep');
    place(mbah, MK.x, MK.z, 0); mbah.g.visible = false;
    const x = trailX(ZA); place(raka, x, ZA, Math.PI); place(dinda, x - 1.5, ZA + 2.4, Math.PI); place(bayu, x + 1.6, ZA + 2.9, Math.PI);
    dinda.watch = bayu.watch = false; camYaw = 0; camPitch = 0.26; followCam(); snapCam();
  });
  yield CARD('Bab 2', 'Jalur yang Berbisik', 3.4);
  yield FADE(false, 2.2);
  yield SAY('Narator', 'Pukul 19.40. Gapura sudah jauh di belakang. Kabut turun lebih cepat dari yang diperkirakan.');
  if (S.flags.jaketHijau) yield SAY('Narator', 'Di sorot senter, jaket hijau muda itu tampak seperti menyala sendiri.');
  else yield SAY('Narator', 'Jaket yang dibalik itu terasa lebih aman. Sedikit.');
  yield SAY('Bayu', 'Pos satu sebentar lagi. Dari sana tinggal tanjakan santai.');
  yield SAY('Dinda', 'Aku masih kepikiran suara tadi. Kamu dengar juga, kan, Ka?');
  if (S.flags.menjawab) yield SAY('Bayu', 'Dan kamu malah nyahut. Ka, serius?');
  else yield SAY('Bayu', 'Angin. Sudah kubilang, angin.');
  yield* walkOn('Naik ke Pos 1 (ikuti jalur).');
  yield DO(() => { ambientOn = true; });
  yield UNTIL(() => raka.z <= -36);
  yield* stopWalk();
  yield DO(() => { sfx.stepsBehind(6, 0.55); addFear(0.08); });
  yield T(3.4);
  yield SAY('Dinda', 'Kalian dengar langkah di belakang kita?');
  yield SAY('Bayu', 'Babi hutan. Atau gema kaki kita sendiri.');
  yield SAY('Dinda', 'Gema tidak datang terlambat satu ketukan.');
  yield* walkOn('Sampai di Pos 1.');
  yield GOTO(POS1.x - 3.0, POS1.z + 0.6, 3.2);
  yield* stopWalk();
  yield DO(() => { faceTo(raka, POS1.x, POS1.z); cineTo(POS1.x - 6.5, terrainH(POS1.x, POS1.z) + 2.3, POS1.z + 5.2, POS1.x, terrainH(POS1.x, POS1.z) + 1.4, POS1.z, 1.6); });
  yield SAY('Narator', 'Pos 1. Sebuah pondok kecil terbuka. Lampu minyak tua bergoyang pelan, padahal tak ada angin.');
  yield SAY('Bayu', 'Nah, ada lampu. Aman.');
  yield SAY('Dinda', 'Tapi sepi banget. Kayak sudah lama nggak ada yang singgah.');
  yield* walkOn('Periksa kertas di bangku pos.');
  yield ACTION('Baca kertas', POS1.x - 0.6, POS1.z + 0.6, 2.6);
  yield* stopWalk();
  yield DO(() => { faceTo(raka, POS1.x + 1.3, POS1.z + 0.3); cineTo(POS1.x - 1.6, terrainH(POS1.x, POS1.z) + 1.9, POS1.z + 2.4, POS1.x + 1.3, terrainH(POS1.x, POS1.z) + 0.6, POS1.z + 0.3, 2.2); sfx.note(); });
  yield SAY('Narator', 'Selembar kertas lembap di atas bangku. Tulisan pensilnya sudah luntur.');
  yield SAY('Narator', '"Pos 1. 14 Suro 1999. Kami berempat. Laras bilang ada yang memanggil dari belakang. Kami bilang itu cuma angin."');
  yield DO(() => { addFind('Kertas di Pos 1', '"14 Suro 1999. Kami berempat. Laras bilang ada yang memanggil dari belakang. Kami bilang itu cuma angin."'); addFear(0.12); });
  yield SAY('Raka', 'Berempat... tahun 1999.');
  yield SAY('Dinda', 'Ka. Tintanya masih basah.');
  yield SAY('Bayu', 'Pasti kena embun. Sini, aku ikat pita di pohon itu. Biar kita nggak nyasar.');
  yield DO(() => { showTapes(1); sfx.snap(); });
  yield T(0.8);
  yield* walkOn('Lanjut naik ke Pos 2.');
  // ---------------- pendakian 1: selendang ----------------
  yield UNTIL(() => raka.z <= -58);
  yield* stopWalk();
  yield DO(() => { bayu.tx = SCARF.x - 1.4; bayu.tz = SCARF.z + 1.2; bayu.spd = 3; cineTo(SCARF.x + 2.6, terrainH(SCARF.x, SCARF.z) + 2.0, SCARF.z + 4.2, SCARF.x - 1.0, terrainH(SCARF.x, SCARF.z) + 1.8, SCARF.z, 1.8); });
  yield T(1.6);
  yield SAY('Bayu', 'Eh, ada kain di ranting. Hijau muda... bagus banget.');
  yield SAY('Dinda', 'Hijau muda. Persis yang Mbah bilang.');
  yield SAY('Narator', 'Kain itu bergoyang pelan, satu-satunya benda di jalur yang tampak hidup.');
  yield CHOICE(['Taruh lagi, Bayu. Itu larangan Mbah.', 'Biarkan saja... cuma kain.']);
  if (LASTCHOICE === 0) {
    S.flags.selendangDitaruh = true;
    yield SAY('Bayu', 'Iya, iya. Penakut. Nih, kubiarkan di sana. Puas?');
  } else {
    S.flags.selendangDiambil = true; S.flags.bayuHum = true;
    yield DO(() => { scarfMesh.visible = false; bayuScarf.visible = true; sfx.whisper(); addFear(0.14); });
    yield SAY('Bayu', 'Nah, gitu dong. Kuikat di tas. Buat kenang-kenangan.');
    yield SAY('Narator', 'Di suatu tempat di dalam hutan, sesuatu bergeser. Pelan. Seperti menarik napas panjang.');
  }
  yield* walkOn('Terus naik.');
  yield UNTIL(() => raka.z <= ZB);
  // ---------------- loop 1 ----------------
  yield* stopWalk();
  yield* blink(() => { tpTrail(ZA); });
  yield DO(() => { flicker(1.0); addFear(0.1); if (S.flags.selendangDitaruh) { scarfMesh.visible = false; bayuScarf.visible = true; S.flags.bayuHum = true; } faceTo(raka, POS1.x, POS1.z); });
  yield SAY('Dinda', 'Tunggu. Itu... Pos 1. Lampu yang sama.');
  yield SAY('Bayu', 'Nggak mungkin. Kita jalan lurus dari tadi.');
  yield SAY('Dinda', 'Pita merahmu masih di pohon itu, Yu.');
  if (S.flags.selendangDitaruh) {
    yield SAY('Dinda', 'Dan tasmu... Yu, apa itu di tasmu?');
    yield SAY('Bayu', 'Aku taruh di ranting tadi. Aku yakin. Aku YAKIN.');
    yield SAY('Raka', 'Lepas, Yu. Buang.');
    yield SAY('Bayu', '...Nanti. Nanti kulepas di atas. Talinya... tidak mau lepas.');
  } else {
    yield SAY('Bayu', 'Kita cuma belok tanpa sadar. Ayo, sekali lagi.');
  }
  // ---------------- pendakian 2: panggilan ----------------
  yield* walkOn('Coba sekali lagi. Ikuti jalur.');
  yield UNTIL(() => raka.z <= -56);
  yield* stopWalk();
  yield DO(() => { sfx.whisper(); addFear(0.12); });
  yield T(1.0);
  yield SAY('Suara', '(dari sisi kiri, sangat pelan) ...Dinda...');
  yield SAY('Dinda', 'Ya—');
  yield CHOICE(['Pegang tangan Dinda erat-erat!', 'Bisikkan: "Jangan jawab."'], 4);
  if (LASTCHOICE >= 0) {
    S.flags.dindaDitahan = true;
    yield SAY('Dinda', '(berbisik) Ka... suaranya pakai suaraku.');
  } else {
    S.flags.dindaMenjawab = true; addFear(0.2);
    yield SAY('Dinda', 'Iya? Siapa—');
    yield DO(() => sfx.whisper());
    yield SAY('Suara', '...bagus.');
  }
  yield DO(() => { sfx.stepsBehind(9, 0.7); });
  yield LOOKGUARD(8, figBehind);
  yield SAY('Narator', 'Langkah di belakang berhenti. Lalu terdengar seseorang bersenandung, lirih, di sela kabut.');
  yield SAY('Dinda', 'Ka... itu Bayu. Dia yang bersenandung.');
  yield DO(() => { S.flags.bayuHum = true; sfx.hum(); faceTo(bayu, raka.x, raka.z); });
  yield SAY('Raka', 'Yu. Berhenti bersenandung.');
  yield SAY('Bayu', 'Bersenandung? Aku? ...Aku nggak lagi bersenandung.');
  yield* walkOn('Naik lagi. Jangan berhenti.');
  yield UNTIL(() => raka.z <= ZB);
  // ---------------- loop 2 ----------------
  yield* stopWalk();
  yield* blink(() => { tpTrail(ZA); showTapes(3); });
  yield DO(() => { flicker(1.2); addFear(0.12); faceTo(raka, POS1.x, POS1.z); });
  yield SAY('Bayu', 'Aku cuma ikat satu pita, Ka. Cuma satu.');
  yield SAY('Dinda', 'Sekarang ada tiga.');
  yield SAY('Narator', 'Lampu minyak di Pos 1 mengerjap. Sekali. Dua kali. Seperti ada yang berdiri di depannya.');
  yield SAY('Raka', '(Jangan panik. Jangan berhenti. Jangan menoleh.)');
  // ---------------- pendakian 3: gelang & padam ----------------
  yield* walkOn('Jangan berhenti. Ikuti jalur.');
  yield DO(() => { brace.visible = true; braceGlow.visible = true; });
  yield UNTIL(() => raka.z <= -52);
  yield* stopWalk();
  yield* walkOn('Periksa cahaya kecil di tepi jalur.');
  yield ACTION('Periksa gelang', BRACE.x, BRACE.z, 2.4);
  yield* stopWalk();
  yield DO(() => { faceTo(raka, BRACE.x, BRACE.z); cineTo(BRACE.x + 1.6, terrainH(BRACE.x, BRACE.z) + 1.3, BRACE.z + 2.2, BRACE.x, terrainH(BRACE.x, BRACE.z) + 0.2, BRACE.z, 2.4); brace.visible = false; braceGlow.visible = false; });
  yield SAY('Narator', 'Gelang benang hijau, terikat di akar yang menonjol. Ada huruf disulam di sana: L - A - R - A - S.');
  yield DO(() => { addFind('Gelang benang hijau', 'Tersulam nama "LARAS". Masih hangat, seperti baru dilepas.'); addFear(0.12); });
  yield SAY('Dinda', 'Laras... yang ada di kertas tadi.');
  yield SAY('Raka', 'Yang bilang ada suara memanggil dari belakang.');
  yield SAY('Bayu', '(bersenandung pelan, menatap kosong ke arah hutan)');
  yield* walkOn('Terus naik.');
  yield UNTIL(() => raka.z <= -68);
  // ---------------- padam ----------------
  yield* stopWalk();
  yield DO(() => { flicker(1.8); sfx.sting(); addFear(0.15); });
  yield T(1.6);
  yield SAY('Dinda', 'Senterku berkedip. Ka? Senterku—');
  yield DO(() => { flashOn = false; darkK = 1; lampB.base = 0; });
  yield DO(() => { sfx.whisper(); });
  yield SAY('Raka', 'Tetap di sini. Jangan lepas tangan siapa pun.');
  yield T(2.2);
  yield DO(() => { sfx.stepsBehind(10, 0.5); });
  yield T(3.0);
  yield SAY('Dinda', 'Ka... ada yang pegang tanganku. Dingin sekali.');
  yield DO(() => { sfx.whisper(); addFear(0.12); });
  yield SAY('Dinda', 'Kaaa—');
  yield T(3.4);
  yield DO(() => { dinda.g.visible = false; dinda.tx = null; dinda.follow = false; dLamp.visible = true; });
  yield DO(() => { flashOn = true; darkK = 0; lampB.base = 42; flicker(1.5); });
  yield T(1.0);
  yield DO(() => { faceTo(bayu, SIDE0.x - 4, SIDE0.z); bayu.tx = null; cineTo(raka.x + 1.5, raka.y + 1.9, raka.z + 3.6, raka.x, raka.y + 1.2, raka.z - 2, 2.0); });
  yield SAY('Raka', 'Din? DINDA!');
  yield SAY('Narator', 'Di tepi jalur, senter Dinda tergeletak. Cahayanya menunjuk lurus ke dalam hutan.');
  yield SAY('Bayu', '(bersenandung, tak menoleh) Dia ikut pergi.');
  yield SAY('Raka', 'Yu, kamu lihat dia ke mana?!');
  yield SAY('Bayu', 'Jangan teriak. Nanti dia marah.');
  yield SAY('Raka', 'Siapa yang marah?');
  yield SAY('Bayu', 'Yang punya selendang.');
  // ---------------- mengikuti cahaya ----------------
  yield DO(() => {
    wispS.x = SIDE0.x - 3; wispS.z = SIDE0.z - 2; wispS.tx = SIDE[1][0]; wispS.tz = SIDE[1][1]; wispS.on = true; wisp.visible = true; ambientOn = false;
    CORR.mode = 'poly'; CORR.w = 3.0; CORR.pts = [[trailX(-58), -58], [SIDE0.x, SIDE0.z]].concat(SIDE);
    followCam(); ctrl = 'walk'; bayu.follow = true; bayu.off = [0.8, 6.0]; bayu.watch = false; setObj('Ikuti cahaya hijau. Cari Dinda.');
  });
  for (let i = 0; i < SIDE.length; i++) {
    const wp = SIDE[i], nx = SIDE[Math.min(SIDE.length - 1, i + 1)];
    yield { init() { wispS.tx = nx[0]; wispS.tz = nx[1]; }, test: () => true };
    yield GOTO(wp[0], wp[1], 3.0, true);
    if (i === 0) yield DO(() => { sfx.whisper(); });
    if (i === 1) yield DO(() => { toast('“Ka... sini...”', 2600); sfx.whisper(); addFear(0.08); });
    if (i === 2) yield DO(() => { bayu.follow = false; bayu.tx = null; addFear(0.06); });
    if (i === 3) yield DO(() => { showFig(SIDE[5][0] + 2, SIDE[5][1] - 8); sfx.sting(); addFear(0.15); flicker(0.8); later(2.6, () => { hideFig(); flicker(0.5); }); });
  }
  yield DO(() => { ctrl = 'none'; resetInput(); setObj(''); wispS.tx = SIDE[SIDE.length - 1][0] - 4; wispS.tz = SIDE[SIDE.length - 1][1] - 4; });
  yield SAY('Narator', 'Cahaya hijau itu melayang naik, lalu padam di sela kabut. Jalan setapak berakhir di dinding pandan yang rapat.');
  yield* blink(() => { enterClearing(); });
  // ---------------- petilasan ----------------
  yield SAY('Narator', 'Sebuah lapangan kecil terbuka di tengah hutan. Beringin raksasa berdiri di sana, akar-akarnya menjuntai seperti rambut.');
  yield SAY('Narator', 'Di depannya ada altar batu, lilin-lilin kecil, dan asap dupa yang naik lurus tanpa tertiup angin.');
  yield DO(() => { followCam(); ctrl = 'walk'; setObj('Dekati Dinda.'); });
  yield GOTO(CL.x + 0.5, CL.z + 1.0, 2.6, true);
  yield DO(() => { ctrl = 'none'; resetInput(); setObj(''); faceTo(raka, dinda.x, dinda.z); cineTo(CL.x + 2.6, 2.0, CL.z + 4.6, CL.x + 0.4, 1.4, CL.z - 2.4, 1.6); sfx.whisper(); addFear(0.1); });
  yield DO(() => { later(0.4, () => { clFlames[0].k = 0; clFlames[3].k = 0; }); later(1.4, () => { clFlames[1].k = 0; clFlames[4].k = 0; }); later(2.6, () => { clFlames[2].k = 0; clFlames[5].k = 0; lampB.base = 8; }); });
  yield SAY('Raka', 'Din? Din, ini aku.');
  yield SAY('Dinda', '(tanpa berbalik) Jangan terlalu dekat, Ka. Dia sedang bicara.');
  yield SAY('Raka', 'Siapa?');
  yield SAY('Dinda', 'Namanya Laras. Dia bilang dia sudah lama sekali menunggu di sini.');
  yield SAY('Dinda', 'Dia bilang... dia tidak mau turun sendirian lagi.');
  if (S.flags.jaketHijau) yield SAY('Suara', '(dari atas beringin) ...kau memakai warnaku...');
  else yield SAY('Suara', '(dari atas beringin) ...bagian dalammu... masih hijau...');
  yield DO(() => { sfx.sting(); flicker(1.0); addFear(0.15); cineTo(CL.x + 1.2, 1.7, CL.z - 0.4, CL.x + 1.9, 0.3, CL.z - 3.3, 1.8); });
  yield SAY('Narator', 'Di kaki altar, sebuah foto tergeletak. Sudutnya berkilau lembap.');
  yield DO(() => { followCam(); ctrl = 'walk'; setObj('Periksa foto di kaki altar.'); });
  yield ACTION('Periksa foto', CL.x + 1.9, CL.z - 2.4, 2.4);
  yield DO(() => { ctrl = 'none'; resetInput(); setObj(''); faceTo(raka, CL.x + 1.9, CL.z - 3.3); cineTo(CL.x + 1.0, 1.6, CL.z - 1.4, CL.x + 1.9, 0.1, CL.z - 3.3, 2.4); });
  yield CHOICE(['Ambil fotonya', 'Cukup dibaca, jangan diambil']);
  if (LASTCHOICE === 0) { S.flags.fotoDiambil = true; yield DO(() => { photoMesh.visible = false; addFear(0.12); sfx.whisper(); }); }
  yield SAY('Narator', 'Polaroid yang sudah menguning. Empat pendaki berdiri di depan gapura yang sama. Di sudut foto, seorang gadis bersyal hijau muda tersenyum.');
  yield SAY('Narator', 'Di baliknya, tulisan tangan: "14 Suro 1999. Turun bertiga. Yang keempat masih di atas."');
  yield DO(() => { addFind('Foto polaroid', '"14 Suro 1999. Turun bertiga. Yang keempat masih di atas." Orang ketiga dari kiri memakai topi biru.'); addFear(0.15); });
  yield SAY('Raka', 'Yang ketiga dari kiri... topi biru itu...');
  yield DO(() => { faceTo(bayu, raka.x, raka.z); cineTo(raka.x - 1.4, raka.y + 1.6, raka.z - 0.8, bayu.x, bayu.y + 1.5, bayu.z, 1.4); });
  yield SAY('Bayu', '(suaranya datar) Tiga yang turun, Ka. Kali ini... juga tiga.');
  yield DO(() => { sfx.hum(); addFear(0.12); cineTo(CL.x + 0.5, 1.9, CL.z + 0.6, CL.x + 0.4, 1.5, CL.z - 2.4, 1.8); });
  yield SAY('Dinda', '(berbisik, tetap membelakangi) Ka. Jangan menoleh. Jangan lihat Bayu.');
  yield CHOICE(['Menoleh ke arah Bayu', 'Tetap menatap punggung Dinda'], 6);
  yield DO(() => { sfx.sting(); flicker(2); addFear(0.3); });
  if (LASTCHOICE === 0) {
    S.flags.menolehAkhir = true;
    yield DO(() => { cineTo(bayu.x, bayu.y + 1.6, bayu.z + 2.0, bayu.x, bayu.y + 1.55, bayu.z, 6); });
    yield SAY('Narator', 'Bayu berdiri tepat di belakangnya. Kepalanya miring terlalu jauh. Bibirnya bergerak, tetapi yang keluar adalah suara perempuan.');
    yield SAY('Suara', '...terima kasih... sudah membawa mereka...');
  } else {
    S.flags.menolehAkhir = false;
    yield SAY('Narator', 'Dinda berbalik sangat pelan. Selendang hijau itu sudah melingkar di lehernya. Ia tersenyum, tetapi bukan dengan bibirnya sendiri.');
    yield SAY('Dinda', '(suara yang bukan miliknya) ...terlambat, Raka...');
  }
  yield DO(() => { flashOn = false; darkK = 1; lampB.base = 0; });
  yield T(0.6);
  yield DIM(1, 0.4);
  yield DO(() => { saveGame(); });
  yield T(1.5);
  yield* bab3();
}
function enterClearing() {
  clearing.visible = true; CORR.mode = 'none'; wispS.on = false; wisp.visible = false; dLamp.visible = false; hideFig(); ambientOn = false;
  BOUNDS.x0 = CL.x - 20; BOUNDS.x1 = CL.x + 20; BOUNDS.z0 = CL.z - 13; BOUNDS.z1 = CL.z + 24;
  setMood('petil'); fearBase = 0.25;
  lampMain.position.set(CL.x, 1.4, CL.z - 5.2); lampB.base = 38; clFlames.forEach(f => { f.k = 1; });
  spiritFixed = 12; spiritX = CL.x - 3; spiritY = 6.5; spiritZ = CL.z - 8;
  place(raka, CL.x + 0.5, CL.z + 17, Math.PI); place(bayu, CL.x + 3.6, CL.z + 15.5, Math.PI); bayu.follow = false; bayu.watch = false; bayu.tx = null;
  place(dinda, CL.x + 0.6, CL.z - 2.4, Math.PI); dinda.follow = false; dinda.watch = false; dindaScarf.visible = true;
  vel.x = vel.z = 0; camYaw = 0; cineTo(CL.x + 4, 2.4, CL.z + 21, CL.x, 3.6, CL.z - 6, 0.5); snapCam();
  cineTo(CL.x + 2.4, 2.3, CL.z + 20, CL.x, 3.2, CL.z - 6, 0.35);
}


/* =====================  CERITA: BAB 3 (YANG KEEMPAT) & BAB 4 (FAJAR JUMAT KLIWON)  ===================== */
const ALT = { x: CL.x, z: CL.z - 5.4 };
const CANDLES = [0, 1, 2, 3, 4, 5].map(i => { const a = i / 6 * Math.PI * 2 + 0.3; return { x: ALT.x + Math.cos(a) * 1.5, z: ALT.z + Math.sin(a) * 1.5 }; });
MOODS.fajar = { top: C(0x3b4a7c), fog: C(0xb58c7c), glow: C(0xffc38a), sun: C(0xffe2b4), fogD: 0.013, hemiSky: C(0xb4a4bc), hemiGnd: C(0x4c4238), hemiI: 1.1, dirCol: C(0xffc890), dirI: 2.1, exp: 1.0, cloud: C(0xffd2b4), cloudA: 0.8, mount: C(0x9c7c82) };
WHO.Laras = '#bfeec4';
const altarBloom = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 5), LMat({ color: 0xf2f0e6, emissive: 0x555544 })); altarBloom.position.set(0.05, 1.0, -4.95); altarBloom.visible = false; clearing.add(altarBloom);
const altarScarf = mkScarf(0.5, 1.3); altarScarf.rotation.x = -Math.PI / 2; altarScarf.position.set(-0.7, 0.94, -4.7); altarScarf.visible = false; clearing.add(altarScarf);
let R3 = { candles: 0, sesajen: false, selendang: false, foto: false, kind: false, end: '' };

function* walkAlone(text) { yield DO(() => { followCam(); ctrl = 'walk'; setObj(text); }); }
function* stopAlone() { yield DO(() => { ctrl = 'none'; resetInput(); setObj(''); }); }
function lightCandle(i) { clFlames[i].k = 1; sfx.chime(); R3.candles++; lampB.base = 8 + 5 * R3.candles; fearBase = Math.max(0.08, 0.3 - 0.035 * R3.candles); flicker(0.4); }
function figBehindC() {           // sosok muncul di belakang pemain (versi untuk petilasan)
  const z = raka.z + 5.4, x = raka.x + 0.9; showFig(x, z); sfx.sting(); addFear(0.28); flicker(1.4); G_shake(0.6);
  later(1.7, () => { if (!R3.laras) { hideFig(); flicker(0.6); } });
}
function LOOKAT(need, maxSecs) {    // kebalikan "jangan menoleh": kali ini pemain HARUS menoleh
  let k = 0, held = 0, hinted = false;
  return {
    init() { setObj('Menolehlah. Kali ini, tatap dia.'); followCam(); ctrl = 'look'; resetInput(); },
    test: dt => {
      k += dt; if (lookingBack()) held += dt; else held = Math.max(0, held - dt * 0.5);
      if (k > 9 && !hinted) { hinted = true; toast('Geser jari di sisi kanan layar untuk memutar kamera ke belakang.', 5200); }
      if (Math.floor(k * 0.4) !== Math.floor((k - dt) * 0.4)) sfx.whisper();
      return held >= need || k >= maxSecs;
    },
    done() { setObj(''); ctrl = 'none'; resetInput(); }
  };
}
function WFLASH(sec) {
  let k = 0;
  return {
    init() { el.fade.style.transition = 'none'; el.fade.style.background = '#fff'; el.fade.style.opacity = '1'; },
    test: dt => ((k += dt) >= 0.25),
    done() { el.fade.style.transition = 'opacity ' + sec + 's'; el.fade.style.opacity = '0'; setTimeout(() => { el.fade.style.background = '#000'; }, sec * 1000 + 150); }
  };
}
function WHITEHOLD(sec) {           // layar putih penuh (cahaya pagi) yang bertahan sebentar
  let k = 0;
  return { init() { el.fade.style.transition = 'opacity 0.4s'; el.fade.style.background = '#fff'; el.fade.style.opacity = '1'; }, test: dt => ((k += dt) >= sec) };
}
function* scareGuard(line, secs) {
  yield DO(() => { sfx.stepsBehind(8, 0.7); addFear(0.1); flicker(0.9); });
  yield T(1.2);
  yield SAY('Suara', line);
  yield LOOKGUARD(secs || 7, figBehindC);
}

function* bab3() {
  ctrl = 'none'; setObj(''); dlgHide(); resetInput(); TIMERS.length = 0;
  el.fade.style.transition = 'none'; el.fade.style.opacity = '1';
  if (!S.finds) S.finds = [];
  if (S.items.indexOf('Bunga sesajen') < 0) S.items.push('Bunga sesajen');
  R3 = { candles: 0, sesajen: false, selendang: false, foto: false, kind: false, end: '', laras: false };
  yield DO(() => {
    setB2Lights(true); enterClearing(); setMood('petil'); ambientOn = false; fearBase = 0.3; fear = Math.max(fear, 0.3);
    clFlames.forEach(f => { f.k = 0; }); lampB.base = 0; flashOn = false; darkK = 1; spiritFixed = 9;
    altarBloom.visible = false; altarScarf.visible = false; hideFig();
    place(raka, ALT.x + 0.4, ALT.z + 5.6, Math.PI); place(dinda, ALT.x + 0.8, ALT.z + 2.7, Math.PI); dinda.follow = false; dinda.watch = false; dindaScarf.visible = true; bayuScarf.visible = false;
    place(bayu, ALT.x + 2.4, ALT.z + 6.4, 0); faceTo(bayu, raka.x, raka.z); bayu.follow = false; bayu.watch = true;
    camYaw = 0; followCam(); snapCam(); saveGame();
  });
  yield CARD('Bab 3', 'Yang Keempat', 3.4);
  yield FADE(false, 2.2);
  yield SAY('Narator', 'Gelap. Jangkrik berhenti bersuara, seolah seluruh hutan menahan napas.');
  yield SAY('Narator', 'Enam lilin di altar sudah padam. Di kaki beringin, sesuatu berdiri dan menunggu.');
  if (S.flags.menolehAkhir) yield SAY('Narator', 'Bayu masih berdiri di belakangmu. Napasnya dingin di tengkuk.');
  else yield SAY('Narator', 'Dinda berdiri tak bergerak di depan altar. Selendang hijau itu melilit lehernya.');
  yield DO(() => { frame2(raka, bayu, 3.6, 1, 1.6); sfx.hum(); });
  yield SAY('Bayu', 'Ka... dengar aku sebentar. Cuma sebentar, sebelum dia bicara lewat mulutku lagi.');
  yield SAY('Raka', 'Siapa kamu sebenarnya, Yu?');
  yield SAY('Bayu', 'Bayu. Nama itu memang punyaku. Aku orang ketiga dari kiri di foto itu.');
  yield SAY('Bayu', '14 Suro 1999. Kami berempat naik: aku, dua temanku, dan Laras.');
  yield SAY('Bayu', 'Waktu turun malam-malam, dari belakang ada yang memanggil. Suara Laras. \"Tunggu... tunggu aku.\"');
  yield SAY('Bayu', 'Aku yang bilang, \"Itu cuma angin. Jangan menoleh.\" Kami terus berjalan. Tak seorang pun menoleh.');
  yield SAY('Bayu', 'Kami turun bertiga. Yang keempat... tertinggal di atas.');
  yield SAY('Raka', 'Kamu... sudah mati juga?');
  yield SAY('Bayu', 'Aku pulang. Hidup, dengan suara itu di kepalaku sampai akhir. Tapi tiap Suro aku kembali naik.');
  yield SAY('Bayu', 'Mencari orang yang mau menoleh untuknya. Kamu bukan kebetulan, Ka. Aku yang memilih kalian. Maafkan aku.');
  yield SAY('Bayu', 'Selendang itu bukan kutukan. Itu miliknya. Dia cuma ingin dikenali, dan selama ini tak ada yang mau menoleh.');
  yield SAY('Bayu', 'Nyalakan lilin-lilin itu. Dia tenang kalau ada api. Korek ini sudah dua puluh tujuh tahun kubawa.');
  yield* walkAlone('Ambil korek dari Bayu.');
  yield ACTION('Ambil korek', bayu.x, bayu.z, 2.4);
  yield DO(() => { S.items.push('Korek api tua'); sfx.chime(); toast('Mendapat: Korek api tua 🔥'); });
  yield* stopAlone();
  yield DO(() => { addFind('Cerita Bayu', 'Kami berempat naik tahun 1999. Laras memanggil dari belakang, kami tak menoleh. Turun bertiga.'); });
  // ---------------- menyalakan enam lilin ----------------
  for (let i = 0; i < 6; i++) {
    yield* walkAlone('Nyalakan lilin di altar (' + (i + 1) + '/6).');
    yield ACTION('Nyalakan lilin', CANDLES[i].x, CANDLES[i].z, 2.1);
    yield DO(() => { lightCandle(i); });
    yield* stopAlone();
    yield T(0.5);
    if (i === 1) { yield* scareGuard('(dari belakang, sangat dekat) ...jangan berhenti... aku di sini...', 7); yield SAY('Raka', '(Jangan panik. Nyalakan sisanya.)'); }
    if (i === 3) { yield* scareGuard('(berbisik di telinga kirimu) ...Raka... kau dengar aku, kan...', 8); yield SAY('Narator', 'Api keempat berkobar. Bayangan di pepohonan mundur selangkah.'); }
  }
  // ---------------- Laras terlihat ----------------
  yield DO(() => { R3.laras = true; showFig(ALT.x + 0.5, ALT.z - 4.2); spiritFixed = 0; fearBase = 0.12; sfx.chime(); cineTo(ALT.x + 0.5, 2.0, ALT.z + 3.6, ALT.x + 0.5, 1.7, ALT.z - 4.2, 1.6); });
  yield SAY('Narator', 'Keenam lilin menyala. Di seberang altar, sosok itu akhirnya terlihat jelas: seorang gadis muda bersyal hijau muda, pucat, basah oleh embun.');
  yield SAY('Laras', 'Kalian... menyalakan api untukku?');
  yield SAY('Laras', 'Sudah lama sekali tidak ada yang menyalakan api untukku.');
  yield SAY('Laras', 'Setiap malam Suro aku memanggil. \"Tunggu aku.\" Mereka selalu berjalan lebih cepat.');
  yield SAY('Bayu', 'Laras... maafkan aku. Aku takut. Aku bilang itu cuma angin.');
  yield SAY('Laras', 'Bayu. Kau selalu kembali, tapi kau tak pernah menoleh.');
  yield SAY('Laras', 'Aku meminjam Dinda sebentar. Suaranya hangat. Aku cuma ingin ada yang menemaniku turun.');
  yield SAY('Raka', '(Menemani... berarti Dinda tidak akan ikut turun.)');
  yield SAY('Laras', 'Aku tidak jahat. Aku hanya kesepian, dan kesepian membuat orang lupa cara melepaskan.');
  // ---------------- ritual ----------------
  yield DO(() => { followCam(); });
  yield* walkAlone('Letakkan bunga sesajen di altar.');
  yield ACTION('Letakkan sesajen', ALT.x, ALT.z + 2.7, 2.2);
  yield DO(() => { R3.sesajen = true; altarBloom.visible = true; S.items = S.items.filter(x => x !== 'Bunga sesajen'); sfx.note(); toast('Sesajen diletakkan dengan hormat 🌼'); });
  yield* stopAlone();
  yield SAY('Laras', '(pelan) Bunga... Sudah lama aku tidak menerima bunga.');
  yield* scareGuard('(dari belakang) ...jangan lepaskan Dinda... dia hangat...', 7);
  yield* walkAlone('Lepaskan selendang dari leher Dinda.');
  yield ACTION('Lepas selendang', dinda.x, dinda.z, 2.2);
  yield DO(() => { dindaScarf.visible = false; S.items.push('Selendang hijau'); sfx.chime(); addFear(0.1); faceTo(dinda, raka.x, raka.z); dinda.watch = true; });
  yield* stopAlone();
  yield SAY('Dinda', 'Ka...? Aku... kenapa dingin sekali? Kenapa aku ada di sini?');
  yield SAY('Raka', 'Tenang, Din. Aku belum selesai. Tetap di dekatku.');
  yield* walkAlone('Letakkan selendang di altar.');
  yield ACTION('Letakkan selendang', ALT.x - 1.1, ALT.z + 2.5, 2.2);
  yield DO(() => { R3.selendang = true; altarScarf.visible = true; S.items = S.items.filter(x => x !== 'Selendang hijau'); sfx.note(); toast('Selendang dikembalikan ke altar 🧣'); });
  yield* stopAlone();
  if (S.flags.fotoDiambil) {
    yield* walkAlone('Kembalikan foto Polaroid ke altar.');
    yield ACTION('Kembalikan foto', ALT.x + 1.1, ALT.z + 2.5, 2.2);
    yield DO(() => { R3.foto = true; sfx.note(); toast('Foto dikembalikan 📷'); });
    yield* stopAlone();
  }
  yield SAY('Laras', '(sangat lirih) ...terima kasih.');
  // ---------------- menoleh ----------------
  yield DO(() => { hideFig(); flicker(0.8); });
  yield FADE(true, 0.3);
  yield DO(() => { place(raka, ALT.x, ALT.z + 3.0, Math.PI); camYaw = 0; followCam(); snapCam(); });
  yield FADE(false, 0.6);
  yield SAY('Narator', 'Hening. Kemudian, dari belakangmu, sangat dekat, seseorang memanggil namamu.');
  yield DO(() => { sfx.whisper(); showFig(raka.x, raka.z + 3.4); addFear(0.15); });
  yield SAY('Laras', 'Raka...');
  yield LOOKAT(1.0, 34);
  yield DO(() => { cineTo(raka.x + 0.7, raka.y + 1.75, raka.z - 0.6, raka.x, 1.7, raka.z + 3.4, 2.4); sfx.chime(); fearBase = 0.05; });
  yield SAY('Laras', 'Kau menoleh.');
  yield SAY('Laras', 'Dua puluh tujuh tahun... tak ada yang menoleh.');
  yield SAY('Narator', 'Wajahnya tak menakutkan. Hanya sangat, sangat lelah.');
  yield CHOICE(['\"Aku di sini, Laras. Aku dengar kamu.\"', '\"Pergi! Kembalikan Dinda!\"'], 10);
  R3.kind = (LASTCHOICE === 0); S.flags.laras = LASTCHOICE;
  if (window.__FORCE_KIND !== undefined) R3.kind = !!window.__FORCE_KIND;
  const full = R3.sesajen && R3.selendang;
  R3.end = (R3.kind && full) ? 'A' : (R3.kind ? 'B' : 'C');
  if (window.__FORCE_END) R3.end = window.__FORCE_END;
  S.flags.ending = R3.end; saveGame();
  if (R3.end === 'A') {
    yield SAY('Raka', 'Aku dengar kamu. Maaf... kami semua lewat terlalu cepat. Kamu tidak sendirian lagi.');
    yield SAY('Laras', '(tersenyum, untuk pertama kalinya) ...kau menoleh. Itu saja. Itu yang kutunggu.');
    yield SAY('Narator', 'Api keenam lilin bergoyang, lalu naik lurus seperti doa. Selendang di altar terangkat perlahan, menjadi kabut hijau yang hangat.');
    yield SAY('Bayu', 'Laras... boleh aku ikut pulang?');
    yield SAY('Laras', 'Ayo, Bayu. Kita turun bersama. Kali ini aku yang menunggumu.');
  } else if (R3.end === 'B') {
    yield SAY('Raka', 'Aku dengar kamu, Laras. Aku di sini.');
    yield SAY('Laras', '(suaranya bergetar) ...kau baik. Tapi ada yang belum kau kembalikan dengan hormat.');
    yield SAY('Narator', 'Lilin-lilin meredup satu per satu. Sosok itu memudar pelan, tak sepenuhnya pergi.');
    yield SAY('Laras', 'Bawa Dinda pulang. Kembalilah saat Suro tahun depan... dan menolehlah lebih cepat.');
  } else {
    yield SAY('Narator', 'Wajah gadis itu berubah. Kelelahan di matanya menjadi sesuatu yang dingin dan sangat lapar.');
    yield SAY('Laras', 'Sama saja seperti mereka. Semua orang menoleh hanya untuk menyuruhku pergi.');
    yield DO(() => { sfx.sting(); flicker(2.4); addFear(0.4); G_shake(1); clFlames.forEach(f => { f.k = 0; }); lampB.base = 0; });
    yield SAY('Laras', 'Kalau begitu... aku ikut turun bersamamu.');
  }
  if (R3.end === 'C') yield DIM(1, 0.7); else yield WHITEHOLD(1.0);
  yield DO(() => { hideFig(); saveGame(); });
  yield T(0.6);
  yield* bab4(R3.end);
}

function* bab4(END) {
  ctrl = 'none'; setObj(''); dlgHide(); resetInput(); TIMERS.length = 0;
  yield DO(() => {
    el.fade.style.transition = 'none'; el.fade.style.background = '#000'; el.fade.style.opacity = '1';
    resetWorld(); state = 'play'; hidePanel(); clearing.visible = false;
    setMood('fajar'); BOUNDS.z0 = -38; CORR.mode = 'none';
    place(raka, GATE.x, GATE.z - 5, 0); place(dinda, GATE.x + 1.7, GATE.z - 6.4, 0); dinda.follow = false; dinda.watch = false; dindaScarf.visible = false;
    place(mbah, MK.x - 3.0, MK.z + 3.5, Math.PI); mbah.watch = true; mbah.g.visible = true;
    if (END === 'A') { place(bayu, GATE.x - 2.6, GATE.z - 3.6, 0); bayu.watch = false; showFig(GATE.x - 4.4, GATE.z - 3.8); }
    else if (END === 'B') { place(bayu, GATE.x - 2.6, GATE.z - 3.6, 0); bayu.watch = false; }
    else bayu.g.visible = false;
    camYaw = Math.PI; followCam(); snapCam();
  });
  yield CARD('Bab 4', 'Fajar Jumat Kliwon', 3.2);
  yield FADE(false, 2.0);
  yield SAY('Narator', 'Fajar Jumat Kliwon. Kabut menipis, dan burung-burung kembali bersuara di Gunung Pandan.');
  yield SAY('Narator', 'Di kejauhan, rombongan warga mulai naik membawa tumpeng dan bunga untuk sedekah bumi.');
  if (END === 'A') {
    yield DO(() => { cineTo(GATE.x - 0.6, 2.0, GATE.z - 8.4, GATE.x - 3.4, 1.5, GATE.z - 3.8, 1.6); });
    yield SAY('Bayu', 'Ka... Din. Terima kasih. Dua puluh tujuh tahun aku ingin mengatakan itu.');
    yield SAY('Laras', '(dari sampingnya, lembut) Kalian juga, hati-hati di jalan turun.');
    yield WFLASH(1.8);
    yield DO(() => { hideFig(); bayu.g.visible = false; sfx.chime(); followCam(); });
  } else if (END === 'B') {
    yield DO(() => { cineTo(GATE.x - 0.6, 2.0, GATE.z - 8.4, GATE.x - 2.6, 1.5, GATE.z - 3.6, 1.6); });
    yield SAY('Bayu', 'Aku masih harus menemaninya, Ka. Tahun depan, kalau kamu berani... menolehlah lebih cepat.');
    yield DO(() => { bayu.g.visible = false; sfx.whisper(); followCam(); });
  } else {
    yield SAY('Dinda', 'Ka... kamu diam terus dari tadi. Kamu kenapa?');
    yield SAY('Raka', '(Tidak ada yang berjalan di belakang kami. Tidak ada.)');
  }
  yield DO(() => { dinda.follow = true; followCam(); });
  yield* walkAlone('Turun ke pos jaga. Mbah Karto menunggu.');
  yield GOTO(mbah.x + 0.6, mbah.z - 3.0, 3.0);
  yield* stopAlone();
  yield DO(() => { dinda.follow = false; faceTo(raka, mbah.x, mbah.z); faceTo(dinda, mbah.x, mbah.z); frame2(raka, mbah, 4.6, 1, 1.6); });
  if (END === 'A') {
    yield SAY('Mbah Karto', 'Empat orang naik di tahun 99. Tiga yang turun. Semalam, akhirnya, yang keempat ikut turun.');
    yield SAY('Raka', 'Mbah tahu?');
    yield SAY('Mbah Karto', 'Dua puluh tujuh tahun Mbah berjaga di sini. Menunggu ada yang mau menoleh untuk Laras.');
    yield SAY('Mbah Karto', 'Aturan itu bukan untuk menakuti. Jangan pakai hijau muda, supaya kalian tak dikira dia. Jangan ambil apa pun, supaya tak berhutang padanya.');
    yield SAY('Mbah Karto', 'Jangan menoleh, supaya kalian tak lari terlalu cepat ke arah yang belum siap. Tapi ada satu orang, satu malam, yang harus melanggarnya.');
    yield SAY('Raka', 'Aku menoleh, Mbah.');
    yield SAY('Mbah Karto', 'Ya. Dan itu satu-satunya pantangan yang boleh dilanggar. Terima kasih, Nak.');
    yield SAY('Narator', 'Matahari naik di atas Gunung Pandan. Di pos jaga, lampu minyak padam dengan sendirinya. Malam itu tak ada lagi yang memanggil dari belakang.');
  } else if (END === 'B') {
    yield SAY('Mbah Karto', 'Kalian turun berdua. Tapi wajah kalian... masih ada yang belum selesai.');
    yield SAY('Raka', 'Dia belum sepenuhnya tenang, Mbah. Ada yang belum kukembalikan dengan benar.');
    yield SAY('Mbah Karto', 'Kadang cukup untuk satu malam. Sesajen dan selendang harus kembali dengan hormat, dan hati yang menoleh harus utuh.');
    yield SAY('Mbah Karto', 'Suro tahun depan, naiklah lagi. Bawa yang belum kalian bawa.');
    yield SAY('Narator', 'Pagi terasa terang, tetapi jauh di hutan sana, seseorang masih menunggu dipanggil dengan namanya.');
  } else {
    yield SAY('Mbah Karto', 'Nak... jangan menoleh.');
    yield SAY('Mbah Karto', '(menatap ke belakang Raka, sangat pelan) Berapa yang naik, dan berapa yang turun?');
    yield SAY('Raka', 'Kami berdua, Mbah. Kan?');
    yield DO(() => { sfx.stepsBehind(6, 0.6); sfx.whisper(); });
    yield SAY('Mbah Karto', 'Sudah Mbah katakan. Dia paling suka orang yang berjalan sambil ketakutan.');
    yield SAY('Narator', 'Di belakang mereka, sangat pelan, seseorang mengikuti dari jarak beberapa langkah.');
    yield DO(() => { sfx.whisper(); addFear(0.4); });
    yield SAY('Suara', '(dari belakang) ...Raka... tunggu aku...');
  }
  yield FADE(true, 2.0);
  const names = { A: 'Yang Keempat Pulang', B: 'Belum Selesai', C: 'Yang Keempat Ikut Turun' };
  yield CARD('TAMAT', names[END] || '', 5);
  yield DO(() => { state = 'end'; ctrl = 'none'; saveGame(); showEndPanel(END, names[END]); });
}
function showEndPanel(END, name) {
  const msg = END === 'A' ? 'Kamu mendapat akhir terbaik: sesajen, selendang, dan hatimu menoleh pada waktunya.' : (END === 'B' ? 'Ada akhir yang lebih baik. Coba lengkapi sesajen dan selendang, lalu jawab Laras dengan tulus.' : 'Ada dua akhir lain. Coba nyalakan lilin, kembalikan selendang, dan jawab Laras dengan lembut.');
  showPanel('<div class="board"><h1>Tamat</h1><h2>' + name + '</h2><p>' + msg + '</p><button class="cta" data-do="new">Main lagi dari awal</button><button class="cta alt" data-do="bab3">Ulangi Bab 3</button><button class="cta alt" data-do="credits">Kredit aset</button><button class="cta alt" data-do="menu">Ke menu</button></div>');
}
function showCredits() {
  showPanel('<div class="board"><h1>Kredit</h1><h2>Selendang Hijau</h2><ul>' +
    '<li>Cerita fiksi berlatar legenda Gunung Pandan, Bojonegoro. Seluruh tokoh dan pantangan tambahan adalah karangan.</li>' +
    '<li>Tokoh pria: paket Animated Men oleh Quaternius (CC0).</li>' +
    '<li>Tokoh perempuan: \"human npc\" oleh opavikE3530H (Sketchfab).</li>' +
    '<li>Pohon: \"Tree Animate\" oleh RandyGF (Sketchfab), lisensi CC BY 4.0. Dimodifikasi: dipisah, dikecilkan, dan diberi tingkat detail.</li>' +
    '<li>Gerbang: \"Torii Gate - 3D Model\" oleh Scarit (Sketchfab).</li>' +
    '<li>Gunung: \"Paramount Mountain 2012\" oleh Victor Hugo Ochoa (Sketchfab).</li>' +
    '<li>Rumput: \"realistics grass 10\" oleh POLYSCAN (Sketchfab).</li>' +
    '<li>Awan: paket \"cartoon night sky\" (Sketchfab).</li>' +
    '<li>Mesin 3D: Three.js (MIT).</li></ul><button class="cta" data-do="menu">Kembali</button></div>');
}
function startBab3() {
  resetInput(); hidePanel(); resetWorld();
  if (!S.finds) S.finds = []; if (!S.items) S.items = [];
  state = 'play'; el.fade.style.transition = 'none'; el.fade.style.opacity = '1';
  startScript(bab3());
}

/* =====================  MODEL 3D (.glb / .fbx) OPSIONAL  ===================== */
// Taruh file model di folder utama repo. Game mencoba nama di "files" berurutan; kalau tidak ada, tokoh tetap memakai balok.
// h = tinggi tokoh (meter), rot = putar model (radian) kalau menghadap arah salah (mis. 3.1416 untuk berbalik).
const MODELS = {
  raka: { files: ['raka.glb', 'raka.fbx', 'Smooth_Male_LongSleeve.fbx', 'Male_LongSleeve.fbx', 'Smooth_Male_Casual.fbx', 'Male_Casual.fbx'], h: 1.75, rot: 0, tint: true, pal: { skin: 0xb98a62, hair: 0x18120e, top: 0xb6e3a0, bottom: 0x2b3448 } },
  dinda: { files: ['dinda.glb', 'dinda.fbx'], h: 1.62, rot: 0, pal: { skin: 0xc79a72, hair: 0x120d0a, top: 0x8a2f3a, bottom: 0x2a2a34 } },
  bayu: { files: ['bayu.glb', 'bayu.fbx', 'Smooth_Male_Casual.fbx', 'Male_Casual.fbx', 'Smooth_Male_Shirt.fbx', 'Male_Shirt.fbx'], h: 1.78, rot: 0, pal: { skin: 0xd7a67d, hair: 0x2a2018, top: 0xd9782b, bottom: 0x3a4a3a } },
  mbah: { files: ['mbah.glb', 'mbah.fbx', 'Smooth_Male_Suit.fbx', 'Male_Suit.fbx'], h: 1.62, rot: 0, pal: { skin: 0xb98a60, hair: 0xe6e6e0, top: 0x2a2a35, bottom: 0x2a2a35 } },
  laras: { files: ['laras.glb', 'laras.fbx'], h: 1.9, rot: 0, pal: { skin: 0xb8c4bd, hair: 0x07090a, top: 0xbfeec4, bottom: 0x101418 } }
};
const gltfLoader = new GLTFLoader(), fbxLoader = new FBXLoader();
let animToastShown = false;
// FBXLoader menganggap warna file sebagai sRGB, padahal Blender menyimpannya linear. Akibatnya warna jadi sangat gelap.
// Di sini warnanya dikembalikan lalu bahan diganti Lambert (lebih ringan) agar cocok dengan cahaya dunia game.
const FBX_NAMED = { tietexture: 0x2a1218, details: 0x8a7a4a, eyes: 0x0b0b0b };
function prepFbx(root) {
  root.traverse(o => {
    if (!o.isMesh) return;
    const arr = Array.isArray(o.material), mats = arr ? o.material : [o.material];
    const out = mats.map(m => {
      if (!m) return m;
      let mat;
      if (m.map) mat = LMat({ map: m.map, roughness: 0.85, metalness: 0 });
      else {
        const c = m.color ? m.color.clone() : new THREE.Color(0xffffff);
        c.convertLinearToSRGB();
        const key = String(m.name || '').toLowerCase().replace(/\s|\.\d+$/g, '');
        if (FBX_NAMED[key] !== undefined && c.r > 0.98 && c.g > 0.98 && c.b > 0.98) c.setHex(FBX_NAMED[key]);
        mat = LMat({ color: c, roughness: 0.85, metalness: 0 });
      }
      mat.name = m.name || '';
      return mat;
    });
    o.material = arr ? out : out[0];
  });
}
const BUILD = 'v16';
const verEl = document.createElement('div');
Object.assign(verEl.style, { position: 'fixed', left: '6px', bottom: '4px', zIndex: '50', pointerEvents: 'none', font: '11px monospace', color: '#9aa596', opacity: '0.75' });
if (document.body) document.body.appendChild(verEl);
const modelState = {};
function updVer() { verEl.textContent = BUILD + ' | ' + Object.keys(MODELS).concat(['pohon', 'gunung', 'torii', 'rumput', 'awan']).map(k => k + ':' + (modelState[k] || '-')).join(' '); }
let rakaTopHex = 0xb6e3a0;
function geoAxes(g) {
  g.computeBoundingBox(); const b = g.boundingBox;
  const mn = [b.min.x, b.min.y, b.min.z], mx = [b.max.x, b.max.y, b.max.z], ext = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
  const up = ext[1] >= ext[0] && ext[1] >= ext[2] ? 1 : (ext[2] >= ext[0] ? 2 : 0);
  const side = up === 0 ? (ext[1] >= ext[2] ? 1 : 2) : (up === 1 ? (ext[0] >= ext[2] ? 0 : 2) : (ext[0] >= ext[1] ? 0 : 1));
  return { mn, up, side, h: ext[up] || 1, cs: (mn[side] + mx[side]) / 2, hw: (ext[side] / 2) || 1 };
}
function vertT(pos, ax, i) {
  const v = a => a === 0 ? pos.getX(i) : (a === 1 ? pos.getY(i) : pos.getZ(i));
  return { t: (v(ax.up) - ax.mn[ax.up]) / ax.h, a: Math.abs(v(ax.side) - ax.cs) / ax.hw };
}
// Warnai bagian baju (dada-perut) dengan warna tertentu, apa pun cara model menyimpan warnanya.
function tintTop(root, hex, pal) {
  let named = false;
  root.traverse(o => {
    if (!o.isMesh) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      if (m && m.color && /shirt|top|jacket|sweater|hoodie/i.test(m.name || '')) { m.map = null; m.color.setHex(hex); named = true; }
    });
  });
  if (named) return;
  const meshes = []; root.traverse(o => { if (o.isMesh) meshes.push(o); });
  meshes.forEach(o => {
    const g = o.geometry, pos = g && g.attributes && g.attributes.position; if (!pos || !pos.count) return;
    const ax = geoAxes(g), col = g.attributes.color, c = new THREE.Color().setHex(hex);
    if (col) {
      g.userData = g.userData || {}; if (!g.userData.orig) g.userData.orig = col.array.slice();
      const base = g.userData.orig;
      for (let i = 0; i < pos.count; i++) {
        const q = vertT(pos, ax, i), inTop = q.t >= 0.5 && q.t < 0.83 && !(q.a > 0.8 && q.t < 0.58);
        col.array[3 * i] = inTop ? c.r : base[3 * i]; col.array[3 * i + 1] = inTop ? c.g : base[3 * i + 1]; col.array[3 * i + 2] = inTop ? c.b : base[3 * i + 2];
      }
      col.needsUpdate = true; return;
    }
    if (Array.isArray(o.material) && g.groups && g.groups.length > 1) {
      const sums = {};
      g.groups.forEach(gr => {
        const k = gr.materialIndex, e = sums[k] || (sums[k] = { s: 0, n: 0 });
        for (let i = gr.start; i < gr.start + gr.count && i < pos.count; i++) { e.s += vertT(pos, ax, i).t; e.n++; }
      });
      let best = -1, bn = 0;
      for (const k in sums) { const m = sums[k].s / (sums[k].n || 1); if (m >= 0.5 && m < 0.85 && sums[k].n > bn) { best = +k; bn = sums[k].n; } }
      const mat = best >= 0 ? o.material[best] : null;
      if (mat && mat.color) { mat.map = null; mat.color.setHex(hex); if (mat.emissive) mat.emissive.copy(mat.color).multiplyScalar(0.16); mat.needsUpdate = true; return; }
    }
    const P = pal || {};
    bandColor(o, { skin: P.skin || 0xc79a72, hair: P.hair || 0x18120e, top: hex, bottom: P.bottom || 0x2a2f3a, shoe: 0x1c1a18 });
  });
}
function setRakaTop(hex) { rakaTopHex = hex; raka.p.topMat.color.setHex(hex); if (raka.root3d) tintTop(raka.root3d, hex, MODELS.raka.pal); }

function loadModelFile(files, i, ok, fail) {
  if (i >= files.length) { fail(); return; }
  const f = files[i], isFbx = /\.fbx$/i.test(f);
  (isFbx ? fbxLoader : gltfLoader).load(f, obj => ok(isFbx ? { scene: obj, animations: obj.animations || [] } : obj, f), undefined, () => loadModelFile(files, i + 1, ok, fail));
}
let colorToastShown = false;
function bandColor(mesh, P) {
  const g = mesh.geometry, pos = g && g.attributes && g.attributes.position; if (!pos || !pos.count) return false;
  g.computeBoundingBox(); const b = g.boundingBox;
  const mn = [b.min.x, b.min.y, b.min.z], mx = [b.max.x, b.max.y, b.max.z], ext = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
  const up = ext[1] >= ext[0] && ext[1] >= ext[2] ? 1 : (ext[2] >= ext[0] ? 2 : 0);
  const side = up === 0 ? (ext[1] >= ext[2] ? 1 : 2) : (up === 1 ? (ext[0] >= ext[2] ? 0 : 2) : (ext[0] >= ext[1] ? 0 : 1));
  const val = (i, ax) => ax === 0 ? pos.getX(i) : (ax === 1 ? pos.getY(i) : pos.getZ(i));
  const h = ext[up] || 1, cs = (mn[side] + mx[side]) / 2, hw = (ext[side] / 2) || 1;
  const cols = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = (val(i, up) - mn[up]) / h, ax = Math.abs(val(i, side) - cs) / hw; let hex;
    if (t < 0.05) hex = P.shoe; else if (t < 0.5) hex = P.bottom; else if (t >= 0.83) hex = t > 0.955 ? P.hair : P.skin; else hex = (ax > 0.8 && t < 0.58) ? P.skin : P.top;
    c.setHex(hex); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  mesh.material = LMat({ vertexColors: true, roughness: 0.9, metalness: 0 });
  return true;
}
function fixModelColors(root, cfg, fname) {
  const pal = cfg.pal || {}, P = { skin: pal.skin || 0xc79a72, hair: pal.hair || 0x18120e, top: pal.top || 0x3a6a8a, bottom: pal.bottom || 0x2a2f3a, shoe: 0x1c1a18 };
  const meshes = []; root.traverse(o => { if (o.isMesh) meshes.push(o); });
  let fixed = 0; const names = [];
  meshes.forEach(o => {
    const hasVC = !!(o.geometry && o.geometry.attributes && o.geometry.attributes.color);
    const arr = Array.isArray(o.material), mats = arr ? o.material : [o.material];
    const out = mats.map((m, i) => {
      if (!m) return m;
      const mapBad = !!m.map && !(m.map.image && (m.map.image.width > 0 || m.map.image.videoWidth > 0));
      const white = !m.color || (m.color.r > 0.9 && m.color.g > 0.9 && m.color.b > 0.9);
      names.push(m.name || ('bahan' + i));
      if (hasVC || (m.map && !mapBad) || (!mapBad && !white)) return m;
      const n = String(m.name || '').toLowerCase(); let c;
      if (/skin|face|head|hand|body|flesh/.test(n)) c = P.skin;
      else if (/hair|beard|brow|mustache/.test(n)) c = P.hair;
      else if (/shoe|boot|foot|feet|sole/.test(n)) c = P.shoe;
      else if (/pant|trouser|jean|short|leg|bottom/.test(n)) c = P.bottom;
      else if (/shirt|top|cloth|jacket|sweater|suit|coat|torso|sleeve/.test(n)) c = P.top;
      else c = [P.skin, P.top, P.bottom, P.hair, P.shoe][(i + fixed) % 5];
      fixed++;
      return LMat({ color: c, roughness: 0.9, metalness: 0 });
    });
    if (fixed && meshes.length === 1 && mats.length === 1 && bandColor(o, P)) return;
    o.material = arr ? out : out[0];
  });
  root.traverse(o => { if (!o.isMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m && m.emissive && m.color && !m.userData.lit) { m.userData.lit = true; m.emissive.copy(m.color).multiplyScalar(0.05); } }); });
  if (fixed && !colorToastShown) { colorToastShown = true; toast('Warna model tidak terbaca, dipakai warna cadangan (' + fname + '; bahan: ' + names.slice(0, 6).join(', ') + ')', 9000); }
}
function attachModel(target, cfg, key) {
  loadModelFile(cfg.files, 0, (gltf, fname) => {
    try {
      const root = gltf.scene, g = target.g;
      root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      if (/\.fbx$/i.test(fname)) prepFbx(root);
      else root.traverse(o => { if (o.isMesh && o.material && o.material.map && !o.material.isMeshLambertMaterial) { const m0 = o.material, n0 = new THREE.MeshLambertMaterial({ map: m0.map, side: m0.side }); n0.name = m0.name; o.material = n0; } });
      const size = new THREE.Vector3(); new THREE.Box3().setFromObject(root).getSize(size);
      root.scale.setScalar(cfg.h / Math.max(0.01, size.y) / (g.scale.y || 1));
      root.position.y = -new THREE.Box3().setFromObject(root).min.y;
      const holder = new THREE.Group(); holder.rotation.y = cfg.rot || 0; holder.add(root);
      g.children.slice().forEach(c => { c.visible = false; });
      g.add(holder);
      target.root3d = root; modelState[key] = fname.replace(/\.(fbx|glb)$/i, '').replace(/^Smooth_/, 'S_'); updVer();
      setTimeout(() => { try { fixModelColors(root, cfg, fname); if (cfg.tint) tintTop(root, rakaTopHex, cfg.pal); } catch (e) { console.warn('warna model:', e); } }, 1500);
      if (gltf.animations && gltf.animations.length) {
        const mixer = new THREE.AnimationMixer(root), acts = {}, names = [];
        gltf.animations.forEach(cl => {
          const n = String(cl.name || '').toLowerCase(); names.push(cl.name);
          if (/idle|stand|breath|wait|rest/.test(n)) { if (!acts.idle) acts.idle = mixer.clipAction(cl); }
          else if (/walk/.test(n)) { if (!acts.walk) acts.walk = mixer.clipAction(cl); }
        });
        if (!acts.walk) gltf.animations.forEach(cl => { if (!acts.walk && /run|jog/.test(String(cl.name || '').toLowerCase())) acts.walk = mixer.clipAction(cl); });
        if (!acts.idle) acts.idle = mixer.clipAction(gltf.animations[0]);
        if (!acts.walk && !animToastShown) { animToastShown = true; toast(fname + ': animasi = ' + names.join(', '), 9000); }
        acts.idle.play(); target.mixer = mixer; target.acts = acts; target.cur = 'idle';
      }
    } catch (e) { console.warn('Model gagal dipasang (' + fname + '):', e); }
  }, () => { modelState[key] = 'x'; updVer(); });
}
[['raka', raka], ['dinda', dinda], ['bayu', bayu], ['mbah', mbah]].forEach(p => attachModel(p[1], MODELS[p[0]], p[0]));
attachModel(fig, MODELS.laras, 'laras');
updVer();

/* =====================  HUTAN POHON ASLI (pohon.glb: LOD + instancing)  ===================== */
// pohon.glb berisi 3 jenis pohon x 3 tingkat detail (Tree_A_L0 dekat, _L1 sedang, _L2 jauh).
// Semua pohon digambar dengan InstancedMesh dan tingkat detailnya dipilih dari jarak ke pemain,
// jadi hutan penuh pohon asli tanpa membebani HP. Pohon 'bulat' lama hanya dipakai bila file ini gagal dimuat.
const LODCAP = [6, 20, 44];
let LODK = QUAL === 'high' ? 1.25 : (QUAL === 'low' ? 0.55 : 1);
const treeLOD = { ready: false, spots: [], buckets: null };
const _to = new THREE.Object3D();
gltfLoader.load('pohon.glb', gltf => {
  try {
    const parts = [[], [], []], mats = {};
    gltf.scene.children.forEach(ch => {
      const m = /^Tree_([ABC])_L([012])$/.exec(ch.name); if (!m) return;
      const list = []; ch.traverse(o => { if (o.isMesh) list.push(o); });
      parts['ABC'.indexOf(m[1])][+m[2]] = list;
    });
    if (!parts[0][0]) { modelState.pohon = 'x(LOD)'; updVer(); return; }
    const matOf = o => {
      const src = o.material, nm = (src && src.name) || 'bark';
      if (!mats[nm]) mats[nm] = new THREE.MeshLambertMaterial({ map: src.map, alphaTest: src.alphaTest || 0, side: src.side });
      return mats[nm];
    };
    treeLOD.buckets = [0, 1, 2].map(L => [0, 1, 2].map(v => (parts[v][L] || []).map(o => {
      const im = new THREE.InstancedMesh(o.geometry, matOf(o), LODCAP[L]); im.count = 0; im.frustumCulled = false; scene.add(im); return im;
    })));
    let sd = 9137; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    const cand = TREE_SPOTS.slice();
    for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)), t = cand[i]; cand[i] = cand[j]; cand[j] = t; }
    cand.forEach(sp => {
      const k = 0.8 + rnd() * 0.5, md = 5.5 + 2.2 * k;
      if (treeLOD.spots.some(a => Math.hypot(a.x - sp.x, a.z - sp.z) < Math.max(md, a.md))) {
        if (sp.c) { const ci = circles.indexOf(sp.c); if (ci >= 0) circles.splice(ci, 1); }
        return;
      }
      if (sp.c) sp.c.r = 0.55 * k;
      treeLOD.spots.push({ x: sp.x, z: sp.z, y: groundY(sp.x, sp.z) - 0.15, k, md, ry: rnd() * 6.28, v: treeLOD.spots.length % 3 });
    });
    BLOBS.forEach(b => { b.visible = false; });
    treeLOD.ready = true; modelState.pohon = treeLOD.spots.length + 'x'; updVer();
  } catch (e) { console.warn('pohon.glb gagal dipasang:', e); modelState.pohon = 'err'; updVer(); }
}, undefined, () => { modelState.pohon = 'x'; updVer(); });
let lodT = 0;
function updateTreeLOD(dt) {
  if (!treeLOD.ready) return;
  lodT -= dt; if (lodT > 0) return; lodT = 0.3;
  const px = raka.x, pz = raka.z, vis = 1.75 / Math.max(0.005, scene.fog ? scene.fog.density : 0.02);
  const D = [Math.min(16 * LODK, vis * 0.3), Math.min(38 * LODK, vis * 0.6), Math.min(80 * LODK, vis)];
  const near = [];
  for (const t of treeLOD.spots) { const d = Math.hypot(t.x - px, t.z - pz); if (d < D[2]) near.push([d, t]); }
  near.sort((a, b) => a[0] - b[0]);
  const cnt = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], tot = [0, 0, 0];
  for (const e of near) {
    const d = e[0], t = e[1];
    let L = d < D[0] ? 0 : (d < D[1] ? 1 : 2);
    while (L < 3 && tot[L] >= LODCAP[L]) L++;
    if (L >= 3) continue;
    const idx = cnt[L][t.v]++; tot[L]++;
    _to.position.set(t.x, t.y, t.z); _to.rotation.set(0, t.ry, 0); _to.scale.setScalar(t.k); _to.updateMatrix();
    for (const im of treeLOD.buckets[L][t.v]) im.setMatrixAt(idx, _to.matrix);
  }
  for (let L = 0; L < 3; L++) for (let v = 0; v < 3; v++) for (const im of treeLOD.buckets[L][v]) { im.count = cnt[L][v]; im.instanceMatrix.needsUpdate = true; }
}

/* =====================  LINGKUNGAN: GUNUNG, AWAN, GERBANG TORII, RUMPUT  ===================== */
// Warna per suasana untuk gunung latar dan awan (dicampur mulus oleh applyMood lewat envApply).
Object.assign(MOODS.dusk, { cloud: C(0xf2a98a), cloudA: 0.85, mount: C(0x86687c) });
Object.assign(MOODS.night, { cloud: C(0x4a5c96), cloudA: 0.6, mount: C(0x1c2540) });
Object.assign(MOODS.deep, { cloud: C(0x222c50), cloudA: 0.55, mount: C(0x0d1220) });
Object.assign(MOODS.petil, { cloud: C(0x1e3a36), cloudA: 0.5, mount: C(0x0d1a1a) });
const DEF_CLOUD = C(0x888899), DEF_MOUNT = C(0x333344);
const cloudMat = new THREE.MeshBasicMaterial({ color: 0xf2a98a, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
const mountMat = new THREE.MeshBasicMaterial({ color: 0x86687c, fog: false, side: THREE.DoubleSide });
function envApply(a, b, t) {
  cloudMat.color.lerpColors(a.cloud || DEF_CLOUD, b.cloud || DEF_CLOUD, t);
  cloudMat.opacity = lerp(a.cloudA === undefined ? 0.6 : a.cloudA, b.cloudA === undefined ? 0.6 : b.cloudA, t);
  mountMat.color.lerpColors(a.mount || DEF_MOUNT, b.mount || DEF_MOUNT, t);
}

/* awan: lembar awan dipotong-potong jadi beberapa bidang di kubah langit */
const cloudGroup = new THREE.Group(); scene.add(cloudGroup);
const CLOUD_RECTS = [[0.0233, 0.5949, 0.7127, 0.8724], [0.01, 0.2553, 0.5613, 0.5084], [0.5593, 0.3914, 0.9753, 0.5992], [0.3033, 0.0243, 0.6487, 0.2236], [0.714, 0.6392, 0.9747, 0.8829], [0.014, 0.0264, 0.2993, 0.2321], [0.7147, 0.0327, 0.91, 0.2911]];
new THREE.TextureLoader().load('awan.png', tex => {
  try {
    tex.colorSpace = THREE.SRGBColorSpace; cloudMat.map = tex; cloudMat.needsUpdate = true;
    const asp = 1024 / 647;
    CLOUD_RECTS.forEach((r, i) => {
      const wU = r[2] - r[0], hV = r[3] - r[1], wW = 150 + 90 * wU, hW = wW * (hV / wU) / asp;
      const g = new THREE.PlaneGeometry(wW, hW), uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, r[0] + uv.getX(k) * wU, (1 - r[3]) + uv.getY(k) * hV);
      const m = new THREE.Mesh(g, cloudMat), az = (i / CLOUD_RECTS.length) * Math.PI * 2 + 0.4, el = (16 + ((i * 37) % 26)) * Math.PI / 180;
      m.position.set(Math.sin(az) * Math.cos(el) * 235, Math.sin(el) * 235, -Math.cos(az) * Math.cos(el) * 235);
      m.lookAt(0, 0, 0); m.renderOrder = -5; m.frustumCulled = false; cloudGroup.add(m);
    });
    modelState.awan = 'ok'; updVer();
  } catch (e) { console.warn('awan gagal dipasang:', e); modelState.awan = 'err'; updVer(); }
}, undefined, () => { modelState.awan = 'x'; updVer(); });

/* gunung latar (menggantikan kerucut polos) */
gltfLoader.load('gunung.glb', gltf => {
  try {
    let src = null; gltf.scene.traverse(o => { if (!src && o.isMesh) src = o; });
    if (!src) return;
    mountMat.map = src.material.map; mountMat.needsUpdate = true;
    [[-40, -10, -300, 26, 0.2], [190, -10, -335, 22, -0.75], [-250, -10, -320, 20, 0.95]].forEach(p => {
      const m = new THREE.Mesh(src.geometry, mountMat); m.position.set(p[0], p[1], p[2]); m.scale.set(p[3], p[3] * 0.95, p[3]); m.rotation.y = p[4]; m.frustumCulled = false; scene.add(m);
    });
    PEAKS.forEach(pk => { pk.visible = false; }); modelState.gunung = 'ok'; updVer();
  } catch (e) { console.warn('gunung.glb gagal dipasang:', e); modelState.gunung = 'err'; updVer(); }
}, undefined, () => { modelState.gunung = 'x'; updVer(); });

/* gerbang torii: satu di pintu masuk jalan setapak samping (Bab 2), satu di petilasan */
gltfLoader.load('torii.glb', gltf => {
  try {
    let src = null; gltf.scene.traverse(o => { if (!src && o.isMesh) src = o; });
    if (!src) return;
    const mat = new THREE.MeshLambertMaterial({ map: src.material.map, side: THREE.DoubleSide });
    const put = (x, z, ry) => {
      const m = new THREE.Mesh(src.geometry, mat); m.position.set(x, groundY(x, z) - 0.05, z); m.rotation.y = ry; scene.add(m);
      const c = Math.cos(ry), sn = Math.sin(ry);
      [-2.0, 2.0].forEach(o => circles.push({ x: x + c * o, z: z - sn * o, r: 0.45 }));
    };
    const dx = SIDE[0][0] - SIDE0.x, dz = SIDE[0][1] - SIDE0.z, dl = Math.hypot(dx, dz);
    put(SIDE0.x + dx / dl * 1.6, SIDE0.z + dz / dl * 1.6, Math.atan2(dx, dz));
    put(CL.x, CL.z + 9, 0);
    modelState.torii = 'ok'; updVer();
  } catch (e) { console.warn('torii.glb gagal dipasang:', e); modelState.torii = 'err'; updVer(); }
}, undefined, () => { modelState.torii = 'x'; updVer(); });

/* rumput: petak rumput asli ditebar mengelilingi pemain (tiga tingkat detail), tidak di jalan setapak */
const grass = { ready: false, im: null, caps: [2, 8, 26] };
const GC = 4;
function gh(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
gltfLoader.load('rumput.glb', gltf => {
  try {
    const lods = [];
    gltf.scene.children.forEach(ch => { const m = /^Rumput_L([012])$/.exec(ch.name); if (!m) return; let mesh = null; ch.traverse(o => { if (!mesh && o.isMesh) mesh = o; }); lods[+m[1]] = mesh; });
    if (!lods[0]) { modelState.rumput = 'x(LOD)'; updVer(); return; }
    const src = lods[0].material, mat = new THREE.MeshLambertMaterial({ map: src.map, alphaTest: src.alphaTest || 0.5, side: THREE.DoubleSide });
    grass.im = [0, 1, 2].map(L => {
      const im = new THREE.InstancedMesh((lods[L] || lods[2]).geometry, mat, grass.caps[L]); im.count = 0; im.frustumCulled = false; scene.add(im); return im;
    });
    grass.ready = true; modelState.rumput = 'ok'; updVer();
  } catch (e) { console.warn('rumput.glb gagal dipasang:', e); modelState.rumput = 'err'; updVer(); }
}, undefined, () => { modelState.rumput = 'x'; updVer(); });
function grassOk(x, z) {
  if (z < 26 && z > -150 && Math.abs(x - trailX(z)) < 2.2) return false;
  if (Math.hypot(x - HUT.x, z - HUT.z) < 5 || Math.hypot(x - GATE.x, z - GATE.z) < 5.5 || Math.hypot(x - POS1.x, z - POS1.z) < 5) return false;
  const q = nearOnPoly([[SIDE0.x, SIDE0.z]].concat(SIDE), x, z); if (Math.hypot(x - q[0], z - q[1]) < 1.6) return false;
  if (x > 400 && Math.hypot(x - CL.x, z - (CL.z - 5.4)) < 6) return false;
  return true;
}
let grT = 0;
function updateGrass(dt) {
  if (!grass.ready) return;
  grT -= dt; if (grT > 0) return; grT = 0.35;
  if (QUAL === 'low') { for (let L = 0; L < 3; L++) grass.im[L].count = 0; return; }   // mode hemat: tanpa rumput
  const px = raka.x, pz = raka.z, vis = 1.75 / Math.max(0.005, scene.fog ? scene.fog.density : 0.02);
  const D = [Math.min(7 * LODK, vis * 0.25), Math.min(17 * LODK, vis * 0.55), Math.min(28 * LODK, vis * 0.9)], R = D[2];
  const i0 = Math.floor((px - R) / GC), i1 = Math.floor((px + R) / GC), j0 = Math.floor((pz - R) / GC), j1 = Math.floor((pz + R) / GC), near = [];
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    if (gh(i, j) > 0.75) continue;
    const x = (i + 0.15 + 0.7 * gh(i + 91, j)) * GC, z = (j + 0.15 + 0.7 * gh(i, j + 57)) * GC, d = Math.hypot(x - px, z - pz);
    if (d > R || !grassOk(x, z)) continue;
    near.push([d, x, z, i, j]);
  }
  near.sort((a, b) => a[0] - b[0]);
  const cnt = [0, 0, 0];
  for (const e of near) {
    let L = e[0] < D[0] ? 0 : (e[0] < D[1] ? 1 : 2);
    while (L < 3 && cnt[L] >= grass.caps[L]) L++;
    if (L >= 3) continue;
    const idx = cnt[L]++, k = 0.8 + 0.7 * gh(e[3] + 13, e[4] + 7);
    _to.position.set(e[1], groundY(e[1], e[2]) - 0.03, e[2]); _to.rotation.set(0, gh(e[3] + 29, e[4] + 3) * 6.283, 0); _to.scale.setScalar(k); _to.updateMatrix();
    grass.im[L].setMatrixAt(idx, _to.matrix);
  }
  for (let L = 0; L < 3; L++) { grass.im[L].count = cnt[L]; grass.im[L].instanceMatrix.needsUpdate = true; }
}

/* =====================  ALUR APLIKASI  ===================== */
let state = 'title';
function showTitle() {
  state = 'title'; ctrl = 'none'; SCRIPT = null; WAIT = null; dlgHide(); setObj(''); resetWorld();
  el.choices.classList.remove('on'); el.card.classList.remove('on'); el.act.classList.remove('on');
  el.fade.style.transition = 'none'; el.fade.style.opacity = '0';
  setMood('dusk');
  place(raka, START.x, START.z, Math.PI); place(dinda, START.x - 1.7, START.z + 2.0, Math.PI); place(bayu, START.x + 1.8, START.z + 2.6, Math.PI); place(mbah, MK.x, MK.z, 0); faceTo(mbah, START.x, START.z);
  cineTo(START.x + 6, 3.4, START.z + 8, 0, 12, -50, 3); snapCam();
  showPanel('<div class="board"><h1>Selendang Hijau</h1><h2>Horor Gunung Pandan</h2><p>Tiga pendaki, satu larangan yang dilanggar. Cerita fiksi berlatar legenda Gunung Pandan, Bojonegoro. Pakai earphone dan putar HP ke mendatar.</p><button class="cta" data-do="new">Mulai Bab 1</button><button class="cta alt" data-do="bab2">Langsung ke Bab 2</button><button class="cta alt" data-do="bab3">Langsung ke Bab 3</button><button class="cta alt" data-do="credits">Kredit aset</button></div>');
}
function startBab1() {
  resetInput(); hidePanel(); S.flags = {}; S.notes = []; S.items = []; S.finds = []; resetWorld(); state = 'play';
  el.fade.style.transition = 'none'; el.fade.style.opacity = '1';
  startScript(bab1());
}
el.panel.addEventListener('click', e => {
  auInit();
  const b = e.target.closest ? e.target.closest('[data-do]') : null; if (!b) return;
  const a = b.dataset.do;
  if (a === 'new') startBab1();
  else if (a === 'bab2') startBab2();
  else if (a === 'bab3') startBab3();
  else if (a === 'credits') showCredits();
  else if (a === 'bright') { cycleBright(); state = 'play'; pauseGame(); }
  else if (a === 'qual') { cycleQual(); state = 'play'; pauseGame(); }
  else if (a === 'resume') { hidePanel(); state = 'play'; }
  else if (a === 'menu') showTitle();
});
function brightLabel() { return BRIGHT < 1.1 ? 'normal' : BRIGHT < 1.5 ? 'terang' : 'sangat terang'; }
function cycleBright() { BRIGHT = BRIGHT < 1.1 ? 1.35 : BRIGHT < 1.5 ? 1.7 : 1; try { localStorage.setItem('sh_bright', String(BRIGHT)); } catch (e) { } applyMood(); }
function qualLabel() { return QUAL === 'auto' ? 'otomatis' : (QUAL === 'high' ? 'tinggi' : 'rendah (hemat baterai)'); }
function cycleQual() {
  QUAL = QUAL === 'auto' ? 'high' : (QUAL === 'high' ? 'low' : 'auto');
  try { localStorage.setItem('sh_qual', QUAL); } catch (e) { }
  PR = QUAL === 'low' ? 0.75 : (QUAL === 'high' ? PR_HI : PR_MAX); renderer.setPixelRatio(PR); LODK = QUAL === 'high' ? 1.25 : (QUAL === 'low' ? 0.55 : 1);
  const sh = QUAL === 'high'; renderer.shadowMap.enabled = sh; dir.castShadow = sh;
  scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m) m.needsUpdate = true; }); });
  resize();
}
function pauseGame() {
  if (state !== 'play') return;
  state = 'pause'; resetInput();
  showPanel('<div class="board"><h1>Dijeda</h1><p>Hutan menunggu dengan sabar.</p><button class="cta" data-do="resume">Lanjut</button><button class="cta alt" data-do="bright">Kecerahan: ' + brightLabel() + '</button><button class="cta alt" data-do="qual">Kualitas: ' + qualLabel() + '</button><button class="cta alt" data-do="menu">Ke menu</button></div>');
}
$('#pauseBtn').addEventListener('click', pauseGame);
$('#muteBtn').addEventListener('click', () => { auInit(); AU.on = !AU.on; if (AU.master) AU.master.gain.value = AU.on ? 0.6 : 0; $('#muteBtn').textContent = AU.on ? '🔊' : '🔇'; });
$('#noteBtn').addEventListener('click', () => {
  const all = S.notes.map(n => '<li>' + n + '</li>').concat((S.finds || []).map(f => '<li>🔎 ' + f + '</li>'));
  el.noteList.innerHTML = all.length ? all.join('') : '<li>Belum ada catatan.</li>';
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
  beam.visible = !goal.quiet;
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
  if (state === 'play' || state === 'end') updateB2(dt, clock);
  updateTreeLOD(dt);
  updateGrass(dt);
  updateActors(dt, clock);
  updateCamera(dt);
  // matahari/bulan dan bayangan mengikuti pemain
  dir.position.set(raka.x + LIGHT_DIR[0] * 60, raka.y + LIGHT_DIR[1] * 60, raka.z + LIGHT_DIR[2] * 60);
  dir.target.position.set(raka.x, raka.y, raka.z);
  sky.position.set(camera.position.x, camera.position.y, camera.position.z);
  cloudGroup.position.set(camera.position.x, camera.position.y, camera.position.z); cloudGroup.rotation.y += dt * 0.0015;
  for (const l of lamps) l.l.intensity = l.base * (0.93 + 0.07 * Math.sin(clock * 11) + (Math.random() < 0.02 ? -0.15 : 0));
  flies.rotation.y += dt * 0.05; flies.position.y = Math.sin(clock * 0.8) * 0.15;
  renderer.render(scene, camera);
  if (raw > 0 && raw < 0.5) {
    avg += raw; avgN++;
    if (avgN >= 60) {
      if (QUAL === 'auto' && avg / avgN > 0.045) { if (LODK > 0.55) { LODK = Math.max(0.5, LODK - 0.2); } else if (PR > 0.9) { PR = Math.max(0.75, PR - 0.25); renderer.setPixelRatio(PR); resize(); } else if (renderer.shadowMap.enabled) { renderer.shadowMap.enabled = false; dir.castShadow = false; } }
      avg = 0; avgN = 0;
    }
  }
}
if (window.__DEBUG) window.__dbg = { grass, cloudGroup, mountMat, cloudMat, vel, PH, treeLOD, TREE_SPOTS, circles, BLOBS, S, raka, dinda, bayu, mbah, ACT, get state() { return state; }, get goal() { return goal; }, DLG, get ctrl() { return ctrl; }, camera };
showTitle();
requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });
