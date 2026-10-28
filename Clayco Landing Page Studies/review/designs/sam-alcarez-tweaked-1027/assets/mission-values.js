/* Our Mission + Values: hovering (or focusing) a value along the bottom of the mission photo
   cross-fades the photo to that value's image; moving away returns to the mission photo. */
(function () {
  document.querySelectorAll('.mv-photo').forEach(function (box) {
    var imgs = Array.prototype.slice.call(box.querySelectorAll('.mv-img'));
    var links = Array.prototype.slice.call(box.querySelectorAll('.mv-values a'));
    function show(name) {
      imgs.forEach(function (img) {
        var on = img.dataset.value === name;
        if (on && img.loading === 'lazy') img.loading = 'eager';
        img.classList.toggle('is-active', on);
      });
      links.forEach(function (a) { a.classList.toggle('is-active', a.dataset.value === name); });
    }
    // load the value photos once the visitor heads toward the row
    box.addEventListener('pointerenter', function () { imgs.forEach(function (i) { i.loading = 'eager'; }); }, { once: true });
    links.forEach(function (a) {
      a.addEventListener('mouseenter', function () { show(a.dataset.value); });
      a.addEventListener('focus', function () { show(a.dataset.value); });
      a.addEventListener('mouseleave', function () { show('mission'); });
      a.addEventListener('blur', function () { show('mission'); });
    });
  });
})();
