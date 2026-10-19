/* Home page intro: full-screen muted video that settles into the header space.
   - Plays full-screen for INTRO_SECONDS, then animates down to the normal hero height.
   - Scrolling, clicking, or pressing a key skips straight to the settled state.
   - Shown once per browser session; later visits in the same session start settled.
   - Visitors with "reduce motion" turned on get the settled hero with the video paused. */
(function () {
  var INTRO_SECONDS = 4;
  var SESSION_KEY = 'clayco-intro-seen';

  var hero = document.getElementById('home-hero');
  if (!hero) return;
  var video = hero.querySelector('.hero-video');
  var toggle = hero.querySelector('.video-toggle');
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Smaller file on small screens
  video.src = window.innerWidth < 900 ? video.dataset.srcSmall : video.dataset.srcLarge;
  video.muted = true;

  var seen = false;
  try { seen = sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) {}

  function setPaused(paused) {
    if (paused) video.pause(); else video.play().catch(function () {});
    toggle.classList.toggle('is-paused', paused);
    toggle.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
  }
  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    setPaused(!video.paused);
  });

  var settled = false;
  function settle() {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    hero.classList.remove('is-intro');
    root.classList.remove('intro-lock');
    window.scrollTo(0, 0);
    ['wheel', 'touchmove', 'keydown', 'click'].forEach(function (t) {
      window.removeEventListener(t, settle);
    });
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
  }

  if (seen || reduceMotion) {
    hero.classList.remove('is-intro');
    settled = true;
    if (reduceMotion) setPaused(true);
    return;
  }

  root.classList.add('intro-lock');
  var timer;
  function startTimer() { timer = setTimeout(settle, INTRO_SECONDS * 1000); }
  // Start the countdown once the video is actually playing (so slow connections still see it)
  if (video.readyState >= 3) startTimer();
  else {
    video.addEventListener('playing', startTimer, { once: true });
    setTimeout(function () { if (!timer) settle(); }, 8000); // safety net if video never loads
  }
  ['wheel', 'touchmove', 'keydown', 'click'].forEach(function (t) {
    window.addEventListener(t, settle, { passive: true });
  });
})();
