/* Site menu: a white bar that drops down across the top of the page, under the header.
   Items with sub-pages open a gray panel of links beneath the bar (on phones it becomes a stacked list).
   - Top-level items with sub-pages expand in place (one open at a time).
   - Closes with the X, the Escape key, or a click anywhere outside it.
   The menu is built from MENU below, so it only needs editing here to update every page.
   Structure mirrors the current claycorp.com navigation. Use "#" for pages that don't exist yet. */
(function () {
  var MENU = [
    ['Home', 'index.html'],
    ['Work', [
      ['Current Projects', 'projects.html'],
      ['Featured Projects', '#'],
      ['Aviation', '#'],
      ['Clayco Compute', '#'],
      ['Commercial', '#'],
      ['Institutional', '#'],
      ['Industrial', '#'],
      ['Life Sciences', '#'],
      ['Power & Energy', '#'],
      ['Residential & Hospitality', '#'],
      ['Sports & Entertainment', '#']
    ]],
    ['Services', [
      ['Overview', '#'],
      ['Pre-Construction', '#'],
      ['Procurement', '#'],
      ['Construction', '#'],
      ['Design', '#'],
      ['Engineering', '#'],
      ['Systems & Equipment', '#'],
      ['VDC & BIM', '#'],
      ['Technical Assurance Group', '#'],
      ['Self-Perform', '#'],
      ['Development', '#'],
      ['Sustainability', '#']
    ]],
    ['About Us', [
      ['Company Overview', '#'],
      ['Safety', '#'],
      ['Sustainability', '#'],
      ['Quality', '#'],
      ['Values & Commitments', '#'],
      ['People', '#'],
      ['Message from Our Chairman', '#'],
      ['Design-Build', '#']
    ]],
    ['Building Solutions', [
      ['Integrated Approach', '#'],
      ['CRG', 'https://realcrg.com/'],
      ['LJC', 'https://theljc.com/'],
      ['Concrete Strategies', 'https://concretestrategies.com/'],
      ['Ventana', 'https://ventana.vc/']
    ]],
    ['Innovation Stories', '#'],
    ['Voices of Clayco', '#'],
    ['Newsroom', '#'],
    ['Careers', '#'],
    ['Contact', '#']
  ];

  var header = document.querySelector('.site-header');
  var btn = header && header.querySelector('.icon-btn[aria-label="Menu"]');
  if (!btn) return;

  function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  var CHEVRON = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 4l4 4 4-4"/></svg>';

  var menu = document.createElement('nav');
  menu.className = 'menu-dropdown';
  menu.id = 'site-menu';
  menu.setAttribute('aria-label', 'Main');
  menu.hidden = true;
  menu.innerHTML = '<div class="menu-inner"><ul class="menu-list">' + MENU.map(function (item, i) {
    if (typeof item[1] === 'string') return '<li><a href="' + item[1] + '">' + esc(item[0]) + '</a></li>';
    var id = 'menu-sub-' + i;
    return '<li class="has-sub">' +
      '<button type="button" aria-expanded="false" aria-controls="' + id + '">' + esc(item[0]) + CHEVRON + '</button>' +
      '<ul class="menu-sub" id="' + id + '" hidden>' +
        item[1].map(function (l) { return '<li><a href="' + l[1] + '">' + esc(l[0]) + '</a></li>'; }).join('') +
      '</ul></li>';
  }).join('') + '</ul></div>';
  header.appendChild(menu);

  // the three-bar icon turns into an X while the menu is open
  btn.insertAdjacentHTML('beforeend',
    '<svg class="icon-close" viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l18 18M24 6L6 24"/></svg>');
  btn.setAttribute('aria-controls', 'site-menu');
  btn.setAttribute('aria-expanded', 'false');

  function isOpen() { return menu.classList.contains('is-open'); }
  function open() {
    menu.hidden = false;
    void menu.offsetWidth; // let the drop-down transition run
    menu.classList.add('is-open');
    header.classList.add('menu-is-open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close menu');
  }
  function close(refocus) {
    if (!isOpen()) return;
    menu.classList.remove('is-open');
    header.classList.remove('menu-is-open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Menu');
    setTimeout(function () { if (!isOpen()) menu.hidden = true; }, 250);
    if (refocus) btn.focus();
  }

  btn.addEventListener('click', function (e) { e.stopPropagation(); isOpen() ? close() : open(); });

  // expand / collapse sub-lists (one at a time)
  menu.querySelectorAll('.has-sub > button').forEach(function (b) {
    b.addEventListener('click', function () {
      var expand = b.getAttribute('aria-expanded') !== 'true';
      menu.querySelectorAll('.has-sub > button').forEach(function (o) {
        o.setAttribute('aria-expanded', 'false');
        document.getElementById(o.getAttribute('aria-controls')).hidden = true;
      });
      b.setAttribute('aria-expanded', String(expand));
      document.getElementById(b.getAttribute('aria-controls')).hidden = !expand;
    });
  });

  document.addEventListener('click', function (e) { if (isOpen() && !menu.contains(e.target)) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(true); });
})();
