/* Sticky navigation: the header is always fixed to the top of the window.
   Over the photo/video banner it stays transparent with white icons;
   once the banner has scrolled away it switches to a solid white bar with the red Clayco logo. */
(function () {
  var header = document.querySelector('.site-header');
  var hero = document.querySelector('.hero');
  if (!header) return;

  function update() {
    // switch just before the bottom of the banner reaches the header
    var limit = hero ? hero.getBoundingClientRect().bottom - header.offsetHeight : 0;
    header.classList.toggle('is-solid', limit <= 0);
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  // the homepage banner changes height when the intro video settles
  if (hero) hero.addEventListener('transitionend', update);
  update();
})();
