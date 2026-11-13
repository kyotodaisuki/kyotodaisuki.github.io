// ホーム画面の 3D 演出:
// 虚空から巨大なメカ熊が歩いてきて画面を殴り、ガラスのように割れてブログが現れる。
import * as THREE from 'three';

const root = document.documentElement;
const canvas = document.getElementById('bg3d');
const fx = document.getElementById('shatter');
const skipBtn = document.getElementById('intro-skip');
const replayBtn = document.getElementById('intro-replay');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const playIntro = root.classList.contains('intro') && !reduced;
window.__introStarted = true;

const BG = 0x04050d;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(BG);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(BG, 14, 66);
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200);
function fitCamera() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = camera.aspect < 1 ? 74 : 58;
  camera.updateProjectionMatrix();
}
fitCamera();

// ---------- lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const key = new THREE.DirectionalLight(0xfff0f5, 2.0);
key.position.set(4, 9, 12);
scene.add(key);
const rimA = new THREE.DirectionalLight(0x22d3ee, 2.2);
rimA.position.set(-9, 6, -10);
scene.add(rimA);
const rimB = new THREE.DirectionalLight(0xff3d9a, 2.2);
rimB.position.set(9, 4, -10);
scene.add(rimB);

// ---------- materials ----------
const M = {
  pink: new THREE.MeshStandardMaterial({ color: 0xd63a7c, metalness: 0.35, roughness: 0.5, flatShading: true }),
  deep: new THREE.MeshStandardMaterial({ color: 0xa3215c, metalness: 0.4, roughness: 0.5, flatShading: true }),
  light: new THREE.MeshStandardMaterial({ color: 0xf6b3cf, metalness: 0.25, roughness: 0.55, flatShading: true }),
  steel: new THREE.MeshStandardMaterial({ color: 0x3a3f52, metalness: 0.8, roughness: 0.35, flatShading: true }),
  dark: new THREE.MeshStandardMaterial({ color: 0x14151f, metalness: 0.6, roughness: 0.5, flatShading: true }),
  nose: new THREE.MeshStandardMaterial({ color: 0x7b2d9b, metalness: 0.5, roughness: 0.3, flatShading: true }),
  eye: new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false }),
  core: new THREE.MeshBasicMaterial({ color: 0xff5fb0, fog: false }),
};

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
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
function add(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function group(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// ---------- the mecha bear (faces +z, ~14 units tall) ----------
function buildBear() {
  const B = {};
  B.root = new THREE.Group();
  B.hips = group(B.root, 0, 4.4, 0);
  add(new THREE.IcosahedronGeometry(1.9, 1), M.steel, B.hips, 0, 0.2, 0).scale.set(1.25, 0.7, 1);

  // legs
  function leg(side) {
    const hip = group(B.hips, side * 1.55, 0, 0);
    add(new THREE.IcosahedronGeometry(0.95, 1), M.dark, hip);
    add(new THREE.CylinderGeometry(1.05, 0.9, 1.9, 8), M.pink, hip, 0, -1.05, 0);
    const knee = group(hip, 0, -2.1, 0);
    add(new THREE.CylinderGeometry(0.8, 0.8, 1.9, 10), M.steel, knee).rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.85, 1.1, 1.6, 8), M.pink, knee, 0, -1.0, 0);
    add(new THREE.BoxGeometry(0.5, 1.2, 0.3), M.deep, knee, 0, -0.9, 0.95);
    const foot = add(new THREE.IcosahedronGeometry(1.2, 1), M.pink, knee, 0, -1.85, 0.45);
    foot.scale.set(1.0, 0.42, 1.45);
    add(new THREE.BoxGeometry(2.1, 0.22, 3.1), M.steel, knee, 0, -2.2, 0.45);
    add(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 10), M.light, knee, 0, -1.35, 1.2).rotation.x = 0.5;
    return { hip, knee };
  }
  B.legL = leg(1);
  B.legR = leg(-1);

  // torso
  B.torso = group(B.hips, 0, 0.5, 0);
  const body = add(new THREE.IcosahedronGeometry(3.0, 2), M.pink, B.torso, 0, 2.7, 0);
  body.scale.set(1.08, 1.0, 0.92);
  const belly = add(new THREE.IcosahedronGeometry(2.2, 2), M.light, B.torso, 0, 2.2, 1.0);
  belly.scale.set(1.0, 1.0, 0.85);
  // belly armor seams
  for (let i = -1; i <= 1; i++) {
    add(new THREE.BoxGeometry(2.6 - Math.abs(i) * 0.5, 0.07, 0.1), M.dark, B.torso, 0, 2.0 + i * 0.75, 2.86 - Math.abs(i) * 0.14);
  }
  // chest reactor
  const ring = add(new THREE.TorusGeometry(0.62, 0.16, 8, 20), M.steel, B.torso, 0, 4.25, 2.42);
  ring.rotation.x = -0.35;
  B.core = add(new THREE.CircleGeometry(0.55, 20), M.core, B.torso, 0, 4.25, 2.44);
  B.core.rotation.x = -0.35;
  B.coreGlow = glow(0xff4fa8, 4.5, B.torso, 0, 4.3, 2.7);
  // collar + exhaust stacks
  add(new THREE.CylinderGeometry(1.5, 1.9, 0.7, 12), M.steel, B.torso, 0, 5.6, 0);
  for (const s of [-1, 1]) {
    const p = add(new THREE.CylinderGeometry(0.32, 0.4, 3.2, 8), M.steel, B.torso, s * 1.5, 5.6, -2.2);
    p.rotation.x = -0.25;
    add(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8), M.dark, B.torso, s * 1.5, 7.1, -2.6).rotation.x = -0.25;
    add(new THREE.BoxGeometry(0.16, 0.16, 0.3), M.steel, B.torso, s * 1.3, 0.9, 2.5);
  }

  // head
  B.head = group(B.torso, 0, 6.2, 0.2);
  const skull = add(new THREE.IcosahedronGeometry(2.05, 2), M.pink, B.head, 0, 1.3, 0);
  skull.scale.set(1.12, 0.98, 1.0);
  const muzzle = add(new THREE.IcosahedronGeometry(1.05, 2), M.light, B.head, 0, 0.75, 1.55);
  muzzle.scale.set(1.25, 0.85, 0.9);
  add(new THREE.IcosahedronGeometry(0.42, 1), M.nose, B.head, 0, 1.1, 2.45).scale.set(1.25, 0.9, 0.8);
  add(new THREE.BoxGeometry(0.08, 0.5, 0.1), M.dark, B.head, 0, 0.55, 2.47);
  add(new THREE.BoxGeometry(1.3, 0.1, 0.1), M.dark, B.head, 0, 0.28, 2.3);
  B.eyeGlows = [];
  for (const s of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), M.dark, B.head, s * 0.82, 1.75, 1.72).rotation.x = Math.PI / 2;
    add(new THREE.SphereGeometry(0.2, 12, 8), M.eye, B.head, s * 0.82, 1.72, 1.9);
    B.eyeGlows.push(glow(0xffe27a, 2.2, B.head, s * 0.82, 1.72, 2.05));
    // heavy angry brows
    const brow = add(new THREE.BoxGeometry(1.15, 0.3, 0.45), M.dark, B.head, s * 0.9, 2.28, 1.78);
    brow.rotation.z = -s * 0.38;
    // ears
    const ear = add(new THREE.CylinderGeometry(0.85, 0.85, 0.5, 12), M.pink, B.head, s * 1.95, 2.95, 0);
    ear.rotation.x = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 12), M.light, B.head, s * 1.95, 2.95, 0.27).rotation.x = Math.PI / 2;
    // temple bolts
    add(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 8), M.steel, B.head, s * 2.28, 1.2, 0.2).rotation.z = Math.PI / 2;
  }
  // skull seam + antenna
  add(new THREE.BoxGeometry(0.1, 1.4, 0.1), M.dark, B.head, 0, 2.75, 1.5).rotation.x = -0.75;
  add(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 5), M.steel, B.head, 1.0, 3.9, -0.4);
  B.antenna = glow(0xff4444, 0.9, B.head, 1.0, 4.75, -0.4);

  // arms
  function arm(side) {
    const shoulder = group(B.torso, side * 3.3, 4.5, 0);
    add(new THREE.IcosahedronGeometry(1.4, 1), M.deep, shoulder, side * 0.1, 0.15, 0);
    add(new THREE.CylinderGeometry(0.85, 0.75, 2.2, 8), M.pink, shoulder, 0, -1.5, 0);
    const elbow = group(shoulder, 0, -2.8, 0);
    add(new THREE.CylinderGeometry(0.75, 0.75, 1.8, 10), M.steel, elbow).rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.85, 1.2, 2.2, 8), M.pink, elbow, 0, -1.3, 0);
    for (const k of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.1, 0.1, 2.0, 6), M.steel, elbow, k * 0.95, -1.2, -0.5);
    }
    add(new THREE.CylinderGeometry(1.15, 1.15, 0.35, 10), M.steel, elbow, 0, -2.45, 0);
    const fist = group(elbow, 0, -3.45, 0);
    add(new THREE.IcosahedronGeometry(1.35, 1), M.pink, fist).scale.set(1.0, 0.82, 1.0);
    for (let i = 0; i < 4; i++) {
      add(new THREE.IcosahedronGeometry(0.34, 1), M.steel, fist, -0.75 + i * 0.5, -0.92, 0.3);
    }
    add(new THREE.IcosahedronGeometry(0.5, 1), M.light, fist, 0, -0.75, -0.5).scale.set(1.3, 0.5, 0.9);
    const tip = group(fist, 0, -1.25, 0.1);
    return { shoulder, elbow, fist, tip };
  }
  B.armL = arm(1);
  B.armR = arm(-1); // the bear's right arm: the punching one
  return B;
}
const bear = buildBear();
scene.add(bear.root);

// ---------- floor grid, dust, shockwaves ----------
const grid = new THREE.GridHelper(240, 60, 0x7a1f52, 0x2a1030);
grid.position.y = 0;
scene.add(grid);

const isSmall = window.innerWidth < 768;
const dustN = isSmall ? 350 : 800;
const dustPos = new Float32Array(dustN * 3);
for (let i = 0; i < dustN; i++) {
  dustPos[i * 3] = (Math.random() - 0.5) * 60;
  dustPos[i * 3 + 1] = Math.random() * 26;
  dustPos[i * 3 + 2] = 6 - Math.random() * 62;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xf9a8d4, size: 0.09, transparent: true, opacity: 0.7 }));
scene.add(dust);

const waves = [];
const waveGeo = new THREE.RingGeometry(0.92, 1, 48);
function shockwave(x, z, strength) {
  const m = new THREE.Mesh(waveGeo, new THREE.MeshBasicMaterial({
    color: 0xff5fb0, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false,
  }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.05, z);
  m.userData = { t: 0, strength };
  scene.add(m);
  waves.push(m);
}
function updateWaves(dt) {
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i];
    w.userData.t += dt;
    const k = w.userData.t / 0.9;
    w.scale.setScalar(1.5 + k * 9 * w.userData.strength);
    w.material.opacity = 0.8 * (1 - k);
    if (k >= 1) { scene.remove(w); w.material.dispose(); waves.splice(i, 1); }
  }
}

// ---------- poses ----------
const STAND = {
  bx: 0, by: 0, bz: 0,
  tx: 0, ty: 0, tz: 0, hx: 0, hy: 0,
  sRx: 0, sRz: -0.22, eR: -0.3, sLx: 0, sLz: 0.22, eL: -0.3,
  hipL: 0, kneeL: 0, hipR: 0, kneeR: 0,
};
function mix(a, b, k) {
  const o = {};
  for (const n in a) o[n] = a[n] + (b[n] - a[n]) * k;
  return o;
}
function applyPose(p) {
  bear.root.position.set(p.bx, 0, p.bz);
  bear.hips.position.y = 4.4 + p.by;
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
}
const ease = (k) => k * k * (3 - 2 * k);
const clamp01 = (k) => Math.min(1, Math.max(0, k));

// ---------- camera ----------
const CAM = new THREE.Vector3(0, 2.3, 14);
const shake = new THREE.Vector3();
let shakeAmp = 0;
const lookTarget = new THREE.Vector3();
function placeCamera(dt) {
  shakeAmp *= Math.exp(-dt * 7);
  shake.set((Math.random() - 0.5) * shakeAmp, (Math.random() - 0.5) * shakeAmp, 0);
  camera.position.copy(CAM).add(shake);
  camera.lookAt(lookTarget.x + shake.x, lookTarget.y + shake.y, lookTarget.z);
}

// ---------- punch choreography: solve so the fist lands right on the lens ----------
const PUNCH_DIR = new THREE.Vector3(-0.02, 0.36, -1).normalize();
const FIST_TARGET = CAM.clone().addScaledVector(PUNCH_DIR, 1.75);
const WIND = Object.assign({}, STAND, {
  tx: -0.14, ty: -0.55, sRx: 1.0, sRz: -0.5, eR: -2.0, sLx: -0.55, eL: -1.0,
  hipL: -0.45, kneeL: 0.35, hipR: 0.3, by: -0.35, hx: 0.1,
});
const PUNCH = Object.assign({}, STAND, {
  tx: 0.5, ty: 0.6, tz: -0.08, sRx: -1.2, sRz: 0.0, eR: -0.04, sLx: 0.8, sLz: 0.4, eL: -1.4,
  hipL: -0.75, kneeL: 0.95, hipR: 0.55, kneeR: 0.2, by: -0.95, hx: -0.5, hy: 0.25,
});
(function solvePunch() {
  const v = new THREE.Vector3();
  let best = 0, bestErr = Infinity;
  for (let i = 0; i <= 120; i++) {
    PUNCH.sRx = -2.4 + (i / 120) * 2.2;
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

const Z_START = -52;
const Z_STAND = PUNCH.bz - 3.2;
const X_STAND = PUNCH.bx * 0.4;
WIND.bz = Z_STAND + 0.9;
WIND.bx = PUNCH.bx * 0.6;
const STEPS = 9;
const T_WALK = 5.4, T_WIND = 0.6, T_STRIKE = 0.15, T_CRACK = 0.95, T_SHARDS = 1.9;
const T_IMPACT = T_WALK + T_WIND + T_STRIKE;
const T_SHATTER = T_IMPACT + T_CRACK;

let lastStep = -1;
function walkPose(u) {
  const ph = u * STEPS * Math.PI;
  const s = Math.sin(ph), c = Math.cos(ph);
  const A = 0.55;
  const settle = 1 - clamp01((u - 0.94) / 0.06);
  const p = Object.assign({}, STAND);
  p.bz = Z_START + (Z_STAND - Z_START) * u;
  p.bx = X_STAND * u + 0.35 * s * settle;
  p.by = 4.2 * (Math.cos(A * s) - 1);
  p.hipL = -A * s; p.kneeL = 0.95 * Math.max(0, c) * settle;
  p.hipR = A * s; p.kneeR = 0.95 * Math.max(0, -c) * settle;
  p.tz = 0.07 * s; p.ty = 0.14 * s; p.tx = 0.06;
  p.sRx = -0.45 * s; p.sLx = 0.45 * s;
  p.eR = -0.45; p.eL = -0.45;
  p.hx = -0.1 * u;
  const step = Math.floor(ph / Math.PI - 0.5);
  if (step !== lastStep && step >= 0) {
    lastStep = step;
    shakeAmp = Math.max(shakeAmp, 0.05 + 0.5 * u * u);
    shockwave(p.bx + (step % 2 ? 1.55 : -1.55), p.bz + 2.2, 0.6 + u);
  }
  return p;
}

// ---------- glass ----------
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
  ) * 1.08;
  const N = 16;
  const radii = [];
  for (let r = Math.max(26, Math.min(W, H) * 0.045); ; r = r * 1.6 + 14) {
    radii.push(r);
    if (r > far) break;
  }
  const angles = [];
  for (let i = 0; i < N; i++) angles.push(((i + (rnd() - 0.5) * 0.7) / N) * Math.PI * 2);
  const V = [];
  for (let j = 0; j < radii.length; j++) {
    const row = [];
    for (let i = 0; i < N; i++) {
      const a = angles[i] + (rnd() - 0.5) * 0.09;
      const r = radii[j] * (1 + (rnd() - 0.5) * 0.26);
      row.push([px + Math.cos(a) * r, py + Math.sin(a) * r]);
    }
    V.push(row);
  }
  const shards = [], lines = [];
  function shard(pts) {
    let cx = 0, cy = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) {
      cx += p[0]; cy += p[1];
      x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);
    }
    if (x1 < 0 || y1 < 0 || x0 > W || y0 > H) return;
    cx /= pts.length; cy /= pts.length;
    const dx = cx - px, dy = cy - py, d = Math.hypot(dx, dy) || 1;
    const sp = (240 + rnd() * 520) * (0.55 + 0.6 * (1 - d / far));
    shards.push({
      pts, cx, cy, x0: x0 - 2, y0: y0 - 2, w: x1 - x0 + 4, h: y1 - y0 + 4,
      vx: (dx / d) * sp + (rnd() - 0.5) * 120, vy: (dy / d) * sp - 120 - rnd() * 260,
      rot: (rnd() - 0.5) * 5, fa: 1.5 + rnd() * 5, fb: 1.5 + rnd() * 5,
      delay: (d / far) * 0.42 + rnd() * 0.08, grow: 0.25 + rnd() * 0.7,
    });
  }
  for (let i = 0; i < N; i++) {
    const n = (i + 1) % N;
    shard([[px, py], V[0][i], V[0][n]]);
    lines.push([[px, py], V[0][i], 2.4, 0]);
    for (let j = 0; j < radii.length - 1; j++) {
      const a = V[j][i], b = V[j][n], c = V[j + 1][n], d = V[j + 1][i];
      lines.push([a, d, Math.max(0.7, 2.2 - j * 0.3), 0]);
      if (rnd() < 0.62) lines.push([a, b, 1, 0]);
      if (j >= 1) {
        if (rnd() < 0.5) { shard([a, b, c]); shard([a, c, d]); lines.push([a, c, 0.7, 1]); }
        else { shard([a, b, d]); shard([b, c, d]); lines.push([b, d, 0.7, 1]); }
      } else {
        shard([a, b, c, d]);
      }
    }
  }
  glass = { px, py, far, shards, lines, snap: null };
}
function drawCracks(t) {
  // two beats: first hit, then the fist grinds in and the cracks reach the edges
  const k1 = clamp01(t / 0.1);
  const k2 = clamp01((t - 0.45) / 0.14);
  const reach = glass.far * (0.34 * (1 - Math.pow(1 - k1, 3)) + 0.7 * ease(k2));
  g2.setTransform(DPR, 0, 0, DPR, 0, 0);
  g2.clearRect(0, 0, W, H);
  const flash = Math.max(0, 1 - t / 0.22) * 0.85 + Math.max(0, 1 - Math.abs(t - 0.5) / 0.12) * 0.3;
  if (flash > 0) {
    const gr = g2.createRadialGradient(glass.px, glass.py, 0, glass.px, glass.py, glass.far * 0.8);
    gr.addColorStop(0, 'rgba(255,255,255,' + flash + ')');
    gr.addColorStop(1, 'rgba(255,200,230,' + flash * 0.25 + ')');
    g2.fillStyle = gr;
    g2.fillRect(0, 0, W, H);
  }
  g2.save();
  g2.beginPath();
  g2.arc(glass.px, glass.py, reach, 0, Math.PI * 2);
  g2.clip();
  g2.lineCap = 'round';
  for (const pass of [0, 1]) {
    g2.strokeStyle = pass ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.55)';
    for (const l of glass.lines) {
      if (l[3] && k2 <= 0) continue;
      g2.lineWidth = l[2] + (pass ? 0 : 1.6);
      g2.beginPath();
      g2.moveTo(l[0][0] + (pass ? 0 : 1.2), l[0][1] + (pass ? 0 : 1.2));
      g2.lineTo(l[1][0] + (pass ? 0 : 1.2), l[1][1] + (pass ? 0 : 1.2));
      g2.stroke();
    }
  }
  g2.restore();
  const fr = g2.createRadialGradient(glass.px, glass.py, 0, glass.px, glass.py, 70 + 60 * k2);
  fr.addColorStop(0, 'rgba(255,255,255,0.55)');
  fr.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = fr;
  g2.fillRect(0, 0, W, H);
}
function takeSnapshot() {
  renderer.render(scene, camera);
  const snap = document.createElement('canvas');
  snap.width = fx.width; snap.height = fx.height;
  const s = snap.getContext('2d');
  s.drawImage(canvas, 0, 0, snap.width, snap.height);
  s.drawImage(fx, 0, 0);
  glass.snap = snap;
}
function drawShards(t) {
  g2.setTransform(1, 0, 0, 1, 0, 0);
  g2.clearRect(0, 0, fx.width, fx.height);
  const flash = Math.max(0, 1 - t / 0.25) * 0.7;
  for (const s of glass.shards) {
    const lt = Math.max(0, t - s.delay);
    const alpha = 1 - clamp01((lt - 0.75) / 0.75);
    if (alpha <= 0) continue;
    const x = s.cx + s.vx * lt, y = s.cy + s.vy * lt + 1300 * lt * lt;
    const sc = 1 + s.grow * lt;
    const fa = Math.cos(s.fa * lt), fb = Math.cos(s.fb * lt);
    g2.setTransform(DPR, 0, 0, DPR, 0, 0);
    g2.translate(x, y);
    g2.rotate(s.rot * lt);
    g2.scale(sc * (Math.abs(fa) < 0.05 ? 0.05 : fa), sc * (Math.abs(fb) < 0.05 ? 0.05 : fb));
    g2.translate(-s.cx, -s.cy);
    g2.globalAlpha = alpha;
    g2.save();
    g2.beginPath();
    g2.moveTo(s.pts[0][0], s.pts[0][1]);
    for (let i = 1; i < s.pts.length; i++) g2.lineTo(s.pts[i][0], s.pts[i][1]);
    g2.closePath();
    g2.clip();
    const sx = Math.max(0, s.x0), sy = Math.max(0, s.y0);
    const sw = Math.min(W, s.x0 + s.w) - sx, sh = Math.min(H, s.y0 + s.h) - sy;
    if (sw > 0 && sh > 0) g2.drawImage(glass.snap, sx * DPR, sy * DPR, sw * DPR, sh * DPR, sx, sy, sw, sh);
    const glint = (1 - Math.abs(fa * fb)) * 0.5 + flash;
    if (glint > 0.01) { g2.fillStyle = 'rgba(255,255,255,' + Math.min(0.9, glint) + ')'; g2.fill(); }
    g2.restore();
    g2.lineWidth = 1.2;
    g2.strokeStyle = 'rgba(255,255,255,0.75)';
    g2.stroke();
  }
  g2.globalAlpha = 1;
}

// ---------- idle background mode (after the intro) ----------
let mouseX = 0, mouseY = 0;
window.addEventListener('pointermove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});
const IDLE_Z = -9;
const camIdle = new THREE.Vector3();
function idleFrame(t, dt) {
  const p = Object.assign({}, STAND);
  const br = Math.sin(t * 1.3);
  p.bz = IDLE_Z;
  p.by = 0.06 * br;
  p.tx = 0.03 + 0.015 * br;
  p.tz = 0.02 * Math.sin(t * 0.6);
  p.sRx = 0.05 * br; p.sLx = -0.05 * br;
  p.hy = mouseX * 0.45 + 0.08 * Math.sin(t * 0.4);
  p.hx = mouseY * 0.25 - 0.05;
  applyPose(p);
  camIdle.set(mouseX * 0.9, 3.4 - mouseY * 0.4, 14);
  camera.position.lerp(camIdle, Math.min(1, dt * 3));
  camera.lookAt(0, 8.2, IDLE_Z);
}

// ---------- main loop ----------
let mode = playIntro ? 'intro' : 'idle';
let t0 = null, last = 0, impactDone = false, snapDone = false;
const v3 = new THREE.Vector3();

function finishIntro() {
  if (mode === 'idle') return;
  mode = 'idle';
  fx.style.display = 'none';
  fx.style.transform = '';
  if (skipBtn) skipBtn.hidden = true;
  root.classList.remove('intro', 'shattering');
  try { sessionStorage.setItem('introPlayed', '1'); } catch (e) { /* ignore */ }
  for (const w of waves) scene.remove(w);
  waves.length = 0;
  camera.position.set(0, 3.4, 14);
}

function introFrame(t, dt) {
  let pose;
  if (t < T_WALK) {
    const u = t / T_WALK;
    pose = walkPose(u);
    lookTarget.set(0, 6 + 3.2 * u * u, pose.bz);
  } else if (t < T_WALK + T_WIND) {
    const k = ease((t - T_WALK) / T_WIND);
    pose = mix(walkPose(1), WIND, k);
    lookTarget.set(0, 9.2 - 0.6 * k, pose.bz);
  } else {
    const k = clamp01((t - T_WALK - T_WIND) / T_STRIKE);
    pose = mix(WIND, PUNCH, k * k);
    if (t > T_IMPACT) {
      // fist grinding against the glass
      const g = t - T_IMPACT;
      const press = ease(clamp01((g - 0.42) / 0.12));
      pose.bz += -0.22 * Math.exp(-g * 9) + 0.2 * press;
      pose.tx += 0.03 * press;
      pose.bx += Math.sin(g * 70) * 0.012;
    }
    v3.copy(CAM).addScaledVector(PUNCH_DIR, 12);
    lookTarget.set(0, 8.6, Z_STAND).lerp(v3, ease(k));
  }
  applyPose(pose);
  placeCamera(dt);

  if (t >= T_IMPACT && !impactDone) {
    impactDone = true;
    shakeAmp = 0.5;
    bear.root.updateMatrixWorld(true);
    bear.armR.tip.getWorldPosition(v3).project(camera);
    const px = Math.min(0.68, Math.max(0.32, v3.x * 0.5 + 0.5)) * W;
    const py = Math.min(0.66, Math.max(0.34, -v3.y * 0.5 + 0.5)) * H;
    buildGlass(px, py);
  }
  if (impactDone && t < T_SHATTER) {
    const g = t - T_IMPACT;
    if (g > 0.45 && g < 0.5) shakeAmp = Math.max(shakeAmp, 0.35);
    drawCracks(g);
    const j = shakeAmp * 26;
    fx.style.transform = 'translate(' + ((Math.random() - 0.5) * j).toFixed(1) + 'px,' + ((Math.random() - 0.5) * j).toFixed(1) + 'px)';
  }
  if (t >= T_SHATTER && !snapDone) {
    snapDone = true;
    fx.style.transform = '';
    takeSnapshot();
    drawShards(0);
    // the real page is revealed behind the falling shards
    root.classList.remove('intro');
    root.classList.add('shattering');
    if (skipBtn) skipBtn.hidden = true;
    idleFrame(0, 1);
    camera.position.set(0, 3.4, 14);
    camera.lookAt(0, 8.2, IDLE_Z);
    mode = 'shards';
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
  // eyes + reactor pulse
  const pulse = 0.85 + 0.15 * Math.sin(t * 5);
  bear.eyeGlows[0].scale.setScalar(2.2 * pulse);
  bear.eyeGlows[1].scale.setScalar(2.2 * pulse);
  bear.coreGlow.scale.setScalar(4.5 * (0.9 + 0.1 * Math.sin(t * 3)));
  bear.antenna.material.opacity = Math.sin(t * 6) > 0 ? 1 : 0.15;
  dust.rotation.y = t * 0.01;
  updateWaves(dt);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  fitCamera();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (mode === 'intro' && !impactDone) sizeFx();
  if (reduced) { idleFrame(0, 1); renderer.render(scene, camera); }
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
  idleFrame(0, 1);
  camera.position.set(0, 3.4, 14);
  camera.lookAt(0, 8.2, IDLE_Z);
} else if (skipBtn) {
  skipBtn.hidden = false;
}
if (reduced) {
  renderer.render(scene, camera);
} else {
  renderer.setAnimationLoop(frame);
}
// test hook: lets the timeline be inspected frame by frame
window.__home3d = { frame, T_IMPACT, T_SHATTER, T_SHARDS };
