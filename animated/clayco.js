/* Clayco concept study runtime (Option A, Option B, their project pages and the
   joint case-study index). Native <dialog> + showModal for every panel; Esc closes
   and focus returns to the trigger. Search is client-side only over
   #clayco-search-data: nothing is submitted anywhere. LJC's case-study spreads
   (#clayco-case-data) open in the shared reader (case-reader.js); the footer's
   office gallery is a tab set. Motion is opt-out: prefers-reduced-motion,
   ?motion=off or the review deck's {type:'ljc-motion'} message make every change
   instant. Concept study only: not the official Clayco website. */
(() => {
  'use strict';
  const doc = document, root = doc.documentElement, body = doc.body;
  const theme = body.dataset.theme || body.dataset.projectTheme || 'clayco-b';
  const optionB = theme === 'clayco-b';
  const isProject = body.dataset.page === 'project';
  const isCases = body.dataset.page === 'cases';
  const query = new URLSearchParams(location.search);
  const embedded = window.parent !== window;
  const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const desktopMega = matchMedia('(min-width: 1100px)');
  let paused = query.get('motion') === 'off';
  const reduced = () => paused || systemMotion.matches;
  const $ = (selector, scope = doc) => scope.querySelector(selector);
  const $$ = (selector, scope = doc) => Array.from(scope.querySelectorAll(selector));
  const post = message => { if (embedded) window.parent.postMessage(message,'*'); };
  const plainClick = event => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  const inside = (rect, x, y) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  function make(tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }
  const isWeb = url => /^https?:/i.test(url || '');
  const isExternal = url => { try { return new URL(url, location.href).origin !== location.origin; } catch { return false; } };

  /* ---------------- Motion ---------------- */
  const running = new Set();
  function animate(element, frames, options) {
    if (!element || reduced() || typeof element.animate !== 'function') return null;
    const animation = element.animate(frames, options);
    running.add(animation);
    const done = () => running.delete(animation);
    animation.finished.then(done, done);
    return animation;
  }
  function setMotion(off, notify = true) {
    paused = Boolean(off);
    root.classList.toggle('motion-off', reduced());
    // The shared case reader reads body.motion-paused (as on the LJC pages).
    body.classList.toggle('motion-paused', reduced());
    if (reduced()) running.forEach(animation => { try { animation.finish(); } catch { animation.cancel(); } });
    $$('[data-motion-toggle]').forEach(button => {
      button.textContent = systemMotion.matches ? 'Reduced motion on' : paused ? 'Play motion' : 'Pause motion';
      button.disabled = systemMotion.matches;
    });
    if (notify) post({ type: 'ljc-motion-state', paused, reduced: reduced(), system: systemMotion.matches });
  }
  $$('[data-motion-toggle]').forEach(button => button.addEventListener('click', () => setMotion(!paused)));
  systemMotion.addEventListener?.('change', () => setMotion(paused));

  /* ---------------- Header ---------------- */
  const header = $('[data-header]');
  function syncHeader() {
    if (!header) return;
    root.style.setProperty('--header-h', `${Math.round(header.getBoundingClientRect().height)}px`);
  }
  let scrollQueued = false;
  function updateHeader() {
    scrollQueued = false;
    if (!header) return;
    if (optionB) { header.classList.toggle('is-scrolled', window.scrollY > 4); return; }
    if (header.dataset.solid === 'always') return;
    const hero = $('.ca-hero');
    header.classList.toggle('is-solid', !hero || hero.getBoundingClientRect().bottom <= header.offsetHeight + 1);
  }
  addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateHeader); } }, { passive: true });
  addEventListener('resize', () => { syncHeader(); updateHeader(); }, { passive: true });
  if (header && 'ResizeObserver' in window) new ResizeObserver(syncHeader).observe(header);
  syncHeader(); updateHeader();

  /* ---------------- Reveal (content is never hidden before it animates) ---------------- */
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      revealObserver.unobserve(entry.target);
      animate(entry.target, [{ opacity: .35, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 720, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }), { threshold: .12, rootMargin: '0px 0px -5% 0px' });
    $$('[data-reveal]').forEach(element => revealObserver.observe(element));
  }
  const heroImage = $('[data-hero-image]');
  if (heroImage) {
    const settle = () => animate(heroImage, [{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 1900, easing: 'cubic-bezier(.2,.7,.2,1)' });
    if (heroImage.complete) settle(); else heroImage.addEventListener('load', settle, { once: true });
  }

  /* ---------------- Dialog lifecycle ---------------- */
  const experiences = new Map();
  const dialogState = new WeakMap();
  const controlsFor = dialog => $$(`button[aria-controls="${dialog.id}"]`);
  function scrollToTarget(target, focus) {
    if (!target) return;
    if (target.id === 'home' || target.id === 'main') window.scrollTo({ top: 0, behavior: reduced() ? 'instant' : 'smooth' });
    else target.scrollIntoView({ behavior: reduced() ? 'instant' : 'smooth', block: 'start' });
    if (!focus) return;
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
    target.focus({ preventScroll: true });
  }
  function openDialog(dialog, trigger, options = {}) {
    if (!dialog || dialog.open) return false;
    $$('dialog[data-clayco-dialog][open]').forEach(other => {
      if (other === dialog) return;
      const state = dialogState.get(other);
      if (state) { state.trigger = null; state.destination = null; }
      other.close();
    });
    dialogState.set(dialog, { trigger: trigger || doc.activeElement, closing: false, destination: null });
    dialog.dataset.phase = 'pre';
    dialog.showModal();
    root.classList.add('has-dialog');
    controlsFor(dialog).forEach(button => button.setAttribute('aria-expanded', 'true'));
    const experience = experiences.get(dialog);
    if (experience?.open) experience.open(dialog, options);
    else dialog.dataset.phase = 'open';
    return true;
  }
  function closeDialog(dialog, destination = null) {
    const state = dialogState.get(dialog);
    if (!dialog?.open || !state || state.closing) return;
    state.closing = true;
    state.destination = destination;
    const finish = () => { if (dialog.open) dialog.close(); };
    const experience = experiences.get(dialog);
    if (experience?.close && !reduced()) experience.close(dialog, finish); else finish();
  }
  function wireDialog(dialog) {
    if (!dialog) return;
    dialog.dataset.claycoDialog = '';
    $$('[data-dialog-close]', dialog).forEach(button => button.addEventListener('click', () => closeDialog(dialog)));
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); });
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault(); event.stopPropagation();
      closeDialog(dialog);
    });
    dialog.addEventListener('click', event => {
      const experience = experiences.get(dialog);
      if (experience?.backdropClick?.(event)) return;
      if (event.target === dialog) {
        const r = dialog.getBoundingClientRect();
        const outside = event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
        if (outside || experience?.closeOnSelf) { closeDialog(dialog); return; }
      }
      const anchor = event.target.closest('a[href^="#"]');
      if (anchor && dialog.contains(anchor) && plainClick(event)) {
        const target = doc.getElementById(anchor.getAttribute('href').slice(1));
        if (target) { event.preventDefault(); closeDialog(dialog, { target, hash: anchor.getAttribute('href') }); }
      }
    });
    dialog.addEventListener('close', () => {
      const state = dialogState.get(dialog) || {};
      dialogState.delete(dialog);
      dialog.dataset.phase = 'closed';
      experiences.get(dialog)?.reset?.(dialog);
      controlsFor(dialog).forEach(button => button.setAttribute('aria-expanded', 'false'));
      root.classList.toggle('has-dialog', Boolean($('dialog[open]')));
      if (state.destination) {
        const { target, hash } = state.destination;
        scrollToTarget(target, true);
        // Inside the review deck the deck owns history: a fragment replaces, never adds, an entry.
        if (location.hash !== hash) history[embedded ? 'replaceState' : 'pushState'](null, '', hash);
      } else if (state.trigger?.isConnected) {
        state.trigger.focus({ preventScroll: true });
      }
      const panel = panelOf(dialog);
      if (panel) requestAnimationFrame(() => { if (!panelShowing(panel)) post({ type: 'ljc-panel-state', panel, open: false }); });
    });
  }
  // Which deck view (Menu or Search) a dialog belongs to, and whether that view still shows.
  function panelOf(dialog) {
    if (dialog?.id === 'clayco-menu' || dialog?.id === 'clayco-mega') return 'menu';
    if (dialog?.id === 'clayco-search' || dialog?.id === 'clayco-results') return 'search';
    return null;
  }
  function panelShowing(panel) {
    if (panel === 'menu') return Boolean($('#clayco-menu[open], #clayco-mega[open]'));
    return Boolean($('#clayco-search[open], #clayco-results[open]')) || (optionB && $('.cb-popup') && !$('.cb-popup').hidden);
  }

  /* A panel that fades in and out; it owns its close animation so a filled
     final frame never leaks into the next opening. */
  function fadeExperience(target, { inFrames, outFrames, inDuration = 380, outDuration = 190, onOpen = null, onReset = null } = {}) {
    let exit = null;
    return {
      open(d) {
        exit?.cancel(); exit = null;
        onOpen?.(d);
        requestAnimationFrame(() => { if (d.open) d.dataset.phase = 'open'; });
        animate(target(d), inFrames, { duration: inDuration, easing: 'cubic-bezier(.2,.7,.2,1)' });
      },
      close(d, done) {
        exit = animate(target(d), outFrames, { duration: outDuration, easing: 'ease-in', fill: 'forwards' });
        if (!exit) { done(); return; }
        exit.finished.then(done, done);
      },
      reset(d) { exit?.cancel(); exit = null; onReset?.(d); },
    };
  }

  /* ---------------- Search engine (shared by both options) ---------------- */
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/['’‘`]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
  const GROUP_OF = { Project: 'projects', Market: 'markets', Service: 'markets', News: 'news', Page: 'pages', Person: 'pages', Office: 'pages' };
  const engine = (() => {
    let data = {};
    try { data = JSON.parse($('#clayco-search-data')?.textContent || '{}'); } catch { data = {}; }
    const records = (data.records || []).filter(r => r && r.title && r.url).map((r, index) => ({
      ...r, index, group: GROUP_OF[r.type] || 'pages',
      haystack: norm([r.title, r.subtitle, r.keywords].join(' ')), titleKey: norm(r.title),
    }));
    function score(record, q, tokens) {
      let value = 0;
      if (record.titleKey === q) value += 100;
      else if (record.titleKey.startsWith(q)) value += 60;
      else if (record.titleKey.split(' ').some(word => word.startsWith(tokens[0]))) value += 30;
      else if (record.titleKey.includes(q)) value += 15;
      if (record.local) value += 2;
      return value;
    }
    function search(raw) {
      const q = norm(raw);
      if (q.length < 2) return null;
      const tokens = q.split(' ');
      const hits = records.filter(record => tokens.every(token => record.haystack.includes(token)))
        .map(record => ({ record, value: score(record, q, tokens) }))
        .sort((a, b) => b.value - a.value || a.record.index - b.record.index)
        .map(item => item.record);
      const groups = { projects: [], markets: [], news: [], pages: [] };
      hits.forEach(record => groups[record.group].push(record));
      return { query: String(raw).trim(), total: hits.length, groups };
    }
    return { search, suggested: data.suggested || [], markets: data.markets || [], norm };
  })();
  const GROUPS_A = [['projects', 'Projects'], ['markets', 'Markets & Services'], ['news', 'News'], ['pages', 'Pages & People']];
  const GROUPS_B = [['projects', 'Projects'], ['markets', 'Markets & services'], ['news', 'News'], ['pages', 'People & pages']];
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  function thumb(record) {
    const box = make('span', 'sr-thumb');
    const image = make('img');
    image.src = record.image; image.alt = ''; image.loading = 'lazy'; image.decoding = 'async'; image.referrerPolicy = 'no-referrer';
    box.append(image);
    return box;
  }
  function recordCopy(record) {
    const copy = make('span', 'sr-copy');
    copy.append(make('span', 'sr-type', record.local ? `${record.type} · LJC + Clayco page` : record.type), make('span', 'sr-title', record.title));
    if (record.subtitle && record.subtitle !== record.title) copy.append(make('span', 'sr-sub', record.subtitle));
    return copy;
  }
  function resultLink(record) {
    const anchor = make('a', 'sr-item');
    anchor.href = record.local || record.url;
    if (record.local) { anchor.dataset.projectStudy = ''; anchor.dataset.projectId = record.projectId; }
    else if ('cases' in record) { anchor.dataset.caseLibrary = ''; if (record.cases) anchor.dataset.caseId = record.cases; }
    else if (isExternal(record.url) && isWeb(record.url)) { anchor.target = '_blank'; anchor.rel = 'noopener'; }
    if (record.image) anchor.append(thumb(record)); else anchor.classList.add('sr-item--text');
    const arrow = make('span', 'sr-arrow', record.local ? '→' : '↗');
    arrow.setAttribute('aria-hidden', 'true');
    anchor.append(recordCopy(record), arrow);
    if (anchor.target === '_blank') anchor.append(make('span', 'sr-only', ' (opens in a new tab)'));
    return anchor;
  }
  function emptyState(term, onMarket) {
    const box = make('div', 'sr-empty');
    box.append(make('h3', '', `No results for “${term}”`), make('p', '', 'Try a market instead:'));
    const list = make('div', 'sr-empty-markets');
    engine.markets.forEach(name => {
      const button = make('button', 'chip');
      button.type = 'button';
      button.append(make('span', 'chip-face', name));
      button.addEventListener('click', () => onMarket(name));
      list.append(button);
    });
    box.append(list);
    return box;
  }
  /* Grouped, two-column results. limit=0 shows everything. */
  function renderGroups(container, result, { labels, limit = 0, filter = 'all', expanded = new Set(), onExpand = null }) {
    const wrap = make('div', 'sr-groups');
    labels.forEach(([key, label]) => {
      if (filter !== 'all' && filter !== key) return;
      const items = result.groups[key];
      if (!items.length) return;
      const section = make('section', 'sr-group');
      const headingId = `${container.id || 'sr'}-${key}`;
      section.setAttribute('aria-labelledby', headingId);
      const heading = make('h3', 'sr-group-head');
      heading.id = headingId;
      heading.append(make('span', '', label), make('span', 'sr-group-count', String(items.length)));
      const list = make('ul', 'plain');
      const max = limit && !expanded.has(key) ? limit : items.length;
      items.slice(0, max).forEach(record => { const li = make('li'); li.append(resultLink(record)); list.append(li); });
      section.append(heading, list);
      if (max < items.length && onExpand) {
        const more = make('button', 'sr-more', `Show all ${items.length} ${label.toLowerCase()}`);
        more.type = 'button';
        more.addEventListener('click', () => onExpand(key));
        section.append(more);
      }
      wrap.append(section);
    });
    container.replaceChildren(wrap);
  }

  /* ---------------- Option A: charcoal morph menu ---------------- */
  const api = {};
  function setupMenuA() {
    const dialog = $('#clayco-menu');
    const trigger = $('.js-menu-trigger');
    if (!dialog || !trigger) return;
    wireDialog(dialog);
    const inner = $('.ca-menu-inner', dialog);
    const bars = $$('.ca-morph span', dialog);
    const lines = $$('.menu-lines span', trigger);
    let motion = [];
    const stop = () => { motion.forEach(animation => animation.cancel()); motion = []; };
    const parts = () => [$('.ca-menu-head', dialog), ...$$('.ca-menu-list > li', dialog), $('.ca-menu-logos', dialog), $('.ca-menu-utility', dialog)].filter(Boolean);
    function hamburger() {
      const panel = dialog.getBoundingClientRect();
      const slice = panel.height / 3;
      return bars.map((bar, index) => {
        const line = lines[index]?.getBoundingClientRect() || { left: panel.left + 24, top: panel.top + 30 + index * 9, width: 34, height: 2 };
        const x = line.left - panel.left, y = line.top - panel.top - index * slice;
        return `translate(${x}px, ${y}px) scale(${Math.max(line.width / panel.width, .001)}, ${Math.max(line.height / slice, .001)})`;
      });
    }
    experiences.set(dialog, {
      open(d) {
        stop();
        inner.scrollTop = 0;
        if (reduced() || typeof d.animate !== 'function') { d.dataset.phase = 'open'; return; }
        body.classList.add('ca-morphing');
        requestAnimationFrame(() => { if (d.dataset.phase === 'pre') d.dataset.phase = 'opening'; });
        const from = hamburger();
        bars.forEach((bar, index) => motion.push(bar.animate([{ transform: from[index] }, { transform: 'none' }], { duration: 700, delay: index * 34, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'backwards' })));
        parts().forEach((part, index) => motion.push(part.animate([{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' }], { duration: 620, delay: 300 + index * 60, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' })));
        const batch = motion.slice();
        Promise.all(batch.map(animation => animation.finished)).then(() => {
          if (!d.open || !['opening', 'pre'].includes(d.dataset.phase)) return;
          d.dataset.phase = 'open';
          body.classList.remove('ca-morphing');
          motion = [];
        }, () => {});
      },
      close(d, done) {
        stop();
        inner.scrollTop = 0;
        d.dataset.phase = 'closing';
        body.classList.add('ca-morphing');
        const to = hamburger();
        parts().forEach(part => motion.push(part.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-10px)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' })));
        bars.forEach((bar, index) => motion.push(bar.animate([{ transform: 'none' }, { transform: to[index] }], { duration: 520, delay: 120 + (2 - index) * 30, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' })));
        Promise.all(motion.map(animation => animation.finished)).then(done, done);
      },
      reset() { stop(); body.classList.remove('ca-morphing'); },
    });
    // Items with sub-items are toggles; the live menu's direct links (a.ca-menu-direct) just navigate.
    $$('button.ca-menu-toggle', dialog).forEach(toggle => toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      const panel = doc.getElementById(toggle.getAttribute('aria-controls'));
      if (!panel) return;
      panel.hidden = !open;
      if (open) animate(panel, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }));
    // Arrow keys move between the primary items (toggles and direct links).
    dialog.addEventListener('keydown', event => {
      const toggle = event.target.closest?.('.ca-menu-toggle');
      if (!toggle || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const toggles = $$('.ca-menu-toggle', dialog);
      const index = toggles.indexOf(toggle);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? toggles.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + toggles.length) % toggles.length;
      event.preventDefault();
      toggles[next].focus();
    });
    trigger.addEventListener('click', () => openDialog(dialog, trigger));
    addEventListener('resize', () => { if (dialog.open && dialog.dataset.phase !== 'open') { stop(); dialog.dataset.phase = 'open'; body.classList.remove('ca-morphing'); } }, { passive: true });
    api.menu = () => openDialog(dialog, trigger);
  }

  /* ---------------- Option A: editorial search modal ---------------- */
  function setupSearchA() {
    const dialog = $('#clayco-search');
    const trigger = $('.js-search-trigger');
    if (!dialog || !trigger) return;
    wireDialog(dialog);
    const input = $('#ca-search-input', dialog);
    const count = $('.search-count', dialog);
    const results = $('.search-results', dialog);
    const start = $('.search-start', dialog);
    const reset = $('.search-reset', dialog);
    const expanded = new Set();
    let lastQuery = '';
    function render() {
      const raw = input.value;
      const q = engine.norm(raw);
      if (q !== lastQuery) { expanded.clear(); lastQuery = q; }
      reset.hidden = !raw;
      if (!q) { start.hidden = false; results.replaceChildren(); count.textContent = ''; return; }
      if (q.length < 2) { start.hidden = false; results.replaceChildren(); count.textContent = 'Type at least 2 characters to search.'; return; }
      start.hidden = true;
      const result = engine.search(raw);
      count.textContent = `${plural(result.total, 'result')} for “${result.query}”`;
      if (!result.total) {
        results.replaceChildren(emptyState(result.query, name => { input.value = name; render(); input.focus({ preventScroll: true }); }));
        return;
      }
      renderGroups(results, result, { labels: GROUPS_A, limit: 5, expanded, onExpand: key => {
        expanded.add(key); render();
        $(`#${results.id}-${key}`)?.closest('.sr-group')?.querySelectorAll('a')[5]?.focus({ preventScroll: false });
      } });
    }
    input.addEventListener('input', render);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); $('a', results)?.focus(); }
    });
    $$('.search-suggestion', dialog).forEach(button => button.addEventListener('click', () => {
      input.value = button.dataset.query; render(); input.focus({ preventScroll: true });
    }));
    reset.addEventListener('click', () => { input.value = ''; render(); input.focus({ preventScroll: true }); });
    experiences.set(dialog, fadeExperience(d => d, {
      inFrames: [{ opacity: 0, transform: 'translateY(-20px)' }, { opacity: 1, transform: 'none' }],
      outFrames: [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-12px)' }],
      inDuration: 420,
      onOpen() { render(); input.focus({ preventScroll: true }); },
    }));
    trigger.addEventListener('click', () => openDialog(dialog, trigger));
    api.search = () => openDialog(dialog, trigger);
    render();
  }

  /* ---------------- Option B: mega menu with hover intent ----------------
     From 1100 px the live menu is a rail of all nine items with the active
     item's sub-items beside it; below that it is an accordion that opens with
     every item collapsed. Header topics open the menu at their item. */
  function setupMega() {
    const dialog = $('#clayco-mega');
    if (!dialog) return;
    wireDialog(dialog);
    const topics = $$('[data-mega-open]');
    const barItems = $$('.cb-topics .cb-topic');
    const menuButton = $('.js-mega-trigger');
    const panel = $('.cb-mega-panel', dialog);
    const groups = $$('.cb-group', dialog);
    const isLink = group => group.classList.contains('cb-group--link');
    let openedBy = null, hoverTimer = 0, leaveTimer = 0, switchTimer = 0, railTimer = 0;
    const visible = element => element && element.getClientRects().length > 0;
    const firstPane = () => groups.find(group => !isLink(group))?.dataset.group || '';
    const typing = () => Boolean(doc.activeElement?.matches?.('input, textarea, select, [contenteditable="true"]'));
    const popupOpen = () => { const popup = $('.cb-popup'); return Boolean(popup && !popup.hidden); };
    function setActive(name) {
      dialog.dataset.active = name || '';
      groups.forEach(group => group.toggleAttribute('data-active', group.dataset.group === name));
      // Only the topic whose item shows reads as active and expanded.
      topics.forEach(topic => {
        const on = dialog.open && topic.dataset.megaOpen === name;
        topic.classList.toggle('is-active', on);
        if (dialog.open) topic.setAttribute('aria-expanded', String(on));
      });
      if (desktopMega.matches) groups.forEach(group => $('.cb-group-toggle', group)?.setAttribute('aria-expanded', String(group.dataset.group === name)));
    }
    function setExpanded(group, open) {
      const toggle = $('.cb-group-toggle', group);
      toggle?.setAttribute('aria-expanded', String(open));
      group.classList.toggle('is-expanded', open);
    }
    function focusGroup(name) {
      const group = (name && groups.find(g => g.dataset.group === name)) || groups[0];
      if (!group) return;
      const body = $('.cb-group-body', group);
      // A topic shortcut lands on its first sub-item; the generic Menu starts at the first live item.
      const target = (name && desktopMega.matches && body ? $$('a', body).find(visible) : null) || $$('a, .cb-group-toggle', group).find(visible);
      target?.focus({ preventScroll: true });
      // Bring the group's heading into view (an expanded group can be taller than the panel).
      if (!desktopMega.matches) ($('.cb-group-heading', group) || group).scrollIntoView({ block: 'nearest' });
    }
    function place() {
      const bar = $('[data-header]');
      const bottom = bar ? Math.max(0, Math.round(bar.getBoundingClientRect().bottom)) : 0;
      dialog.style.setProperty('--mega-top', `${bottom}px`);
    }
    function openMega(name = null, trigger = null, via = 'click') {
      clearTimeout(hoverTimer);
      const pane = name || (desktopMega.matches ? firstPane() : '');
      if (dialog.open) { setActive(pane); focusGroup(name); openedBy = via === 'hover' ? openedBy : 'click'; return; }
      openedBy = via;
      place();
      // Phones and tablets open with every item collapsed, so all nine show at once.
      groups.forEach(group => setExpanded(group, desktopMega.matches && group.dataset.group === name));
      const opener = trigger || (visible(menuButton) ? menuButton : topics.find(t => t.dataset.megaOpen === name)) || menuButton;
      if (!openDialog(dialog, opener)) return;
      setActive(pane);
      focusGroup(name);
    }
    const fade = fadeExperience(() => panel, {
      inFrames: [{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'none' }],
      outFrames: [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px)' }],
      inDuration: 340, outDuration: 180,
      onOpen() {
        groups.forEach((group, index) => animate(desktopMega.matches ? $('.cb-group-heading', group) : group, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 60 + index * 45, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }));
      },
      onReset() { clearTimeout(leaveTimer); leaveTimer = 0; clearTimeout(switchTimer); clearTimeout(railTimer); openedBy = null; setActive(''); },
    });
    experiences.set(dialog, {
      ...fade,
      closeOnSelf: true,
      backdropClick(event) {
        if (event.target !== dialog) return false;
        const { clientX: x, clientY: y } = event;
        if (inside(dialog.getBoundingClientRect(), x, y)) return false; // dim area below the panel: default close
        const topic = topics.find(t => visible(t) && inside(t.getBoundingClientRect(), x, y));
        if (topic) { openedBy = 'click'; setActive(topic.dataset.megaOpen); focusGroup(topic.dataset.megaOpen); return true; }
        // Task-first's search icon sits in the header above the open menu: one click switches to search.
        const searchIcon = $('.js-search-trigger');
        if (searchIcon && visible(searchIcon) && inside(searchIcon.getBoundingClientRect(), x, y)) { api.search?.(); return true; }
        const field = $('.cb-search-box');
        if (field && inside(field.getBoundingClientRect(), x, y)) {
          const state = dialogState.get(dialog);
          if (state) state.trigger = $('#cb-search-input');
        }
        closeDialog(dialog);
        return true;
      },
    });
    topics.forEach(topic => {
      topic.addEventListener('pointerenter', event => {
        // Never take focus from someone using the search field.
        if (event.pointerType !== 'mouse' || !finePointer.matches || dialog.open || typing() || popupOpen()) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => { if (!typing() && !popupOpen()) openMega(topic.dataset.megaOpen, topic, 'hover'); }, 500);
      });
      topic.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
      topic.addEventListener('click', () => openMega(topic.dataset.megaOpen, topic, 'click'));
      topic.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown') { event.preventDefault(); openMega(topic.dataset.megaOpen, topic, 'key'); }
      });
    });
    // Left and right move along the whole header bar (topics and direct links).
    barItems.forEach((item, index) => item.addEventListener('keydown', event => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      barItems[(index + (event.key === 'ArrowRight' ? 1 : -1) + barItems.length) % barItems.length].focus();
    }));
    menuButton?.addEventListener('click', () => openMega(null, menuButton, 'click'));
    // While the menu is open the header sits behind the modal, so read the pointer position.
    doc.addEventListener('pointermove', event => {
      if (!dialog.open || event.pointerType !== 'mouse' || !desktopMega.matches) return;
      const { clientX: x, clientY: y } = event;
      const topic = topics.find(t => inside(t.getBoundingClientRect(), x, y));
      clearTimeout(switchTimer);
      if (topic && dialog.dataset.active !== topic.dataset.megaOpen) switchTimer = setTimeout(() => setActive(topic.dataset.megaOpen), 140);
      if (openedBy !== 'hover') return;
      const bar = $('[data-header]');
      const within = inside(panel.getBoundingClientRect(), x, y) || (bar && inside(bar.getBoundingClientRect(), x, y));
      if (within) { clearTimeout(leaveTimer); leaveTimer = 0; }
      else if (!leaveTimer) leaveTimer = setTimeout(() => { leaveTimer = 0; if (openedBy === 'hover') closeDialog(dialog); }, 500);
    }, { passive: true });
    // A hover-opened menu also closes when the pointer leaves the window.
    doc.addEventListener('mouseout', event => { if (!event.relatedTarget && dialog.open && openedBy === 'hover') closeDialog(dialog); });
    panel.addEventListener('pointerdown', () => { openedBy = 'interaction'; });
    // Rail items switch the pane after the same hover intent; a click switches at once.
    groups.forEach(group => {
      if (isLink(group)) return;
      const heading = $('.cb-group-heading', group);
      heading?.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'mouse' || !desktopMega.matches) return;
        clearTimeout(railTimer);
        railTimer = setTimeout(() => setActive(group.dataset.group), 500);
      });
      heading?.addEventListener('pointerleave', () => clearTimeout(railTimer));
    });
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Escape') openedBy = 'interaction';
      const keys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      const current = event.target.closest?.('.cb-group a, .cb-group-toggle');
      if (!current) return;
      const group = current.closest('.cb-group');
      const focusables = scope => $$('a, .cb-group-toggle', scope).filter(visible);
      let next = null;
      if (!desktopMega.matches) {
        const all = focusables(panel).filter(el => el.closest('.cb-group'));
        const i = all.indexOf(current);
        if (event.key === 'ArrowDown') next = all[(i + 1) % all.length];
        if (event.key === 'ArrowUp') next = all[(i - 1 + all.length) % all.length];
        if (event.key === 'Home') next = all[0];
        if (event.key === 'End') next = all[all.length - 1];
      } else {
        const rail = groups.map(g => $('.cb-group-toggle', g) || $('.cb-group-link', g)).filter(Boolean);
        if (rail.includes(current)) {
          const i = rail.indexOf(current);
          if (event.key === 'ArrowDown') next = rail[(i + 1) % rail.length];
          if (event.key === 'ArrowUp') next = rail[(i - 1 + rail.length) % rail.length];
          if (event.key === 'Home') next = rail[0];
          if (event.key === 'End') next = rail[rail.length - 1];
          if (event.key === 'ArrowRight' && !isLink(group)) { setActive(group.dataset.group); next = $$('a', $('.cb-group-body', group)).find(visible); }
        } else {
          const own = $$('a', $('.cb-group-body', group) || group).filter(visible), i = own.indexOf(current);
          if (event.key === 'ArrowDown') next = own[(i + 1) % own.length];
          if (event.key === 'ArrowUp') next = own[(i - 1 + own.length) % own.length];
          if (event.key === 'Home') next = own[0];
          if (event.key === 'End') next = own[own.length - 1];
          if (event.key === 'ArrowLeft') next = $('.cb-group-toggle', group);
        }
      }
      if (next) { event.preventDefault(); next.focus(); }
    });
    dialog.addEventListener('focusin', event => {
      const group = event.target.closest?.('.cb-group');
      if (group && desktopMega.matches && !isLink(group)) setActive(group.dataset.group);
    });
    $$('.cb-group-toggle', dialog).forEach(toggle => toggle.addEventListener('click', () => {
      const group = toggle.closest('.cb-group');
      if (desktopMega.matches) { clearTimeout(railTimer); setActive(group.dataset.group); return; }
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      setExpanded(group, open);
      if (open) animate($('.cb-group-body', group), [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }));
    addEventListener('resize', () => { if (dialog.open) place(); }, { passive: true });
    api.menu = () => openMega(null, null, 'message');
  }

  /* ---------------- Option B: live dropdown + full results overlay ---------------- */
  function setupSearchB() {
    const box = $('[data-combobox]');
    if (!box) return;
    const input = $('#cb-search-input', box);
    const popup = $('.cb-popup', box);
    const listbox = $('[role="listbox"]', box);
    const status = $('.cb-popup-status', box);
    const chipButtons = $$('.cb-popup-chips .chip', box);
    const chipRow = $('.cb-popup-chips', box);
    const seeAll = $('.cb-see-all', box);
    const clear = $('.cb-search-clear', box);
    const overlay = $('#clayco-results');
    let type = 'all', options = [], active = -1, timer = 0, skipFocusOpen = false, optionSeq = 0;
    function openPopup() {
      if (!popup.hidden) return;
      popup.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      animate(popup, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
    function closePopup() {
      const wasOpen = !popup.hidden;
      popup.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      setActive(-1);
      // Tell the deck its Search view closed, unless the full results took over or
      // focus left for the deck's own controls (Full page keeps &panel=search).
      if (wasOpen) requestAnimationFrame(() => { if (doc.hasFocus() && popup.hidden && !panelShowing('search')) post({ type: 'ljc-panel-state', panel: 'search', open: false }); });
    }
    function setActive(index) {
      active = index;
      options.forEach((option, i) => option.setAttribute('aria-selected', String(i === index)));
      if (index >= 0 && options[index]) {
        input.setAttribute('aria-activedescendant', options[index].id);
        options[index].scrollIntoView({ block: 'nearest' });
      } else input.removeAttribute('aria-activedescendant');
    }
    function option(classes) {
      const node = make('div', `cb-opt ${classes || ''}`.trim());
      node.id = `cb-opt-${++optionSeq}`;
      node.setAttribute('role', 'option');
      node.setAttribute('aria-selected', 'false');
      options.push(node);
      return node;
    }
    function group(labelText, countText) {
      const wrap = make('div', 'cb-optgroup');
      wrap.setAttribute('role', 'group');
      const label = make('div', 'cb-group-label');
      label.id = `cb-grp-${++optionSeq}`;
      label.setAttribute('role', 'presentation');
      label.append(make('span', '', labelText));
      if (countText !== undefined) label.append(make('b', '', countText));
      wrap.setAttribute('aria-labelledby', label.id);
      wrap.append(label);
      listbox.append(wrap);
      return wrap;
    }
    function queryOption(text, parent) {
      const node = option('cb-opt--query');
      node.dataset.query = text;
      const arrow = make('span', 'sr-arrow', '→'); arrow.setAttribute('aria-hidden', 'true');
      node.append(make('span', 'sr-title', text), arrow);
      parent.append(node);
    }
    function recordOption(record, parent) {
      const node = option(record.image ? '' : 'cb-opt--text');
      node.dataset.href = record.local || record.url;
      if (record.local) node.dataset.projectId = record.projectId;
      if ('cases' in record) { node.dataset.caseLibrary = ''; if (record.cases) node.dataset.caseId = record.cases; }
      if (record.image) node.append(thumb(record));
      const arrow = make('span', 'sr-arrow', record.local ? '→' : '↗'); arrow.setAttribute('aria-hidden', 'true');
      node.append(recordCopy(record), arrow);
      parent.append(node);
    }
    function render() {
      const raw = input.value;
      const q = engine.norm(raw);
      listbox.replaceChildren(); options = []; active = -1;
      input.removeAttribute('aria-activedescendant');
      clear.hidden = !raw;
      if (!q) {
        chipRow.hidden = true; seeAll.hidden = true; status.textContent = '';
        const g = group('Suggested searches');
        engine.suggested.forEach(text => queryOption(text, g));
        return null;
      }
      if (q.length < 2) {
        chipRow.hidden = true; seeAll.hidden = true;
        status.textContent = 'Type at least 2 characters to search.';
        return null;
      }
      const result = engine.search(raw);
      chipRow.hidden = !result.total;
      chipButtons.forEach(chip => {
        const key = chip.dataset.type;
        const n = key === 'all' ? result.total : result.groups[key].length;
        chip.querySelector('.chip-count').textContent = String(n);
        chip.disabled = key !== 'all' && n === 0;
        chip.setAttribute('aria-pressed', String(key === type));
        chip.setAttribute('aria-label', `${chip.querySelector('.chip-face').firstChild.textContent.trim()}, ${plural(n, 'result')}`);
      });
      if (type !== 'all' && !result.groups[type].length) { type = 'all'; chipButtons.forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.type === 'all'))); }
      if (!result.total) {
        status.textContent = `No results for “${result.query}”. Try a market:`;
        seeAll.hidden = true;
        const g = group('Markets');
        engine.markets.forEach(name => queryOption(name, g));
        return result;
      }
      status.textContent = `${plural(result.total, 'result')} for “${result.query}”`;
      const limit = type === 'all' ? 3 : 8;
      GROUPS_B.forEach(([key, label]) => {
        if (type !== 'all' && key !== type) return;
        const items = result.groups[key];
        if (!items.length) return;
        const g = group(label, String(items.length));
        items.slice(0, limit).forEach(record => recordOption(record, g));
      });
      seeAll.hidden = false;
      seeAll.textContent = result.total === 1 ? 'See 1 result' : `See all ${result.total} results`;
      return result;
    }
    function activate(node) {
      if (!node) return;
      if (node.dataset.query) {
        input.value = node.dataset.query; type = 'all';
        render(); openPopup(); input.focus({ preventScroll: true });
        return;
      }
      const href = node.dataset.href;
      closePopup();
      if (node.dataset.caseLibrary !== undefined && followCaseLink(node.dataset.caseId || '', href)) return;
      if (node.dataset.projectId && embedded) { post({ type: 'ljc-project', theme, project: node.dataset.projectId }); return; }
      if (isWeb(href) && isExternal(href)) { window.open(href, '_blank', 'noopener'); return; }
      location.href = href;
    }
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { render(); openPopup(); }, 150);
    });
    input.addEventListener('focus', () => {
      if (skipFocusOpen) { skipFocusOpen = false; return; }
      render(); openPopup();
    });
    input.addEventListener('click', () => { if (popup.hidden) { render(); openPopup(); } });
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (popup.hidden) { render(); openPopup(); }
        if (!options.length) return;
        if (event.key === 'ArrowDown') setActive(active + 1 >= options.length ? 0 : active + 1);
        else setActive(active <= 0 ? options.length - 1 : active - 1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        clearTimeout(timer);
        if (active >= 0 && !popup.hidden) { activate(options[active]); return; }
        render();
        if (engine.norm(input.value).length >= 2) openOverlay(); else openPopup();
      } else if (event.key === 'Escape') {
        if (!popup.hidden) { event.preventDefault(); closePopup(); }
        else if (input.value) { event.preventDefault(); input.value = ''; render(); }
      } else if (event.key === 'Tab') {
        setActive(-1);
      }
    });
    box.addEventListener('focusout', event => { if (!box.contains(event.relatedTarget)) closePopup(); });
    popup.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); closePopup(); input.focus({ preventScroll: true }); } });
    listbox.addEventListener('pointerdown', event => { if (event.target.closest('[role="option"]')) event.preventDefault(); });
    listbox.addEventListener('click', event => activate(event.target.closest('[role="option"]')));
    listbox.addEventListener('mousemove', event => {
      const node = event.target.closest('[role="option"]');
      const index = options.indexOf(node);
      if (index >= 0 && index !== active) setActive(index);
    });
    chipButtons.forEach(chip => chip.addEventListener('click', () => { type = chip.dataset.type; render(); }));
    seeAll.addEventListener('click', () => openOverlay());
    clear.addEventListener('click', () => { input.value = ''; type = 'all'; render(); openPopup(); input.focus({ preventScroll: true }); });
    doc.addEventListener('pointerdown', event => { if (!popup.hidden && !box.contains(event.target)) closePopup(); });

    // Full results overlay
    let overlayType = 'all';
    const overlayInput = overlay && $('#cb-results-input', overlay);
    const overlayBody = overlay && $('.cb-results-body', overlay);
    const overlayCount = overlay && $('.search-count', overlay);
    const overlayChips = overlay ? $$('.cb-results-chips .chip', overlay) : [];
    function renderOverlay() {
      const raw = overlayInput.value;
      const q = engine.norm(raw);
      if (q.length < 2) {
        overlayBody.replaceChildren();
        overlayCount.textContent = q ? 'Type at least 2 characters to search.' : '';
        overlayChips.forEach(chip => { chip.querySelector('.chip-count').textContent = ''; chip.disabled = chip.dataset.type !== 'all'; });
        return;
      }
      const result = engine.search(raw);
      if (overlayType !== 'all' && !result.groups[overlayType].length) overlayType = 'all';
      overlayChips.forEach(chip => {
        const key = chip.dataset.type;
        const n = key === 'all' ? result.total : result.groups[key].length;
        chip.querySelector('.chip-count').textContent = String(n);
        chip.disabled = key !== 'all' && n === 0;
        chip.setAttribute('aria-pressed', String(key === overlayType));
      });
      overlayCount.textContent = `${plural(result.total, 'result')} for “${result.query}”`;
      if (!result.total) {
        overlayBody.replaceChildren(emptyState(result.query, name => { overlayInput.value = name; renderOverlay(); overlayInput.focus({ preventScroll: true }); }));
        return;
      }
      renderGroups(overlayBody, result, { labels: GROUPS_B, filter: overlayType });
    }
    let overlayTimer = 0;
    function openOverlay() {
      if (!overlay) return;
      closePopup();
      overlayInput.value = input.value;
      overlayType = type;
      renderOverlay();
      skipFocusOpen = true;
      openDialog(overlay, input);
      overlayInput.focus({ preventScroll: true });
    }
    if (overlay) {
      wireDialog(overlay);
      overlayInput.addEventListener('input', () => { clearTimeout(overlayTimer); overlayTimer = setTimeout(renderOverlay, 150); });
      overlayInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); clearTimeout(overlayTimer); renderOverlay(); $('a', overlayBody)?.focus(); } });
      overlayChips.forEach(chip => chip.addEventListener('click', () => { overlayType = chip.dataset.type; renderOverlay(); }));
      experiences.set(overlay, fadeExperience(d => d, {
        inFrames: [{ opacity: 0, transform: 'translateY(-18px)' }, { opacity: 1, transform: 'none' }],
        outFrames: [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-10px)' }],
        outDuration: 180,
        onReset() {
          input.value = overlayInput.value;
          type = overlayType;
          clear.hidden = !input.value;
          skipFocusOpen = true;
        },
      }));
    }
    api.search = () => {
      $$('dialog[data-clayco-dialog][open]').forEach(d => {
        const state = dialogState.get(d);
        if (state) { state.trigger = input; state.destination = null; }
        d.close();
      });
      skipFocusOpen = false;
      input.focus({ preventScroll: true });
      render(); openPopup();
    };
    render();
  }

  /* ---------------- Option B: family-of-companies switcher ---------------- */
  $$('[data-family]').forEach(wrap => {
    const button = $('button', wrap), list = $('ul', wrap);
    const set = open => { button.setAttribute('aria-expanded', String(open)); list.hidden = !open; };
    button.addEventListener('click', () => set(list.hidden));
    wrap.addEventListener('keydown', event => { if (event.key === 'Escape' && !list.hidden) { event.preventDefault(); set(false); button.focus(); } });
    wrap.addEventListener('focusout', event => { if (!wrap.contains(event.relatedTarget)) set(false); });
    doc.addEventListener('pointerdown', event => { if (!list.hidden && !wrap.contains(event.target)) set(false); });
  });

  /* ---------------- Option A: Featured / Current tabs ---------------- */
  $$('[data-tabs]').forEach(scope => {
    const tabs = $$('[role="tab"]', scope);
    function select(tab, focus) {
      tabs.forEach(item => {
        const on = item === tab;
        item.setAttribute('aria-selected', String(on));
        item.tabIndex = on ? 0 : -1;
        const panel = doc.getElementById(item.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      const panel = doc.getElementById(tab.getAttribute('aria-controls'));
      $$('.ca-card', panel).forEach((card, index) => animate(card, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 560, delay: index * 60, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }));
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => { if (tab.getAttribute('aria-selected') !== 'true') select(tab, false); });
      tab.addEventListener('keydown', event => {
        let next = null;
        if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
        if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
        if (event.key === 'Home') next = tabs[0];
        if (event.key === 'End') next = tabs[tabs.length - 1];
        if (next) { event.preventDefault(); select(next, true); }
      });
    });
  });

  /* ---------------- Option B: project finder ---------------- */
  $$('[data-finder]').forEach(finder => {
    const cards = $$('[data-finder-card]', finder);
    const count = $('.cb-finder-count', finder);
    const more = $('.cb-finder-more', finder);
    const empty = $('.cb-finder-empty', finder);
    const resetButton = $('.cb-finder-reset', finder);
    const chips = $$('[data-filter]', finder);
    // The page sets its own page size (Task-first's denser grid shows 15); 8 / 6 otherwise.
    const phone = matchMedia('(max-width: 767px)').matches;
    const step = Number(phone ? finder.dataset.finderStepMobile : finder.dataset.finderStep) || (phone ? 6 : 8);
    let market = 'all', status = 'all', limit = step;
    function matches() {
      return cards.filter(card => (market === 'all' || card.dataset.markets.split(' ').includes(market))
        && (status === 'all' || card.dataset[status] === 'true'));
    }
    function apply() {
      const list = matches();
      cards.forEach(card => { card.hidden = true; });
      list.forEach((card, index) => { card.hidden = index >= limit; });
      const shown = Math.min(limit, list.length);
      count.textContent = list.length ? `Showing ${shown} of ${plural(list.length, 'project')}` : 'No matching projects';
      empty.hidden = list.length > 0;
      more.hidden = shown >= list.length;
      more.textContent = `Show more projects (${list.length - shown})`;
      resetButton.hidden = market === 'all' && status === 'all';
      return list;
    }
    function choose(groupName, value) {
      if (groupName === 'market') market = value; else status = value;
      chips.filter(chip => chip.dataset.filter === groupName).forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.value === value)));
      limit = step;
      apply().slice(0, limit).forEach((card, index) => animate(card, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: index * 30, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }));
    }
    chips.forEach(chip => chip.addEventListener('click', () => choose(chip.dataset.filter, chip.dataset.value)));
    resetButton.addEventListener('click', () => { choose('market', 'all'); choose('status', 'all'); chips.find(chip => chip.dataset.value === 'all')?.focus(); });
    more.addEventListener('click', () => {
      const before = limit;
      limit += step;
      const list = apply();
      $('a', list[before] || list[list.length - 1])?.focus();
    });
    apply();
  });

  /* ---------------- Footer office gallery ----------------
     Server markup lists every office as a card (photo, address, phone). Here the
     city buttons become tabs: one office shows at a time, arrow keys move between
     cities (selection follows focus), and a polite live region reads the address.
     Phones show the cities as a scrolling row of chips above the photo. */
  $$('[data-office-gallery]').forEach(gallery => {
    const list = $('.cf-og-tabs', gallery);
    const tabs = $$('[data-office-tab]', gallery);
    const panels = tabs.map(tab => doc.getElementById(tab.getAttribute('aria-controls')));
    const live = $('[data-office-live]', gallery);
    if (!list || !tabs.length || panels.some(panel => !panel)) return;
    const narrow = matchMedia('(max-width: 767px)');
    const orient = () => list.setAttribute('aria-orientation', narrow.matches ? 'horizontal' : 'vertical');
    list.setAttribute('role', 'tablist');
    orient();
    narrow.addEventListener?.('change', orient);
    tabs.forEach((tab, index) => {
      const panel = panels[index];
      tab.setAttribute('role', 'tab');
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.tabIndex = 0;
      // Start the photo download as soon as a city is pointed at or focused.
      const warm = () => { const image = $('img', panel); if (image && image.loading === 'lazy') image.loading = 'eager'; };
      tab.addEventListener('pointerenter', warm);
      tab.addEventListener('focus', warm);
    });
    list.hidden = false;
    gallery.classList.add('is-enhanced');
    let current = -1;
    // Keep the chosen chip inside the scrolling row without moving the page.
    function reveal(tab) {
      if (list.scrollWidth <= list.clientWidth + 1) return;
      const box = list.getBoundingClientRect(), item = tab.getBoundingClientRect();
      let delta = 0;
      if (item.left < box.left + 8) delta = item.left - box.left - 24;
      else if (item.right > box.right - 8) delta = item.right - box.right + 24;
      if (delta) list.scrollBy({ left: delta, behavior: reduced() ? 'instant' : 'smooth' });
    }
    function select(index, { focus = false, announce = false } = {}) {
      if (index === current) { if (focus) tabs[index].focus({ preventScroll: true }); return; }
      current = index;
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
      });
      const panel = panels[index];
      gallery.dataset.office = tabs[index].id.replace(/^cf-og-tab-/, '');
      if (focus) tabs[index].focus({ preventScroll: true });
      reveal(tabs[index]);
      if (!announce) return;
      if (live) live.textContent = panel.dataset.summary || '';
      const image = $('img', panel);
      const fade = () => animate(image, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
      if (image) { if (image.complete) fade(); else image.addEventListener('load', fade, { once: true }); }
      animate($('.cf-og-details', panel), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(index, { announce: true }));
      tab.addEventListener('keydown', event => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
        const next = step ? (index + step + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
        if (next === null) return;
        event.preventDefault();
        select(next, { focus: true, announce: true });
      });
    });
    select(0);
  });

  /* ---------------- Case studies: LJC's spreads in the shared reader ----------------
     #clayco-case-data holds every joint case study (held spreads already left out by
     the generator). Project pages show a strip; the index page opens a cover. */
  const caseContent = new Map((() => {
    try {
      const data = JSON.parse($('#clayco-case-data')?.textContent || '{}');
      return (Array.isArray(data.cases) ? data.cases : []).filter(item => item && item.id && Array.isArray(item.pages) && item.pages.length);
    } catch { return []; }
  })().map(item => [item.id, { id: `clayco-case-${item.id}`, title: item.title, pages: item.pages }]));
  const strips = new Map();
  let readingCase = '';
  function syncCaseSelection(id) {
    if (!isCases) return;
    const params = new URLSearchParams(location.search);
    if (id) params.set('case', id); else params.delete('case');
    const search = params.toString();
    history.replaceState(history.state, '', `${location.pathname}${search ? `?${search}` : ''}${location.hash}`);
    post({ type: 'ljc-case-selection', project: id || null });
  }
  function openCase(id, index = 0, trigger = null) {
    const content = caseContent.get(id);
    if (!content) return false;
    const at = Math.max(0, Math.min(content.pages.length - 1, Number(index) || 0));
    if (!window.LJCCaseReader?.open(content, at, trigger)) {
      window.open(content.pages[at].src, '_blank', 'noopener');
      return false;
    }
    readingCase = id;
    syncCaseSelection(id);
    return true;
  }
  doc.addEventListener('ljc-case-reader-close', event => {
    if (!readingCase) return;
    const id = readingCase;
    readingCase = '';
    syncCaseSelection('');
    // The strip follows the spread the reader closed on.
    strips.get(id)?.show(Number(event.detail?.index) || 0, false);
  });
  // A case-study link: on the index it opens the reader in place; in the deck it
  // asks for the Case studies view; standalone it is an ordinary link.
  function followCaseLink(id, href) {
    if (isCases) {
      $$('dialog[data-clayco-dialog][open]').forEach(dialog => {
        const state = dialogState.get(dialog);
        if (state) { state.trigger = null; state.destination = null; }
        dialog.close();
      });
      const card = id && $(`[data-case-open="${CSS.escape(id)}"]`);
      if (card) { card.scrollIntoView({ block: 'center', behavior: 'instant' }); openCase(id, 0, card); }
      else scrollToTarget($('#main'), true);
      return true;
    }
    if (embedded) { post({ type: 'ljc-cases', ...(id ? { case: id } : {}) }); return true; }
    if (href) { location.href = href; return true; }
    return false;
  }
  $$('[data-case-open]').forEach(button => button.addEventListener('click', () => openCase(button.dataset.caseOpen, 0, button)));
  $$('[data-case-strip]').forEach(strip => {
    const id = strip.dataset.caseStrip;
    const track = $('.cp-case-track', strip);
    const cards = $$('.cp-case-page', strip);
    const count = $('.cp-case-count', strip);
    const previous = $('[data-case-step="-1"]', strip), next = $('[data-case-step="1"]', strip);
    if (!caseContent.has(id) || !track || !cards.length) return;
    const total = cards.length;
    let frame = 0;
    const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const nearest = () => cards.reduce((best, card, i) => Math.abs(card.offsetLeft - track.scrollLeft) < Math.abs(cards[best].offsetLeft - track.scrollLeft) ? i : best, 0);
    // Spreads wholly in view, so the count reads "1–3 of 13" on wide screens and "5 of 13" on phones.
    // It counts positions; the cards keep the book's own spread labels (Spread 02, 03 …), which
    // skip any held spread, so the spoken count names both.
    function inView() {
      const left = track.scrollLeft - 2, right = track.scrollLeft + track.clientWidth + 2;
      const shown = cards.map((card, i) => [card, i]).filter(([card]) => card.offsetLeft >= left && card.offsetLeft + card.offsetWidth <= right).map(([, i]) => i);
      return shown.length ? [shown[0], shown[shown.length - 1]] : [nearest(), nearest()];
    }
    function sync() {
      const [first, last] = inView();
      const visible = first === last ? `${first + 1}` : `${first + 1}–${last + 1}`;
      const name = i => $('.cp-case-label', cards[i])?.textContent.trim() || `Spread ${i + 1}`;
      const spoken = first === last ? `${name(first)}, ${first + 1} of ${total}` : `${name(first)} to ${name(last)}, ${first + 1} to ${last + 1} of ${total}`;
      const shown = make('span', '', `${visible} of ${total}`);
      shown.setAttribute('aria-hidden', 'true');
      if (count.textContent !== `${shown.textContent}${spoken}`) count.replaceChildren(shown, make('span', 'sr-only', spoken));
      if (previous) previous.disabled = track.scrollLeft <= 1;
      if (next) next.disabled = track.scrollLeft >= maxScroll() - 1;
    }
    function show(index, smooth = true) {
      const target = cards[Math.max(0, Math.min(total - 1, index))];
      track.scrollTo({ left: Math.min(maxScroll(), target.offsetLeft), behavior: smooth && !reduced() ? 'smooth' : 'instant' });
      requestAnimationFrame(sync);
    }
    strips.set(id, { show });
    previous?.addEventListener('click', () => show(inView()[0] - 1));
    next?.addEventListener('click', () => show(inView()[0] + 1));
    track.addEventListener('scroll', () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(sync); }, { passive: true });
    track.addEventListener('keydown', event => {
      if (event.target !== track) return;
      const to = { ArrowRight: inView()[0] + 1, ArrowLeft: inView()[0] - 1, Home: 0, End: total - 1 }[event.key];
      if (to === undefined) return;
      event.preventDefault();
      show(to);
    });
    $$('[data-case-page]', strip).forEach(button => button.addEventListener('click', () => openCase(id, button.dataset.casePage, button)));
    $('[data-case-read]', strip)?.addEventListener('click', event => openCase(id, inView()[0], event.currentTarget));
    addEventListener('resize', () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(sync); }, { passive: true });
    sync();
  });
  // Case-study links (search results, the homepage row, project-page shortcuts) and
  // LJC's Reverberation story link, which belongs to the LJC edition of the deck.
  doc.addEventListener('click', event => {
    if (!plainClick(event) || event.defaultPrevented) return;
    const caseLink = event.target.closest('a[data-case-library]');
    if (caseLink) {
      if (followCaseLink(caseLink.dataset.caseId || '', '')) event.preventDefault();
      return;
    }
    const story = event.target.closest('a[data-reverberation]');
    if (story && embedded) {
      event.preventDefault();
      post({ type: 'ljc-reverberation', mode: 'digital', ...(story.dataset.story ? { story: story.dataset.story } : {}) });
    }
  });

  /* ---------------- Deck messages and embedded navigation ---------------- */
  doc.addEventListener('click', event => {
    if (!embedded || !plainClick(event) || event.defaultPrevented) return;
    const brand = event.target.closest('a[data-brand-project]');
    if (brand) { event.preventDefault(); post({ type: 'ljc-brand-project', theme: brand.dataset.targetTheme, project: brand.dataset.projectId }); return; }
    const study = event.target.closest('a[data-project-study]');
    if (study) { event.preventDefault(); post({ type: 'ljc-project', theme, project: study.dataset.projectId }); return; }
    const home = event.target.closest('a[data-home-section]');
    if (home) { event.preventDefault(); post({ type: 'ljc-home', section: home.dataset.homeSection }); return; }
    // In-page links scroll without adding a history entry: the review deck owns history.
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor || anchor.closest('dialog')) return;
    const target = doc.getElementById(anchor.getAttribute('href').slice(1));
    if (!target) return;
    event.preventDefault();
    scrollToTarget(target, true);
    history.replaceState(history.state, '', anchor.getAttribute('href'));
  });
  // Standalone pages: same-site links carry a paused-motion choice to the next page.
  if (!embedded) doc.addEventListener('click', event => {
    if (!plainClick(event) || !paused) return;
    const anchor = event.target.closest('a[href]');
    if (!anchor || anchor.getAttribute('href').startsWith('#')) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin) return;
    url.searchParams.set('motion', 'off');
    anchor.href = url.href;
  }, true);

  const SECTIONS = {
    'clayco-gallery': ['home', 'intro', 'work', 'integrated', 'insights', 'contact'],
    'clayco-a': ['home', 'intro', 'paths', 'work', 'news', 'integrated', 'partners', 'contact'],
    'clayco-b': ['home', 'doors', 'markets', 'integrated', 'finder', 'insights', 'contact'],
  };
  const ALIASES = {
    'clayco-a': { doors: 'paths', markets: 'paths', careers: 'paths', finder: 'work', insights: 'news', reverberation: 'integrated', 'case-studies': 'work', about: 'intro', atlas: 'contact' },
    'clayco-b': { intro: 'home', paths: 'doors', work: 'finder', news: 'insights', reverberation: 'integrated', 'case-studies': 'finder', about: 'home', atlas: 'contact', careers: 'doors', partners: 'doors' },
  };
  const PROJECT_ALIASES = { work: 'gallery', paths: 'story', intro: 'story', news: 'facts', integrated: 'facts', partners: 'contact', insights: 'contact', finder: 'gallery', markets: 'facts', careers: 'contact', doors: 'story', case: 'case-study', 'case-studies': 'case-study' };
  function goToSection(id) {
    if (!id) return;
    if (isProject || isCases) {
      if (id === 'home' || id === 'top') { window.scrollTo({ top: 0, behavior: 'instant' }); return; }
      // Kali Hotel has no case-study strip: its section requests land on the gallery.
      const target = doc.getElementById(PROJECT_ALIASES[id] || id) || (PROJECT_ALIASES[id] === 'case-study' ? doc.getElementById('gallery') : null);
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
      return;
    }
    const key = (SECTIONS[theme] || []).includes(id) ? id : ALIASES[theme]?.[id];
    const target = key && doc.getElementById(key);
    if (!target) return;
    if (key === 'home') window.scrollTo({ top: 0, behavior: 'instant' });
    else target.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  function openPanel(panel) {
    if (panel === 'menu' && theme === 'clayco-gallery') doc.dispatchEvent(new CustomEvent('clayco-gallery-panel', { detail: { panel } }));
    else if (panel === 'menu') api.menu?.();
    else if (panel === 'search') api.search?.();
  }
  addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.parent) return;
    const data = event.data || {};
    if (data.type === 'ljc-section') goToSection(String(data.id || ''));
    else if (data.type === 'ljc-motion') setMotion(Boolean(data.paused));
    else if (data.type === 'ljc-open-panel') openPanel(data.panel);
  });

  setupMenuA();
  setupSearchA();
  setupMega();
  setupSearchB();
  setMotion(paused, false);

  let announced = false;
  function ready() {
    if (announced) return;
    announced = true;
    syncHeader(); updateHeader();
    const section = query.get('section');
    if (section) goToSection(section);
    const panel = query.get('panel');
    if (panel === 'menu' || panel === 'search') openPanel(panel);
    post({ type: 'ljc-ready', theme, ...(isProject ? { view: 'project', project: body.dataset.projectId } : isCases ? { view: 'cases' } : {}) });
    // The index opens a case study named in ?case= (deep links and the deck's Back).
    const requested = isCases ? query.get('case') : '';
    if (requested && caseContent.has(requested) && !readingCase) openCase(requested, 0, $(`[data-case-open="${CSS.escape(requested)}"]`));
  }
  (doc.fonts?.ready || Promise.resolve()).then(() => requestAnimationFrame(ready), () => requestAnimationFrame(ready));
  setTimeout(ready, 2500);
  addEventListener('pageshow', event => { if (event.persisted) setMotion(paused, false); });
})();
