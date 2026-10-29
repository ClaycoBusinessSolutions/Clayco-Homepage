/* Final review: the two finalist designs, presented three ways — Option (one design fills the
   stage), Side by side (both at desktop width, scaled to fit) and Mobile (CSS-drawn devices with
   one design or both). Classic script so it also opens from disk. */
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
  const KEYS = ['a', 'b'];
  const LABELS = { a: 'A · Sam Alcarez, Tweaked original', b: 'B · Dohyoung Kim, Task-first' };
  const MODE_LABELS = { option: 'Option', side: 'Side by side', mobile: 'Mobile' };
  const PAD_Y = 24, PAD_X = 28, CAPTION = 40;
  const MOVE = 'cubic-bezier(.65,0,.35,1)', ARRIVE = 'cubic-bezier(.16,1,.3,1)', DURATION = 700;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const html = document.documentElement, body = document.body, stage = $('#stage'), bar = $('#bar');
  const panes = Object.fromEntries(KEYS.map(key => [key, $(`#pane-${key}`)]));
  const frames = Object.fromEntries(KEYS.map(key => [key, $('iframe', panes[key])]));
  const pages = { a: DESIGNS.a.home, b: DESIGNS.b.home };
  const sameOrigin = event => event.origin === location.origin || (location.protocol === 'file:' && event.origin === 'null');

  // ---------- State, read from the address; old ?view=a|b|side&device=phone links still open ----------
  const S = { mode: 'side', solo: 'a', show: 'both', model: 'iphone', rot: 'port', chrome: 'shown' };
  {
    const query = new URLSearchParams(location.search);
    const mode = query.get('mode'), design = query.get('design'), device = query.get('device'), view = query.get('view');
    const single = value => (value === 'a' || value === 'b' ? value : null);
    if (MODELS[device]) S.model = device;
    if (['option', 'side', 'mobile'].includes(mode)) S.mode = mode;
    else if (device === 'phone') S.mode = 'mobile';
    else if (single(view)) S.mode = 'option';
    const picked = single(design) || single(view);
    if (picked) S.solo = picked;
    if (S.mode === 'mobile') S.show = design === 'both' ? 'both' : picked || 'both';
    if (query.get('rot') === 'land' && MODELS[S.model].rotates) S.rot = 'land';
  }
  let lastDesktop = S.mode === 'mobile' ? 'side' : S.mode;
  const shown = () => (S.mode === 'side' ? KEYS : S.mode === 'option' ? [S.solo] : S.show === 'both' ? KEYS : [S.show]);
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
      a: () => pick('a'), b: () => pick('b'), '[': () => cycle(-1), ']': () => cycle(1), r: rotate,
      h: toggleChrome, f: toggleFullscreen, m: () => setMode('mobile'), d: () => { if (S.mode === 'mobile') setMode(lastDesktop); }, '?': () => toggleLegend(),
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
    pages[key] = new URL(page, location.href).href;
    loading(key, true);
    frames[key].src = pages[key];
    renderPane(key);
  }
  function renderPane(key) {
    const here = new URL(pages[key], location.href).pathname;
    const atHome = here === new URL(DESIGNS[key].home, location.href).pathname;
    $('.pane-home', panes[key]).hidden = atHome;
    panes[key].classList.toggle('is-away', !atHome);
    $('.pane-open', panes[key]).href = pages[key];
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
      doc.addEventListener('pointerdown', () => { closeMenu(); toggleLegend(false); }, true);
      doc.addEventListener('click', event => {
        const a = event.target.closest?.('a[href]');
        if (!a || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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
    if (S.mode === 'mobile') {
      url.searchParams.set('design', S.show);
      url.searchParams.set('device', S.model);
      if (MODELS[S.model].rotates && S.rot === 'land') url.searchParams.set('rot', 'land');
    }
    history.replaceState(null, '', url);
  }
  const barHeight = () => html.style.setProperty('--bar-real', `${bar.offsetHeight}px`);
  const tools = $('.tools', bar);
  function fitBar() {
    bar.classList.remove('is-compact', 'is-wrapped');
    const over = () => tools.getBoundingClientRect().right > bar.getBoundingClientRect().right - parseFloat(getComputedStyle(bar).paddingRight) + .5;
    if (over()) bar.classList.add('is-compact');
    if (over()) bar.classList.add('is-wrapped');
  }
  let booted = false;
  function render() {
    const show = shown(), d = dims();
    Object.assign(body.dataset, { mode: S.mode, layout: show.length > 1 ? 'duo' : 'single', model: S.model, rot: S.rot, chrome: S.chrome });
    for (const name of ['sw', 'sh', 'dw', 'dh', 'bezel', 'status']) body.style.setProperty(`--${name}`, `${d[name]}px`);
    KEYS.forEach(key => { panes[key].dataset.shown = String(show.includes(key)); });
    press('mode', S.mode); press('solo', S.solo); press('show', S.show);
    $$('[data-ctx]').forEach(el => { const on = el.dataset.ctx === S.mode; if (el.hidden === on) { el.hidden = !on; if (on) arrive(el); } });
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
  function announce() {
    const parts = [MODE_LABELS[S.mode]];
    if (S.mode === 'option') parts.push(LABELS[S.solo]);
    if (S.mode === 'mobile') parts.push(dims().name, S.show === 'both' ? 'both designs' : LABELS[S.show]);
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
  function restore(saved) {
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
        anims.push(el.animate([{ opacity: 0, translate: `${key === 'a' ? -8 : 8}% 0` }, { opacity: 1, translate: '0 0' }], { duration: 720, easing: ARRIVE }));
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
  // Option A ↔ B: the next design wipes in from its side behind a red hairline.
  // Mobile A ↔ B: the devices trade places, the outgoing one sliding away.
  function swap(from, update) {
    const to = from === 'a' ? 'b' : 'a', dir = to === 'b' ? 1 : -1;
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
    if (Object.keys(S).every(k => S[k] === before[k])) return;
    closeMenu();
    if (before.mode !== 'mobile') lastDesktop = before.mode;
    const after = shown(), reload = before.size !== sizeKey(), chrome = before.chrome !== S.chrome;
    const saved = reload ? null : anchors();
    const update = () => {
      if (chrome) { body.classList.add('chrome-switch'); requestAnimationFrame(() => requestAnimationFrame(() => body.classList.remove('chrome-switch'))); }
      render();
      if (chrome) chromeChanged();
      if (reload) KEYS.forEach(key => load(key, pages[key]));
      else restore(saved);
      requestAnimationFrame(() => KEYS.forEach(revealVisible));
    };
    const same = before.mode === S.mode && !chrome;
    if (same && S.mode === 'option' && before.solo !== S.solo) swap(before.solo, update);
    else if (same && S.mode === 'mobile' && before.model !== S.model) morph(update);
    else if (same && S.mode === 'mobile' && before.rot !== S.rot) turn(before.rot !== 'land', update);
    else if (same && S.mode === 'mobile' && before.show !== S.show && before.show !== 'both' && S.show !== 'both') swap(before.show, update);
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
    announce();
  }
  function setMode(next) {
    if (next === S.mode) return;
    const patch = { mode: next };
    if (next === 'mobile') patch.show = S.mode === 'option' ? S.solo : 'both';
    if (next === 'option' && S.mode === 'mobile' && S.show !== 'both') patch.solo = S.show;
    change(patch);
  }
  function pick(key) {
    if (S.mode === 'side') change({ mode: 'option', solo: key });
    else if (S.mode === 'option') change({ solo: key });
    else change({ show: key, solo: key });
  }
  function setModel(model) {
    const patch = { model };
    if (!MODELS[model].rotates) patch.rot = 'port';
    if (S.mode !== 'mobile') Object.assign(patch, { mode: 'mobile', show: S.mode === 'option' ? S.solo : 'both' });
    change(patch);
  }
  function cycle(step) {
    if (S.mode !== 'mobile') return setMode('mobile');
    setModel(ORDER[(ORDER.indexOf(S.model) + step + ORDER.length) % ORDER.length]);
  }
  function rotate() {
    if (S.mode === 'mobile' && MODELS[S.model].rotates) change({ rot: S.rot === 'land' ? 'port' : 'land' });
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
  $$('[data-seg=show] button').forEach(b => b.addEventListener('click', () => (b.dataset.show === 'both' ? change({ show: 'both' }) : pick(b.dataset.show))));
  $('#rotate').addEventListener('click', rotate);
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
  KEYS.forEach(key => load(key));
})();
