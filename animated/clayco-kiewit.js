/* Clayco Option D: header, mega menu, search, phone sheet, sliders, tabs, carousel,
   career cards and scroll reveals, rebuilt by hand after the reference site's interaction
   patterns. Vanilla, no libraries. ?motion=off, prefers-reduced-motion and the review
   deck's {type:'ljc-motion'} message settle everything. Concept study. */
(() => {
  'use strict';

  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const systemReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 1280px)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const narrow = matchMedia('(max-width: 768px)');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const framed = window.parent !== window;
  const post = msg => { if (framed) { try { window.parent.postMessage(msg, location.origin); } catch (_) { /* cross-origin parent */ } } };

  let deckPaused = false;
  const still = () => deckPaused || params.get('motion') === 'off' || systemReduce.matches;
  const smooth = () => (still() ? 'auto' : 'smooth');

  root.classList.add('kd-ready');

  /* ------------------------------------------------------------ header: hide on scroll down, white on scroll up */
  const hd = $('.hd');
  const main = $('#main');
  const foot = $('.ft');
  let lastY = window.scrollY;
  let sheetOpen = false;
  let searchOpen = false;

  function onScroll() {
    const y = window.scrollY;
    if (!hd.classList.contains('is-open') && !sheetOpen && !searchOpen) {
      if (y <= 4) hd.classList.remove('is-solid', 'is-hidden');
      else if (y > lastY + 3 && y > hd.offsetHeight) { hd.classList.add('is-hidden'); }
      else if (y < lastY - 3) { hd.classList.remove('is-hidden'); hd.classList.add('is-solid'); }
    }
    lastY = y;
  }
  let scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => { scrollQueued = false; onScroll(); });
  }, { passive: true });
  hd.addEventListener('focusin', () => {
    if (hd.classList.contains('is-hidden')) { hd.classList.remove('is-hidden'); if (window.scrollY > 4) hd.classList.add('is-solid'); }
  });

  /* ------------------------------------------------------------ mega menu */
  const megaItems = $$('.hd-item[data-panel]');
  let openItem = null;
  let openedAt = 0;
  let leaveTimer = 0;

  function openMega(item, focusFirst) {
    clearTimeout(leaveTimer);
    if (openItem && openItem !== item) closeMega(false);
    if (searchOpen) closeSearch(false);
    openItem = item;
    openedAt = performance.now();
    item.classList.add('is-open');
    $('.hd-link', item).setAttribute('aria-expanded', 'true');
    hd.classList.add('is-open');
    hd.classList.remove('is-hidden');
    if (focusFirst) { const first = $('.mega a', item); if (first) first.focus(); }
  }
  function closeMega(restoreFocus) {
    if (!openItem) return;
    const item = openItem;
    openItem = null;
    item.classList.remove('is-open');
    const btn = $('.hd-link', item);
    btn.setAttribute('aria-expanded', 'false');
    hd.classList.remove('is-open');
    if (window.scrollY <= 4) hd.classList.remove('is-solid');
    else hd.classList.add('is-solid');
    if (restoreFocus) btn.focus();
  }
  megaItems.forEach(item => {
    const btn = $('.hd-link', item);
    btn.addEventListener('click', () => {
      if (openItem === item) {
        if (performance.now() - openedAt < 450) return; // the hover that opened it is still settling
        closeMega(false);
      } else openMega(item);
    });
    btn.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); openMega(item, true); }
    });
    item.addEventListener('mouseenter', () => { if (desktop.matches && finePointer.matches) openMega(item); });
    item.addEventListener('mouseleave', () => {
      if (!finePointer.matches) return;
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => { if (openItem === item) closeMega(false); }, 160);
    });
    item.addEventListener('focusout', ev => {
      if (openItem === item && !item.contains(ev.relatedTarget)) closeMega(false);
    });
  });
  document.addEventListener('pointerdown', ev => {
    if (openItem && !openItem.contains(ev.target)) closeMega(false);
    if (searchOpen && !$('.srch').contains(ev.target) && !ev.target.closest('.hd-search')) closeSearch(false);
  });

  /* ------------------------------------------------------------ search (in-page over D.searchIndex; nothing is submitted) */
  let INDEX = { items: [], suggested: [] };
  try { INDEX = JSON.parse($('#kd-search-data').textContent); } catch (_) { /* keep empty */ }
  const searchBtn = $('.hd-search');
  const srch = $('#kd-search');
  const fold = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  INDEX.items.forEach(it => { it.hay = fold([it.title, it.subtitle, it.type, it.keywords].join(' ')); });

  function results(query) {
    const words = fold(query).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return INDEX.items
      .map(it => {
        if (!words.every(w => it.hay.includes(w))) return null;
        const t = fold(it.title);
        const score = words.reduce((s, w) => s + (t.startsWith(w) ? 4 : t.includes(w) ? 2 : 1), 0);
        return { it, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(r => r.it);
  }
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function renderSearch(input, list, count) {
    const q = input.value.trim();
    list.replaceChildren();
    const chips = list.parentElement.querySelector('.srch-chips');
    if (chips) chips.remove();
    if (!q) {
      count.textContent = INDEX.suggested.length ? 'Suggested' : '';
      if (INDEX.suggested.length) {
        const wrap = el('div', 'srch-chips');
        INDEX.suggested.forEach(term => {
          const b = el('button', 'srch-chip', term);
          b.type = 'button';
          b.addEventListener('click', () => { input.value = term; renderSearch(input, list, count); input.focus(); });
          wrap.append(b);
        });
        list.before(wrap);
      }
      return;
    }
    const found = results(q);
    count.textContent = found.length ? `${found.length} result${found.length === 1 ? '' : 's'}` : 'No results';
    found.forEach(it => {
      const li = el('li');
      const a = el('a');
      a.href = it.url;
      if (/^https?:/.test(it.url)) { a.target = '_blank'; a.rel = 'noopener'; }
      a.append(el('span', 'sr-type', it.type), el('span', 'sr-title', it.title));
      if (it.subtitle) a.append(el('span', 'sr-sub', it.subtitle));
      if (a.target) a.append(el('span', 'sr-only', ' (opens in a new tab)'));
      li.append(a);
      list.append(li);
    });
  }
  const q1 = $('#kd-q'), r1 = $('#kd-results'), c1 = $('#kd-count');
  const q2 = $('#kd-q2'), r2 = $('#kd-results2'), c2 = $('#kd-count2');
  q1.addEventListener('input', () => renderSearch(q1, r1, c1));
  q2.addEventListener('input', () => renderSearch(q2, r2, c2));
  q2.addEventListener('focus', () => renderSearch(q2, r2, c2));
  [q1, q2].forEach(input => input.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); const first = (input === q1 ? r1 : r2).querySelector('a'); if (first) first.focus(); }
  }));

  function openSearch() {
    closeMega(false);
    searchOpen = true;
    hd.classList.add('is-searching', 'is-open');
    hd.classList.remove('is-hidden');
    searchBtn.setAttribute('aria-expanded', 'true');
    renderSearch(q1, r1, c1);
    requestAnimationFrame(() => q1.focus());
  }
  function closeSearch(restoreFocus) {
    if (!searchOpen) return;
    searchOpen = false;
    hd.classList.remove('is-searching', 'is-open');
    if (window.scrollY > 4) hd.classList.add('is-solid');
    searchBtn.setAttribute('aria-expanded', 'false');
    if (restoreFocus) searchBtn.focus();
  }
  searchBtn.addEventListener('click', () => (searchOpen ? closeSearch(true) : openSearch()));
  $('.srch-close').addEventListener('click', () => closeSearch(true));

  /* ------------------------------------------------------------ phone and tablet sheet */
  const burger = $('.hd-burger');
  const sheet = $('#kd-sheet');
  const sheetMain = $('.sheet-main', sheet);
  function openSheet() {
    sheetOpen = true;
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add('is-in'));
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Close menu');
    hd.classList.add('is-open');
    hd.classList.remove('is-hidden');
    root.classList.add('kd-lock');
    main.inert = true; foot.inert = true;
  }
  function closeSheet(restoreFocus) {
    if (!sheetOpen) return;
    sheetOpen = false;
    sheet.classList.remove('is-in');
    $$('.sheet-sub.is-in', sheet).forEach(s => { s.classList.remove('is-in'); s.hidden = true; });
    sheetMain.inert = false;
    $$('[data-sub]', sheet).forEach(b => b.setAttribute('aria-expanded', 'false'));
    sheet.hidden = true;
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Menu');
    hd.classList.remove('is-open');
    if (window.scrollY <= 4) hd.classList.remove('is-solid');
    root.classList.remove('kd-lock');
    main.inert = false; foot.inert = false;
    if (restoreFocus) burger.focus();
  }
  burger.addEventListener('click', () => (sheetOpen ? closeSheet(true) : openSheet()));
  $$('[data-sub]', sheet).forEach(btn => {
    const sub = document.getElementById(btn.dataset.sub);
    btn.addEventListener('click', () => {
      sub.hidden = false;
      sheetMain.inert = true;
      btn.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => { sub.classList.add('is-in'); $('.sheet-back', sub).focus({ preventScroll: true }); });
    });
    $('.sheet-back', sub).addEventListener('click', () => {
      sub.classList.remove('is-in');
      sheetMain.inert = false;
      btn.setAttribute('aria-expanded', 'false');
      setTimeout(() => { if (!sub.classList.contains('is-in')) sub.hidden = true; }, still() ? 0 : 500);
      btn.focus({ preventScroll: true });
    });
  });
  desktop.addEventListener('change', ev => { if (ev.matches) closeSheet(false); else { closeMega(false); closeSearch(false); } });

  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return;
    if (openItem) closeMega(true);
    else if (searchOpen) closeSearch(true);
    else if (sheetOpen) {
      const sub = $('.sheet-sub.is-in', sheet);
      if (sub) $('.sheet-back', sub).click(); else closeSheet(true);
    } else if (tabsOpen()) closeDropdown(true);
  });

  /* ------------------------------------------------------------ sliders: hero (autoplay 10s, Ken Burns) and billboard (manual) */
  function Slider(el) {
    const slides = $$('.sl-slide', el);
    const dots = $$('.sl-dot', el);
    const prev = $('.sl-prev', el);
    const next = $('.sl-next', el);
    const pauseBtn = $('.sl-pause', el);
    const fade = Number(el.dataset.fade) || 700;
    const autoplay = Number(el.dataset.autoplay) || 0;
    el.style.setProperty('--fade-ms', `${fade}ms`);
    let index = 0;
    let timer = 0;
    let userPaused = false;
    let inView = false; // the IntersectionObserver reports at once; nothing loads off screen
    let focusHeld = false;
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);

    function playVideo(slide) {
      const v = $('.sl-video', slide);
      if (!v) return;
      if (still() || userPaused || !inView || saveData) { v.pause(); return; }
      if (!v.src && v.dataset.src) {
        v.src = v.dataset.src;
        v.addEventListener('playing', () => v.classList.add('is-playing'), { once: true });
      }
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    }
    function stopVideo(slide) { const v = $('.sl-video', slide); if (v && !v.paused) v.pause(); }

    function schedule() {
      clearTimeout(timer);
      if (autoplay && !userPaused && !still() && inView && !focusHeld) timer = setTimeout(() => go(index + 1 >= slides.length ? 0 : index + 1), autoplay);
    }
    function go(n) {
      if (n < 0 || n >= slides.length || n === index) return;
      const old = slides[index];
      const cur = slides[n];
      old.classList.remove('is-active');
      old.classList.add('is-leaving');
      old.setAttribute('aria-hidden', 'true');
      old.inert = true;
      setTimeout(() => old.classList.remove('is-leaving'), fade + 60);
      stopVideo(old);
      index = n;
      cur.classList.add('is-active');
      cur.removeAttribute('aria-hidden');
      cur.inert = false;
      dots.forEach((d, i) => { if (i === n) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
      const had = document.activeElement;
      if (prev) prev.disabled = n === 0;
      if (next) next.disabled = n === slides.length - 1;
      if (had === next && next.disabled && prev) prev.focus();
      else if (had === prev && prev.disabled && next) next.focus();
      playVideo(cur);
      syncPause();
      schedule();
    }
    // The pause control shows while something moves: the hero's slideshow, or a slide's looping clip.
    function syncPause() {
      if (pauseBtn) pauseBtn.hidden = still() || (!autoplay && !$('.sl-video', slides[index]));
    }
    // Autoplay waits while keyboard focus is inside, so a keyboard user's place is never pulled out from under them.
    // (No hover hold: the hero fills the screen, so a resting pointer would stop the slideshow for good.)
    const keyboardFocus = n => { try { return n.matches(':focus-visible'); } catch (_) { return true; } };
    el.addEventListener('focusin', ev => { if (keyboardFocus(ev.target)) { focusHeld = true; clearTimeout(timer); } });
    el.addEventListener('focusout', ev => { if (!el.contains(ev.relatedTarget)) { focusHeld = false; schedule(); } });
    dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
    if (prev) prev.addEventListener('click', () => go(index - 1));
    if (next) next.addEventListener('click', () => go(index + 1));
    el.addEventListener('keydown', ev => {
      if (ev.target.closest('a, input')) return;
      if (ev.key === 'ArrowRight') { go(index + 1); }
      else if (ev.key === 'ArrowLeft') { go(index - 1); }
    });
    // swipe
    let sx = 0, sy = 0, tracking = false;
    el.addEventListener('pointerdown', ev => { if (ev.pointerType === 'mouse') return; sx = ev.clientX; sy = ev.clientY; tracking = true; });
    el.addEventListener('pointerup', ev => {
      if (!tracking) return;
      tracking = false;
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(index + (dx < 0 ? 1 : -1));
    });
    el.addEventListener('pointercancel', () => { tracking = false; });

    function setPaused(p) {
      userPaused = p;
      el.classList.toggle('is-paused', p);
      if (pauseBtn) {
        pauseBtn.setAttribute('aria-pressed', String(p));
        pauseBtn.setAttribute('aria-label', p ? pauseBtn.dataset.labelPlay : pauseBtn.dataset.labelPause);
      }
      if (p) { clearTimeout(timer); stopVideo(slides[index]); } else { playVideo(slides[index]); schedule(); }
    }
    if (pauseBtn) pauseBtn.addEventListener('click', () => setPaused(!userPaused));

    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (inView) { playVideo(slides[index]); schedule(); } else { clearTimeout(timer); stopVideo(slides[index]); }
    }, { threshold: 0.2 }).observe(el);

    return {
      motion() {
        if (still()) { clearTimeout(timer); slides.forEach(stopVideo); el.classList.toggle('is-paused', true); }
        else { el.classList.toggle('is-paused', userPaused); playVideo(slides[index]); schedule(); }
        syncPause();
      },
    };
  }
  const sliders = $$('.sl').map(Slider);

  /* ------------------------------------------------------------ services tabs (tablist; dropdown pill at phone width) */
  const tabsWrap = $('.sv-tabs');
  const tabs = $$('.sv-tab');
  const row = $('.sv-row');
  const scroller = $('.sv-scroller');
  const dd = $('.sv-dd');
  const ddLabel = $('.sv-dd-label');
  const list = $('#sv-list');
  const tabsOpen = () => tabsWrap.classList.contains('is-open');

  function select(tab, focus) {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (on && panel.hidden) { panel.hidden = false; panel.classList.remove('is-fresh'); void panel.offsetWidth; panel.classList.add('is-fresh'); }
      else if (!on) panel.hidden = true;
    });
    ddLabel.textContent = tab.textContent;
    if (focus) tab.focus({ preventScroll: true });
    if (!narrow.matches) {
      const r = tab.getBoundingClientRect(), s = scroller.getBoundingClientRect();
      if (r.right > s.right - 160) scroller.scrollBy({ left: r.right - (s.right - 160), behavior: smooth() });
      else if (r.left < s.left + 48) scroller.scrollBy({ left: r.left - (s.left + 48), behavior: smooth() });
    }
  }
  tabs.forEach(t => t.addEventListener('click', () => { select(t, false); if (narrow.matches) closeDropdown(true); }));
  list.addEventListener('keydown', ev => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let n = -1;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') n = (i + 1) % tabs.length;
    else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
    else if (ev.key === 'Home') n = 0;
    else if (ev.key === 'End') n = tabs.length - 1;
    if (n < 0) return;
    ev.preventDefault();
    select(tabs[n], true);
  });
  function edges() {
    const max = scroller.scrollWidth - scroller.clientWidth;
    row.classList.toggle('at-start', scroller.scrollLeft <= 2);
    row.classList.toggle('at-end', scroller.scrollLeft >= max - 2);
  }
  scroller.addEventListener('scroll', edges, { passive: true });
  window.addEventListener('resize', edges);
  $('.sv-arrow--next').addEventListener('click', () => scroller.scrollBy({ left: scroller.clientWidth * 0.6, behavior: smooth() }));
  $('.sv-arrow--prev').addEventListener('click', () => scroller.scrollBy({ left: -scroller.clientWidth * 0.6, behavior: smooth() }));
  function closeDropdown(focus) {
    tabsWrap.classList.remove('is-open');
    dd.setAttribute('aria-expanded', 'false');
    if (focus) dd.focus();
  }
  dd.addEventListener('click', () => {
    const open = !tabsOpen();
    tabsWrap.classList.toggle('is-open', open);
    dd.setAttribute('aria-expanded', String(open));
    if (open) { const cur = tabs.find(t => t.getAttribute('aria-selected') === 'true'); if (cur) cur.focus(); }
  });
  document.addEventListener('pointerdown', ev => { if (tabsOpen() && !tabsWrap.contains(ev.target)) closeDropdown(false); });
  tabsWrap.addEventListener('focusout', ev => { if (tabsOpen() && !tabsWrap.contains(ev.relatedTarget)) closeDropdown(false); });
  function orient() { list.setAttribute('aria-orientation', narrow.matches ? 'vertical' : 'horizontal'); if (!narrow.matches) closeDropdown(false); edges(); }
  narrow.addEventListener('change', orient);
  orient();

  /* ------------------------------------------------------------ work carousel (native scroll with snap; round buttons) */
  const track = $('#mk-track');
  const mkPrev = $('.mk-prev');
  const mkNext = $('.mk-next');
  const step = () => { const c = $('.mk-slide', track); return c ? c.getBoundingClientRect().width + 20 : 300; };
  function mkEdges() {
    const max = track.scrollWidth - track.clientWidth;
    const had = document.activeElement;
    mkPrev.disabled = track.scrollLeft <= 2;
    mkNext.disabled = track.scrollLeft >= max - 2;
    if (had === mkNext && mkNext.disabled) mkPrev.focus({ preventScroll: true });
    else if (had === mkPrev && mkPrev.disabled) mkNext.focus({ preventScroll: true });
  }
  mkPrev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: smooth() }));
  mkNext.addEventListener('click', () => track.scrollBy({ left: step(), behavior: smooth() }));
  track.addEventListener('scroll', mkEdges, { passive: true });
  window.addEventListener('resize', mkEdges);
  mkEdges();

  /* ------------------------------------------------------------ career cards: hover opens on desktop; click, tap, Enter or Space toggles */
  $$('.ccard').forEach(card => {
    const btn = $('.ccard-btn', card);
    btn.addEventListener('click', () => {
      const open = !card.classList.contains('is-open');
      $$('.ccard.is-open').forEach(c => { if (c !== card) { c.classList.remove('is-open'); $('.ccard-btn', c).setAttribute('aria-expanded', 'false'); } });
      card.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
    if (finePointer.matches) {
      card.addEventListener('mouseenter', () => btn.setAttribute('aria-expanded', 'true'));
      card.addEventListener('mouseleave', () => { if (!card.classList.contains('is-open')) btn.setAttribute('aria-expanded', 'false'); });
    }
  });

  /* ------------------------------------------------------------ scroll reveal: once, as the top crosses ~55% of the viewport */
  const revealables = $$('.rv, .rule--draw');
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -22% 0px' });
  function watchReveals() {
    revealables.forEach(n => {
      if (n.classList.contains('in')) return;
      if (n.getBoundingClientRect().bottom < 0) n.classList.add('in'); // already passed: show without replaying
      else io.observe(n);
    });
  }

  /* ------------------------------------------------------------ motion switches */
  function applyMotion() {
    const off = still();
    root.classList.toggle('kd-still', off);
    root.classList.toggle('kd-motion', !off);
    if (off) { io.disconnect(); revealables.forEach(n => n.classList.add('in')); }
    else watchReveals();
    sliders.forEach(s => s.motion());
  }
  systemReduce.addEventListener('change', applyMotion);
  applyMotion();

  /* ------------------------------------------------------------ deck contract */
  function goToSection(id) {
    closeMega(false); closeSearch(false); closeSheet(false);
    const target = id === 'home' || !id ? document.body : document.getElementById(id);
    if (!target) return;
    const y = target === document.body ? 0 : target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: y, behavior: 'auto' });
  }
  function openPanel(panel) {
    if (panel === 'search') { if (desktop.matches) openSearch(); else { openSheet(); requestAnimationFrame(() => q2.focus()); } }
    else if (panel === 'menu') { if (desktop.matches) openMega(megaItems[0], false); else openSheet(); }
  }
  window.addEventListener('message', ev => {
    if (ev.origin !== location.origin || ev.source !== window.parent) return;
    const data = ev.data || {};
    if (data.type === 'ljc-section') goToSection(String(data.id || ''));
    else if (data.type === 'ljc-motion') { deckPaused = Boolean(data.paused); applyMotion(); post({ type: 'ljc-motion-state', paused: still(), reduced: still(), system: systemReduce.matches }); }
    else if (data.type === 'ljc-open-panel') openPanel(data.panel);
  });
  if (params.get('section')) requestAnimationFrame(() => goToSection(params.get('section')));
  if (params.get('panel')) requestAnimationFrame(() => openPanel(params.get('panel')));
  post({ type: 'ljc-ready', theme: root.dataset.theme || 'clayco-d' });
})();
