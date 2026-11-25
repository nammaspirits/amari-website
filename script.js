/* AMARI website v2 — interactions (no libraries) */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  /* Intro pop-up (age check) */
  var intro = $('#intro'), toast = $('#toast');
  $('#btn-enter').addEventListener('click', function () {
    intro.classList.add('intro-out');
    setTimeout(function () { intro.hidden = true; document.body.classList.remove('locked'); }, 900);
    setTimeout(function () { toast.hidden = false; }, 2600);
  });
  $('#btn-decline').addEventListener('click', function () { $('#intro-ask').hidden = true; $('#intro-no').hidden = false; });
  $('#btn-reask').addEventListener('click', function () { $('#intro-no').hidden = true; $('#intro-ask').hidden = false; });
  $$('[data-close-toast]').forEach(function (el) { el.addEventListener('click', function () { toast.hidden = true; }); });

  /* Mobile menu */
  var nav = $('.nav'), navBtn = $('.nav-toggle');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    navBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    navBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  navBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  $$('#nav-links a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); navBtn.focus(); }
  });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) setMenu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 1023) setMenu(false); });

  /* Hero bottle tilt */
  var zone = $('#tilt-zone'), bottle = $('#tilt-bottle'), sun = $('#tilt-sun');
  bottle.style.transition = 'transform .25s ease-out';
  sun.style.transition = 'transform .4s ease-out';
  zone.addEventListener('mousemove', function (e) {
    var r = zone.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    var ry = Math.round(x * 30), rx = Math.round(-y * 14);
    bottle.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
    sun.style.transform = 'translate(' + (-ry * 1.6) + 'px,' + (rx * 1.6) + 'px)';
  });
  zone.addEventListener('mouseleave', function () { bottle.style.transform = ''; sun.style.transform = ''; });

  /* Turn the bottle: drag (mouse, touch, pen), arrow keys, slider, buttons, auto-turn.
     Works with any number of photos: add more <img class="view" data-view="N"> frames
     (e.g. 24-36 turntable shots) and it becomes a smooth 360-degree spin. */
  var TEXT = [
    'The antelope-in-sun label: Spirit of Africa, Beyond Ordinary Whiskey, Origin Reserve, Gold Blend.',
    'A gold cap and AMARI neck band over an amber, triple-distilled blend.',
    'Made for the World — a blend of fine grains, carefully distilled to bring out a smooth, rich and distinctive character.',
    'Batch 01. 750 ml. 42.8% ABV. Blended and bottled in Goa.'
  ];
  var NAMES = ['Front', 'Side', 'Back', 'Other side'];
  var stage = $('#turn-stage'), frames = $$('[data-view]'), N = frames.length, STEP = 360 / N;
  var range = $('#turn'), autoBtn = $('#btn-auto'), hint = $('#turn-hint');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var angle = 0, shown = -1, auto = !reduceMotion, anim = null, drag = null, sliding = false;
  var paint3d = null;   // set by bottle3d.js when the 3D bottle is ready: free spin instead of photo steps

  function norm(a) { return ((a % 360) + 360) % 360; }
  function nearest(a) { return Math.round(a / STEP) * STEP; }
  function toward(target) { var d = norm(target - angle); if (d > 180) d -= 360; return angle + d; }

  function render() {
    var n = norm(angle);
    if (paint3d) paint3d(angle);
    else frames.forEach(function (img, k) {
      var d = n - k * STEP; d = ((d + 540) % 360) - 180;          // signed degrees from this frame
      var t = d / STEP, at = Math.abs(t);                           // -1..1 between neighbours
      if (at >= 1) { img.style.opacity = 0; img.style.visibility = 'hidden'; return; }
      img.style.visibility = 'visible';
      img.style.opacity = Math.min(1, Math.max(0, (0.62 - at) / 0.24)).toFixed(3); // quick cross-fade mid-turn
      img.style.transform = 'translateX(' + (t * 16).toFixed(2) + '%) scaleX(' + (1 - 0.1 * at).toFixed(3) + ')';
    });
    var idx = Math.round(n / STEP) % N;
    if (idx !== shown) {
      shown = idx;
      $('#view-no').textContent = (idx < 9 ? '0' : '') + (idx + 1);
      $('#view-text').textContent = TEXT[idx] || '';
      $$('[data-pick]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-pick') === idx ? 'true' : 'false'); });
      stage.setAttribute('aria-valuetext', NAMES[idx] || ('View ' + (idx + 1)));
    }
    stage.setAttribute('aria-valuenow', Math.round(n));
    if (!sliding) range.value = Math.round(n);
  }

  function stopAnim() { if (anim) { cancelAnimationFrame(anim); anim = null; } }
  function animateTo(target, ms) {
    stopAnim();
    if (reduceMotion || !ms) { angle = target; render(); return; }
    var from = angle, start = performance.now();
    (function tick(now) {
      var p = Math.min(1, (now - start) / ms), e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      angle = from + (target - from) * e; render();
      anim = p < 1 ? requestAnimationFrame(tick) : null;
    })(start);
  }
  function stopAuto() { auto = false; autoBtn.textContent = 'Auto-turn'; }
  function hideHint() { if (hint) hint.classList.add('gone'); }

  /* Drag with momentum, then settle on the nearest photo */
  stage.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    stopAuto(); stopAnim(); hideHint();
    drag = { id: e.pointerId, x: e.clientX, t: performance.now(), v: 0 };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
    stage.classList.add('dragging');
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var now = performance.now(), dx = e.clientX - drag.x, dt = Math.max(1, now - drag.t);
    var deg = dx * 360 / (stage.clientWidth * 1.3);                // a full-width drag turns ~280 degrees
    angle += deg;
    drag.v = drag.v * 0.6 + (deg / dt) * 0.4;                      // degrees per ms, smoothed
    drag.x = e.clientX; drag.t = now;
    render();
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var v = drag.v;
    drag = null;
    stage.classList.remove('dragging');
    if (paint3d) {                                                  // 3D: keep spinning and slow down naturally
      if (reduceMotion || Math.abs(v) < 0.01) return;
      var last = performance.now();
      (function coast(now) {
        var dt = Math.min(48, now - last); last = now;
        angle += v * dt; v *= Math.pow(0.94, dt / 16.7); render();
        anim = Math.abs(v) > 0.004 ? requestAnimationFrame(coast) : null;
      })(last);
      return;
    }
    var fling = Math.max(-STEP * 1.5, Math.min(STEP * 1.5, v * 240));
    var target = nearest(angle + fling);
    animateTo(target, 380 + Math.min(420, Math.abs(target - angle) * 4));
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('lostpointercapture', endDrag);

  /* Keyboard on the stage */
  stage.addEventListener('keydown', function (e) {
    var go = { ArrowRight: STEP, ArrowUp: STEP, ArrowLeft: -STEP, ArrowDown: -STEP }[e.key];
    if (go) { e.preventDefault(); stopAuto(); hideHint(); animateTo(nearest(angle) + go, 600); }
    else if (e.key === 'Home') { e.preventDefault(); stopAuto(); animateTo(toward(0), 600); }
  });

  /* Slider: turns freely while dragging, settles on release */
  range.addEventListener('input', function () { sliding = true; stopAuto(); stopAnim(); hideHint(); angle = +range.value; render(); });
  range.addEventListener('change', function () { sliding = false; if (!paint3d) animateTo(nearest(angle), 400); });

  /* Front / Side / Back / Other side buttons */
  $$('[data-pick]').forEach(function (b) {
    b.addEventListener('click', function () { stopAuto(); hideHint(); animateTo(toward(+b.getAttribute('data-pick') * STEP), 700); });
  });

  autoBtn.addEventListener('click', function () { auto = !auto; autoBtn.textContent = auto ? 'Pause turning' : 'Auto-turn'; });
  if (!auto) autoBtn.textContent = 'Auto-turn';
  setInterval(function () { if (!paint3d && auto && !drag && !anim && !document.hidden) animateTo(nearest(angle) + STEP, 1100); }, 2800);

  /* 3D mode: a slow, continuous showroom spin while auto-turn is on */
  var spinLast = 0;
  function spin(now) {
    if (paint3d && auto && !drag && !anim && !sliding) {
      angle += Math.min(48, now - (spinLast || now)) * 0.014;      // about 14 degrees a second
      render();
    }
    spinLast = now;
    requestAnimationFrame(spin);
  }

  window.AMARI_turn = {
    use3D: function (fn) {
      paint3d = fn;
      frames.forEach(function (img) { img.style.visibility = 'hidden'; });
      render();
      requestAnimationFrame(spin);
    }
  };
  render();

  /* Serve tabs */
  var SERVES = [
    { title: 'Neat', img: 'images/motif-whisky-glass.png', text: 'Let the warm spice and refined caramel speak for themselves. A short glass, no rush.' },
    { title: 'Ice & Citrus', img: 'images/motif-ice-citrus.png', text: 'Over ice with a twist of citrus — bright, cool and a little wild.' },
    { title: 'After Dark', img: 'images/motif-nightlife.png', text: 'Made for music, friends and nights that run long.' }
  ];
  var serveParts = ['#serve-img', '#serve-title', '#serve-text'], serveTimer;
  function fill(i) {
    $('#serve-title').textContent = SERVES[i].title;
    $('#serve-text').textContent = SERVES[i].text;
    $('#serve-img').src = SERVES[i].img;
  }
  function serve(i, instant) {
    $$('[data-serve]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-serve') === i ? 'true' : 'false'); });
    if (instant) { fill(i); return; }
    clearTimeout(serveTimer);
    serveParts.forEach(function (s) { $(s).classList.add('swap'); });
    serveTimer = setTimeout(function () {
      fill(i);
      serveParts.forEach(function (s) { $(s).classList.remove('swap'); });
    }, 300);
  }
  $$('[data-serve]').forEach(function (b) { b.addEventListener('click', function () { serve(+b.getAttribute('data-serve')); }); });
  serve(0, true);

  /* Newsletter (front end only — connect to your email service) */
  $('#btn-subscribe').addEventListener('click', function () {
    var email = $('#v2-email'), age = $('#v2-age'), err = $('#nl-err'), msg = '';
    email.removeAttribute('aria-invalid');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { msg = 'Please enter a valid email address.'; email.setAttribute('aria-invalid', 'true'); email.focus(); }
    else if (!age.checked) { msg = 'Please confirm you are of legal drinking age.'; age.focus(); }
    if (msg) { err.textContent = msg; err.hidden = false; return; }
    err.hidden = true;
    $('#nl-form').hidden = true; $('#nl-done').hidden = false;
  });
})();
