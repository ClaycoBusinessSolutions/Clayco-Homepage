/* Task-first motion, Nordic v2 — "set out, then build" (28 Oct 2026). Loaded after clayco.js on
   Task-first pages; states live in clayco-b-nordic-v2.css. After the queued reveals, footer lift
   and masked headings in Kim's RBB Gallery and PATH presentations: rules draw first, like a chalk
   line on site; then content lands on them; photographs rise from the ground line; then everything
   rests. Plain WAAPI + IntersectionObserver, no library. The menu sheet lives in clayco.js.
   Nothing is hidden unless this script is running (html.cbm). Reduced motion, ?motion=off,
   the footer Pause motion button and the review deck (html.motion-off) settle everything. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const off = () => reduce.matches || root.classList.contains('motion-off');
  // Phone finder tabs scroll sideways under a fade: keep the focused or chosen tab fully in view
  // (also when a market tile picks it). Runs with motion off too; only the scroll's easing differs.
  document.querySelectorAll('.cb-filter-chips').forEach(row => row.addEventListener('focusin', event => {
    const chip = event.target.closest('.chip');
    if (!chip || row.scrollWidth <= row.clientWidth) return;
    const box = row.getBoundingClientRect(), face = chip.getBoundingClientRect(), fade = 56, pad = parseFloat(getComputedStyle(row).paddingLeft);
    const dx = face.right > box.right - fade ? face.right - (box.right - fade) : face.left < box.left + pad ? face.left - (box.left + pad) : 0;
    if (dx) row.scrollBy({ left: dx, behavior: off() ? 'auto' : 'smooth' });
  }));
  const release = () => root.classList.remove('cbm-pending');
  if (off() || !('IntersectionObserver' in window) || typeof Element.prototype.animate !== 'function') { release(); return; }
  root.classList.add('cbm');
  // Lines are measured and masked once the display face is in, so the rise never swaps fonts mid-motion
  // (cold cache on the public link). The head's cbm-pending hold covers the wait; 700 ms at most.
  const fontReady = document.fonts?.load ? Promise.race([document.fonts.load('400 1em "Clayco Haas"'), new Promise(done => setTimeout(done, 700))]) : Promise.resolve();
  fontReady.then(start, start);
  function start() {

    const OUT = 'cubic-bezier(.16,1,.3,1)';    // arrivals (expo-out family)
    const FADE = 'cubic-bezier(.33,1,.68,1)';  // opacity (cubic-out)
    const SET = 'cubic-bezier(.65,0,.35,1)';   // rules and sheets (in-out)
    const RISE = 'cubic-bezier(.77,0,.18,1)';  // photo clip (quart in-out)
    const running = new Set();
    const play = (el, frames, o) => {
      if (!el) return null;
      const a = el.animate(frames, { fill: 'backwards', ...o });
      running.add(a); const done = () => running.delete(a); a.finished.then(done, done);
      return a;
    };
    const arrive = (el, delay, travel = 14) => {
      play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay, easing: FADE });
      play(el, [{ transform: `translateY(${travel}px)` }, { transform: 'none' }], { duration: 900, delay, easing: OUT });
    };
    // One queue for the whole page (after RBB's queued reveal): items that arrive together leave
    // 75 ms apart, so a fast scroll gives a steady stream instead of a burst.
    let nextAt = 0;
    const slot = () => { const now = performance.now(); const t = Math.max(now, nextAt); nextAt = t + 75; return Math.min(t - now, 450); };

    /* M1 / M2: split a heading into word masks; words on the same visual line share one delay. */
    function riseLines(el, start, step = 90) {
      const html = el.innerHTML, label = el.textContent.replace(/\s+/g, ' ').trim();
      const words = [], texts = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) texts.push(walker.currentNode);
      for (const node of texts) {
        const frag = document.createDocumentFragment();
        for (const part of node.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (!part.trim()) { frag.append(part); continue; }
          const mask = document.createElement('span'); mask.className = 'n-mask';
          const word = document.createElement('span'); word.textContent = part;
          mask.append(word); frag.append(mask); words.push(word);
        }
        node.replaceWith(frag);
      }
      el.setAttribute('aria-label', label);
      let line = -1, top = null;
      const anims = words.map(word => {
        word.setAttribute('aria-hidden', 'true');
        const t = Math.round(word.parentNode.getBoundingClientRect().top);
        if (top === null || Math.abs(t - top) > 4) { line++; top = t; }
        return play(word, [{ transform: 'translateY(118%)' }, { transform: 'none' }], { duration: 1000, delay: start + line * step, easing: OUT });
      });
      // Restore the original markup once settled, so resizing re-wraps normally.
      Promise.allSettled(anims.map(a => a && a.finished)).then(() => { el.innerHTML = html; el.removeAttribute('aria-label'); });
      return start + line * step + 1000;
    }

    /* Rules: [data-n-rule] gets a drawn ::before (CSS). Adding .is-set draws it. */
    const RULES = [
      '.cb-door-list', '.cb-door-list > li', '.section-head', '.cb-flow-step', '.cb-ddb',
      '.cb-ddb-item', '.news-card--story', '.cb-filters', '.cf-office',
    ].join(',');
    document.querySelectorAll(RULES).forEach(el => el.setAttribute('data-n-rule', ''));
    const setRule = (el, delay) => { el.style.setProperty('--n-d', `${delay}ms`); el.classList.add('is-set'); };

    /* M1. Opening: kicker, headline by line, links; Start here rules draw, then rows land. */
    const statement = document.querySelector('.cb-statement');
    if (statement) {
      const end = riseLines(statement, 120);
      document.querySelectorAll('.cb-hero .kicker').forEach(el => play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: FADE }));
      document.querySelectorAll('.cb-hero-links').forEach(el => arrive(el, end - 360, 10));
      const list = document.querySelector('.cb-door-list');
      if (list) setRule(list, 200);
      arrive(document.querySelector('.cb-doors-title'), 160, 8);
      document.querySelectorAll('.cb-door-list > li').forEach((li, i) => {
        setRule(li, 320 + i * 90); // each row's top rule
        arrive(li.firstElementChild, 480 + i * 90, 12);
      });
    }
    release();

    /* M3. Photographs rise from the ground line, queued; captions follow. */
    const PHOTOS = 'main :is(.cb-photo .media, .cb-market .media, .cb-proj .media, .news-card .media, .cp-photo--lead, .cp-related-card .media, .cc-cover)';
    // Captions are the photograph's siblings inside its card or figure; a project-page photo rises alone.
    const captionOf = media => media.parentElement.matches('a, figure') ? [...media.parentElement.children].filter(c => c !== media && !c.matches('.arrow, .sr-only')) : [];
    const risePhoto = (media, delay) => {
      media.classList.remove('n-wait');
      play(media, [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 1000, delay, easing: RISE });
      play(media.querySelector('img'), [{ transform: 'translateY(4%) scale(1.06)' }, { transform: 'none' }], { duration: 1400, delay, easing: OUT });
      captionOf(media).forEach((cap, i) => { cap.classList.remove('n-wait'); arrive(cap, delay + 220 + i * 50, 10); });
    };

    /* M2 + M4. Section heads and ruled rows: rule draws, then label/title/content arrive. */
    const setOut = (el, delay) => {
      el.classList.remove('n-wait');
      setRule(el, delay);
      const title = el.querySelector('.section-title');
      if (title) riseLines(title, delay + 260, 70);
      const parts = [];
      [...el.children].forEach(c => {
        if (c === title || c.matches('.cb-ddb-list, .n-indicator')) return;
        if (title && c.contains(title)) parts.push(...[...c.children].filter(x => x !== title)); else parts.push(c);
      });
      parts.forEach((part, i) => arrive(part, delay + 180 + i * 40, 10));
    };

    const targets = new Map(); // observed element -> reveal function
    const watcher = new IntersectionObserver(entries => {
      entries.filter(e => e.isIntersecting)
        .map(e => e.target)
        .sort((a, b) => { const p = a.getBoundingClientRect(), q = b.getBoundingClientRect(); return (p.top - q.top) || (p.left - q.left); })
        .forEach(t => { watcher.unobserve(t); const run = targets.get(t); targets.delete(t); run?.(slot()); });
    }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
    // Keyboard focus never waits for a reveal: whatever holds the focused element lands at once.
    addEventListener('focusin', event => {
      const el = event.target;
      if (!el.matches?.(':focus-visible')) return;
      const host = [...targets.keys()].find(t => t.contains(el));
      if (host) { watcher.unobserve(host); const run = targets.get(host); targets.delete(host); run(0); }
      running.forEach(a => { const n = a.effect?.target; if (n && (n.contains(el) || el.contains(n))) a.finish(); });
    });
    const below = el => el.getBoundingClientRect().top > innerHeight * .94;
    const queue = (el, run, watch = el) => {
      if (!below(el)) { run(el.closest('.cb-top') ? 400 : 160); return; } // on screen at load: join the opening
      el.classList.add('n-wait');
      targets.set(watch, run.bind(null)); watcher.observe(watch);
    };

    document.querySelectorAll(PHOTOS).forEach(media => {
      if (below(media)) captionOf(media).forEach(cap => cap.classList.add('n-wait'));
      // A clipped element has no visible area for the observer: watch its unclipped parent.
      queue(media, d => risePhoto(media, d), media.parentElement);
    });
    document.querySelectorAll('main .section-head, main .cb-ddb, main .cb-flow-step, main .cb-ddb-item, main .news-card--story, main .cb-filters, .cf-office')
      .forEach(el => queue(el, d => setOut(el, d)));

    /* Full-width photograph drifts 3% against the scroll (transform only, rAF-throttled). */
    const bandImg = document.querySelector('main .cb-photo img');
    let drifting = false;
    const drift = () => {
      drifting = false; if (!bandImg || off()) return;
      const box = bandImg.parentElement.getBoundingClientRect();
      if (box.bottom < 0 || box.top > innerHeight) return;
      const p = (box.top + box.height / 2 - innerHeight / 2) / (innerHeight / 2 + box.height / 2);
      bandImg.style.translate = `0 ${(p * -3).toFixed(2)}%`; bandImg.style.scale = '1.07';
    };
    if (bandImg) { addEventListener('scroll', () => { if (!drifting) { drifting = true; requestAnimationFrame(drift); } }, { passive: true }); drift(); }

    /* M5. Finder: the red indicator slides to the pressed chip; leaving cards fade in place;
       staying cards glide to their new cells (FLIP); new cards rise; the count updates. */
    document.querySelectorAll('[data-finder]').forEach(finder => {
      const grid = finder.querySelector('.cb-finder-grid');
      const count = finder.querySelector('.cb-finder-count');
      // Hidden cards' photographs load before the finder is reached, so filters and Show more
      // uncover photographs rather than empty tiles.
      const warm = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        warm.disconnect();
        grid.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
      }, { rootMargin: '600px 0px' });
      warm.observe(finder);
      finder.querySelectorAll('.cb-filter-chips').forEach(row => {
        const bar = document.createElement('span'); bar.className = 'n-indicator'; bar.setAttribute('aria-hidden', 'true');
        row.append(bar); row.classList.add('has-indicator');
        const place = () => {
          const face = row.querySelector('[aria-pressed="true"] .chip-face'); if (!face) return;
          const r = row.getBoundingClientRect(), f = face.getBoundingClientRect();
          bar.style.width = `${f.width}px`; bar.style.transform = `translate(${f.left - r.left + row.scrollLeft}px, ${f.bottom - r.top - 2}px)`;
        };
        place(); new ResizeObserver(place).observe(row);
        row.addEventListener('click', () => requestAnimationFrame(place));
      });
      const visible = () => [...grid.children].filter(li => !li.hidden);
      finder.addEventListener('click', event => {
        if (off() || !event.target.closest('[data-filter], .cb-finder-reset, .cb-finder-more')) return;
        // Capture phase: this runs before clayco.js updates the grid in its own click handler.
        const gridBox = grid.getBoundingClientRect();
        const before = new Map(visible().map(li => [li, li.getBoundingClientRect()]));
        const height = grid.offsetHeight, text = count.textContent;
        requestAnimationFrame(() => {
          const after = visible(); let fresh = 0;
          before.forEach((r, li) => { // ghosts of cards that left
            if (after.includes(li)) return;
            const ghost = li.cloneNode(true); ghost.hidden = false; ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true;
            Object.assign(ghost.style, { position: 'absolute', left: `${r.left - gridBox.left}px`, top: `${r.top - gridBox.top}px`, width: `${r.width}px`, pointerEvents: 'none', margin: 0 });
            grid.prepend(ghost); // under the cards gliding into its cell
            ghost.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.98)' }], { duration: 180, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).finished.then(() => ghost.remove(), () => ghost.remove());
          });
          after.forEach(li => {
            const was = before.get(li), now = li.getBoundingClientRect();
            if (was) {
              const dx = was.left - now.left, dy = was.top - now.top;
              if (Math.abs(dx) + Math.abs(dy) > 1) play(li, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 700, delay: 60, easing: OUT });
            } else {
              const d = 140 + Math.min(fresh++, 12) * 35;
              play(li.querySelector('.media'), [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 700, delay: d, easing: RISE });
              arrive(li.querySelector('.cb-proj-copy'), d + 160, 8);
            }
          });
          const h = grid.offsetHeight;
          if (h !== height) play(grid, [{ height: `${height}px` }, { height: `${h}px` }], { duration: 600, easing: SET, fill: 'none' });
          if (count.textContent !== text) arrive(count, 0, 6);
        });
      }, true);
    });

    /* M6b. Footer lift (desktop): the red footer's content starts 120px high and settles as the
       footer rises into view, with a shade that clears; same vocabulary as the menu sheet. */
    const footer = document.querySelector('.cf'), inner = footer?.querySelector(':scope > .wrap');
    const wide = matchMedia('(min-width: 1100px)');
    let lifting = false;
    const lift = () => {
      lifting = false; if (!inner || off() || !wide.matches) { if (inner) inner.style.translate = ''; footer?.style.removeProperty('--n-shade'); return; }
      const top = footer.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, (innerHeight - top) / innerHeight));
      // 64px stays inside the footer's 72px top padding, so the wordmark never crosses its edge; the shade
      // clears by halfway, so Clayco red reads true for most of the entry.
      inner.style.translate = `0 ${(-(1 - p) * 64).toFixed(1)}px`;
      footer.style.setProperty('--n-shade', (Math.max(0, 1 - 2 * p) * .14).toFixed(3));
    };
    if (inner) { addEventListener('scroll', () => { if (!lifting) { lifting = true; requestAnimationFrame(lift); } }, { passive: true }); lift(); }

    /* Settle: motion turned off mid-way shows everything at rest. It runs once and stops watching:
       it changes the root's class itself, and the review deck's adapter also writes that attribute,
       so a live observer would ping-pong with it and lock the page. */
    const settle = () => {
      if (!off() || !root.classList.contains('cbm')) return;
      classWatch.disconnect();
      running.forEach(a => { try { a.finish(); } catch { a.cancel(); } });
      watcher.disconnect(); targets.clear();
      document.querySelectorAll('.n-wait').forEach(el => el.classList.remove('n-wait'));
      document.querySelectorAll('[data-n-rule]').forEach(el => el.classList.add('is-set'));
      document.getAnimations().forEach(a => { if (a instanceof CSSTransition && a.effect?.pseudoElement === '::before') a.finish(); });
      if (bandImg) { bandImg.style.translate = ''; bandImg.style.scale = ''; }
      if (inner) inner.style.translate = ''; footer?.style.removeProperty('--n-shade');
      root.classList.remove('cbm');
    };
    const classWatch = new MutationObserver(settle);
    classWatch.observe(root, { attributes: true, attributeFilter: ['class'] });
    reduce.addEventListener?.('change', settle);
  }
})();
