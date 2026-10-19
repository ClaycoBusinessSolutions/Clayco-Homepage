/* Scroll reveal + number count-up.
   - The intro statement band is set up by hand in index.html ([data-reveal-group], .reveal, data-reveal-delay).
   - Every other homepage section (main > section.section) is set up automatically below:
       the red eyebrow wipes in from the left, then the section's pieces fade up one after another
       (images, headlines, text columns and each card in a grid get their own small delay).
   - Numbers with [data-count] count up once their group is revealed.
   - Visitors with "reduce motion" see everything immediately, no animation. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reduce) return; // content is visible by default

  // How far into the window a section's top edge must scroll before it plays
  // (share of window height from the top). Lower = visitor scrolls further first.
  var STATEMENT_LINE = 0.45; // the gray intro band (sits right under the video header)
  var SECTION_LINE = 0.8;    // all other sections
  var STEP = 0.12;           // seconds between each piece in a section

  /* ---- auto-tag the regular sections ---- */
  // containers whose children should arrive one at a time
  var STAGGER = ['grid-3', 'grid-2', 'news-grid', 'news-side', 'values-intro', 'mission-body', 'paths', 'offices', 'band-values'];
  function isStagger(el) { return STAGGER.some(function (c) { return el.classList.contains(c); }); }

  function tagSection(sec) {
    if (sec.hasAttribute('data-reveal-group')) return;
    sec.setAttribute('data-reveal-group', '');
    if (!sec.dataset.revealLine) sec.dataset.revealLine = SECTION_LINE; // a section can set its own data-reveal-line
    var d = 0.15;
    function reveal(el) { el.classList.add('reveal'); el.style.transitionDelay = d.toFixed(2) + 's'; d += STEP; }
    function walk(parent) { Array.prototype.forEach.call(parent.children, function (ch) {
      if (ch.hasAttribute('data-reveal-skip')) return;            // e.g. background photos
      if (ch.hasAttribute('data-reveal-inner')) { walk(ch); return; } // wrapper: animate its children instead
      if (ch.classList.contains('eyebrow')) { ch.classList.add('reveal-wipe'); return; }
      if (ch.classList.contains('news-head')) {          // eyebrow + "View all" link row
        Array.prototype.forEach.call(ch.children, function (k) {
          if (k.classList.contains('eyebrow')) k.classList.add('reveal-wipe'); else reveal(k);
        });
        return;
      }
      if (isStagger(ch) && ch.children.length > 6) {
        // long grids (e.g. the 24 Current Projects cards): each card animates on its own as it scrolls into view,
        // with a small left-to-right offset per row so they ripple in
        var cols = Math.max(1, Math.round(ch.clientWidth / (ch.children[0].clientWidth || ch.clientWidth)));
        Array.prototype.forEach.call(ch.children, function (k, n) {
          k.setAttribute('data-reveal-group', '');
          k.dataset.revealLine = 0.92;
          k.classList.add('reveal');
          k.style.transitionDelay = ((n % cols) * 0.1).toFixed(2) + 's';
        });
        return;
      }
      if (isStagger(ch)) {
        Array.prototype.forEach.call(ch.children, function (k) {
          if (isStagger(k)) Array.prototype.forEach.call(k.children, reveal); // e.g. the two small news stories
          else reveal(k);
        });
        return;
      }
      reveal(ch);
    }); }
    walk(sec);
  }
  document.querySelectorAll('main > section.section, footer.site-footer').forEach(tagSection); // footer: office cards arrive one by one

  var groups = document.querySelectorAll('[data-reveal-group]');
  if (!groups.length) return;
  document.documentElement.classList.add('reveal-ready');

  /* ---- count-up numbers ---- */
  function format(el, v) {
    var dec = parseInt(el.dataset.decimals || '0', 10);
    var n = el.dataset.format === 'year'
      ? String(Math.round(v))
      : v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return (el.dataset.prefix || '') + n + (el.dataset.suffix || '');
  }
  function countUp(el, delay) {
    var end = parseFloat(el.dataset.count);
    var start = el.dataset.format === 'year' ? end - 40 : 0; // years tick up from 40 earlier
    var dur = 1600;
    el.textContent = format(el, start);
    setTimeout(function () {
      var t0 = null;
      function frame(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3); // ease-out
        el.textContent = format(el, start + (end - start) * eased);
        if (p < 1) requestAnimationFrame(frame);
        else el.textContent = format(el, end);
      }
      requestAnimationFrame(frame);
    }, delay);
  }
  // set starting values so numbers don't flash at full value before counting
  document.querySelectorAll('[data-reveal-group] [data-count]').forEach(function (el) {
    var end = parseFloat(el.dataset.count);
    el.textContent = format(el, el.dataset.format === 'year' ? end - 40 : 0);
  });

  /* ---- observers (one per trigger line) ---- */
  var observers = {};
  function observerFor(line) {
    if (observers[line]) return observers[line];
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var g = entry.target.closest('[data-reveal-group]') || entry.target;
        g.classList.add('is-revealed');
        g.querySelectorAll('[data-count]').forEach(function (el, i) { countUp(el, 650 + i * 120); });
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -' + Math.round((1 - line) * 100) + '% 0px', threshold: 0 });
    return (observers[line] = io);
  }

  // Don't start watching until the homepage intro video has settled into the header
  function start() {
    groups.forEach(function (g) {
      // photo bands keep their text near the bottom, so watch the text block rather than the band's top edge
      var target = g.querySelector('.band-content') || g.querySelector('[data-reveal-inner]') || g;
      observerFor(parseFloat(g.dataset.revealLine || STATEMENT_LINE)).observe(target);
    });
  }
  var hero = document.getElementById('home-hero');
  if (hero && hero.classList.contains('is-intro')) {
    var mo = new MutationObserver(function () {
      if (!hero.classList.contains('is-intro')) {
        mo.disconnect();
        setTimeout(start, 1500); // let the shrink animation finish first
      }
    });
    mo.observe(hero, { attributes: true, attributeFilter: ['class'] });
  } else {
    start();
  }
})();
