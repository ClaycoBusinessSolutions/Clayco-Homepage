/* Final review: the two finalist designs, the current claycorp.com and the Kiewit-style study, presented
   three ways — Option (one fills the stage), Side by side (any two or more at desktop width, scaled to fit)
   and Mobile (CSS-drawn devices showing any one or more). Classic script so it also opens from disk. */
(() => {
  'use strict';
  const DESIGNS = {
    a: { home: 'designs/sam-alcarez-tweaked-1027/index.html' },
    b: {
      home: '../../animated/clayco-b.html',
      // Task-first hands these links to its host page when embedded (see animated/README.md).
      routes: { projects: '../../animated/project-clayco-b.html', cases: '../../animated/clayco-case-studies.html', ljc: '../../animated/project-ljc.html', reverberation: '../../animated/reverberation.html' },
    },
    // The current claycorp.com, for reference (29 Oct): its homepage HTML captured onto this origin
    // (tools/capture-claycorp.py), so it scrolls with the others; images, styles, scripts and links come
    // from claycorp.com, live. Open goes to the live site. Loaded the first time it shows.
    c: { home: 'designs/claycorp-current/index.html', open: 'https://claycorp.com/', lazy: true },
    // Option D (29 Oct): Clayco's homepage in kiewit.com's design language (animated/KIEWIT-STUDY.md).
    d: { home: '../../animated/clayco-kiewit.html', lazy: true },
  };
  const DESKTOP_WIDTH = 1280;  // side by side, each design lays out as on a 1280px laptop
  // Screen = the CSS px viewport each device gives the page (the body adds the bezel); status = its status bar.
  const MODELS = {
    iphone: { name: 'iPhone 18 Pro', w: 402, h: 874, bezel: 16, status: 62 },
    iphonemax: { name: 'iPhone 18 Pro Max', w: 440, h: 956, bezel: 16, status: 62 },
    galaxy: { name: 'Galaxy S Ultra', w: 412, h: 915, bezel: 12, status: 36 },
    ipad: { name: 'iPad Pro 12.9″', w: 1024, h: 1366, bezel: 44, status: 24, rotates: true },
  };
  const ORDER = Object.keys(MODELS);
  const PHONE_BOX = Object.values(MODELS).filter(m => !m.rotates)
    .reduce((box, m) => ({ dw: Math.max(box.dw, m.w + 2 * m.bezel), dh: Math.max(box.dh, m.h + 2 * m.bezel) }), { dw: 0, dh: 0 });
  const KEYS = ['a', 'b', 'c', 'd'];
  const LABELS = { a: 'A · Sam Alcarez, Tweaked original', b: 'B · Dohyoung Kim, Task-first', c: 'C · the current claycorp.com', d: 'D · Kiewit-style study' };
  const ordered = keys => KEYS.filter(key => keys.includes(key));
  // Side by side compares any two or more; Mobile shows any one or more devices.
  const MIN = { pair: 2, show: 1 };
  const MODE_LABELS = { option: 'Option', side: 'Side by side', mobile: 'Mobile' };
  const PAD_Y = 24, PAD_X = 28, CAPTION = 40;
  const MOVE = 'cubic-bezier(.65,0,.35,1)', ARRIVE = 'cubic-bezier(.16,1,.3,1)', DURATION = 700;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const html = document.documentElement, body = document.body, stage = $('#stage'), bar = $('#bar');
  const panes = Object.fromEntries(KEYS.map(key => [key, $(`#pane-${key}`)]));
  const frames = Object.fromEntries(KEYS.map(key => [key, $('iframe', panes[key])]));
  const pages = Object.fromEntries(KEYS.map(key => [key, DESIGNS[key].home]));
  const joining = new Set();  // panes (re)loaded by the review, which join the others while scrolling together
  const sameOrigin = event => event.origin === location.origin || (location.protocol === 'file:' && event.origin === 'null');

  // ---------- State, read from the address; old ?view=a|b|side&device=phone links still open ----------
  const S = { mode: 'side', solo: 'a', pair: ['a', 'b'], show: ['a', 'b'], model: 'iphone', rot: 'port', chrome: 'shown', sync: false };
  {
    const query = new URLSearchParams(location.search);
    const mode = query.get('mode'), design = query.get('design'), device = query.get('device'), view = query.get('view');
    const single = value => (KEYS.includes(value) ? value : null);
    const list = value => ordered((value || '').split(','));
    if (MODELS[device]) S.model = device;
    if (['option', 'side', 'mobile'].includes(mode)) S.mode = mode;
    else if (device === 'phone') S.mode = 'mobile';
    else if (single(view)) S.mode = 'option';
    const picked = single(design) || single(view);
    if (picked) S.solo = picked;
    if (list(query.get('compare')).length >= MIN.pair) S.pair = list(query.get('compare'));
    if (S.mode === 'mobile') S.show = design === 'both' ? ['a', 'b'] : list(design).length ? list(design) : picked ? [picked] : ['a', 'b'];
    if (query.get('rot') === 'land' && MODELS[S.model].rotates) S.rot = 'land';
    S.sync = query.get('sync') === '1' && location.protocol !== 'file:';
  }
  // Task-first's two open review calls (?window=line, ?footer=uncover) reach every page pane B loads, and stay in the address.
  const SWITCHES = [...new URLSearchParams(location.search)].filter(([k, v]) => (k === 'window' && v === 'line') || (k === 'footer' && v === 'uncover'));
  let lastDesktop = S.mode === 'mobile' ? 'side' : S.mode;
  const shown = () => (S.mode === 'side' ? S.pair : S.mode === 'option' ? [S.solo] : S.show);
  function dims() {
    const m = MODELS[S.model], land = S.rot === 'land' && m.rotates;
    const sw = land ? m.h : m.w, sh = land ? m.w : m.h;
    return { name: m.name, sw, sh, dw: sw + 2 * m.bezel, dh: sh + 2 * m.bezel, bezel: m.bezel, status: m.status };
  }
  // Frames reload whenever the width a design lays out at changes (desktop ↔ device, device ↔ device).
  const sizeKey = () => (S.mode === 'mobile' ? `${dims().sw}x${dims().sh}` : 'desktop');

  // ---------- Keys: from the review page and from inside either design (fields and dialogs excluded) ----------
  function onKey(event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"], dialog[open]')) return;
    if (event.key === 'Escape') {
      if (menuOpen() || legendOpen()) { event.preventDefault(); closeMenu(true); toggleLegend(false); }
      return;
    }
    if (event.target.closest?.('#device-menu')) return;
    const action = {
      '1': () => setMode('option'), '2': () => setMode('side'), '3': () => setMode('mobile'),
      a: () => pick('a'), b: () => pick('b'), c: () => pick('c'), d: () => pick('d'), '[': () => cycle(-1), ']': () => cycle(1), r: rotate,
      h: toggleChrome, f: toggleFullscreen, s: () => toggleSync(), m: () => setMode('mobile'), '?': () => toggleLegend(),
    }[event.key.length === 1 ? event.key.toLowerCase() : ''];
    if (!action) return;
    event.preventDefault();
    if (!event.repeat) action();
  }

  // ---------- Frames ----------
  const progress = {}, slow = {};
  function loading(key, on) {
    const line = $('.load', panes[key]), was = panes[key].classList.contains('is-loading');
    const at = getComputedStyle(line).transform;
    progress[key]?.cancel();
    clearTimeout(slow[key]);
    panes[key].classList.toggle('is-loading', on);
    if (on) slow[key] = setTimeout(() => loading(key, false), 3500);  // a slow photo never hides the page
    if (reduce.matches || (!on && !was)) return;
    progress[key] = on
      ? line.animate([{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(.86)', opacity: 1 }], { duration: 2400, easing: ARRIVE, fill: 'forwards' })
      : line.animate([{ transform: at, opacity: 1 }, { transform: 'scaleX(1)', opacity: 0 }], { duration: 480, easing: MOVE });
  }
  function load(key, page = DESIGNS[key].home) {
    const url = new URL(page, location.href);
    if (key === 'b') SWITCHES.forEach(([k, v]) => url.searchParams.set(k, v));
    pages[key] = url.href;
    loading(key, true);
    frames[key].src = pages[key];
    renderPane(key);
  }
  function renderPane(key) {
    const here = new URL(pages[key], location.href).pathname;
    const atHome = here === new URL(DESIGNS[key].home, location.href).pathname;
    $('.pane-home', panes[key]).hidden = atHome;
    panes[key].classList.toggle('is-away', !atHome);
    $('.pane-open', panes[key]).href = (atHome && DESIGNS[key].open) || pages[key];
  }
  function prepare(key) {
    let doc;
    try { doc = frames[key].contentDocument; pages[key] = frames[key].contentWindow.location.href; } catch { return; }
    if (!doc?.head) return;
    // Phones and tablets use overlay scrollbars, so the design keeps the device's full width.
    doc.querySelector('style[data-final-device]')?.remove();
    if (S.mode === 'mobile') {
      const style = doc.createElement('style'); style.dataset.finalDevice = '';
      style.textContent = 'html,html *{scrollbar-width:none!important}html::-webkit-scrollbar,html *::-webkit-scrollbar{display:none!important}';
      doc.head.append(style);
    }
    // Public links open in a new tab; the designs' own pages stay in their pane.
    if (!doc.documentElement.dataset.finalLinks) {
      doc.documentElement.dataset.finalLinks = '';
      doc.addEventListener('keydown', onKey);
      doc.defaultView.addEventListener('scroll', () => follow(key), { passive: true });
      doc.addEventListener('pointerdown', () => { closeMenu(); toggleLegend(false); }, true);
      doc.addEventListener('click', event => {
        const a = event.target.closest?.('a[href]');
        if (!a || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const raw = a.getAttribute('href');
        if (raw?.startsWith('#') && raw.length > 1 && doc.getElementById(decodeURIComponent(raw.slice(1)))) {
          // The capture's <base> would turn #main into claycorp.com/#main; stay on the page instead.
          event.preventDefault(); doc.getElementById(decodeURIComponent(raw.slice(1))).scrollIntoView(); return;
        }
        const url = new URL(a.href, doc.baseURI);
        if (/^https?:$/.test(url.protocol) && url.origin !== location.origin) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      }, true);
    }
  }
  // Sam's statement band reveals as it scrolls past 45% of the window, after his intro settles.
  // Scaled side by side, or in a device, it is already on screen, so reveal what is visible.
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
    loading(key, false);
    prepare(key); renderPane(key); settleReveals(key);
    // A pane the review (re)loads while scrolling together joins the others where they are: at the pane
    // scrolled last, or the furthest down. Its own navigation (a project page, a deep link) keeps its place.
    if (joining.delete(key) && S.sync && shown().includes(key) && winOf(key)) {
      const others = shown().filter(k => k !== key && winOf(k));
      const ref = others.includes(lastScrolled) ? lastScrolled : others.sort((x, y) => winOf(y).scrollY - winOf(x).scrollY)[0];
      if (ref) winOf(key).scrollTo({ top: winOf(ref).scrollY, behavior: 'instant' });
    }
    if (winOf(key)) at[key] = winOf(key).scrollY;
    // From disk the page is another origin: its packaged bridge applies the device scrollbar style.
    if (location.protocol === 'file:') frames[key].contentWindow?.postMessage({ type: 'review-motion', method: 'device', device: S.mode === 'mobile' ? 'mobile' : 'desktop' }, '*');
  }));

  // ---------- Layout ----------
  function fit() {
    const d = dims();
    for (const key of KEYS) {
      const box = $('.pane-view', panes[key]);
      const width = box.clientWidth, height = box.clientHeight;
      if (!width || !height) continue;
      if (S.mode === 'mobile') {
        const box = MODELS[S.model].rotates ? d : PHONE_BOX;
        const scale = Math.max(.12, Math.min(1, (height - CAPTION - PAD_Y * 2) / box.dh, (width - PAD_X * 2) / box.dw));
        panes[key].style.setProperty('--ds', scale.toFixed(4));
      } else {
        const virtual = S.mode === 'side' ? Math.max(width, DESKTOP_WIDTH) : width;
        panes[key].style.setProperty('--vw', `${virtual}px`);
        panes[key].style.setProperty('--s', (width / virtual).toFixed(4));
      }
    }
  }
  function indicate(seg, instant) {
    const on = $('[aria-pressed=true]', seg), mark = $('.seg-ind', seg);
    if (!on || !seg.offsetWidth) { delete seg.dataset.ready; return; }
    const jump = instant || !seg.dataset.ready || reduce.matches;
    if (jump) mark.style.transition = 'none';
    mark.style.setProperty('--x', `${on.offsetLeft}px`);
    mark.style.setProperty('--w', `${on.offsetWidth}px`);
    if (jump) { void mark.offsetWidth; mark.style.transition = ''; }
    seg.dataset.ready = '';
  }
  const indicators = instant => $$('[data-seg]').forEach(seg => indicate(seg, instant));
  const press = (name, value) => $$(`[data-seg=${name}] button`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[name] === value)));
  function arrive(el) {
    if (!booted || reduce.matches) return;
    el.animate([{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: ARRIVE });
  }
  function urlState() {
    const url = new URL(location.href);
    url.search = '';
    if (S.mode !== 'side') url.searchParams.set('mode', S.mode);
    if (S.mode === 'option') url.searchParams.set('design', S.solo);
    if (S.pair.join() !== 'a,b') url.searchParams.set('compare', S.pair.join());
    if (S.mode === 'mobile') {
      url.searchParams.set('design', S.show.join() === 'a,b' ? 'both' : S.show.join());
      url.searchParams.set('device', S.model);
      if (MODELS[S.model].rotates && S.rot === 'land') url.searchParams.set('rot', 'land');
    }
    if (S.sync) url.searchParams.set('sync', '1');
    SWITCHES.forEach(([k, v]) => url.searchParams.set(k, v));
    url.search = url.search.replace(/%2C/gi, ',');
    history.replaceState(null, '', url);
  }
  const barHeight = () => html.style.setProperty('--bar-real', `${bar.offsetHeight}px`);
  const tools = $('.tools', bar);
  // The bar gives up room in stages: the tool labels, then Scroll together's label and the design names,
  // and only then wraps onto two rows.
  function fitBar() {
    bar.classList.remove('is-compact', 'is-tight', 'is-wrapped');
    const over = () => tools.getBoundingClientRect().right > bar.getBoundingClientRect().right - parseFloat(getComputedStyle(bar).paddingRight) + .5;
    for (const stage of ['is-compact', 'is-tight', 'is-wrapped']) if (over()) bar.classList.add(stage);
  }
  let booted = false;
  function render() {
    const show = shown(), d = dims();
    Object.assign(body.dataset, { mode: S.mode, layout: ['single', 'duo', 'trio', 'quad'][show.length - 1], model: S.model, rot: S.rot, chrome: S.chrome });
    for (const name of ['sw', 'sh', 'dw', 'dh', 'bezel', 'status']) body.style.setProperty(`--${name}`, `${d[name]}px`);
    // Each shown pane takes the next column (or row) in A–D order; the others wait, hidden, in the first.
    KEYS.forEach(key => { const at = show.indexOf(key); panes[key].dataset.shown = String(at >= 0); panes[key].style.setProperty('--slot', String(at + 1 || 1)); });
    press('mode', S.mode); press('solo', S.solo);
    $$('[data-pick]').forEach(group => {
      const set = S[group.dataset.pick];
      $$('button', group).forEach(b => b.setAttribute('aria-pressed', String(set.includes(b.dataset.key))));
    });
    $$('[data-ctx]').forEach(el => { const on = el.dataset.ctx === S.mode; if (el.hidden === on) { el.hidden = !on; if (on) arrive(el); } });
    // Scroll together needs two panes on screen, and pages it can reach (from disk, every frame is another origin).
    const together = show.length > 1 && location.protocol !== 'file:';
    if (syncButton.hidden === together) { syncButton.hidden = !together; if (together) arrive(syncButton); }
    syncButton.setAttribute('aria-pressed', String(S.sync && together));
    const rotateButton = $('#rotate'), rotates = Boolean(MODELS[S.model].rotates);
    if (rotateButton.hidden === rotates) { rotateButton.hidden = !rotates; if (rotates) arrive(rotateButton); }
    rotateButton.setAttribute('aria-pressed', String(S.rot === 'land'));
    rotateButton.setAttribute('aria-label', S.rot === 'land' ? 'Landscape (rotate to portrait)' : 'Portrait (rotate to landscape)');
    $('#device-name').textContent = d.name;
    $$('#device-menu [data-model]').forEach(b => {
      const m = MODELS[b.dataset.model], on = b.dataset.model === S.model, land = on && m.rotates && S.rot === 'land';
      b.setAttribute('aria-checked', String(on));
      $('.size', b).textContent = land ? `${m.h} × ${m.w}` : `${m.w} × ${m.h}`;
    });
    $('#device-btn .glyph').innerHTML = $(`#device-menu [data-model=${S.model}] svg`).innerHTML;
    $('#device-btn').setAttribute('aria-label', `Device: ${d.name}`);
    $$('.cap-name').forEach(el => { el.textContent = d.name; });
    $$('.cap-size').forEach(el => { el.textContent = `${d.sw} × ${d.sh}`; });
    $$('.cap-vp').forEach(el => { el.textContent = `${d.sw} × ${d.sh - d.status} viewport`; });
    fitBar(); fit(); indicators(); barHeight(); urlState();
  }
  function announce(onlySync = false) {
    if (onlySync) { $('#announce').textContent = `Scroll together ${S.sync ? 'on' : 'off'}`; return; }
    const parts = [MODE_LABELS[S.mode]];
    if (S.mode === 'option') parts.push(LABELS[S.solo]);
    if (S.mode === 'side') parts.push(S.pair.map(key => LABELS[key]).join(', '));
    if (S.mode === 'mobile') parts.push(dims().name, S.show.map(key => LABELS[key]).join(', '));
    if (S.sync && shown().length > 1) parts.push('scrolling together');
    if (S.chrome === 'hidden') parts.push('header hidden');
    $('#announce').textContent = parts.join(' · ');
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
  let holding = 0;  // until then, scroll events are the review's own hold, not a reader's
  function restore(saved) {
    holding = performance.now() + 400;
    requestAnimationFrame(() => requestAnimationFrame(() => saved.forEach(a => {
      if (a && a.el.isConnected) a.win.scrollTo({ top: a.win.scrollY + a.el.getBoundingClientRect().top - a.top, behavior: 'instant' });
    })));
  }

  // ---------- Motion ----------
  let transition = null, running = [];
  function track(anims, done) {
    const entry = { anims, done };
    running.push(entry);
    Promise.all(anims.map(a => a.finished.catch(() => {}))).then(() => {
      if (!running.includes(entry)) return;
      running = running.filter(e => e !== entry);
      done(); anims.forEach(a => a.cancel());
    });
  }
  // Jump any motion in progress to its end before the next change starts.
  function settle() {
    try { transition?.skipTransition(); } catch {}
    const list = running; running = [];
    list.forEach(entry => { entry.anims.forEach(a => { try { a.finish(); } catch {} }); entry.done(); entry.anims.forEach(a => a.cancel()); });
  }
  const tf = (scale, turn) => `translate(-50%, -50%) scale(${scale})${turn === undefined ? '' : ` rotate(${turn}deg)`}`;
  const scaleOf = key => parseFloat(panes[key].style.getPropertyValue('--ds')) || 1;
  function sweep() {
    if (reduce.matches) return;
    $('.sweep i').animate([{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 1, offset: .62 }, { transform: 'scaleX(1)', opacity: 0 }], { duration: 860, easing: MOVE });
  }
  const FLAGS = ['vtEnter', 'vtExit', 'vtRise', 'vtSink', 'vtBar', 'vtChrome', 'vtShrink'];
  const clearFlags = () => FLAGS.forEach(name => delete html.dataset[name]);
  // Mode, layout and header changes: each pane morphs from its old box to its new one (View
  // Transitions; FLIP with the Web Animations API where those are missing). Devices rise in.
  function layout(update, plan) {
    if (reduce.matches) return update();
    if (typeof document.startViewTransition !== 'function') return flip(update, plan);
    FLAGS.forEach(name => { if (plan[name]) html.dataset[name] = plan[name]; else delete html.dataset[name]; });
    const area = key => { if (panes[key].dataset.shown !== 'true') return 0; const r = panes[key].getBoundingClientRect(); return r.width * r.height; };
    const before = Object.fromEntries(KEYS.map(key => [key, area(key)]));
    const run = () => {
      update();
      const shrink = KEYS.filter(key => before[key] && area(key) < before[key] * .8);
      if (shrink.length) html.dataset.vtShrink = shrink.join(' '); else delete html.dataset.vtShrink;
    };
    let vt;
    try { vt = document.startViewTransition(run); } catch { clearFlags(); return update(); }
    transition = vt;
    vt.ready.then(sweep, () => {});
    vt.finished.catch(() => {}).finally(() => { if (transition === vt) { transition = null; clearFlags(); afterTransition(); } });
  }
  function flip(update, plan) {
    const before = Object.fromEntries(KEYS.map(key => [key, panes[key].getBoundingClientRect()]));
    const radius = Object.fromEntries(KEYS.map(key => [key, parseFloat(getComputedStyle(panes[key]).borderTopLeftRadius) || 0]));
    update();
    const anims = [];
    KEYS.forEach((key, i) => {
      const el = panes[key];
      if (el.dataset.shown !== 'true') return;
      if (plan.vtEnter.includes(key)) {
        anims.push(el.animate([{ opacity: 0, translate: `${el.style.getPropertyValue('--slot') === '1' ? -8 : 8}% 0` }, { opacity: 1, translate: '0 0' }], { duration: 720, easing: ARRIVE }));
      } else {
        const a = before[key], b = el.getBoundingClientRect();
        if (a.width && b.width && Math.abs(a.left - b.left) + Math.abs(a.top - b.top) + Math.abs(a.width - b.width) + Math.abs(a.height - b.height) > 1) {
          // One scale for both axes, never a stretch. A growing pane starts at the old box and its clip
          // curtains open; a shrinking pane starts at (about) its new size, so it is never zoomed.
          const rw = a.width / b.width, rh = a.height / b.height;
          const s = b.width * b.height >= a.width * a.height ? Math.max(rw, rh) : Math.min(rw, rh);
          const right = Math.max(0, b.width - a.width / s), bottom = Math.max(0, b.height - a.height / s);
          const r0 = radius[key] / s, r1 = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
          anims.push(el.animate([
            { transformOrigin: '0 0', transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${s})`, clipPath: `inset(0px ${right}px ${bottom}px 0px round ${r0}px)` },
            { transformOrigin: '0 0', transform: 'none', clipPath: `inset(0px 0px 0px 0px round ${r1}px)` },
          ], { duration: DURATION, easing: MOVE }));
        }
      }
      if (plan.vtRise.includes(key)) anims.push($('.device', el).animate([{ opacity: 0, translate: '0 72px' }, { opacity: 1, translate: '0 0' }], { duration: 760, delay: 100 + i * 90, easing: ARRIVE, fill: 'backwards' }));
    });
    track(anims, () => {});
    sweep();
  }
  // Option, one design to another: the next wipes in from its side (A–D order) behind a red hairline.
  // Mobile, one device to another: the devices trade places, the outgoing one sliding away.
  function swap(from, to, update) {
    const dir = KEYS.indexOf(to) > KEYS.indexOf(from) ? 1 : -1;
    update();
    if (reduce.matches) return;
    const incoming = panes[to], outgoing = panes[from], anims = [];
    outgoing.classList.add('is-leaving'); incoming.classList.add('is-entering');
    if (S.mode === 'option') {
      // The pane slides in as a window while its page slides the other way, so the page holds still
      // and the red hairline on the pane's leading edge stays exactly on the reveal.
      const timing = { duration: DURATION, easing: MOVE };
      incoming.classList.add(dir > 0 ? 'from-right' : 'from-left');
      anims.push(incoming.animate([{ translate: `${dir * 100}% 0` }, { translate: '0 0' }], timing));
      anims.push($('.pane-view', incoming).animate([{ translate: `${-dir * 100}% 0` }, { translate: '0 0' }], timing));
      anims.push(outgoing.animate([{ opacity: 1, translate: '0 0' }, { opacity: .25, translate: `${-dir * 5}% 0` }], timing));
      try { anims.push(incoming.animate([{ opacity: 1 }, { opacity: 1, offset: .8 }, { opacity: 0 }], { duration: DURATION + 100, pseudoElement: '::after' })); } catch {}
    } else {
      // The incoming pane is see-through (CSS) while its device arrives; only its head fades in, after the old head has gone.
      anims.push($('.pane-head', outgoing).animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: MOVE, fill: 'forwards' }));
      anims.push($('.pane-head', incoming).animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 120, easing: MOVE, fill: 'backwards' }));
      anims.push($('.device-caption', outgoing).animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: MOVE, fill: 'forwards' }));
      anims.push($('.device', outgoing).animate([{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: `${-dir * 96}px 0` }], { duration: 440, easing: MOVE, fill: 'forwards' }));
      anims.push($('.device', incoming).animate([{ opacity: 0, translate: `${dir * 150}px 0` }, { opacity: 1, translate: '0 0' }], { duration: 760, delay: 80, easing: ARRIVE, fill: 'backwards' }));
      anims.push($('.device-caption', incoming).animate([{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], { duration: 560, delay: 280, easing: ARRIVE, fill: 'backwards' }));
    }
    track(anims, () => { outgoing.classList.remove('is-leaving'); incoming.classList.remove('is-entering', 'from-right', 'from-left'); });
  }
  // Device change: the frame itself morphs (size, corners, bezel) while the screen reloads.
  function morph(update) {
    const keys = shown();
    const read = key => {
      const device = $('.device', panes[key]);
      const d = getComputedStyle(device), g = getComputedStyle($('.device-glass', device)), s = getComputedStyle($('.device-screen', device));
      return { w: d.width, h: d.height, r: d.borderRadius, gi: g.top, gr: g.borderRadius, si: s.top, sr: s.borderRadius, ds: scaleOf(key) };
    };
    const from = Object.fromEntries(keys.map(key => [key, read(key)]));
    update();
    if (reduce.matches) return;
    const anims = [];
    keys.forEach((key, i) => {
      const a = from[key], b = read(key), device = $('.device', panes[key]);
      const timing = { duration: DURATION + 60, easing: MOVE, delay: i * 70, fill: 'backwards' };
      const inset = (v, r) => ({ top: v, right: v, bottom: v, left: v, borderRadius: r });
      panes[key].classList.add('is-morphing');
      anims.push(device.animate([{ width: a.w, height: a.h, borderRadius: a.r, transform: tf(a.ds) }, { width: b.w, height: b.h, borderRadius: b.r, transform: tf(b.ds) }], timing));
      anims.push($('.device-glass', device).animate([inset(a.gi, a.gr), inset(b.gi, b.gr)], timing));
      anims.push($('.device-screen', device).animate([inset(a.si, a.sr), inset(b.si, b.sr)], timing));
    });
    track(anims, () => keys.forEach(key => panes[key].classList.remove('is-morphing')));
    sweep();
  }
  // iPad rotation: the frame turns a quarter while it rescales to the new fit.
  function turn(wasPortrait, update) {
    const keys = shown(), from = Object.fromEntries(keys.map(key => [key, scaleOf(key)]));
    update();
    if (reduce.matches) return;
    const anims = keys.map((key, i) => {
      panes[key].classList.add('is-rotating');
      // It pulls back a little mid-turn so the corners clear the pane.
      const to = scaleOf(key), low = Math.min(from[key], to) * .8;
      return $('.device', panes[key]).animate([
        { transform: tf(from[key], wasPortrait ? 90 : -90) },
        { transform: tf(low, wasPortrait ? 45 : -45), offset: .5 },
        { transform: tf(to, 0) },
      ], { duration: 900, easing: MOVE, delay: i * 70, fill: 'backwards' });
    });
    track(anims, () => keys.forEach(key => panes[key].classList.remove('is-rotating')));
  }

  // ---------- Changes ----------
  function change(patch) {
    settle();
    const before = { ...S, shown: shown(), size: sizeKey() };
    Object.assign(S, patch);
    if (Object.keys(S).every(k => String(S[k]) === String(before[k]))) return;
    closeMenu();
    if (before.mode !== 'mobile') lastDesktop = before.mode;
    const after = shown(), reload = before.size !== sizeKey(), chrome = before.chrome !== S.chrome;
    // Turning Scroll together on or off moves nothing, so there is no place to hold.
    const onlySync = Object.keys(S).every(k => k === 'sync' || String(S[k]) === String(before[k]));
    const saved = reload || onlySync ? null : anchors();
    const update = () => {
      if (chrome) { body.classList.add('chrome-switch'); requestAnimationFrame(() => requestAnimationFrame(() => body.classList.remove('chrome-switch'))); }
      render();
      if (chrome) chromeChanged();
      // A new width reloads every pane that has loaded; the current site's pane loads the first time it shows.
      if (reload) KEYS.forEach(key => { if (frames[key].getAttribute('src') !== 'about:blank' || after.includes(key)) { joining.add(key); load(key, pages[key]); } });
      else if (saved) { restore(saved); after.forEach(key => { if (frames[key].getAttribute('src') === 'about:blank') { joining.add(key); load(key); } }); }
      if (S.sync && !before.sync) align();
      requestAnimationFrame(() => KEYS.forEach(revealVisible));
    };
    const same = before.mode === S.mode && !chrome;
    if (same && S.mode === 'option' && before.solo !== S.solo) swap(before.solo, S.solo, update);
    else if (same && S.mode === 'mobile' && before.model !== S.model) morph(update);
    else if (same && S.mode === 'mobile' && before.rot !== S.rot) turn(before.rot !== 'land', update);
    else if (same && S.mode === 'mobile' && before.show.length === 1 && S.show.length === 1 && before.show[0] !== S.show[0]) swap(before.show[0], S.show[0], update);
    else if (same && before.shown.join() === after.join() && !reload) update();
    else {
      const plan = { vtEnter: [], vtExit: [], vtRise: [], vtSink: [], vtBar: '' };
      KEYS.forEach(key => {
        const was = before.shown.includes(key), is = after.includes(key);
        if (is && !was) plan.vtEnter.push(key);
        if (was && !is) plan.vtExit.push(key);
        const hadDevice = before.mode === 'mobile' && was, hasDevice = S.mode === 'mobile' && is;
        if (was && is && hasDevice && !hadDevice) plan.vtRise.push(key);
        if (was && is && hadDevice && !hasDevice) plan.vtSink.push(key);
      });
      if (chrome) { plan.vtBar = S.chrome === 'hidden' ? 'out' : body.classList.contains('is-peek') ? '' : 'in'; plan.vtChrome = 'on'; }
      for (const name of ['vtEnter', 'vtExit', 'vtRise', 'vtSink']) plan[name] = plan[name].join(' ');
      layout(update, plan);
    }
    announce(onlySync);
  }
  function setMode(next) {
    if (next === S.mode) return;
    const patch = { mode: next };
    if (next === 'mobile') patch.show = S.mode === 'option' ? [S.solo] : S.pair;
    if (next === 'option' && S.mode === 'mobile' && S.show.length === 1) patch.solo = S.show[0];
    if (next === 'option' && !shown().includes(patch.solo || S.solo)) patch.solo = shown()[0];
    if (next === 'side' && S.mode === 'mobile' && S.show.length < MIN.pair && !S.pair.includes(S.show[0])) patch.pair = ordered([...S.pair, S.show[0]]);
    // Into Side by side: what was on screen stays on screen, joined by the others in the comparison.
    if (next === 'side' && S.mode === 'mobile' && S.show.length >= MIN.pair) patch.pair = S.show;
    if (next === 'side' && S.mode === 'option' && !S.pair.includes(S.solo)) patch.pair = ordered([...S.pair, S.solo]);
    change(patch);
  }
  function pick(key) {
    if (S.mode === 'side') change({ mode: 'option', solo: key });
    else if (S.mode === 'option') change({ solo: key });
    else change({ show: [key], solo: key });
  }
  // A compare chip adds or removes its pane; the last two side by side (or the last device) stay.
  function toggle(name, key, button) {
    const set = S[name], on = set.includes(key);
    if (on && set.length <= MIN[name]) {
      $('#announce').textContent = name === 'pair' ? 'Side by side keeps at least two.' : 'Mobile keeps at least one device.';
      if (!reduce.matches) button.animate([{ translate: '0 0' }, { translate: '-3px 0' }, { translate: '3px 0' }, { translate: '0 0' }], { duration: 260, easing: MOVE });
      else { button.classList.add('is-refused'); setTimeout(() => button.classList.remove('is-refused'), 600); }
      return;
    }
    change({ [name]: KEYS.filter(k => (k === key ? !on : set.includes(k))) });
  }
  function setModel(model) {
    const patch = { model };
    if (!MODELS[model].rotates) patch.rot = 'port';
    if (S.mode !== 'mobile') Object.assign(patch, { mode: 'mobile', show: S.mode === 'option' ? [S.solo] : S.pair });
    change(patch);
  }
  function cycle(step) {
    if (S.mode !== 'mobile') return setMode('mobile');
    setModel(ORDER[(ORDER.indexOf(S.model) + step + ORDER.length) % ORDER.length]);
  }
  function rotate() {
    if (S.mode === 'mobile' && MODELS[S.model].rotates) change({ rot: S.rot === 'land' ? 'port' : 'land' });
  }

  // ---------- Scroll together ----------
  // Every pane on screen follows the one being scrolled (each page's own CSS px, which side by side and in
  // devices are drawn at the same scale). In step, a follower goes to the same distance from its top. Out of
  // step — a shorter page waiting at its end — it moves by the same amount going down, and in proportion going
  // up (at most four times the leader's move), so the panes close up towards the top without a jump. While a pane leads (160 ms after its
  // last scroll), the others' scroll events are its followers' replies and are not passed on.
  const syncButton = $('#sync-btn');
  const at = {};  // each pane's scrollY at its last scroll event (set on load too)
  let lead = null, leadUntil = 0, lastScrolled = null;
  const winOf = key => { try { return frames[key].contentWindow?.document ? frames[key].contentWindow : null; } catch { return null; } };
  function follow(key, absolute = false) {
    const from = winOf(key);
    if (!from) return;
    const y = from.scrollY, was = at[key] ?? y, now = performance.now();
    at[key] = y;
    if (!absolute && (now < holding || (lead && lead !== key && now < leadUntil))) return;
    lastScrolled = key;
    if (!S.sync || shown().length < 2 || !shown().includes(key)) return;
    lead = key; leadUntil = now + 160;
    shown().forEach(other => {
      const win = other !== key && winOf(other);
      if (!win) return;
      const inStep = absolute || Math.abs(win.scrollY - was) <= 1;
      const step = Math.abs(y - was) * 4;
      const target = inStep ? y : y < was && was > 0 ? Math.max(win.scrollY * y / was, win.scrollY - step) : win.scrollY + y - was;
      if (Math.abs(win.scrollY - target) > .5) win.scrollTo({ top: target, behavior: 'instant' });
      at[other] = win.scrollY;
    });
  }
  // Turning it on lines the others up with the pane last scrolled (or the first on screen).
  const align = () => follow(shown().includes(lastScrolled) ? lastScrolled : shown()[0], true);
  function toggleSync() {
    if (shown().length < 2) return;
    change({ sync: !S.sync });
  }

  // ---------- Header: hide, reveal from the top edge or the pill, peek ----------
  const hideButton = $('#hide-btn'), revealButton = $('#reveal');
  let peekTimer = 0, idleTimer = 0, chromeByKeyboard = false, pointer = null;
  // A click with detail 0 is a keyboard activation: focus then follows to the counterpart button.
  // From the H key or the mouse, focus is simply released so no ring is left on screen.
  const toggleChrome = event => {
    chromeByKeyboard = event?.type === 'click' && event.detail === 0;
    change({ chrome: S.chrome === 'hidden' ? 'shown' : 'hidden' });
  };
  function chromeChanged() {
    const keyboard = chromeByKeyboard, active = document.activeElement;
    chromeByKeyboard = false;
    clearTimeout(idleTimer);
    body.classList.remove('is-idle', 'is-peek');
    if (S.chrome === 'hidden') {
      if (bar.contains(active)) { if (keyboard) revealButton.focus({ preventScroll: true }); else active.blur(); }
      idleTimer = setTimeout(() => body.classList.add('is-idle'), 2800);
    } else if (active === revealButton) { if (keyboard) hideButton.focus({ preventScroll: true }); else active.blur(); }
  }
  function peek(on) {
    clearTimeout(peekTimer);
    if (S.chrome !== 'hidden') return body.classList.remove('is-peek');
    body.classList.toggle('is-peek', on);
  }
  // During a view transition the page is a snapshot overlay, so the bar loses :hover and gets a
  // mouseleave even with the pointer still on it: hold the peek and decide once the motion ends.
  const keepPeek = () => Boolean(transition) || menuOpen() || Boolean(bar.querySelector(':focus-visible')) || bar.matches(':hover');
  const overBar = () => {
    if (!pointer) return false;
    const r = bar.getBoundingClientRect();
    return pointer[0] >= r.left && pointer[0] <= r.right && pointer[1] >= r.top && pointer[1] <= r.bottom;
  };
  const hidePeekSoon = delay => { clearTimeout(peekTimer); peekTimer = setTimeout(() => { if (!keepPeek()) peek(false); }, delay); };
  function afterTransition() {
    if (S.chrome !== 'hidden' || !body.classList.contains('is-peek')) return;
    clearTimeout(peekTimer);
    if (!overBar() && !menuOpen() && !bar.querySelector(':focus-visible')) hidePeekSoon(450);
  }
  const trackPointer = event => { pointer = [event.clientX, event.clientY]; };
  addEventListener('pointermove', trackPointer, { passive: true, capture: true });
  addEventListener('pointerdown', trackPointer, { passive: true, capture: true });
  hideButton.addEventListener('click', toggleChrome);
  revealButton.addEventListener('click', toggleChrome);
  $('.hot').addEventListener('mouseenter', () => peek(true));
  bar.addEventListener('mouseenter', () => clearTimeout(peekTimer));
  bar.addEventListener('mouseleave', () => { if (S.chrome === 'hidden' && !transition) hidePeekSoon(450); });
  bar.addEventListener('focusin', () => { if (S.chrome === 'hidden') peek(true); });
  bar.addEventListener('focusout', event => { if (S.chrome === 'hidden' && !transition && !bar.contains(event.relatedTarget)) hidePeekSoon(300); });

  // ---------- Device menu ----------
  const deviceButton = $('#device-btn'), menu = $('#device-menu'), menuItems = $$('[role=menuitemradio]', menu);
  const menuOpen = () => menu.hasAttribute('data-open');
  function openMenu(focusItem) {
    menu.setAttribute('data-open', '');
    deviceButton.setAttribute('aria-expanded', 'true');
    if (focusItem) (menuItems.find(item => item.getAttribute('aria-checked') === 'true') || menuItems[0]).focus();
  }
  function closeMenu(refocus, instant) {
    if (!menuOpen()) return;
    if (instant) menu.style.transition = 'none';
    menu.removeAttribute('data-open');
    deviceButton.setAttribute('aria-expanded', 'false');
    if (instant) { void menu.offsetWidth; menu.style.transition = ''; }
    if (refocus) deviceButton.focus({ preventScroll: true });
  }
  deviceButton.addEventListener('click', event => (menuOpen() ? closeMenu() : openMenu(event.detail === 0)));
  deviceButton.addEventListener('keydown', event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openMenu(true); } });
  menu.addEventListener('keydown', event => {
    const i = menuItems.indexOf(document.activeElement), n = menuItems.length;
    const next = { ArrowDown: (i + 1) % n, ArrowUp: (i - 1 + n) % n, Home: 0, End: n - 1 }[event.key];
    if (next !== undefined) { event.preventDefault(); menuItems[next].focus(); }
    else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeMenu(true); }
    else if (event.key === 'Tab') closeMenu(true, true);  // the browser's Tab then moves on from the device button
  });
  menuItems.forEach(item => item.addEventListener('click', () => { closeMenu(menu.contains(document.activeElement)); setModel(item.dataset.model); }));

  // ---------- Key legend ----------
  const legend = $('#legend'), keysButton = $('#keys-btn');
  const legendOpen = () => legend.hasAttribute('data-open');
  function toggleLegend(force) {
    const open = force ?? !legendOpen();
    if (open === legendOpen()) return;
    legend.toggleAttribute('data-open', open);
    keysButton.setAttribute('aria-expanded', String(open));
    if (!open && legend.contains(document.activeElement)) keysButton.focus({ preventScroll: true });
  }
  keysButton.addEventListener('click', () => toggleLegend());
  $('#legend-close').addEventListener('click', () => toggleLegend(false));
  document.addEventListener('pointerdown', event => {
    if (menuOpen() && !event.target.closest('.menu-wrap')) closeMenu();
    if (legendOpen() && !event.target.closest('#legend, #keys-btn')) toggleLegend(false);
  });
  addEventListener('blur', () => closeMenu());

  // ---------- Full screen ----------
  const fullscreenButton = $('#fullscreen');
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.(); else html.requestFullscreen?.().catch(() => {});
  }
  fullscreenButton.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    const on = Boolean(document.fullscreenElement);
    body.classList.toggle('is-fullscreen', on);
    fullscreenButton.setAttribute('aria-pressed', String(on));
    fullscreenButton.title = `${on ? 'Exit full screen' : 'Full screen'} (F)`;
    fitBar(); barHeight();
  });

  // ---------- Wiring ----------
  $$('[data-seg=mode] button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $$('[data-seg=solo] button').forEach(b => b.addEventListener('click', () => pick(b.dataset.solo)));
  $$('[data-pick]').forEach(group => $$('button', group).forEach(b => b.addEventListener('click', () => toggle(group.dataset.pick, b.dataset.key, b))));
  $('#rotate').addEventListener('click', rotate);
  syncButton.addEventListener('click', toggleSync);
  KEYS.forEach(key => $('.pane-home', panes[key]).addEventListener('click', () => load(key)));
  document.addEventListener('keydown', onKey);
  addEventListener('resize', () => { fitBar(); fit(); indicators(true); barHeight(); }, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(() => { fit(); barHeight(); }).observe(stage);
  document.fonts?.ready.then(() => { fitBar(); fit(); indicators(true); barHeight(); });

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
  announce();
  booted = true;
  // A quiet first entrance: the panes settle in, devices rise.
  if (!reduce.matches) {
    shown().forEach((key, i) => {
      panes[key].animate([{ opacity: 0, translate: '0 14px' }, { opacity: 1, translate: '0 0' }], { duration: 800, delay: 60 + i * 90, easing: ARRIVE, fill: 'backwards' });
      if (S.mode === 'mobile') $('.device', panes[key]).animate([{ opacity: 0, translate: '0 64px' }, { opacity: 1, translate: '0 0' }], { duration: 820, delay: 160 + i * 90, easing: ARRIVE, fill: 'backwards' });
    });
  }
  KEYS.forEach(key => { if (!DESIGNS[key].lazy || shown().includes(key)) { joining.add(key); load(key); } });
})();
