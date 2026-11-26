/* AMARI — 3D bottle for the "Turn the bottle" section, built from the real bottle.
   Shape: the outline measured from four studio photos (bottle-profile.json, radius per height).
   Surface: those four photos unwrapped around the bottle and blended into one 360° skin
   (bottle-skin.webp), shown unlit so it looks exactly like the photographs. Cap top: the real
   top-down cap photo. Loads only when the section is near; falls back to the photo viewer. */
import * as THREE from 'three';

const stage = document.getElementById('turn-stage');
const turn = window.AMARI_turn;

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

if (stage && turn && webglOK()) {
  const start = () => init().catch((err) => console.warn('AMARI 3D bottle unavailable, using photos.', err));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); start(); }
    }, { rootMargin: '800px 0px' });
    io.observe(stage);
  } else start();
}

const V = '20261126d';   // bump when the skin or profile is rebuilt

async function init() {
  const [profile, skin, capTop] = await Promise.all([
    fetch(`images/bottle-profile.json?v=${V}`).then((r) => { if (!r.ok) throw new Error('profile'); return r.json(); }),
    loadTex(`images/bottle-skin.webp?v=${V}`),
    loadTex(`images/cap-top-disc.webp?v=${V}`)
  ]);

  const holder = document.createElement('div');
  holder.className = 'bottle3d';
  holder.setAttribute('aria-hidden', 'true');
  stage.appendChild(holder);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  holder.appendChild(renderer.domElement);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  [skin, capTop].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 200);
  const DIST = 34;                                   // far and narrow, like a studio product shot
  camera.position.set(0, 5, DIST);
  camera.lookAt(0, 5, 0);

  /* ---------- Shape: lathe from the measured outline (heights evenly spaced, so the skin maps 1:1) ---------- */
  const H = profile.h, rad = profile.radius, n = rad.length;
  const pts = rad.map((r, j) => new THREE.Vector2(Math.max(r, 0.002), (j / (n - 1)) * H));
  const bottle = new THREE.Group();
  scene.add(bottle);

  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 256), new THREE.MeshBasicMaterial({ map: skin }));
  bottle.add(body);

  // real cap top (photo of the cap from above) and a dark glass base
  const topR = rad[n - 2];
  const top = new THREE.Mesh(new THREE.CircleGeometry(topR, 96), new THREE.MeshBasicMaterial({ map: capTop, transparent: true }));
  top.rotation.x = -Math.PI / 2; top.position.y = H - 0.001;
  bottle.add(top);
  const baseDisc = new THREE.Mesh(new THREE.CircleGeometry(rad[2], 64), new THREE.MeshBasicMaterial({ color: 0x8D351D }));
  baseDisc.rotation.x = Math.PI / 2; baseDisc.position.y = 0.002;
  bottle.add(baseDisc);

  const maxR = Math.max(...rad);

  /* ---------- Sizing: always the whole bottle, on any screen ---------- */
  function resize() {
    const w = holder.clientWidth, h = holder.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const halfH = H / 2 + 0.45, halfW = maxR + 0.35;
    const vHalf = Math.max(halfH, halfW / camera.aspect);
    camera.fov = 2 * Math.atan(vHalf / DIST) * 180 / Math.PI;
    camera.updateProjectionMatrix();
    draw();
  }
  let queued = false, ready = false;
  function draw() {
    if (!ready || queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; renderer.render(scene, camera); });
  }

  if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
  ready = true;
  new ResizeObserver(resize).observe(holder);
  turn.use3D((angleDeg) => {
    bottle.rotation.y = THREE.MathUtils.degToRad(angleDeg);
    draw();
  });
  resize();
  stage.classList.add('is-3d');
}

function loadTex(url) {
  return new Promise((res, rej) => new THREE.TextureLoader().load(url, res, undefined, rej));
}
