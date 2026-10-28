/* Our Business Units: unit list on the left, selected unit's hero project on the right, thumbnails underneath.
   - Click a unit to show its projects (first project becomes the hero).
   - Click a thumbnail to swap that project into the hero spot.
   - Up/Down arrow keys move between units when the list is focused. */
(function () {
  document.querySelectorAll('.bu').forEach(function (sec) {
    var tabs = Array.prototype.slice.call(sec.querySelectorAll('.bu-tab'));
    var panels = Array.prototype.slice.call(sec.querySelectorAll('.bu-panel'));

    function showProject(panel, j) {
      var heroes = panel.querySelectorAll('.bu-hero');
      var thumbs = panel.querySelectorAll('.bu-thumb');
      heroes.forEach(function (h, n) { h.hidden = n !== j; h.classList.toggle('is-active', n === j); });
      thumbs.forEach(function (t, n) { t.classList.toggle('is-active', n === j); t.setAttribute('aria-pressed', n === j ? 'true' : 'false'); });
    }

    function showUnit(i, focus) {
      tabs.forEach(function (t, n) {
        var on = n === i;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p, n) {
        var on = n === i;
        p.hidden = !on;
        p.classList.toggle('is-active', on);
        if (on) {
          showProject(p, 0);
          p.querySelectorAll('img[loading="lazy"]').forEach(function (img) { img.loading = 'eager'; });
        }
      });
      if (focus) tabs[i].focus();
    }

    tabs.forEach(function (t, i) {
      t.tabIndex = t.classList.contains('is-active') ? 0 : -1;
      t.addEventListener('click', function () { showUnit(i); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); showUnit((i + 1) % tabs.length, true); }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); showUnit((i - 1 + tabs.length) % tabs.length, true); }
      });
    });

    panels.forEach(function (p) {
      p.querySelectorAll('.bu-thumb').forEach(function (t, j) {
        t.addEventListener('click', function () { showProject(p, j); });
      });
    });
  });
})();
