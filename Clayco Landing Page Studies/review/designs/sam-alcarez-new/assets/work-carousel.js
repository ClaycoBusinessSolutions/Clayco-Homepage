/* Our Work: one project in frame at a time.
   Clicking a dot slides the chosen project in from the right while the current one exits left.
   The rollover caption is handled in CSS. */
(function () {
  var DURATION = 800; // ms, keep in sync with .work-slide transition in styles.css

  // .work = Featured Projects band; [data-carousel] = any other frame using the same slider (e.g. Our Values)
  document.querySelectorAll('.section.work, [data-carousel]').forEach(function (section) {
    var slides = Array.prototype.slice.call(section.querySelectorAll('.work-slide'));
    var dots = Array.prototype.slice.call(section.querySelectorAll('.work-dot'));
    if (!slides.length) return;
    var current = 0, busy = false;

    function setDot(i) {
      dots.forEach(function (d, n) {
        d.classList.toggle('is-active', n === i);
        if (n === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
    }

    function show(i) {
      if (i === current || busy || !slides[i]) return;
      busy = true;
      var out = slides[current], inc = slides[i];
      setDot(i);

      // park the incoming slide off to the right, then animate both
      inc.classList.remove('is-active', 'is-leaving');
      inc.style.transition = 'none';
      inc.style.transform = 'translateX(100%)';
      inc.style.visibility = 'visible';
      void inc.offsetWidth; // commit the starting position
      inc.style.transition = '';
      inc.style.transform = '';
      inc.style.visibility = '';
      inc.classList.add('is-entering', 'is-active');
      out.classList.add('is-leaving');
      out.classList.remove('is-active');

      var finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        out.classList.remove('is-leaving');
        inc.classList.remove('is-entering');
        out.setAttribute('aria-hidden', 'true');
        inc.removeAttribute('aria-hidden');
        current = i;
        busy = false;
      }
      inc.addEventListener('transitionend', function te(e) {
        if (e.target !== inc || e.propertyName !== 'transform') return;
        inc.removeEventListener('transitionend', te);
        finish();
      });
      setTimeout(finish, DURATION + 400); // fallback (e.g. reduced motion = no transition)
    }

    dots.forEach(function (d, i) { d.addEventListener('click', function () { show(i); }); });
  });
})();
