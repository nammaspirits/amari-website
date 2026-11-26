/* AMARI v2 opening — amber light inside the rising sun.
   A small WebGL fragment shader: slow ribbons of light, like sunlight through whisky,
   in the brand palette only (Dark Cacao, Burnt Earth, Sunlit Amber, Desert Sand).
   Runs only while the opening is on screen; listens for "amari:pulse" (the drum swells)
   and shuts itself down, releasing the GPU, when the opening ends. */
const intro = document.getElementById('intro');
const canvas = document.getElementById('op-light');

const FRAG = `
precision mediump float;
uniform vec2 uRes; uniform float uTime; uniform float uGlow;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime;
  vec2 q = vec2(fbm(uv * 1.2 + vec2(t * 0.03, 0.0)), fbm(uv * 1.2 + vec2(5.2, 1.3) - t * 0.025));
  float w = fbm(uv * 1.7 + 1.9 * q + vec2(t * 0.045, -t * 0.015));
  float band = exp(-pow((uv.y * 1.1 + (w - 0.5) * 0.6) * 3.4, 2.0));            // one calm, warped horizontal river of light
  float caustic = pow(1.0 - abs(sin(w * 7.0 + uv.x * 1.6 + t * 0.22)), 3.0);      // soft light filaments
  float L = band * (0.62 + 0.45 * caustic) * uGlow + 0.05 * w;
  vec3 cacao = vec3(0.200, 0.110, 0.063), earth = vec3(0.553, 0.208, 0.114);
  vec3 amber = vec3(0.827, 0.522, 0.165), sand = vec3(0.929, 0.867, 0.773);
  vec3 col = mix(cacao, earth, smoothstep(0.05, 0.38, L));
  col = mix(col, amber, smoothstep(0.32, 0.78, L));
  col = mix(col, sand, 0.55 * smoothstep(1.1, 1.8, L));                         // only the hottest core turns pale
  col *= 0.9 + 0.1 * hash(gl_FragCoord.xy + fract(t));                           // film grain
  gl_FragColor = vec4(col, 1.0);
}`;
const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

function run() {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return fallback();
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  const par = gl.getExtension('KHR_parallel_shader_compile');
  const ready = () => !par || gl.getProgramParameter(prog, par.COMPLETION_STATUS_KHR);
  (function wait() { if (!ready()) return requestAnimationFrame(wait); setup(gl, prog); })();
}

function setup(gl, prog) {
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return fallback();
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, 'uRes'), uTime = gl.getUniformLocation(prog, 'uTime'), uGlow = gl.getUniformLocation(prog, 'uGlow');

  let SCALE = 0.55;                                       // soft light needs no full resolution: cheap on any device
  if (Math.min(innerWidth, innerHeight) < 600) SCALE = 0.42;   // phones: fewer pixels, same look
  function size() {
    const w = Math.max(2, Math.round(innerWidth * SCALE)), h = Math.max(2, Math.round(innerHeight * SCALE));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  addEventListener('resize', size);
  size();

  let glow = 0.6, target = 1, raf = 0, alive = true;
  const t0 = performance.now();
  intro.addEventListener('amari:pulse', () => { glow = 1.75; });
  intro.addEventListener('amari:out', () => { target = 1.45; });
  let lastT = 0, slow = 0, seen = 0;
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (!intro.classList.contains('s-stage')) { lastT = 0; return; }    // the sun is not on screen yet: no GPU work
    if (lastT) {                                          // frame budget watch: if the device struggles, render the light smaller
      seen++; if (now - lastT > 24) slow++;
      if (seen === 40) { if (slow > 12 && SCALE > 0.26) { SCALE *= 0.7; size(); } seen = slow = 0; }
    }
    lastT = now;
    glow += (target - glow) * 0.045;                      // each drum swell flares, then settles
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (now - t0) / 1000 + 6.0);
    gl.uniform1f(uGlow, glow);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  raf = requestAnimationFrame(frame);

  function stop() {
    if (!alive) return;
    alive = false; cancelAnimationFrame(raf);
    removeEventListener('resize', size);
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  }
  new MutationObserver(() => { if (intro.hidden) stop(); }).observe(intro, { attributes: true, attributeFilter: ['hidden'] });
}

function fallback() {
  canvas.style.background = 'radial-gradient(ellipse 70% 30% at 50% 50%, #D3852A, #8D351D 45%, #331C10 75%)';
}

if (intro && canvas && !intro.hidden) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) fallback();
  else (window.requestIdleCallback || ((f) => setTimeout(f, 300)))(run, { timeout: 2500 });
  if (!(window.CSS && CSS.registerProperty)) tweenSun();   // older browsers: animate the sun by script
}

/* Browsers without @property (older Safari / Firefox) cannot animate --r / --cy in CSS, so the sun would jump.
   Here the same moves are played by script, with the same timing and easing. */
function tweenSun() {
  const sun = intro.querySelector('.op-sun'); if (!sun) return;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  const px = (v) => { probe.style.width = `calc(${v.trim() || '0px'})`; return probe.getBoundingClientRect().width; };
  const back = (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };   // gentle overshoot, like the CSS curve
  const out = (t) => 1 - Math.pow(1 - t, 3);
  const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let cur = { r: 0, cy: px(getComputedStyle(sun).getPropertyValue('--cy')) }, anim = 0;
  const apply = () => { sun.style.setProperty('--r', cur.r + 'px'); sun.style.setProperty('--cy', cur.cy + 'px'); };
  apply();
  new MutationObserver(() => {
    sun.style.removeProperty('--r'); sun.style.removeProperty('--cy');
    const cs = getComputedStyle(sun), to = { r: px(cs.getPropertyValue('--r')), cy: px(cs.getPropertyValue('--cy')) };
    apply();
    if (Math.abs(to.r - cur.r) < 0.5 && Math.abs(to.cy - cur.cy) < 0.5) return;
    const from = { ...cur }, isOut = intro.classList.contains('s-out'), t0 = performance.now();
    const dr = isOut ? 1300 : 750, dc = 1200;
    cancelAnimationFrame(anim);
    (function step(now) {
      const a = Math.min(1, (now - t0) / dr), b = Math.min(1, (now - t0) / dc);
      cur.r = from.r + (to.r - from.r) * (isOut ? io(a) : back(a));
      cur.cy = from.cy + (to.cy - from.cy) * out(b);
      apply();
      if (a < 1 || b < 1) anim = requestAnimationFrame(step);
    })(t0);
  }).observe(intro, { attributes: true, attributeFilter: ['class'] });
}
