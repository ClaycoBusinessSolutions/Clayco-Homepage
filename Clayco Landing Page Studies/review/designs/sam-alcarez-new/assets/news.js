/* News frame: one large story with a strip of thumbnails.
   - Moves to the next story every SECONDS seconds (the active thumbnail's red bar fills as a timer).
   - Pauses while the cursor is over the frame (so the rollover text can be read) and when it's off screen.
   - Clicking a thumbnail jumps to that story and restarts the timer.
   - Visitors with "reduce motion" don't get the auto-advance. */
(function () {
  var SECONDS = 3.5;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.news').forEach(function (sec) {
    var frame = sec.querySelector('.news-frame');
    var thumbs = Array.prototype.slice.call(sec.querySelectorAll('.news-thumb'));
    if (!thumbs.length || !frame) return;
    frame.style.setProperty('--news-dur', SECONDS + 's');

    var current = Math.max(0, thumbs.findIndex(function (t) { return t.classList.contains('is-active'); }));
    var timer = null, hovering = false, onScreen = false;

    function show(i) {
      current = i;
      thumbs.forEach(function (o, n) {
        var on = n === i;
        o.classList.toggle('is-active', on);
        o.classList.remove('is-timing');
        o.setAttribute('aria-pressed', on ? 'true' : 'false');
        var story = document.getElementById(o.getAttribute('aria-controls'));
        if (story) { story.hidden = !on; story.classList.toggle('is-active', on); }
      });
    }

    function startTiming() {
      var t = thumbs[current];
      t.classList.remove('is-timing'); void t.offsetWidth; // restart the progress bar
      t.classList.add('is-timing');
    }
    function tick() { show((current + 1) % thumbs.length); startTiming(); }
    function run() {
      if (reduce || timer || hovering || !onScreen) return;
      frame.classList.remove('is-paused');
      if (!thumbs[current].classList.contains('is-timing')) startTiming();
      // the remaining time is handled by the CSS progress bar; advance when it finishes
      timer = true;
    }
    function pause() { timer = null; frame.classList.add('is-paused'); }

    // advance when the active thumbnail's progress bar completes
    thumbs.forEach(function (t) {
      t.querySelector('.news-thumb-media').addEventListener('animationend', function (e) {
        if (e.animationName === 'thumb-progress' && timer && t.classList.contains('is-active')) tick();
      }, true);
    });

    thumbs.forEach(function (t, i) {
      t.addEventListener('click', function () {
        show(i);
        if (!reduce) startTiming();
        var feature = sec.querySelector('.news-feature');
        if (feature && feature.getBoundingClientRect().top < 0) feature.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    frame.addEventListener('mouseenter', function () { hovering = true; pause(); });
    frame.addEventListener('mouseleave', function () { hovering = false; run(); });
    frame.addEventListener('focusin', function () { hovering = true; pause(); });
    frame.addEventListener('focusout', function () { hovering = false; run(); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { onScreen = e.isIntersecting; if (onScreen) run(); else pause(); });
      }, { threshold: 0.4 }).observe(frame);
    } else { onScreen = true; run(); }
  });
})();
