/* Background videos inside full-width bands (e.g. Integrated by Design).
   - Picks the smaller file on small screens.
   - Plays only while the band is on screen (saves battery/data), pauses when scrolled away.
   - The round pause/play button lets visitors stop it; their choice is respected.
   - Visitors with "reduce motion" see the still poster frame. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('video.band-bg[data-src-large]').forEach(function (video) {
    var band = video.parentElement;
    var toggle = band.querySelector('.video-toggle');
    var userPaused = reduce;

    video.muted = true;
    video.src = window.innerWidth < 900 ? video.dataset.srcSmall : video.dataset.srcLarge;

    function setUI() {
      if (!toggle) return;
      var paused = video.paused;
      toggle.classList.toggle('is-paused', paused);
      toggle.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
    }
    video.addEventListener('play', setUI);
    video.addEventListener('pause', setUI);

    if (toggle) toggle.addEventListener('click', function () {
      if (video.paused) { userPaused = false; video.play().catch(function () {}); }
      else { userPaused = true; video.pause(); }
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !userPaused) video.play().catch(function () {});
          else if (!e.isIntersecting) video.pause();
        });
      }, { threshold: 0.25 }).observe(band);
    } else if (!userPaused) {
      video.play().catch(function () {});
    }
    setUI();
  });
})();
