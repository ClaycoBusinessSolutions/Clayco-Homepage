/* Background photo slideshow for full-width bands (Our Mission + Values).
   - Cross-fades through the general photos every SECONDS seconds, looping.
   - Photos marked data-value="safety|community|quality" are NOT in the loop: hovering (or focusing/tapping)
     a value in the values row cross-fades to that value's photo and holds it; moving away resumes the loop.
   - Only runs while the band is on screen; photos load just before they're needed.
   - The round pause/play button stops and restarts the loop.
   - Visitors with "reduce motion" see the first photo only (value photos still swap, without the zoom). */
(function () {
  var SECONDS = 4;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.band-slides').forEach(function (wrap) {
    var all = Array.prototype.slice.call(wrap.querySelectorAll('.band-slide'));
    var loop = all.filter(function (img) { return !img.dataset.value; });
    var band = wrap.parentElement;
    var toggle = band.querySelector('.slides-toggle');
    var valueLinks = Array.prototype.slice.call(band.querySelectorAll('[data-show-value]'));

    var i = 0, timer = null, onScreen = false, userPaused = reduce, holding = null;
    var shown = loop[0];

    function load(img) { if (img && img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); } }
    function showImg(img) {
      if (!img || img === shown) return;
      load(img);
      var prev = shown; shown = img;
      function swap() { if (shown !== img) return; prev.classList.remove('is-active'); img.classList.add('is-active'); }
      if (img.complete && img.naturalWidth) swap(); else img.addEventListener('load', swap, { once: true });
    }

    function next() {
      i = (i + 1) % loop.length;
      showImg(loop[i]);
      load(loop[(i + 1) % loop.length]);
    }
    function play() { if (!timer && loop.length > 1 && !userPaused && !holding) timer = setInterval(next, SECONDS * 1000); setUI(); }
    function stop() { clearInterval(timer); timer = null; setUI(); }
    function setUI() {
      if (!toggle) return;
      var paused = !timer;
      toggle.classList.toggle('is-paused', paused);
      toggle.setAttribute('aria-label', paused ? 'Play background slideshow' : 'Pause background slideshow');
    }
    if (loop.length < 2 || reduce) { if (toggle) toggle.hidden = true; }
    else load(loop[1]);

    // values row: hold that value's photo while hovered / focused
    function hold(name) {
      var img = all.filter(function (x) { return x.dataset.value === name; })[0];
      if (!img) return;
      holding = name; stop();
      valueLinks.forEach(function (a) { a.classList.toggle('is-active', a.dataset.showValue === name); });
      showImg(img);
    }
    function release() {
      holding = null;
      valueLinks.forEach(function (a) { a.classList.remove('is-active'); });
      showImg(loop[i]);
      if (onScreen) play();
    }
    valueLinks.forEach(function (a) {
      a.addEventListener('mouseenter', function () { hold(a.dataset.showValue); });
      a.addEventListener('focus', function () { hold(a.dataset.showValue); });
      a.addEventListener('mouseleave', release);
      a.addEventListener('blur', release);
      // preload value photos once the visitor heads toward the row
      a.addEventListener('pointerenter', function () { all.forEach(function (x) { if (x.dataset.value) load(x); }); }, { once: true });
    });
    var row = band.querySelector('.band-values');
    if (row) row.addEventListener('mouseenter', function () { all.forEach(function (x) { if (x.dataset.value) load(x); }); }, { once: true });

    if (toggle) toggle.addEventListener('click', function () {
      userPaused = !userPaused;
      if (userPaused) stop(); else if (onScreen) play();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          onScreen = e.isIntersecting;
          if (onScreen) play(); else stop();
        });
      }, { threshold: 0.25 }).observe(band);
    } else { onScreen = true; play(); }
  });
})();
