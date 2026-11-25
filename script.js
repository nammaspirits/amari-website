/* AMARI website v2 — interactions (no libraries) */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  /* v2 opening: prelude (loader -> tagline -> fly into the sun), then the sun rises over the savanna,
     swells in three drum-beat pulses and becomes the age check. Returning visitors get a short version. */
  window.AMARI_opening_started = true;                          // tells the page's safety net that the opening is running
  var intro = $('#intro'), toast = $('#toast');
  var KEY = 'amari_age_ok', DAYS30 = 30 * 864e5;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var returning = false;
  try { returning = Date.now() - (+localStorage.getItem(KEY) || 0) < DAYS30; } catch (e) { /* storage blocked */ }
  var timers = [], leaving = false;
  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function clearAll() { timers.forEach(clearTimeout); timers = []; }
  function add() { for (var i = 0; i < arguments.length; i++) intro.classList.add(arguments[i]); }
  function pulse() { intro.dispatchEvent(new Event('amari:pulse')); }
  function focusYes() { setTimeout(function () { $('#btn-enter').focus({ preventScroll: true }); }, reduce ? 0 : 450); }

  function toAsk() {                                              // skip straight to the question
    clearAll();
    add('s-tag', 's-mark', 's-dive', 's-stage', 's-rise', 's-swell1', 's-head', 's-swell2', 's-name', 's-swell3', 's-ask');
    pulse(); focusYes();
  }
  /* Keep everything inside the sun on any screen shape: measure each line and button and scale the
     whole group down until every corner sits inside the circle (same size formula as the CSS full sun). */
  function fitSun() {
    var body = $('.op-body'); if (!body) return;
    var vw = innerWidth, vh = innerHeight;
    var R = Math.min(Math.max(0.42 * Math.min(vw, vh), 268), 0.47 * vw, 0.47 * vh) * 0.92;
    var half = body.offsetHeight / 2, s = 1;
    $$('.op-body .op-name, .op-body .op-sub, .op-body .op-q, .op-body .op-btns, .op-body .op-band, .op-body .op-fine').forEach(function (el) {
      if (!el.offsetWidth || el.closest('[hidden]')) return;
      var top = 0, n = el; while (n && n !== body) { top += n.offsetTop; n = n.offsetParent; }
      var x = el.offsetWidth / 2;
      [top - half, top + el.offsetHeight - half].forEach(function (y) { s = Math.min(s, R / Math.hypot(x, y)); });
    });
    body.style.setProperty('--fit', Math.max(0.4, s).toFixed(3));
  }
  window.addEventListener('resize', fitSun);
  function aimDive() {                                            // move the logo's sun to the screen centre and grow it past the corners
    var art = $('.op-art'), d = art.querySelector('.op-disc').getBoundingClientRect();
    var dx = innerWidth / 2 - (d.left + d.width / 2), dy = innerHeight / 2 - (d.top + d.height / 2);
    art.style.setProperty('--dx', dx + 'px');
    art.style.setProperty('--dy', dy + 'px');
    art.style.setProperty('--s', (2.1 * Math.hypot(innerWidth, innerHeight) / d.width).toFixed(2));
  }
  function loader(done) {                                         // 0-100, held under 100 until the page has loaded
    var el = $('#op-count'), t0 = performance.now(), loaded = document.readyState === 'complete';
    window.addEventListener('load', function () { loaded = true; });
    (function tick(now) {
      var p = Math.min(1, (now - t0) / 1600);
      var v = Math.round((loaded || now - t0 > 4000 ? p : Math.min(p, 0.9)) * 100);
      el.textContent = v;
      if (v >= 100) { at(380, done); return; }
      requestAnimationFrame(tick);
    })(t0);
  }
  function playStage(fast) {
    add('s-stage');
    if (fast) {
      at(250, function () { add('s-rise'); pulse(); });
      at(750, function () { add('s-swell2', 's-head', 's-name'); pulse(); });
      at(1700, enter);
      return;
    }
    at(1100, function () { add('s-rise'); });                    // horizon has drawn; the sun comes up
    at(1700, function () { add('s-swell1'); pulse(); });          // drum 1
    at(2200, function () { add('s-head'); });
    at(2400, function () { add('s-swell2'); pulse(); });          // drum 2
    at(2800, function () { add('s-name'); });
    at(3100, function () { add('s-swell3'); pulse(); });          // drum 3
    at(3900, function () { add('s-ask'); focusYes(); });
  }
  function enter() {
    if (leaving) return;
    leaving = true; clearAll();
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* storage blocked */ }
    intro.dispatchEvent(new Event('amari:out'));
    add('s-out');                                                 // the sun swells past the screen edges
    at(reduce ? 0 : 1150, function () { add('is-gone'); });
    at(reduce ? 0 : 1750, finish);
  }
  function finish() {
    intro.hidden = true;
    document.body.classList.remove('locked');
    setTimeout(function () { toast.hidden = false; }, 1700);
  }

  $('#btn-enter').addEventListener('click', enter);
  $('#op-skip').addEventListener('click', function () { if (returning) enter(); else toAsk(); });
  $('#btn-decline').addEventListener('click', function () { $('#intro-ask').hidden = true; $('#intro-no').hidden = false; fitSun(); $('#btn-reask').focus(); });
  $('#btn-reask').addEventListener('click', function () { $('#intro-no').hidden = true; $('#intro-ask').hidden = false; fitSun(); $('#btn-enter').focus(); });
  intro.addEventListener('keydown', function (e) {               // keep focus inside the age check
    if (e.key !== 'Tab') return;
    var f = $$('#intro button').filter(function (b) { return !b.closest('[hidden]') && b.offsetParent !== null && getComputedStyle(b).visibility !== 'hidden' && getComputedStyle(b).pointerEvents !== 'none'; });
    if (!f.length) { e.preventDefault(); return; }
    var i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && (i === -1 || i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
  });

  fitSun();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSun);   // re-measure once the web fonts arrive
  if (reduce) { if (returning) finish(); else toAsk(); }
  else if (returning) playStage(true);
  else loader(function () {
    add('s-tag');                                                 // "Roho ya Afrika. / Spirit of Africa."
    at(2000, function () { add('s-mark'); });                    // antelope-in-sun mark
    at(2900, function () { aimDive(); add('s-dive'); });         // fly into the sun
    at(3700, function () { playStage(false); });
  });
  $$('[data-close-toast]').forEach(function (el) { el.addEventListener('click', function () { toast.hidden = true; }); });

  /* Header: transparent over the hero, solid Ivory once you scroll (or while the mobile menu is open) */
  var head = $('.site-head'), headTick = false;
  function paintHead() { headTick = false; head.classList.toggle('solid', window.scrollY > 24 || nav.classList.contains('open')); }
  window.addEventListener('scroll', function () { if (!headTick) { headTick = true; requestAnimationFrame(paintHead); } }, { passive: true });

  /* Mobile menu */
  var nav = $('.nav'), navBtn = $('.nav-toggle');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    paintHead();
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
  paintHead();

  /* Hero bottle tilt */
  var zone = $('#tilt-zone'), bottle = $('#tilt-bottle'), sun = $('#tilt-sun');
  bottle.style.transition = 'transform .25s ease-out';
  sun.style.transition = 'transform .4s ease-out';
  zone.addEventListener('mousemove', function (e) {
    var r = zone.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    var ry = Math.round(x * 10), rx = Math.round(-y * 5);
    bottle.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
    sun.style.transform = 'translate(' + (-ry * 2.4) + 'px,' + (rx * 2.4) + 'px)';
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


  /* Motion system: reveals as things scroll into view (all browsers), word-by-word headings,
     arched-label image reveals, Adinkra rules, and the horizon progress line. */
  (function () {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) return;    // everything simply shows
    document.documentElement.classList.add('js-motion');

    // headings rise word by word
    $$('h2.rv, .g-words p').forEach(function (h) {
      var i = 0;
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              var w = document.createElement('span'); w.className = 'w';
              var inner = document.createElement('span'); inner.textContent = part; inner.style.setProperty('--i', i++);
              w.appendChild(inner); frag.appendChild(w);
            });
            n.parentNode.replaceChild(frag, n);
          } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
        });
      })(h);
      h.classList.add('split');
      if (!h.classList.contains('rv')) h.classList.add('rv');
    });

    // images open through the label's arch
    $$('.tv:not(#turn-stage), .g-tile:not(.g-words)').forEach(function (el) { el.classList.add('arch'); });
    var stage3d = $('#turn-stage'); if (stage3d) stage3d.classList.add('rv');      // the 3D stage fades up instead of being masked
    $$('.gallery .g-tile').forEach(function (el, k) { el.style.setProperty('--d', (k % 4) * 0.09 + 's'); });

    // gentle stagger for groups that reveal together
    $$('.card.rv').forEach(function (el, k) { el.style.setProperty('--d', (k % 3) * 0.08 + 's'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    $$('.rv, .arch, .kente-rule').forEach(function (el) { io.observe(el); });
  })();

  /* Horizon progress line under the header */
  (function () {
    var head = $('.site-head'), ticking = false;
    function paint() {
      ticking = false;
      var max = document.documentElement.scrollHeight - innerHeight;
      head.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0);
    }
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    paint();
  })();

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
