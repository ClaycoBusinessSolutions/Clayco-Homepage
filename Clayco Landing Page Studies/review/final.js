/* Final review: the two remaining designs side by side, or either one full screen,
   on desktop or in the iPhone 18 Pro mockup. Classic script so it also opens from disk. */
(() => {
  'use strict';
  const DESIGNS = {
    a: { home: 'designs/sam-alcarez-tweaked-1027/index.html' },
    b: {
      home: '../../animated/clayco-b.html',
      // Task-first hands these links to its host page when embedded (see animated/README.md).
      routes: { projects: '../../animated/project-clayco-b.html', cases: '../../animated/clayco-case-studies.html', ljc: '../../animated/project-ljc.html', reverberation: '../../animated/reverberation.html' },
    },
  };
  const DESKTOP_WIDTH = 1280;  // side by side, each design lays out as on a 1280px laptop
  const PHONE = { width: 434, height: 906 };
  const KEYS = ['a', 'b'];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const query = new URLSearchParams(location.search);
  let view = ['side', 'a', 'b'].includes(query.get('view')) ? query.get('view') : 'side';
  let device = query.get('device') === 'phone' ? 'phone' : 'desktop';
  const panes = Object.fromEntries(KEYS.map(key => [key, $(`#pane-${key}`)]));
  const frames = Object.fromEntries(KEYS.map(key => [key, $('iframe', panes[key])]));
  const pages = { a: DESIGNS.a.home, b: DESIGNS.b.home };
  const sameOrigin = event => event.origin === location.origin || (location.protocol === 'file:' && event.origin === 'null');

  // Keys work from the review page and from inside either design (typing in a field or dialog excluded).
  function onKey(event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"], dialog[open]')) return;
    const action = { '1': () => setView('side'), '2': () => setView('a'), '3': () => setView('b'), d: () => setDevice('desktop'), m: () => setDevice('phone'), f: () => $('#fullscreen').click() }[event.key.toLowerCase()];
    if (action) { event.preventDefault(); action(); }
    if (event.key === '?') document.body.classList.toggle('show-keys');
  }
  function load(key, page = DESIGNS[key].home) {
    pages[key] = new URL(page, location.href).href;
    panes[key].classList.add('is-loading');
    frames[key].src = pages[key];
    renderPane(key);
  }
  function renderPane(key) {
    const here = new URL(pages[key], location.href).pathname;
    $('.pane-home', panes[key]).hidden = here === new URL(DESIGNS[key].home, location.href).pathname;
    $('.pane-open', panes[key]).href = pages[key];
  }
  function prepare(key) {
    let doc;
    try { doc = frames[key].contentDocument; pages[key] = frames[key].contentWindow.location.href; } catch { return; }
    if (!doc?.head) return;
    // Phones use overlay scrollbars, so the design keeps the full 402px width.
    doc.querySelector('style[data-final-device]')?.remove();
    if (device === 'phone') {
      const style = doc.createElement('style'); style.dataset.finalDevice = '';
      style.textContent = 'html,html *{scrollbar-width:none!important}html::-webkit-scrollbar,html *::-webkit-scrollbar{display:none!important}';
      doc.head.append(style);
    }
    // Public links open in a new tab; the designs' own pages stay in their pane.
    if (!doc.documentElement.dataset.finalLinks) {
      doc.documentElement.dataset.finalLinks = '';
      doc.addEventListener('keydown', onKey);
      doc.addEventListener('click', event => {
        const a = event.target.closest?.('a[href]');
        if (!a || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const url = new URL(a.href, doc.baseURI);
        if (/^https?:$/.test(url.protocol) && url.origin !== location.origin) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      }, true);
    }
  }
  // Sam's statement band reveals as it scrolls past 45% of the window, after his intro settles.
  // Scaled side by side, or on the phone, it is already on screen, so reveal what is visible.
  function revealVisible(key) {
    let doc, win;
    try { doc = frames[key].contentDocument; win = frames[key].contentWindow; } catch { return; }
    if (!doc?.documentElement?.classList.contains('reveal-ready') || doc.getElementById('home-hero')?.classList.contains('is-intro')) return;
    doc.querySelectorAll('[data-reveal-group]:not(.is-revealed)').forEach(group => {
      if (group.getBoundingClientRect().top >= win.innerHeight) return;
      group.classList.add('is-revealed');
      group.querySelectorAll('[data-count]').forEach(el => {
        const end = parseFloat(el.dataset.count), decimals = parseInt(el.dataset.decimals || '0', 10);
        const value = el.dataset.format === 'year' ? String(Math.round(end)) : end.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        el.textContent = (el.dataset.prefix || '') + value + (el.dataset.suffix || '');
      });
    });
  }
  function settleReveals(key) {
    let doc, win;
    try { doc = frames[key].contentDocument; win = frames[key].contentWindow; } catch { return; }
    const hero = doc?.getElementById('home-hero');
    const later = () => win.setTimeout(() => revealVisible(key), 1700);
    if (hero?.classList.contains('is-intro')) {
      const watch = new win.MutationObserver(() => { if (!hero.classList.contains('is-intro')) { watch.disconnect(); later(); } });
      watch.observe(hero, { attributes: true, attributeFilter: ['class'] });
    } else if (doc) later();
  }
  KEYS.forEach(key => frames[key].addEventListener('load', () => {
    if (frames[key].src === 'about:blank') return;
    panes[key].classList.remove('is-loading');
    prepare(key); renderPane(key); settleReveals(key);
    // From disk the page is another origin: its packaged bridge applies the phone scrollbar style.
    if (location.protocol === 'file:') frames[key].contentWindow?.postMessage({ type: 'review-motion', method: 'device', device: device === 'phone' ? 'mobile' : 'desktop' }, '*');
  }));

  function fit() {
    for (const key of KEYS) {
      const box = $('.pane-view', panes[key]);
      const width = box.clientWidth, height = box.clientHeight;
      if (!width) continue;
      if (device === 'desktop') {
        const virtual = view === 'side' ? Math.max(width, DESKTOP_WIDTH) : width;
        panes[key].style.setProperty('--vw', `${virtual}px`);
        panes[key].style.setProperty('--s', (width / virtual).toFixed(4));
      } else {
        const scale = Math.max(.2, Math.min(1, (height - 56) / PHONE.height, (width - 32) / PHONE.width));
        panes[key].style.setProperty('--device-scale', scale.toFixed(4));
      }
    }
  }
  function urlState() {
    const url = new URL(location.href);
    url.search = '';
    if (view !== 'side') url.searchParams.set('view', view);
    if (device === 'phone') url.searchParams.set('device', 'phone');
    history.replaceState(null, '', url);
  }
  function render() {
    document.body.dataset.view = view;
    document.body.dataset.device = device;
    $$('.views [data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    $$('.devices [data-device]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.device === device)));
    fit(); urlState();
  }
  // Keep each design at the same place when the view changes width.
  function anchors() {
    return KEYS.map(key => {
      try {
        const win = frames[key].contentWindow, doc = frames[key].contentDocument;
        if (!win?.innerWidth || !doc) return null;
        const el = doc.elementFromPoint(win.innerWidth / 2, 2);
        return el ? { win, el, top: el.getBoundingClientRect().top } : null;
      } catch { return null; }
    });
  }
  function restore(saved) {
    requestAnimationFrame(() => requestAnimationFrame(() => saved.forEach(a => {
      if (a && a.el.isConnected) a.win.scrollTo({ top: a.win.scrollY + a.el.getBoundingClientRect().top - a.top, behavior: 'instant' });
    })));
  }
  function setView(next) {
    if (next === view) return;
    const saved = anchors();
    view = next; render(); restore(saved);
    requestAnimationFrame(() => KEYS.forEach(revealVisible));
  }
  function setDevice(next) {
    if (next === device) return;
    device = next; render();
    // Reload so each design lays out from the start at the new width (as in the review).
    KEYS.forEach(key => load(key, pages[key]));
  }

  $$('.views [data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $$('.devices [data-device]').forEach(button => button.addEventListener('click', () => setDevice(button.dataset.device)));
  $$('.pane-solo').forEach(button => button.addEventListener('click', () => setView(button.dataset.solo)));
  $$('.pane-side').forEach(button => button.addEventListener('click', () => setView('side')));
  KEYS.forEach(key => $('.pane-home', panes[key]).addEventListener('click', () => load(key)));
  $('#fullscreen').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => {
    $('#fullscreen').firstChild.textContent = document.fullscreenElement ? 'Exit full screen ' : 'Full screen ';
  });
  document.addEventListener('keydown', onKey);
  addEventListener('resize', fit, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe($('#stage'));

  // Task-first's in-page navigation, answered the way the review does.
  addEventListener('message', event => {
    const key = KEYS.find(k => event.source === frames[k].contentWindow);
    const data = event.data;
    if (!key || !data || !sameOrigin(event)) return;
    // From disk the review cannot read a pane's address; the packaged page reports it.
    if (data.type === 'review-frame-location' && location.protocol === 'file:' && typeof data.href === 'string') { pages[key] = data.href; renderPane(key); return; }
    const routes = DESIGNS[key].routes;
    if (!routes) return;
    const at = page => new URL(page, location.href);
    if (data.type === 'ljc-project' && typeof data.project === 'string') { const url = at(routes.projects); url.searchParams.set('project', data.project); load(key, url.href); }
    if (data.type === 'ljc-cases') { const url = at(routes.cases); if (typeof data.case === 'string' && data.case) url.searchParams.set('case', data.case); load(key, url.href); }
    if (data.type === 'ljc-home') { const url = at(DESIGNS[key].home); if (typeof data.section === 'string' && data.section) url.searchParams.set('section', data.section); load(key, url.href); }
    if (data.type === 'ljc-brand-project' && typeof data.project === 'string') { const url = at(routes.ljc); url.searchParams.set('project', data.project); window.open(url.href, '_blank', 'noopener'); }
    if (data.type === 'ljc-reverberation') { const url = at(routes.reverberation); url.searchParams.set('theme', 'ljc'); for (const k of ['mode', 'story', 'chapter']) if (typeof data[k] === 'string') url.searchParams.set(k, data[k]); window.open(url.href, '_blank', 'noopener'); }
  });

  render();
  KEYS.forEach(key => load(key));
})();
