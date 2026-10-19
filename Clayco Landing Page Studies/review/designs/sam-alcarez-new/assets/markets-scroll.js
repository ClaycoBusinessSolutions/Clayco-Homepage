/* Our Markets tiles: horizontal scrolling row in the intro band.
   - Hover near the left/right edge of the row and a see-through arrow appears; click it to move one tile
   - Click-and-drag with a mouse; swipe on touch; trackpad scroll works natively
   - Left/right arrow keys when the row is focused */
(function () {
  document.querySelectorAll('.markets').forEach(function (wrap) {
    var row = wrap.querySelector('.market-tiles');
    if (!row) return;

    function max() { return Math.max(0, row.scrollWidth - row.clientWidth); }
    function step() {
      var tile = row.querySelector('li');
      var gap = parseFloat(getComputedStyle(row).columnGap || getComputedStyle(row).gap) || 0;
      return tile ? tile.getBoundingClientRect().width + gap : row.clientWidth;
    }

    // edge arrows (appear on hover near the left/right edge); hidden at the start/end of the row
    var prev = wrap.querySelector('.markets-edge--prev');
    var next = wrap.querySelector('.markets-edge--next');
    function go(dir) { row.scrollBy({ left: dir * step(), behavior: 'smooth' }); }
    function update() {
      if (prev) prev.hidden = row.scrollLeft <= 2;
      if (next) next.hidden = row.scrollLeft >= max() - 2;
    }
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    row.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    row.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); row.scrollBy({ left: step(), behavior: 'smooth' }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); row.scrollBy({ left: -step(), behavior: 'smooth' }); }
    });

    // mouse drag-to-scroll on the tiles themselves
    var down = false, startX = 0, startScroll = 0, moved = false;
    row.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startScroll = row.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) { moved = true; row.classList.add('is-dragging'); }
      if (moved) row.scrollLeft = startScroll - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      if (moved) {
        row.classList.remove('is-dragging');
        var s = step();
        row.scrollTo({ left: Math.round(row.scrollLeft / s) * s, behavior: 'smooth' });
      }
    });
    row.addEventListener('click', function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);

    update();
  });
})();
