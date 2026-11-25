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
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return fallback();
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, 'uRes'), uTime = gl.getUniformLocation(prog, 'uTime'), uGlow = gl.getUniformLocation(prog, 'uGlow');

  const SCALE = 0.55;                                     // soft light needs no full resolution: cheap on any device
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
  function frame(now) {
    if (!alive) return;
    glow += (target - glow) * 0.045;                      // each drum swell flares, then settles
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (now - t0) / 1000 + 6.0);
    gl.uniform1f(uGlow, glow);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
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
  else run();
}
