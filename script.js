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

  /* Turn the bottle */
  var TEXT = [
    'The antelope-in-sun label: Spirit of Africa, Beyond Ordinary Whiskey, Origin Reserve, Gold Blend.',
    'A gold cap and AMARI neck band over an amber, triple-distilled blend.',
    'Made for the World — a blend of fine grains, carefully distilled to bring out a smooth, rich and distinctive character.',
    'Batch 01. 750 ml. 42.8% ABV. Blended and bottled in Goa.'
  ];
  var view = 0, auto = true, range = $('#turn'), autoBtn = $('#btn-auto');
  function show(i) {
    view = i;
    $$('[data-view]').forEach(function (img) {
      var k = +img.getAttribute('data-view');
      img.style.opacity = k === i ? 1 : 0;
      img.style.transform = k === i ? 'none' : 'scale(.94) translateX(' + (k < i ? -30 : 30) + 'px)';
    });
    $$('[data-pick]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-pick') === i ? 'true' : 'false'); });
    $('#view-no').textContent = '0' + (i + 1);
    $('#view-text').textContent = TEXT[i];
    range.value = i;
  }
  function stopAuto() { auto = false; autoBtn.textContent = 'Auto-turn'; }
  $$('[data-pick]').forEach(function (b) { b.addEventListener('click', function () { stopAuto(); show(+b.getAttribute('data-pick')); }); });
  range.addEventListener('input', function () { stopAuto(); show(+range.value); });
  autoBtn.addEventListener('click', function () { auto = !auto; autoBtn.textContent = auto ? 'Pause turning' : 'Auto-turn'; });
  setInterval(function () { if (auto) show((view + 1) % 4); }, 2200);
  show(0);

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
