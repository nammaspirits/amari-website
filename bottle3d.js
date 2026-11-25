/* AMARI — real-time 3D bottle for the "Turn the bottle" section.
   Built from the measured outline of the bottle photo and the print label artwork.
   Kept light on purpose: standard materials only (fast shader start-up on Windows/ANGLE),
   shaders prepared off the main thread, and nothing loads until the section is near.
   If WebGL or three.js is unavailable, the photo viewer in script.js stays as it is. */
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

function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

async function init() {
  /* ---------- Renderer, scene, camera, studio lights ---------- */
  const holder = document.createElement('div');
  holder.className = 'bottle3d';
  holder.setAttribute('aria-hidden', 'true');
  stage.appendChild(holder);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  holder.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 5.3, 23);
  camera.lookAt(0, 5, 0);

  scene.add(new THREE.HemisphereLight(0xFBF2E0, 0x331C10, 1.1));
  const key = new THREE.DirectionalLight(0xFBF2E0, 2.4); key.position.set(-5, 8, 10); scene.add(key);
  const fillLight = new THREE.DirectionalLight(0xEDDDC5, 0.6); fillLight.position.set(6, 2, 6); scene.add(fillLight);
  const rim = new THREE.DirectionalLight(0xD3852A, 1.4); rim.position.set(7, 6, -6); scene.add(rim);

  /* ---------- Bottle outline (y: 0 = base, 10 = top of cap), measured from bottle-front.webp ---------- */
  const body = [
    [0.00, 0.02], [0.90, 0.02], [1.38, 0.07], [1.56, 0.18], [1.62, 0.40], [1.63, 0.70],
    [1.62, 1.20], [1.61, 3.00], [1.61, 5.40], [1.62, 6.20], [1.61, 6.45], [1.57, 6.70],
    [1.40, 6.90], [1.17, 7.02], [0.90, 7.20], [0.70, 7.38], [0.63, 7.60], [0.62, 7.95], [0.60, 9.80]
  ];
  const fill = 7.22; // whisky level, just under the shoulder
  const v2 = (pts, scale = 1, maxY = Infinity) => pts.filter((p) => p[1] <= maxY).map(([r, y]) => new THREE.Vector2(r * scale, y));

  const bottle = new THREE.Group();
  scene.add(bottle);

  // Whisky: darker toward the edges, glowing in the middle, like light through a round bottle
  const liquidPts = v2(body, 0.93, fill);
  liquidPts.push(new THREE.Vector2(0.62 * 0.93 + 0.2, fill), new THREE.Vector2(0, fill));
  liquidPts[0] = new THREE.Vector2(0, 0.14);
  const liquidMat = new THREE.MeshStandardMaterial({ color: 0xD3852A, roughness: 0.22, metalness: 0 });
  liquidMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
      float facing = clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0);
      gl_FragColor.rgb *= mix(vec3(0.30, 0.16, 0.08), vec3(1.05), pow(facing, 0.85));`
    );
  };
  bottle.add(new THREE.Mesh(new THREE.LatheGeometry(liquidPts, 96), liquidMat));

  // Glass: a faint tint plus soft studio-light streaks (fixed to the camera, like real reflections)
  const glassTint = new THREE.Mesh(
    new THREE.LatheGeometry(v2(body), 128),
    new THREE.MeshStandardMaterial({ color: 0xFBF2E0, roughness: 0.1, transparent: true, opacity: 0.08, depthWrite: false })
  );
  glassTint.renderOrder = 3;
  bottle.add(glassTint);
  const streakTex = canvasTexture(512, 8, (g, w) => {
    const grad = g.createLinearGradient(0, 0, w, 0);
    [[0.00, 0], [0.16, 0], [0.21, 0.85], [0.25, 0], [0.30, 0.25], [0.33, 0], [0.70, 0], [0.76, 0.35], [0.82, 0], [1, 0]]
      .forEach(([o, a]) => grad.addColorStop(o, `rgba(251,242,224,${a})`));
    g.fillStyle = grad; g.fillRect(0, 0, w, 8);
  });
  const streaks = new THREE.Mesh(
    new THREE.LatheGeometry(v2(body, 1.004), 128, -Math.PI / 2, Math.PI),   // front half only, faces the camera
    new THREE.MeshBasicMaterial({ map: streakTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  streaks.renderOrder = 4;
  scene.add(streaks);                                                         // not in the group: reflections stay put as the bottle turns

  /* ---------- Labels from the print artwork ---------- */
  const loader = new THREE.TextureLoader();
  const loadTex = (url) => new Promise((res, rej) => loader.load(url, res, undefined, rej));
  const [frontTex, backTex] = await Promise.all([loadTex('images/label-front.webp'), loadTex('images/label-back.webp')]);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  [frontTex, backTex].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; });

  const LABEL_R = 1.635;
  function wrapLabel(tex, heightU, centerY, centreAngle, transparent) {
    const arc = (heightU * tex.image.width / tex.image.height) / LABEL_R;   // label width as an angle
    const geo = new THREE.CylinderGeometry(LABEL_R, LABEL_R, heightU, 96, 1, true, centreAngle - arc / 2, arc);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0, transparent, alphaTest: transparent ? 0.5 : 0, emissive: 0xFFFFFF, emissiveMap: tex, emissiveIntensity: 0.18 });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = centerY;
    m.renderOrder = 2;
    return m;
  }
  bottle.add(wrapLabel(frontTex, 5.18, 3.06, 0, true));            // 75 x 115 mm, front
  bottle.add(wrapLabel(backTex, 3.60, 3.80, Math.PI, false));      // 55 x 80 mm, back

  /* ---------- Gold cap with the AMARI band ---------- */
  const capTex = canvasTexture(2048, 512, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#D3852A'); grad.addColorStop(0.55, '#EDDDC5'); grad.addColorStop(1, '#D3852A');
    g.fillStyle = grad; g.fillRect(0, 0, 2048, 512);
    g.fillStyle = 'rgba(51,28,16,.28)';
    for (let x = 0; x < 2048; x += 16) g.fillRect(x, 0, 5, 300);     // knurled grip
    g.fillStyle = 'rgba(141,53,29,.35)'; g.fillRect(0, 300, 2048, 6);
    g.fillStyle = '#1B1B1B';
    g.font = '600 120px "Barlow Condensed", "Arial Narrow", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
      const cx = (i + 0.5) * (2048 / 3);
      'AMARI'.split('').forEach((ch, k) => g.fillText(ch, cx + (k - 2) * 120, 410));
    }
  });
  capTex.anisotropy = aniso;
  const gold = { roughness: 0.32, metalness: 0.35 };
  const capSide = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 1.92, 96, 1, true), new THREE.MeshStandardMaterial({ ...gold, map: capTex }));
  capSide.position.y = 8.9;
  capSide.rotation.y = Math.PI / 2;
  bottle.add(capSide);
  bottle.add(new THREE.Mesh(
    new THREE.LatheGeometry([new THREE.Vector2(0.66, 9.86), new THREE.Vector2(0.64, 9.94), new THREE.Vector2(0.55, 9.99), new THREE.Vector2(0, 10)], 96),
    new THREE.MeshStandardMaterial({ ...gold, color: 0xD3852A })
  ));

  /* ---------- Sizing, rendering, hooking into the existing controls ---------- */
  function resize() {
    const w = holder.clientWidth, h = holder.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const needH = 11.6, needW = 4.6;                                  // keep the whole bottle in frame
    camera.fov = 2 * Math.atan(Math.max(needH, needW / camera.aspect) / 2 / 23) * 180 / Math.PI;
    camera.updateProjectionMatrix();
    draw();
  }
  let queued = false, ready = false;
  function draw() {
    if (!ready || queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; renderer.render(scene, camera); });
  }

  bottle.rotation.x = 0.04;
  // Prepare shaders without freezing the page (uses KHR_parallel_shader_compile where available)
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
