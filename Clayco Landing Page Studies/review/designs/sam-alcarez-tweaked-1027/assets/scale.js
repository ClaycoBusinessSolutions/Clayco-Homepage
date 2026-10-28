/* Dynamic scale: the layout is designed on a 1080px-wide artboard.
   On wider screens everything inside the page margins (type, images, spacing) scales up proportionally,
   so the page looks the same on a laptop, a large monitor or a 4K display.
   Below 1080px the regular responsive (tablet / phone) layout takes over at scale 1.
   MIN/MAX limit how far it scales. */
(function () {
  var BASE = 1080, MAX = 2.4;
  function set() {
    var s = Math.min(MAX, Math.max(1, window.innerWidth / BASE));
    document.documentElement.style.setProperty('--scale', s.toFixed(4));
  }
  set();
  window.addEventListener('resize', set);
})();
