// ホーム画面の 3D 演出:
// 虚空から巨大なサイバーメカ熊が歩いてきて画面を殴り、
// 液晶ガラスが割れて崩れ落ち、ブログが現れる。
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const root = document.documentElement;
const canvas = document.getElementById('bg3d');
const fx = document.getElementById('shatter');
const shardCanvas = document.getElementById('shards');
const skipBtn = document.getElementById('intro-skip');
const replayBtn = document.getElementById('intro-replay');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const playIntro = root.classList.contains('intro') && !reduced;
window.__introStarted = true;

const isSmall = window.innerWidth < 768;
const BG = 0x030409;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
// the composer encodes the clear colour once more, so hand it over pre-linearised
renderer.setClearColor(new THREE.Color(BG).convertSRGBToLinear());
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(BG, 16, 84);
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 300);
let baseFov = 58;
function fitCamera() {
  camera.aspect = window.innerWidth / window.innerHeight;
  baseFov = camera.aspect < 1 ? 74 : 58;
  camera.fov = baseFov;
  camera.updateProjectionMatrix();
}
fitCamera();

// neon studio reflected in the armor
(function buildEnvironment() {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x020308);
  function panel(color, power, x, y, z, w, h) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide })
    );
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  }
  panel(0x22e6ff, 2.2, -9, 3, -3, 5, 12);
  panel(0xff2d95, 2.2, 9, 2, -3, 5, 12);
  panel(0xffffff, 1.6, 0, 10, 4, 12, 3);
  panel(0xffffff, 0.8, 0, 2, 11, 5, 3);
  panel(0xff5fa8, 0.3, 0, -7, 0, 16, 16);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(env, 0.03).texture;
  pm.dispose();
})();

scene.add(new THREE.AmbientLight(0xffffff, 0.12));
const key = new THREE.DirectionalLight(0xffeef6, 1.5);
key.position.set(5, 10, 12);
scene.add(key);
const rimA = new THREE.DirectionalLight(0x22e6ff, 2.6);
rimA.position.set(-9, 6, -10);
scene.add(rimA);
const rimB = new THREE.DirectionalLight(0xff2d95, 2.6);
rimB.position.set(9, 4, -10);
scene.add(rimB);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.42, 0.4, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- materials ----------
function metal(color, metalness, roughness) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, flatShading: true });
}
function neonMat(color, power) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), fog: false });
}
const M = {
  pink: metal(0xff2f92, 0.55, 0.36),
  deep: metal(0x9c1560, 0.65, 0.36),
  light: metal(0xffa6d0, 0.4, 0.42),
  steel: metal(0x6f7690, 0.95, 0.28),
  dark: metal(0x12141c, 0.9, 0.42),
  glass: metal(0x05060a, 1.0, 0.08),
  nose: metal(0x5b1d7a, 0.8, 0.25),
  cyan: neonMat(0x22e6ff, 1.5),
  hot: neonMat(0xff2d95, 1.5),
  eye: neonMat(0x9ff6ff, 2.2),
};

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const glowTex = glowTexture();
function glow(color, size, parent, x, y, z) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true,
  }));
  s.scale.setScalar(size);
  s.position.set(x, y, z);
  parent.add(s);
  return s;
}
function put(m, parent, x, y, z, rx, ry, rz) {
  m.position.set(x || 0, y || 0, z || 0);
  m.rotation.set(rx || 0, ry || 0, rz || 0);
  parent.add(m);
  return m;
}
const box = (w, h, d, mat, parent, x, y, z, rx, ry, rz) =>
  put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), parent, x, y, z, rx, ry, rz);
const prism = (rt, rb, h, sides, mat, parent, x, y, z, rx, ry, rz) =>
  put(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, sides), mat), parent, x, y, z, rx, ry, rz);
function group(parent, x, y, z) {
  return put(new THREE.Group(), parent, x, y, z);
}
const HALF = Math.PI / 2;

// ---------- cyber mecha bear (faces +z, ~19 units tall) ----------
const LEG = 7.2;
const HIP_Y = 7.5;
function buildBear() {
  const B = {};
  B.root = new THREE.Group();
  B.hips = group(B.root, 0, HIP_Y, 0);
  prism(1.6, 1.15, 1.3, 6, M.dark, B.hips, 0, 0.1, 0).scale.set(1.35, 1, 0.9);
  prism(0.5, 0.5, 4.6, 10, M.steel, B.hips, 0, -0.3, 0, 0, 0, HALF);
  box(1.3, 1.5, 0.5, M.pink, B.hips, 0, -0.45, 0.95, 0.22);
  box(0.9, 0.08, 0.08, M.cyan, B.hips, 0, 0.1, 1.28);
  for (const s of [-1, 1]) {
    box(0.4, 1.9, 1.7, M.pink, B.hips, s * 2.5, -0.5, 0, 0, 0, s * 0.16);
    box(0.08, 1.3, 0.08, M.hot, B.hips, s * 2.74, -0.5, 0.6, 0, 0, s * 0.16);
  }

  function leg(side) {
    const hip = group(B.hips, side * 1.55, -0.3, 0);
    prism(0.6, 0.5, 3.0, 8, M.dark, hip, 0, -1.6, 0);
    prism(1.2, 0.85, 2.6, 6, M.pink, hip, 0, -1.5, 0).scale.z = 1.12;
    box(0.5, 1.9, 0.3, M.deep, hip, 0, -1.45, 1.05, -0.12);
    box(0.08, 1.7, 0.08, M.cyan, hip, side * 1.0, -1.5, 0.3);
    const knee = group(hip, 0, -3.3, 0);
    prism(0.62, 0.62, 2.1, 10, M.steel, knee, 0, 0, 0, 0, 0, HALF);
    prism(0.15, 0.8, 1.5, 4, M.pink, knee, 0, 0.3, 0.8, 0.3, Math.PI / 4);
    prism(0.5, 0.5, 3.2, 8, M.dark, knee, 0, -1.7, 0);
    prism(0.8, 1.4, 2.8, 6, M.pink, knee, 0, -1.85, 0);
    box(0.62, 2.3, 0.3, M.deep, knee, 0, -1.8, 1.08, 0.2);
    box(0.1, 1.7, 0.06, M.cyan, knee, 0, -1.8, 1.27, 0.2);
    prism(0.42, 0.62, 1.0, 8, M.steel, knee, 0, -1.3, -1.2, -0.5);
    prism(0.3, 0.3, 0.05, 8, M.hot, knee, 0, -1.78, -1.47, -0.5);
    prism(0.5, 0.5, 1.9, 8, M.steel, knee, 0, -3.25, 0, 0, 0, HALF);
    box(2.3, 0.35, 3.7, M.dark, knee, 0, -3.72, 0.5);
    box(2.1, 0.85, 2.1, M.pink, knee, 0, -3.2, 0.95, 0.28);
    box(1.7, 0.95, 1.0, M.deep, knee, 0, -3.2, -0.85);
    box(1.6, 0.07, 0.07, M.hot, knee, 0, -3.5, 2.37);
    for (const k of [-0.7, 0, 0.7]) {
      put(new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.0, 4), M.steel), knee, k, -3.62, 2.7, HALF);
    }
    hip.rotation.z = side * 0.07;
    return { hip, knee };
  }
  B.legL = leg(1);
  B.legR = leg(-1);

  // torso: narrow waist, keel-shaped chest
  B.torso = group(B.hips, 0, 0.6, 0);
  for (let i = 0; i < 3; i++) {
    prism(1.38, 1.28, 0.46, 10, M.dark, B.torso, 0, 0.3 + i * 0.55, 0);
    prism(1.05, 1.05, 0.1, 10, M.steel, B.torso, 0, 0.58 + i * 0.55, 0);
    box(1.5 + i * 0.25, 0.42, 0.3, M.light, B.torso, 0, 0.3 + i * 0.55, 1.28);
  }
  for (const s of [-1, 1]) prism(0.1, 0.1, 1.9, 6, M.steel, B.torso, s * 1.5, 0.9, 0.2, 0, 0, s * -0.2);
  prism(3.4, 1.9, 3.5, 6, M.pink, B.torso, 0, 3.55, 0).scale.z = 0.82;
  prism(1.7, 2.7, 0.8, 6, M.dark, B.torso, 0, 5.6, 0).scale.z = 0.82;
  prism(0.75, 0.85, 1.0, 8, M.dark, B.torso, 0, 6.3, 0.1);
  for (const s of [-1, 1]) {
    box(1.75, 1.35, 0.4, M.deep, B.torso, s * 1.2, 4.3, 1.85, -0.12, s * 0.52);
    box(1.6, 0.08, 0.08, M.hot, B.torso, s * 1.2, 3.55, 1.95, -0.12, s * 0.52);
    box(0.9, 0.5, 0.3, M.dark, B.torso, s * 1.35, 2.75, 1.45, -0.1, s * 0.52);
    for (let i = 0; i < 3; i++) box(0.7, 0.05, 0.06, M.cyan, B.torso, s * 1.35, 2.62 + i * 0.13, 1.62, -0.1, s * 0.52);
  }
  prism(0.5, 0.5, 8.0, 10, M.steel, B.torso, 0, 4.8, 0, 0, 0, HALF);
  // reactor
  prism(0.85, 0.85, 0.5, 6, M.steel, B.torso, 0, 3.25, 2.1, HALF);
  B.core = put(new THREE.Mesh(new THREE.CircleGeometry(0.58, 6), M.cyan), B.torso, 0, 3.25, 2.37);
  B.coreGlow = glow(0x1596b0, 2.6, B.torso, 0, 3.25, 2.6);
  // back pack, thrusters, binders
  box(3.2, 2.8, 1.5, M.dark, B.torso, 0, 3.9, -2.0);
  for (const s of [-1, 1]) {
    prism(0.55, 0.85, 1.7, 8, M.steel, B.torso, s * 0.95, 2.5, -2.6, 0.5);
    box(0.36, 5.2, 1.7, M.pink, B.torso, s * 2.7, 6.6, -2.6, -0.3, 0, -s * 0.42);
    box(0.1, 4.6, 0.1, M.cyan, B.torso, s * 2.92, 6.6, -1.85, -0.3, 0, -s * 0.42);
  }

  // head
  B.head = group(B.torso, 0, 6.8, 0.3);
  B.head.scale.setScalar(1.3);
  put(new THREE.Mesh(new THREE.IcosahedronGeometry(1.55, 1), M.pink), B.head, 0, 1.1, 0).scale.set(1.15, 0.95, 1.05);
  box(2.6, 0.55, 0.5, M.glass, B.head, 0, 1.28, 1.3);
  prism(0.5, 0.95, 1.0, 6, M.light, B.head, 0, 0.6, 1.7, HALF);
  box(0.55, 0.3, 0.25, M.nose, B.head, 0, 0.86, 2.2);
  box(1.6, 0.5, 1.2, M.steel, B.head, 0, 0.0, 1.2, 0.12);
  for (let i = -1; i <= 1; i++) box(0.1, 0.26, 0.06, M.hot, B.head, i * 0.32, 0.0, 1.83, 0.12);
  prism(0.12, 0.4, 1.5, 4, M.steel, B.head, 0, 2.3, 0.95, -0.55, Math.PI / 4);
  B.eyeGlows = [];
  for (const s of [-1, 1]) {
    box(0.66, 0.15, 0.1, M.eye, B.head, s * 0.62, 1.3, 1.57, 0, 0, -s * 0.3);
    B.eyeGlows.push(glow(0x1b8fa6, 1.3, B.head, s * 0.62, 1.3, 1.75));
    box(1.55, 0.4, 0.8, M.deep, B.head, s * 0.75, 1.74, 1.2, 0.1, s * 0.2, -s * 0.32);
    box(0.3, 1.2, 1.3, M.deep, B.head, s * 1.6, 0.55, 0.7);
    prism(0.9, 0.9, 0.46, 10, M.pink, B.head, s * 1.55, 2.45, -0.1, HALF);
    put(new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.11, 6, 10), M.steel), B.head, s * 1.55, 2.45, 0.12);
    put(new THREE.Mesh(new THREE.CircleGeometry(0.5, 10), M.hot), B.head, s * 1.55, 2.45, 0.15);
  }
  box(0.08, 1.5, 0.4, M.steel, B.head, 2.2, 3.4, -0.4);
  B.antenna = glow(0xaa1122, 0.6, B.head, 2.2, 4.2, -0.4);

  function arm(side) {
    const shoulder = group(B.torso, side * 4.0, 4.8, 0);
    prism(1.0, 1.75, 2.0, 6, M.pink, shoulder, side * 0.2, 0.5, 0);
    prism(0.45, 1.05, 0.5, 6, M.deep, shoulder, side * 0.2, 1.7, 0);
    put(new THREE.Mesh(new THREE.TorusGeometry(1.66, 0.06, 4, 6), M.cyan), shoulder, side * 0.2, -0.46, 0, HALF, 0, Math.PI / 6);
    put(new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.2, 4), M.steel), shoulder, side * 1.7, 0.7, 0, 0, 0, -side * HALF);
    prism(0.6, 0.55, 2.6, 8, M.dark, shoulder, 0, -1.8, 0);
    box(0.5, 1.8, 1.4, M.pink, shoulder, side * 0.62, -1.9, 0);
    const elbow = group(shoulder, 0, -3.2, 0);
    prism(0.68, 0.68, 1.9, 10, M.steel, elbow, 0, 0, 0, 0, 0, HALF);
    prism(0.6, 0.4, 0.9, 8, M.steel, elbow, 0, 0.5, -0.95, 0.5);
    const flame = put(new THREE.Mesh(new THREE.ConeGeometry(0.42, 3.4, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x66f0ff).multiplyScalar(1.6), transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide,
      })), elbow, 0, 2.3, -1.95, 0.5);
    const flare = glow(0x2aa6bd, 3, elbow, 0, 0.95, -1.2);
    prism(0.6, 0.6, 3.0, 8, M.dark, elbow, 0, -1.5, 0);
    prism(1.0, 1.6, 2.6, 6, M.pink, elbow, 0, -1.9, 0);
    box(0.7, 2.2, 0.3, M.deep, elbow, 0, -1.9, 1.25, 0.22);
    box(0.1, 2.0, 0.08, M.cyan, elbow, 0, -1.9, 1.44, 0.22);
    box(0.08, 2.0, 0.1, M.cyan, elbow, side * 1.27, -1.9, 0, 0, 0, -side * 0.22);
    for (const k of [-1, 1]) prism(0.1, 0.1, 2.4, 6, M.steel, elbow, k * 0.7, -1.6, -1.0, -0.15);
    prism(1.45, 1.45, 0.4, 8, M.steel, elbow, 0, -3.35, 0);
    // mechanical fist: -y is the striking face
    const fist = group(elbow, 0, -4.4, 0);
    box(2.5, 1.6, 2.2, M.dark, fist, 0, 0, 0);
    box(2.75, 1.0, 2.45, M.pink, fist, 0, 0.42, 0);
    box(2.0, 0.08, 0.08, M.cyan, fist, 0, -0.12, 1.24);
    for (let i = 0; i < 4; i++) {
      const fxp = -0.96 + i * 0.64;
      box(0.56, 0.8, 2.0, M.steel, fist, fxp, -0.8, 0);
      box(0.5, 0.3, 0.7, M.deep, fist, fxp, -1.25, 0.45);
      put(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 4), M.steel), fist, fxp, -1.55, 0.45, Math.PI);
      if (i < 3) box(0.06, 0.1, 1.9, M.hot, fist, fxp + 0.32, -1.16, 0);
    }
    box(0.7, 0.9, 1.2, M.steel, fist, -side * 1.5, -0.5, 0.3);
    const tip = group(fist, 0, -1.6, 0.2);
    return { shoulder, elbow, fist, tip, flame, flare };
  }
  B.armL = arm(1);
  B.armR = arm(-1); // the bear's right arm: the punching one
  return B;
}
const bear = buildBear();
scene.add(bear.root);

// ---------- neon floor, dust, shockwaves, sparks ----------
const grid = new THREE.GridHelper(320, 64, 0xb0206a, 0x3a1560);
grid.material.transparent = true;
grid.material.opacity = 0.55;
scene.add(grid);

const dustN = isSmall ? 350 : 800;
const dustPos = new Float32Array(dustN * 3);
for (let i = 0; i < dustN; i++) {
  dustPos[i * 3] = (Math.random() - 0.5) * 70;
  dustPos[i * 3 + 1] = Math.random() * 34;
  dustPos[i * 3 + 2] = 6 - Math.random() * 74;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x6fbfe0, size: 0.07, transparent: true, opacity: 0.45 }));
scene.add(dust);

const waves = [];
const waveGeo = new THREE.RingGeometry(0.965, 1, 64);
function shockwave(x, z, strength) {
  const m = new THREE.Mesh(waveGeo, new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xff2d95).multiplyScalar(1.3), transparent: true, opacity: 0.8,
    side: THREE.DoubleSide, depthWrite: false,
  }));
  m.rotation.x = -HALF;
  m.position.set(x, 0.06, z);
  m.userData = { t: 0, strength };
  scene.add(m);
  waves.push(m);
}
function updateWaves(dt) {
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i];
    w.userData.t += dt;
    const k = w.userData.t / 1.0;
    w.scale.setScalar(2 + (1 - Math.pow(1 - k, 2)) * 16 * w.userData.strength);
    w.material.opacity = 0.8 * (1 - k);
    if (k >= 1) { scene.remove(w); w.material.dispose(); waves.splice(i, 1); }
  }
}

const SPARKS = 360;
const sparkPos = new Float32Array(SPARKS * 3).fill(-999);
const sparkVel = new Float32Array(SPARKS * 3);
const sparkGeo = new THREE.BufferGeometry();
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
scene.add(new THREE.Points(sparkGeo, new THREE.PointsMaterial({
  color: new THREE.Color(0xffc37a).multiplyScalar(1.6), size: 0.14, transparent: true,
  blending: THREE.AdditiveBlending, depthWrite: false,
})));
let sparkNext = 0;
function emitSparks(x, y, z, n, speed) {
  for (let i = 0; i < n; i++) {
    const k = sparkNext * 3;
    sparkNext = (sparkNext + 1) % SPARKS;
    const a = Math.random() * Math.PI * 2;
    sparkPos[k] = x; sparkPos[k + 1] = y; sparkPos[k + 2] = z;
    sparkVel[k] = Math.cos(a) * speed * (0.3 + Math.random());
    sparkVel[k + 1] = speed * (0.4 + Math.random() * 1.1);
    sparkVel[k + 2] = Math.sin(a) * speed * (0.3 + Math.random());
  }
}
function updateSparks(dt) {
  for (let k = 0; k < SPARKS * 3; k += 3) {
    if (sparkPos[k + 1] < -100) continue;
    sparkVel[k + 1] -= 26 * dt;
    sparkPos[k] += sparkVel[k] * dt;
    sparkPos[k + 1] += sparkVel[k + 1] * dt;
    sparkPos[k + 2] += sparkVel[k + 2] * dt;
    if (sparkPos[k + 1] < 0) sparkPos[k + 1] = -999;
  }
  sparkGeo.attributes.position.needsUpdate = true;
}

// ---------- poses ----------
const STAND = {
  bx: 0, by: 0, bz: 0,
  tx: 0.08, ty: 0, tz: 0, hx: 0, hy: 0,
  sRx: -0.1, sRz: -0.3, eR: -0.55, sLx: -0.1, sLz: 0.3, eL: -0.55,
  hipL: 0, kneeL: 0, hipR: 0, kneeR: 0,
  boost: 0, flare: 1,
};
function mix(a, b, k) {
  const o = {};
  for (const n in a) o[n] = a[n] + (b[n] - a[n]) * k;
  return o;
}
function applyPose(p, t) {
  bear.root.position.set(p.bx, 0, p.bz);
  bear.hips.position.y = HIP_Y + p.by;
  bear.torso.rotation.set(p.tx, p.ty, p.tz);
  bear.head.rotation.set(p.hx, p.hy, 0);
  bear.armR.shoulder.rotation.set(p.sRx, 0, p.sRz);
  bear.armR.elbow.rotation.x = p.eR;
  bear.armL.shoulder.rotation.set(p.sLx, 0, p.sLz);
  bear.armL.elbow.rotation.x = p.eL;
  bear.legL.hip.rotation.x = p.hipL;
  bear.legL.knee.rotation.x = p.kneeL;
  bear.legR.hip.rotation.x = p.hipR;
  bear.legR.knee.rotation.x = p.kneeR;
  const flick = 0.85 + 0.15 * Math.sin((t || 0) * 90);
  bear.armR.flame.visible = bear.armR.flare.visible = p.boost > 0.01;
  bear.armL.flame.visible = bear.armL.flare.visible = false;
  bear.armR.flame.scale.set(p.boost * flick, p.boost * flick, p.boost * flick);
  bear.armR.flare.scale.setScalar(3 * p.boost * flick);
  const pulse = 0.9 + 0.1 * Math.sin((t || 0) * 5);
  bear.eyeGlows[0].scale.setScalar(1.3 * pulse * p.flare);
  bear.eyeGlows[1].scale.setScalar(1.3 * pulse * p.flare);
  bear.coreGlow.scale.setScalar(2.6 * (0.9 + 0.1 * Math.sin((t || 0) * 3)) * p.flare);
}
const ease = (k) => k * k * (3 - 2 * k);
const clamp01 = (k) => Math.min(1, Math.max(0, k));

// ---------- camera ----------
const CAM = new THREE.Vector3(0, 1.9, 16);
const shake = new THREE.Vector3();
let shakeAmp = 0;
const lookTarget = new THREE.Vector3();
function placeCamera(dt) {
  shakeAmp *= Math.exp(-dt * 6);
  shake.set((Math.random() - 0.5) * shakeAmp, (Math.random() - 0.5) * shakeAmp, 0);
  camera.position.copy(CAM).add(shake);
  camera.lookAt(lookTarget.x + shake.x, lookTarget.y + shake.y, lookTarget.z);
}

// ---------- punch choreography: solve so the fist lands right on the lens ----------
const PUNCH_DIR = new THREE.Vector3(-0.02, 0.34, -1).normalize();
const FIST_TARGET = CAM.clone().addScaledVector(PUNCH_DIR, 2.0);
const WIND = Object.assign({}, STAND, {
  tx: -0.12, ty: -0.62, sRx: 1.05, sRz: -0.55, eR: -2.1, sLx: -0.7, sLz: 0.35, eL: -1.2,
  hipL: -0.45, kneeL: 0.35, hipR: 0.3, by: -0.6, hx: 0.12, hy: 0.3, boost: 0.45, flare: 1.8,
});
const PUNCH = Object.assign({}, STAND, {
  tx: 0.5, ty: 0.62, tz: -0.08, sRx: -1.2, sRz: 0.0, eR: -0.04, sLx: 0.9, sLz: 0.45, eL: -1.5,
  hipL: -0.9, kneeL: 1.1, hipR: 0.5, kneeR: 0.15, by: -2.1, hx: -0.5, hy: -0.3, boost: 1.5, flare: 2.2,
});
(function solvePunch() {
  const v = new THREE.Vector3();
  let best = 0, bestErr = Infinity;
  for (let i = 0; i <= 160; i++) {
    PUNCH.sRx = -2.4 + (i / 160) * 2.2;
    applyPose(PUNCH);
    bear.root.updateMatrixWorld(true);
    bear.armR.tip.getWorldPosition(v);
    const err = Math.abs(v.y - FIST_TARGET.y);
    if (err < bestErr) { bestErr = err; best = PUNCH.sRx; }
  }
  PUNCH.sRx = best;
  applyPose(PUNCH);
  bear.root.updateMatrixWorld(true);
  bear.armR.tip.getWorldPosition(v);
  PUNCH.bx = FIST_TARGET.x - v.x;
  PUNCH.bz = FIST_TARGET.z - v.z;
})();

const Z_START = -70;
const Z_STAND = PUNCH.bz - 4.5;
const X_STAND = PUNCH.bx * 0.35;
WIND.bz = Z_STAND + 1.0;
WIND.bx = PUNCH.bx * 0.55;
const READY = Object.assign({}, STAND, {
  bz: Z_STAND, bx: X_STAND, by: -0.35, tx: 0.16, sRz: -0.5, sLz: 0.5, eR: -0.95, eL: -0.95,
  hipL: -0.12, hipR: 0.12, hx: -0.12, flare: 1.9,
});
const STEPS = 7;
const T_WALK = 5.6, T_HOLD = 0.5, T_WIND = 0.5, T_STRIKE = 0.12, T_CRACK = 1.15, T_SHARDS = 2.1;
const T_IMPACT = T_WALK + T_HOLD + T_WIND + T_STRIKE;
const T_SHATTER = T_IMPACT + T_CRACK;

let lastStep = -1;
function walkPose(u) {
  // each step lunges then slams: a heavy, deliberate gait
  const q = u * STEPS - 0.5;
  const k = Math.floor(q), f = q - k;
  const w = f + (ease(ease(f)) - f) * 0.75;
  const ph = (k + w + 0.5) * Math.PI;
  const s = Math.sin(ph), c = Math.cos(ph);
  const A = 0.5;
  const settle = 1 - clamp01((u - 0.95) / 0.05);
  const p = Object.assign({}, STAND);
  p.bz = Z_START + (Z_STAND - Z_START) * clamp01(ph / (STEPS * Math.PI));
  p.bx = X_STAND * u;
  p.by = LEG * (Math.cos(A * s) - 1) - 0.25 * Math.pow(Math.abs(s), 6);
  p.hipL = -A * s; p.kneeL = 1.0 * Math.max(0, c) * settle;
  p.hipR = A * s; p.kneeR = 1.0 * Math.max(0, -c) * settle;
  p.tz = 0.035 * s; p.ty = 0.16 * s; p.tx = 0.14;
  p.sRx = -0.15 - 0.22 * s; p.sLx = -0.15 + 0.22 * s;
  p.eR = -0.8; p.eL = -0.8;
  p.hx = -0.06 - 0.1 * u; p.hy = -0.16 * s;
  if (k !== lastStep && k >= 0) {
    lastStep = k;
    const fx0 = p.bx + (k % 2 ? 1.6 : -1.6), fz0 = p.bz + 3.4;
    shakeAmp = Math.max(shakeAmp, 0.08 + 0.75 * u * u);
    shockwave(fx0, fz0, 0.7 + u);
    emitSparks(fx0, 0.2, fz0 + 1, 34, 7);
  }
  return p;
}

// ---------- screen glass ----------
const g2 = fx.getContext('2d');
let W = 0, H = 0, DPR = 1;
function sizeFx() {
  W = window.innerWidth; H = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  fx.width = Math.round(W * DPR); fx.height = Math.round(H * DPR);
}
let glass = null;
function buildGlass(px, py) {
  const rnd = Math.random;
  const far = Math.max(
    Math.hypot(px, py), Math.hypot(W - px, py), Math.hypot(px, H - py), Math.hypot(W - px, H - py)
  ) * 1.1;
  const N = 15;
  const sw = (Math.PI * 2) / N;
  const radii = [0];
  for (let r = Math.max(13, Math.min(W, H) * 0.02); ; r = r * 1.4 + 5) {
    radii.push(r);
    if (r > far) break;
  }
  const K = radii.length - 1;
  const angles = [];
  for (let i = 0; i < N; i++) angles.push((i + (rnd() - 0.5) * 0.6) * sw);
  angles.push(angles[0] + Math.PI * 2);
  function spoke(a0, from) {
    const pts = [];
    for (let j = 0; j <= K; j++) {
      if (j < from) { pts.push(null); continue; }
      if (j === 0) { pts.push([px, py]); continue; }
      const a = a0 + (rnd() - 0.5) * sw * 0.24;
      const r = radii[j] * (1 + (rnd() - 0.5) * 0.2);
      pts.push([px + Math.cos(a) * r, py + Math.sin(a) * r]);
    }
    return pts;
  }
  const main = [];
  for (let i = 0; i < N; i++) main.push(spoke(angles[i], 0));
  main.push(main[0]);

  const shards = [], lines = [];
  function line(a, b, major) {
    lines.push({
      a, b, w: major ? 0.8 + rnd() * 0.9 : 0.5 + rnd() * 0.5,
      glint: rnd() < (major ? 0.3 : 0.14), r: Math.min(Math.hypot(a[0] - px, a[1] - py), Math.hypot(b[0] - px, b[1] - py)),
    });
  }
  function shard(L, R) {
    const pts = L.concat(R.slice().reverse());
    let cx = 0, cy = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) {
      cx += p[0]; cy += p[1];
      x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);
    }
    if (x1 < 0 || y1 < 0 || x0 > W || y0 > H) return;
    cx /= pts.length; cy /= pts.length;
    shards.push({ L, R, pts, cx, cy, d: Math.hypot(cx - px, cy - py), size: Math.hypot(x1 - x0, y1 - y0), tint: rnd() * rnd() * 0.05, dead: 0 });
  }
  function ladder(L, R, a, b) {
    let j = a;
    while (j < b) {
      const len = j < 3 ? 1 : 1 + Math.floor(rnd() * rnd() * 4.2);
      const e = Math.min(b, j + len);
      if (j < 3 && j > 0 && rnd() < 0.7) {
        // tiny fragments in the crushed zone
        shard([L[j], L[j]], [R[j], R[e]]);
        shard([L[j], L[e]], [L[j], R[e]]);
        line(L[j], R[e], false);
      } else {
        shard(L.slice(j, e + 1), R.slice(j, e + 1));
      }
      if (e < b) line(L[e], R[e], false);
      j = e;
    }
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < K; j++) line(main[i][j], main[i][j + 1], true);
    const js = 2 + Math.floor(rnd() * 3);
    if (js >= K - 1) { ladder(main[i], main[i + 1], 0, K); continue; }
    // a secondary crack branches off one side of the sector
    const mid = spoke((angles[i] + angles[i + 1]) / 2, js + 1);
    mid[js] = rnd() < 0.5 ? main[i][js] : main[i + 1][js];
    for (let j = js; j < K; j++) line(mid[j], mid[j + 1], rnd() < 0.5);
    ladder(main[i], main[i + 1], 0, js);
    line(main[i][js], main[i + 1][js], false);
    ladder(main[i], mid, js, K);
    ladder(mid, main[i + 1], js, K);
  }
  // dead LCD patches bleed out from the impact, bounded by the cracks
  for (const s of shards) {
    const near = s.d / (Math.min(W, H) * 0.3);
    if (near < 0.3 || rnd() > near * 1.25 + 0.15) s.dead = near < 0.5 ? 1 : 2;
  }
  // broken column drivers: stuck vertical lines
  const vlines = [];
  const colors = ['#00ffff', '#ff00ff', '#00ff66', '#ffffff', '#3355ff', '#ff2244', '#000000'];
  for (let i = 0; i < 26; i++) {
    const spread = (rnd() - 0.5) * (rnd() < 0.7 ? 0.5 : 1.6) * W;
    vlines.push({
      x: Math.round(px + spread), w: rnd() < 0.75 ? 1 : 2 + Math.floor(rnd() * 5),
      color: colors[Math.floor(rnd() * colors.length)], stage: rnd() < 0.3 ? 1 : 2,
      top: rnd() < 0.5, alpha: 0.45 + rnd() * 0.5,
    });
  }
  const crumbs = [];
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * rnd() * Math.min(W, H) * 0.09, l = 3 + rnd() * 9, b = rnd() * Math.PI * 2;
    crumbs.push([px + Math.cos(a) * r, py + Math.sin(a) * r, Math.cos(b) * l, Math.sin(b) * l]);
  }
  glass = { px, py, far, shards, lines, vlines, crumbs };
}

function drawCracks(t) {
  // two beats: first hit, then the fist grinds in and the cracks run to the edges
  const k1 = clamp01(t / 0.07);
  const k2 = clamp01((t - 0.5) / 0.12);
  const k3 = clamp01((t - 0.85) / 0.2);
  const reach = glass.far * (0.3 * (1 - Math.pow(1 - k1, 3)) + 0.75 * ease(k2));
  const stage = k2 > 0 ? 2 : 1;
  const { px, py } = glass;
  g2.setTransform(DPR, 0, 0, DPR, 0, 0);
  g2.clearRect(0, 0, W, H);

  // panel tearing: rows of the live image slip sideways
  const tears = stage === 2 ? 5 : 2;
  for (let i = 0; i < tears; i++) {
    if (Math.random() < 0.45) continue;
    const y = Math.random() * H, h = 4 + Math.random() * (stage === 2 ? 60 : 24), dx = (Math.random() - 0.5) * (stage === 2 ? 90 : 30);
    const sy = canvas.height / H;
    g2.drawImage(canvas, 0, y * sy, canvas.width, h * sy, dx, y, W, h);
    if (Math.random() < 0.4) {
      g2.globalCompositeOperation = 'lighter';
      g2.fillStyle = Math.random() < 0.5 ? 'rgba(0,255,255,0.16)' : 'rgba(255,0,255,0.16)';
      g2.fillRect(0, y, W, h);
      g2.globalCompositeOperation = 'source-over';
    }
  }
  // backlight flicker, dying toward the end
  const dim = (stage === 2 ? 0.1 + Math.random() * 0.22 : Math.random() * 0.08) + k3 * 0.25;
  g2.fillStyle = 'rgba(0,0,0,' + dim + ')';
  g2.fillRect(0, 0, W, H);

  for (const v of glass.vlines) {
    if (v.stage > stage || Math.random() < 0.12) continue;
    g2.globalAlpha = v.alpha;
    g2.fillStyle = v.color;
    if (v.top) g2.fillRect(v.x, 0, v.w, py + 40); else g2.fillRect(v.x, py - 40, v.w, H);
  }
  g2.globalAlpha = 1;

  // facets + dead patches
  for (const s of glass.shards) {
    if (s.d > reach) continue;
    const dead = s.dead && s.dead <= stage;
    if (!dead && s.tint < 0.012) continue;
    g2.beginPath();
    g2.moveTo(s.pts[0][0], s.pts[0][1]);
    for (let i = 1; i < s.pts.length; i++) g2.lineTo(s.pts[i][0], s.pts[i][1]);
    g2.closePath();
    g2.fillStyle = dead ? 'rgba(2,1,6,0.93)' : 'rgba(255,255,255,' + s.tint + ')';
    g2.fill();
  }
  // liquid-crystal bruise around the dead area
  const br = Math.min(W, H) * (0.1 + 0.16 * ease(k2));
  const bruise = g2.createRadialGradient(px, py, br * 0.35, px, py, br * 1.5);
  bruise.addColorStop(0, 'rgba(20,0,60,0.55)');
  bruise.addColorStop(0.55, 'rgba(90,0,160,0.22)');
  bruise.addColorStop(0.8, 'rgba(0,180,255,0.1)');
  bruise.addColorStop(1, 'rgba(0,0,0,0)');
  g2.fillStyle = bruise;
  g2.fillRect(0, 0, W, H);

  // cracks: thin, with a shadow side and occasional bright glints
  g2.save();
  g2.beginPath();
  g2.arc(px, py, reach, 0, Math.PI * 2);
  g2.clip();
  g2.lineCap = 'round';
  g2.lineJoin = 'round';
  for (const pass of [0, 1, 2]) {
    g2.strokeStyle = pass === 0 ? 'rgba(0,0,0,0.6)' : pass === 1 ? 'rgba(215,232,255,0.5)' : 'rgba(255,255,255,0.96)';
    const off = pass === 0 ? 1.1 : 0;
    for (const l of glass.lines) {
      if (pass === 2 && !l.glint) continue;
      g2.lineWidth = pass === 0 ? l.w + 0.8 : pass === 1 ? l.w : l.w + 0.5;
      g2.beginPath();
      g2.moveTo(l.a[0] + off, l.a[1] + off);
      g2.lineTo(l.b[0] + off, l.b[1] + off);
      g2.stroke();
    }
  }
  g2.restore();

  // pulverised glass at the point of impact
  const pr = Math.min(W, H) * (0.035 + 0.03 * k2);
  const frost = g2.createRadialGradient(px, py, 0, px, py, pr * 2);
  frost.addColorStop(0, 'rgba(255,255,255,0.85)');
  frost.addColorStop(0.35, 'rgba(235,240,255,0.35)');
  frost.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = frost;
  g2.fillRect(px - pr * 2, py - pr * 2, pr * 4, pr * 4);
  g2.strokeStyle = 'rgba(255,255,255,0.7)';
  g2.lineWidth = 0.7;
  g2.beginPath();
  const nCr = Math.floor(glass.crumbs.length * (0.5 + 0.5 * k2));
  for (let i = 0; i < nCr; i++) {
    const c = glass.crumbs[i];
    g2.moveTo(c[0], c[1]);
    g2.lineTo(c[0] + c[2], c[1] + c[3]);
  }
  g2.stroke();

  const flash = Math.max(0, 1 - t / 0.12) * 0.75 + Math.max(0, 1 - Math.abs(t - 0.53) / 0.07) * 0.3;
  if (flash > 0) {
    g2.fillStyle = 'rgba(255,255,255,' + flash + ')';
    g2.fillRect(0, 0, W, H);
  }
}

// falling shards: real 3D pieces textured with the last frame of the screen
let shardGL = null;
function prepareShards() {
  const r = new THREE.WebGLRenderer({ canvas: shardCanvas, antialias: true, alpha: true });
  r.setPixelRatio(DPR);
  r.setSize(W, H);
  r.setClearColor(0x000000, 0);
  const fov = 34;
  const dist = (H / 2) / Math.tan((fov * Math.PI) / 360);
  const cam = new THREE.PerspectiveCamera(fov, W / H, 10, dist * 6);
  cam.position.set(W / 2, H / 2, dist);
  cam.lookAt(W / 2, H / 2, 0);
  const pos = [], center = [], axis = [], vel = [], misc = [], side = [];
  const rnd = Math.random;
  const { px, py, far } = glass;
  for (const s of glass.shards) {
    const dx = s.cx - px, dy = s.cy - py, d = Math.hypot(dx, dy) || 1;
    const nearK = Math.pow(1 - Math.min(1, d / far), 2);
    const out = 20 + rnd() * 110 + nearK * 260;
    const a = rnd() * Math.PI * 2;
    const ax = [Math.cos(a), Math.sin(a), (rnd() - 0.5) * 0.5];
    const al = Math.hypot(ax[0], ax[1], ax[2]);
    const v = [(dx / d) * out, -(dy / d) * out + rnd() * 60, 40 + rnd() * 160 + nearK * 900];
    const spin = (rnd() < 0.5 ? -1 : 1) * (0.8 + rnd() * 3.2) * (s.size < 60 ? 2.2 : s.size > 260 ? 0.55 : 1);
    const delay = (d / far) * 0.5 + rnd() * 0.07;
    const n = s.L.length;
    const quad = (p0, u0, p1, u1, p2, u2) => {
      for (const [p, u] of [[p0, u0], [p1, u1], [p2, u2]]) {
        pos.push(p[0], H - p[1], 0);
        center.push(s.cx, H - s.cy);
        axis.push(ax[0] / al, ax[1] / al, ax[2] / al);
        vel.push(v[0], v[1], v[2]);
        misc.push(spin, delay);
        side.push(u);
      }
    };
    for (let k = 0; k < n - 1; k++) {
      quad(s.L[k], 0, s.R[k], 1, s.R[k + 1], 1);
      quad(s.L[k], 0, s.R[k + 1], 1, s.L[k + 1], 0);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aCenter', new THREE.Float32BufferAttribute(center, 2));
  geo.setAttribute('aAxis', new THREE.Float32BufferAttribute(axis, 3));
  geo.setAttribute('aVel', new THREE.Float32BufferAttribute(vel, 3));
  geo.setAttribute('aMisc', new THREE.Float32BufferAttribute(misc, 2));
  geo.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  const snap = document.createElement('canvas');
  snap.width = fx.width; snap.height = fx.height;
  const tex = new THREE.CanvasTexture(snap);
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uSnap: { value: tex }, uRes: { value: new THREE.Vector2(W, H) }, uG: { value: 2600 * Math.max(0.7, H / 800) } },
    side: THREE.DoubleSide, transparent: true,
    vertexShader: `
      attribute vec2 aCenter; attribute vec3 aAxis; attribute vec3 aVel; attribute vec2 aMisc; attribute float aSide;
      uniform float uT; uniform vec2 uRes; uniform float uG;
      varying vec2 vUv; varying vec3 vN; varying float vMove; varying float vSide; varying float vAlpha;
      vec3 rot(vec3 v, vec3 k, float a) { float c = cos(a), s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c); }
      void main() {
        float lt = max(0.0, uT - aMisc.y);
        vec3 c = vec3(aCenter, 0.0);
        float ang = aMisc.x * lt;
        vec3 p = rot(position - c, aAxis, ang) + c + aVel * lt + vec3(0.0, -0.5 * uG * lt * lt, 0.0);
        vN = rot(vec3(0.0, 0.0, 1.0), aAxis, ang);
        vUv = position.xy / uRes;
        vMove = clamp(lt * 8.0, 0.0, 1.0);
        vSide = aSide;
        vAlpha = 1.0 - smoothstep(1.3, 1.75, lt);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D uSnap; uniform float uT;
      varying vec2 vUv; varying vec3 vN; varying float vMove; varying float vSide; varying float vAlpha;
      void main() {
        vec3 col = texture2D(uSnap, vUv).rgb;
        vec3 n = normalize(vN);
        // the backlight dies as soon as a piece leaves the panel
        col *= mix(1.0, 0.5 + 0.35 * abs(n.z), vMove);
        float spec = pow(abs(dot(n, normalize(vec3(0.35, 0.6, 0.72)))), 60.0);
        col += vec3(0.85, 0.95, 1.0) * spec * vMove * 1.2;
        float e = min(vSide, 1.0 - vSide);
        float edge = 1.0 - smoothstep(0.0, fwidth(vSide) * 1.6, e);
        col += vec3(0.8, 0.95, 1.0) * edge * (0.15 + 0.55 * vMove);
        gl_FragColor = vec4(col, vAlpha);
      }`,
  });
  const sc = new THREE.Scene();
  sc.add(new THREE.Mesh(geo, mat));
  r.compile(sc, cam);
  shardGL = { r, sc, cam, mat, tex, snap, geo };
}
function takeSnapshot() {
  const s = shardGL.snap.getContext('2d');
  s.drawImage(canvas, 0, 0, shardGL.snap.width, shardGL.snap.height);
  s.drawImage(fx, 0, 0);
  shardGL.tex.needsUpdate = true;
}
function drawShards(t) {
  shardGL.mat.uniforms.uT.value = t;
  shardGL.r.render(shardGL.sc, shardGL.cam);
}
function disposeShards() {
  if (!shardGL) return;
  shardGL.geo.dispose(); shardGL.mat.dispose(); shardGL.tex.dispose();
  shardGL.r.dispose(); shardGL.r.forceContextLoss();
  shardGL = null;
}

// ---------- idle background mode (after the intro) ----------
let mouseX = 0, mouseY = 0;
window.addEventListener('pointermove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});
const IDLE_Z = -13;
const IDLE_CAM = new THREE.Vector3(0, 4, 16);
const IDLE_LOOK = new THREE.Vector3(0, 10.8, IDLE_Z);
const camIdle = new THREE.Vector3();
function idleFrame(t, dt) {
  const p = Object.assign({}, STAND);
  const br = Math.sin(t * 1.3);
  p.bz = IDLE_Z;
  p.by = 0.07 * br;
  p.tx = 0.08 + 0.015 * br;
  p.tz = 0.015 * Math.sin(t * 0.6);
  p.sRx = -0.1 + 0.04 * br; p.sLx = -0.1 - 0.04 * br;
  p.hy = mouseX * 0.45 + 0.08 * Math.sin(t * 0.4);
  p.hx = mouseY * 0.25 - 0.05;
  applyPose(p, t);
  camIdle.set(mouseX * 1.1, IDLE_CAM.y - mouseY * 0.5, IDLE_CAM.z);
  camera.position.lerp(camIdle, Math.min(1, dt * 3));
  camera.lookAt(IDLE_LOOK);
}
function enterIdle() {
  if (camera.fov !== baseFov) { camera.fov = baseFov; camera.updateProjectionMatrix(); }
  camera.position.copy(IDLE_CAM);
  idleFrame(0, 1);
  for (const w of waves) scene.remove(w);
  waves.length = 0;
  sparkPos.fill(-999);
}

// ---------- main loop ----------
let mode = playIntro ? 'intro' : 'idle';
let t0 = null, last = 0, impactDone = false;
const v3 = new THREE.Vector3();

function finishIntro() {
  if (mode === 'idle') return;
  if (mode === 'intro') enterIdle();
  mode = 'idle';
  fx.style.display = 'none';
  shardCanvas.style.display = 'none';
  disposeShards();
  if (skipBtn) skipBtn.hidden = true;
  root.classList.remove('intro', 'shattering');
  try { sessionStorage.setItem('introPlayed', '1'); } catch (e) { /* ignore */ }
}

function introFrame(t, dt) {
  let pose;
  let fov = baseFov;
  const tHold = T_WALK, tWind = tHold + T_HOLD, tStrike = tWind + T_WIND;
  if (t < tHold) {
    const u = t / T_WALK;
    pose = walkPose(u);
    lookTarget.set(0, 8.5 + 4.5 * u * u, pose.bz);
  } else if (t < tWind) {
    const k = ease((t - tHold) / T_HOLD);
    pose = mix(walkPose(1), READY, k);
    lookTarget.set(0, 13 + 0.8 * k, pose.bz);
    fov = baseFov - 3 * k;
  } else if (t < tStrike) {
    const k = ease((t - tWind) / T_WIND);
    pose = mix(READY, WIND, k);
    lookTarget.set(0, 13.8 - 1.2 * k, pose.bz);
    fov = baseFov - 3 - 3 * k;
  } else {
    const k = clamp01((t - tStrike) / T_STRIKE);
    pose = mix(WIND, PUNCH, k * k);
    if (t > T_IMPACT) {
      // fist grinding against the glass
      const g = t - T_IMPACT;
      const press = ease(clamp01((g - 0.46) / 0.1));
      pose.bz += -0.3 * Math.exp(-g * 9) + 0.22 * press;
      pose.tx += 0.03 * press;
      pose.bx += Math.sin(g * 70) * 0.012;
      pose.boost = 1.5 * Math.exp(-g * 2.2) + 0.9 * press;
    }
    v3.copy(CAM).addScaledVector(PUNCH_DIR, 12);
    lookTarget.set(0, 12.6, Z_STAND).lerp(v3, ease(k));
    fov = baseFov - 6 + 14 * k;
  }
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  applyPose(pose, t);
  placeCamera(dt);

  if (t >= T_IMPACT && !impactDone) {
    impactDone = true;
    shakeAmp = 0.6;
    bear.root.updateMatrixWorld(true);
    bear.armR.tip.getWorldPosition(v3).project(camera);
    const px = Math.min(0.66, Math.max(0.34, v3.x * 0.5 + 0.5)) * W;
    const py = Math.min(0.64, Math.max(0.36, -v3.y * 0.5 + 0.5)) * H;
    buildGlass(px, py);
    prepareShards();
  }
}

function frame(ms) {
  if (t0 === null) { t0 = ms; last = ms; }
  const t = (ms - t0) / 1000;
  const dt = Math.min(0.05, (ms - last) / 1000);
  last = ms;

  if (mode === 'intro') {
    introFrame(t, dt);
  } else {
    if (mode === 'shards') {
      const st = t - T_SHATTER;
      if (st >= T_SHARDS) finishIntro(); else drawShards(st);
    }
    if (mode === 'idle' && window.scrollY > window.innerHeight * 1.1) return;
    idleFrame(t, dt);
  }
  bear.antenna.material.opacity = Math.sin(t * 6) > 0 ? 1 : 0.15;
  dust.rotation.y = t * 0.01;
  updateWaves(dt);
  updateSparks(dt);
  composer.render();

  // the glass layer is drawn after the scene so it can sample the live frame
  if (mode === 'intro' && impactDone) {
    const g = t - T_IMPACT;
    if (t < T_SHATTER) {
      if (g > 0.5 && g < 0.55) shakeAmp = Math.max(shakeAmp, 0.4);
      drawCracks(g);
      const j = shakeAmp * 22;
      fx.style.transform = 'translate(' + ((Math.random() - 0.5) * j).toFixed(1) + 'px,' + ((Math.random() - 0.5) * j).toFixed(1) + 'px)';
    } else {
      fx.style.transform = '';
      drawCracks(T_CRACK);
      takeSnapshot();
      drawShards(0);
      fx.style.display = 'none';
      // the real page is revealed behind the falling shards
      root.classList.remove('intro');
      root.classList.add('shattering');
      if (skipBtn) skipBtn.hidden = true;
      enterIdle();
      mode = 'shards';
    }
  }
}

window.addEventListener('resize', () => {
  fitCamera();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  if (mode === 'intro' && !impactDone) sizeFx();
  if (reduced) { idleFrame(0, 1); composer.render(); }
});

if (skipBtn) skipBtn.addEventListener('click', finishIntro);
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') finishIntro(); });
if (replayBtn) {
  replayBtn.addEventListener('click', () => {
    try { sessionStorage.removeItem('introPlayed'); } catch (e) { /* ignore */ }
    window.scrollTo(0, 0);
    window.location.reload();
  });
}

sizeFx();
if (mode === 'idle') {
  fx.style.display = 'none';
  shardCanvas.style.display = 'none';
  enterIdle();
} else if (skipBtn) {
  skipBtn.hidden = false;
}
if (reduced) {
  composer.render();
} else {
  renderer.setAnimationLoop(frame);
}
window.__home3d = { T_IMPACT, T_SHATTER, T_SHARDS };
