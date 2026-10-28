/* Scroll reveal + number count-up (Tweaked Original: intro statement band only).
   - Any element with [data-reveal-group] gets .is-revealed once its top edge scrolls above TRIGGER_LINE;
     its .reveal children fade up (staggered via data-reveal-delay, see styles.css).
   - Numbers with [data-count] count up once their group is revealed.
   - Waits until the homepage intro video has settled into the header.
   - Visitors with "reduce motion" see everything immediately, no animation. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var groups = document.querySelectorAll('[data-reveal-group]');
  if (!groups.length || !('IntersectionObserver' in window)) return;
  if (reduce) return;

  document.documentElement.classList.add('reveal-ready');

  function format(el, v) {
    var dec = parseInt(el.dataset.decimals || '0', 10);
    var n = el.dataset.format === 'year'
      ? String(Math.round(v))
      : v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return (el.dataset.prefix || '') + n + (el.dataset.suffix || '');
  }
  function countUp(el, delay) {
    var end = parseFloat(el.dataset.count);
    var start = el.dataset.format === 'year' ? end - 40 : 0;
    var dur = 1600;
    el.textContent = format(el, start);
    setTimeout(function () {
      var t0 = null;
      function frame(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = format(el, start + (end - start) * eased);
        if (p < 1) requestAnimationFrame(frame); else el.textContent = format(el, end);
      }
      requestAnimationFrame(frame);
    }, delay);
  }
  document.querySelectorAll('[data-reveal-group] [data-count]').forEach(function (el) {
    var end = parseFloat(el.dataset.count);
    el.textContent = format(el, el.dataset.format === 'year' ? end - 40 : 0);
  });

  var TRIGGER_LINE = 0.45;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var g = entry.target;
      g.classList.add('is-revealed');
      g.querySelectorAll('[data-count]').forEach(function (el, i) { countUp(el, 650 + i * 120); });
      io.unobserve(g);
    });
  }, { rootMargin: '0px 0px -' + Math.round((1 - TRIGGER_LINE) * 100) + '% 0px', threshold: 0 });

  function start() { groups.forEach(function (g) { io.observe(g); }); }
  var hero = document.getElementById('home-hero');
  if (hero && hero.classList.contains('is-intro')) {
    var mo = new MutationObserver(function () {
      if (!hero.classList.contains('is-intro')) { mo.disconnect(); setTimeout(start, 1500); }
    });
    mo.observe(hero, { attributes: true, attributeFilter: ['class'] });
  } else {
    start();
  }
})();
