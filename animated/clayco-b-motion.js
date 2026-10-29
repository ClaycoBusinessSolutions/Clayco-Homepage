/* Task-first motion, Nordic v2 — "set out, then build" (28 Oct 2026). Loaded after clayco.js on
   Task-first pages; states live in clayco-b-nordic-v2.css. After the queued reveals, footer lift
   and masked headings in Kim's RBB Gallery and PATH presentations: rules draw first, like a chalk
   line on site; then content lands on them; photographs rise from the ground line; then everything
   rests. Plain WAAPI + IntersectionObserver, no library. The menu sheet lives in clayco.js.
   Vonder round (29 Oct): one scroll driver for every scroll-linked value, the band and project lead
   photographs open as a window, the 03 thesis is pencilled then inked, the concrete panels and the
   footer arrive out of shade, large photographs drift inside their frames, labels are typeset by
   character and text links roll their label. No smooth-scroll hijack: native scroll stays native; only the values follow it.
   Nothing is hidden unless this script is running (html.cbm). Reduced motion, ?motion=off
   and the review deck (html.motion-off) settle everything. */
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
  const fontReady = document.fonts?.load ? Promise.race([Promise.all([document.fonts.load('400 1em "Clayco Haas"'), document.fonts.load('500 1em "Clayco Haas"')]), new Promise(done => setTimeout(done, 700))]) : Promise.resolve();
  fontReady.then(start, start);
  function start() {

    const OUT = 'cubic-bezier(.16,1,.3,1)';    // arrivals (expo-out family)
    const FADE = 'cubic-bezier(.33,1,.68,1)';  // opacity (cubic-out)
    const SET = 'cubic-bezier(.65,0,.35,1)';   // rules and sheets (in-out)
    const RISE = 'cubic-bezier(.77,0,.18,1)';  // photo clip (quart in-out)
    const WIPE = 'cubic-bezier(.65,0,.15,1)';  // the window's opening and image growth (vonder's "wipe")
    const P2OUT = 'cubic-bezier(.215,.61,.355,1)'; // the window's shade (power2-out)
    const CHAR = 'cubic-bezier(0,.63,.17,1)';  // typeset characters
    const SLIDE = 'cubic-bezier(0,.79,.17,1)'; // vonder's footer lines
    // Kim's two open calls for the review (29 Oct): ?window=line opens the windows as a full-width hairline
    // (the spec's fallback); ?footer=uncover brings back the spec's 120–180px uncover, which cuts the wordmark.
    const ask = new URLSearchParams(location.search);
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

    /* Scroll driver (vonder's scroll triggers, no library): one rAF loop over cached geometry that writes
       only translate, scale and custom properties, so there is no layout work and no layout shift. Each
       scrub follows its progress with a 100 ms lag (about Lenis's lerp .15 at 60 fps) instead of the page
       smoothing its scroll; a jump of more than a viewport (deck section jumps, ?section=, the #finder door,
       Home/End) snaps. The loop sleeps once every value has settled. */
    const desk = matchMedia('(min-width: 1100px) and (hover: hover) and (pointer: fine)');
    const scrubs = []; let vh = root.clientHeight;
    const docTop = el => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; }; // ignores transforms
    const EDGE = { top: 0, center: .5, bottom: 1 };
    const edge = (v, size) => v.endsWith('%') ? parseFloat(v) / 100 * size : EDGE[v] * size;
    const at = (s, spec) => { const [el, port] = spec.split(' '); return s.top + edge(el, s.h) - edge(port, vh); };
    const measure = () => { vh = root.clientHeight; scrubs.forEach(s => { s.top = docTop(s.subject); s.h = s.subject.offsetHeight; s.y0 = at(s, s.start); s.y1 = at(s, s.end); s.measure?.(); }); };
    const scrub = o => { const s = { when: () => true, shown: null, held: false, live: false, ...o }; scrubs.push(s); return s; };
    let raf = 0, last = 0, lastY = scrollY;
    const frame = now => {
      raf = 0; const dt = last ? Math.min(64, now - last) : 16.7; last = now;
      const y = scrollY, jump = Math.abs(y - lastY) > vh; lastY = y;
      const k = 1 - Math.exp(-dt / 100);
      let moving = false;
      for (const s of scrubs) {
        if (off() || !s.when()) { if (s.live) { s.reset(); s.live = false; s.shown = null; } continue; }
        const p = s.held ? 1 : Math.min(1, Math.max(0, (y - s.y0) / ((s.y1 - s.y0) || 1)));
        let v = (s.shown == null || jump || s.held) ? p : s.shown + (p - s.shown) * k;
        if (Math.abs(p - v) < .0005) v = p; else moving = true;
        if (v !== s.shown) { s.apply(v); s.shown = v; s.live = true; }
      }
      if (moving) raf = requestAnimationFrame(frame); else last = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const remeasure = () => { measure(); kick(); };
    addEventListener('scroll', kick, { passive: true }); addEventListener('resize', remeasure);
    const bodyWatch = new ResizeObserver(remeasure); bodyWatch.observe(document.body); // Show more, filters
    document.fonts?.ready.then(remeasure); desk.addEventListener?.('change', remeasure);

    // Photographs drift slowly inside fixed frames (vonder's ParallaxImage): over the frame's whole transit
    // the image (and its clip) moves from −a% to +a% at scale 1 + 2a/100. The individual translate and scale
    // properties compose with the WAAPI rise and the CSS hover zoom; the frame itself never moves.
    const drifts = new Map(); // media -> its drift, so a clip made later (clipOf) joins it where it stands
    const drift = (media, amount, { slack = 0, when = () => desk.matches } = {}) => {
      const s = scrub({
        subject: media, start: 'top bottom', end: 'bottom top', when,
        apply(p) {
          const a = typeof amount === 'function' ? amount() : amount;
          media.querySelectorAll(':scope > img, :scope > .n-clip').forEach(el => { el.style.translate = `0 ${(-a + 2 * a * p).toFixed(2)}%`; el.style.scale = (1 + 2 * a / 100 + slack).toFixed(3); });
        },
        reset() { media.querySelectorAll(':scope > img, :scope > .n-clip').forEach(el => { el.style.translate = ''; el.style.scale = ''; }); },
      });
      drifts.set(media, s);
      return s;
    };
    // Out of shade (vonder's dark lift, restrained; desktop): the inner .wrap lags its box and an ink shade
    // clears by halfway, linear from the box's top at the viewport bottom to the viewport top. Keyboard
    // focus inside holds it at rest until focus leaves. The browser has already judged the focused control
    // visible in its lifted place, so if coming to rest takes it out of view, the page scrolls to it, with
    // 16px to spare for the focus ring (clear of the sticky header at the top).
    const header = document.querySelector('.cb-header');
    const lift = (section, { travel, shade }) => {
      const inner = section.querySelector(':scope > .wrap');
      if (!inner) return null;
      const s = scrub({
        subject: section, start: 'top bottom', end: 'top top', when: () => desk.matches,
        measure() { s.d = travel(); },
        apply(p) {
          section.classList.add('n-lift');
          inner.style.translate = `0 ${(-(1 - p) * s.d).toFixed(1)}px`;
          section.style.setProperty('--n-shade', (shade * Math.max(0, 1 - 2 * p)).toFixed(3));
        },
        reset() { section.classList.remove('n-lift'); inner.style.translate = ''; section.style.removeProperty('--n-shade'); },
      });
      section.addEventListener('focusin', e => {
        const el = e.target;
        if (!el.matches?.(':focus-visible')) return;
        s.held = true; kick();
        requestAnimationFrame(() => { // after the driver's frame has put the section at rest
          if (document.activeElement !== el) return;
          const r = el.getBoundingClientRect(), top = Math.max(0, header ? header.getBoundingClientRect().bottom : 0);
          if (r.bottom > innerHeight) scrollBy(0, Math.ceil(r.bottom - innerHeight + 16));
          else if (r.top < top) scrollBy(0, Math.floor(r.top - top - 16));
        });
      });
      section.addEventListener('focusout', e => { if (!section.contains(e.relatedTarget)) { s.held = false; kick(); } });
      return s;
    };
    // Pencilled, then inked (vonder's statement fill): words are inline spans, so line breaks never change;
    // one custom property per frame (--read = progress × words) sets every word's opacity in CSS.
    const readFill = (el, start = 'top 88%', end = 'top 42%') => {
      const texts = []; let n = 0;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) texts.push(walker.currentNode);
      for (const node of texts) {
        const frag = document.createDocumentFragment();
        for (const part of node.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (!part.trim()) { frag.append(part); continue; }
          const word = document.createElement('span'); word.className = 'n-w'; word.style.setProperty('--w', n++); word.textContent = part;
          frag.append(word);
        }
        node.replaceWith(frag);
      }
      el.classList.add('n-read');
      return scrub({ subject: el, start, end, apply(p) { el.style.setProperty('--read', (p * n).toFixed(3)); }, reset() { el.style.removeProperty('--read'); } });
    };

    /* M1 / M2: split a heading into word masks; lines leave `step` apart and words within a line `wordStep`. */
    function riseLines(el, start, step = 90, wordStep = 0) {
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
      // A heading is named by aria-label; anything else (the footer sign-off) keeps a .sr-only copy.
      if (el.matches('h1, h2, h3, h4, h5, h6')) el.setAttribute('aria-label', label);
      else el.append(Object.assign(document.createElement('span'), { className: 'sr-only', textContent: label }));
      let line = -1, top = null, col = 0, lastDelay = start;
      const anims = words.map(word => {
        word.setAttribute('aria-hidden', 'true');
        const t = Math.round(word.parentNode.getBoundingClientRect().top);
        if (top === null || Math.abs(t - top) > 4) { line++; top = t; col = 0; }
        const delay = start + line * step + col++ * wordStep; lastDelay = Math.max(lastDelay, delay);
        return play(word, [{ transform: 'translateY(118%)' }, { transform: 'none' }], { duration: 1000, delay, easing: OUT });
      });
      // Restore the original markup once settled, so resizing re-wraps normally.
      Promise.allSettled(anims.map(a => a && a.finished)).then(() => { el.innerHTML = html; el.removeAttribute('aria-label'); });
      return lastDelay + 1000;
    }
    /* Typeset labels (vonder's SplitText): each character slides in from the right inside its own mask while
       the label eases in a few pixels. One inline-block per text node keeps the flex kicker's spaces; the
       pieces are aria-hidden behind a .sr-only copy (aria-label is ignored on a <p>). Restored once settled. */
    function slideChars(el, delay) {
      const html = el.innerHTML, label = el.textContent.replace(/\s+/g, ' ').trim(), chars = [], wraps = [], texts = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) if (walker.currentNode.textContent.trim()) texts.push(walker.currentNode);
      for (const node of texts) {
        const wrap = document.createElement('span'); wrap.className = 'n-clabel'; wrap.setAttribute('aria-hidden', 'true');
        for (const part of node.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (!part.trim()) { wrap.append(part); continue; }
          const word = document.createElement('span'); word.className = 'n-cword';
          for (const c of part) { const mask = document.createElement('span'); mask.className = 'n-cmask'; const ch = document.createElement('span'); ch.textContent = c; mask.append(ch); word.append(mask); chars.push(ch); }
          wrap.append(word);
        }
        node.replaceWith(wrap); wraps.push(wrap);
      }
      el.append(Object.assign(document.createElement('span'), { className: 'sr-only', textContent: label }));
      play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay, easing: FADE });
      const anims = [
        ...wraps.map(w => play(w, [{ translate: '12px 0' }, { translate: '0 0' }], { duration: 700, delay, easing: CHAR })),
        ...chars.map((ch, i) => play(ch, [{ transform: 'translateX(100%)' }, { transform: 'none' }], { duration: 460, delay: delay + i * 14, easing: CHAR })),
      ];
      Promise.allSettled(anims.map(a => a.finished)).then(() => { el.innerHTML = html; });
    }

    /* Rules: [data-n-rule] gets a drawn ::before (CSS). Adding .is-set draws it. */
    const RULES = [
      '.cb-door-list', '.cb-door-list > li', '.section-head', '.cb-flow-step', '.cb-ddb',
      '.news-card--story', '.cb-filters', '.cf-office', '.cf-base',
    ].join(',');
    document.querySelectorAll(RULES).forEach(el => el.setAttribute('data-n-rule', ''));
    const setRule = (el, delay) => { el.style.setProperty('--n-d', `${delay}ms`); el.classList.add('is-set'); };

    /* Scroll-linked moves, registered before anything is queued: the band drifts at every width (half on
       phones; 1.07 keeps the window covered), Markets, case-study covers, the news leads and the project
       lead drift on desktop; the concrete panels and the footer lift; the 03 thesis fills. The finder has none. */
    const band = document.querySelector('main .cb-photo .media');
    if (band) drift(band, () => desk.matches ? 3 : 1.5, { slack: .01, when: () => true });
    document.querySelectorAll('main .cb-market .media').forEach((m, i) => drift(m, i < 2 ? 2.5 : 2));
    document.querySelectorAll('main .cb-ddb-thumb').forEach(m => drift(m, 2));
    document.querySelectorAll('main .news-grid--four > li:not(.news-card--story) .media').forEach(m => drift(m, 2));
    document.querySelectorAll('main .cp-photo--lead').forEach(m => drift(m, 3, { slack: .01 }));
    const padTop = el => parseFloat(getComputedStyle(el).paddingTop);
    // The lag stays inside the panel's top padding, so headings never cross its edge and rules still draw first.
    document.querySelectorAll('main .section--panel').forEach(sec => lift(sec, { travel: () => padTop(sec) * .75, shade: .08 }));
    // M6b. The red footer arrives out of shade the same way, its content lagging 64px inside the 72px top
    // padding, so the wordmark never crosses the footer's edge. The spec's uncover (120–180px, above the
    // footer's top, clipped) sliced the wordmark mid-glyph on its way down; it waits for Kim's call.
    const footer = document.querySelector('.cf');
    const uncover = ask.get('footer') === 'uncover';
    if (footer) lift(footer, { travel: () => uncover ? Math.min(180, Math.max(120, vh * .18)) : Math.max(0, padTop(footer) - 8), shade: .14 });
    const thesis = document.querySelector('main #cb-int-title');
    if (thesis) readFill(thesis);
    measure(); kick();

    /* M1. Opening: kicker typeset, headline by line and word, links; Start here rules draw, then rows land. */
    const statement = document.querySelector('.cb-statement');
    if (statement) {
      const end = riseLines(statement, 120, 90, 30);
      document.querySelectorAll('.cb-hero .kicker').forEach(el => slideChars(el, 0));
      document.querySelectorAll('.cb-hero-links').forEach(el => arrive(el, end - 360, 10));
      const list = document.querySelector('.cb-door-list');
      if (list) setRule(list, 200);
      const doorsTitle = document.querySelector('.cb-doors-title');
      if (doorsTitle) slideChars(doorsTitle, 160);
      document.querySelectorAll('.cb-door-list > li').forEach((li, i) => {
        setRule(li, 320 + i * 90); // each row's top rule
        arrive(li.firstElementChild, 480 + i * 90, 12);
      });
    }
    release();

    /* Text links roll their label on hover (vonder's footer link; pointer devices only): each word leaves
       upwards, a copy rises from below and a red square marks the link (CSS transitions). Keyboard focus
       shows the square only, so a label never blanks as it takes focus. Built once from the label's text
       node: the visible words stay the link's name and its selectable text; the copies are aria-hidden and
       unselectable. Email and phone links keep their plain text, so an address copies as written. */
    const rolls = [];
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      document.querySelectorAll('main a.text-link, a.cb-photo-link, .cf-base a.cf-link:not([href^="mailto:"], [href^="tel:"])').forEach(a => {
        const node = [...a.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
        if (!node) return;
        const roll = document.createElement('span'); roll.className = 'n-roll';
        let i = 0;
        for (const part of node.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (!part.trim()) { roll.append(part); continue; }
          const word = document.createElement('span'); word.className = 'n-rw'; word.style.setProperty('--i', i++);
          const copy = Object.assign(document.createElement('span'), { className: 'n-ri', textContent: part }); copy.setAttribute('aria-hidden', 'true');
          word.append(Object.assign(document.createElement('span'), { className: 'n-ro', textContent: part }), copy);
          roll.append(word);
        }
        node.replaceWith(roll); a.classList.add('n-rolls'); rolls.push([a, node, roll]);
        // Left before the roll lands (under a second), the label rolls straight back instead of waiting out
        // the return delay, so it is never blank between the two.
        let since = 0, back;
        // A hover during the contact base's word entrance finishes it first, so the label never shows twice.
        a.addEventListener('pointerenter', () => { since = performance.now(); a.querySelectorAll('.n-ro').forEach(w => w.getAnimations().forEach(x => running.has(x) && x.finish())); });
        a.addEventListener('pointerleave', () => {
          if (performance.now() - since > 1000) return;
          a.classList.add('n-back'); clearTimeout(back); back = setTimeout(() => a.classList.remove('n-back'), 1000);
        });
      });
    }

    // Moving photographs (Seedance 2.5 clips, Kim 29 Oct): a media box with data-video gets a muted video over
    // its photograph, which stays underneath as the poster and the motion-off view. Clips play while on screen
    // and pause off it; the band's montage (Sam's hero video) starts with its window each time it comes into
    // view, and loops like the others; a door's clip plays only while the door is hovered or focused.
    const clips = new Map();
    const cranes = new Set(); // band clips waiting for their figure to show
    const clipOf = media => {
      let video = clips.get(media);
      if (video) return video;
      video = document.createElement('video');
      Object.assign(video, { muted: true, playsInline: true, preload: 'none', loop: true });
      video.className = 'n-clip'; video.setAttribute('aria-hidden', 'true'); video.setAttribute('muted', '');
      video.src = media.dataset.video;
      video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
      media.append(video); clips.set(media, video);
      // The drift sleeps while the scroll rests (after a jump, say): place the new clip where the photograph stands.
      const s = drifts.get(media);
      if (s?.live) s.apply(s.shown);
      // A clip that starts while its photograph is still settling joins the settle where it stands.
      media.querySelector(':scope > img')?.getAnimations().filter(a => running.has(a)).forEach(a => {
        const c = play(video, a.effect.getKeyframes(), a.effect.getTiming());
        if (a.startTime != null) c.startTime = a.startTime;
        else { c.currentTime = a.currentTime ?? 0; a.ready.then(() => { if (c.playState !== 'idle' && a.startTime != null) c.startTime = a.startTime; }); }
      });
      return video;
    };
    const playClip = (media, fromStart) => { if (off()) return; const video = clipOf(media); if (fromStart) video.currentTime = 0; video.play().catch(() => {}); };

    /* M3. Photographs rise from the ground line, queued; captions follow. */
    const PHOTOS = 'main :is(.cb-photo .media, .cb-market .media, .cb-proj .media, .news-card .media, .cb-ddb-item .media, .cp-photo--lead, .cp-related-card .media, .cc-cover)';
    // Captions are the photograph's siblings inside its card or figure; a project-page photo rises alone.
    const captionOf = media => media.parentElement.matches('a, figure') ? [...media.parentElement.children].filter(c => c !== media && !c.matches('.arrow, .sr-only')) : [];
    // The band and the project lead open as a window instead (signature 1).
    const isWindow = el => el.matches('.cb-photo .media, .cp-photo--lead');
    // The frame a window is judged by: a .media waits clipped, which the observer reads as no area, so its
    // parent; the project lead waits by opacity, so itself (its parent also holds the thumbnail row).
    const frameOf = media => media.classList.contains('media') ? media.parentElement : media;
    // A photograph rises once it can be drawn, so the move never plays on an empty box (cold cache,
    // slow link). It waits under its mask for at most 2.5s; hidden finder cards rise unseen, as before.
    const ready = img => !img || (img.complete && img.naturalWidth > 0);
    const risePhoto = (media, delay, again = false) => {
      const go = isWindow(media) ? openWindow : risePhotoNow;
      const img = media.querySelector('img');
      if (ready(img) || !media.getClientRects().length) { go(media, delay, again); return; }
      const t0 = performance.now();
      media.classList.add('n-wait'); captionOf(media).forEach(cap => cap.classList.add('n-wait'));
      Promise.race([img.decode().catch(() => {}), new Promise(done => setTimeout(done, 2500))])
        .then(() => { if (media.classList.contains('n-wait')) go(media, Math.max(0, delay - (performance.now() - t0)), again); });
    };
    // Slow on purpose (Kim, 29 Oct): the photograph uncovers over 1.6s and settles over 2.4s.
    const risePhotoNow = (media, delay, again = false) => {
      media.classList.remove('n-wait');
      play(media, [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 1600, delay, easing: RISE });
      media.querySelectorAll(':scope > :is(img, .n-clip)').forEach(el => play(el, [{ transform: 'translateY(6%) scale(1.1)' }, { transform: 'none' }], { duration: 2400, delay, easing: OUT }));
      if (again) return; // a replay moves the photograph only; its caption stays put
      captionOf(media).forEach((cap, i) => { cap.classList.remove('n-wait'); arrive(cap, delay + 320 + i * 60, 10); });
    };
    // The window (vonder's preloader hole and hero growth): an opening centred on the visible part of the
    // frame widens to the full frame at the frame's aspect ratio (inset values interpolate linearly), while
    // the image grows towards the viewer about that centre and an ink shade clears. The compensating
    // translateY keeps transform-origin at 50% 50%, which the drift's coverage depends on.
    const openWindow = (media, delay, again = false) => {
      media.classList.remove('n-wait');
      const r = media.getBoundingClientRect(), w = r.width, h = r.height;
      const cy = Math.min(h - 1, Math.max(0, (Math.max(r.top, 0) + Math.min(r.bottom, innerHeight)) / 2 - r.top));
      // ?window=line: a full-width hairline that widens like a drawn rule, instead of an opening from the centre.
      const cx = ask.get('window') === 'line' ? 0 : w / 2, hair = cx ? 0 : 1;
      if (media.dataset.video) clipOf(media); // the clip drifts and grows with the photograph
      play(media, [{ clipPath: `inset(${cy}px ${cx}px ${h - cy - hair}px ${cx}px)` }, { clipPath: 'inset(0px 0px 0px 0px)' }], { duration: 1500, delay, easing: WIPE });
      // Growth from .9 only where a drift scale covers the frame as the opening completes (vonder skips it on
      // phones), and never for the hairline, which is full width from its first frame.
      if (cx && innerWidth >= 768 && (media === band || desk.matches)) {
        media.querySelectorAll(':scope > img, :scope > .n-clip').forEach(el => play(el, [{ transform: `translateY(${(.1 * (cy - h / 2)).toFixed(1)}px) scale(.9)` }, { transform: 'none' }], { duration: 1800, delay, easing: WIPE }));
      }
      const dim = media.querySelector(':scope > .n-dim') || media.appendChild(Object.assign(document.createElement('span'), { className: 'n-dim' }));
      dim.setAttribute('aria-hidden', 'true');
      play(dim, [{ opacity: .3 }, { opacity: 0 }], { duration: 1000, delay: delay + 400, easing: P2OUT });
      // The crane shot starts with the window, unless the window opened barely on screen (passed, at the top
      // edge): then it waits for 20% of the figure to show, so the shot is not spent unseen.
      if (media.dataset.video) setTimeout(() => { if (shown(frameOf(media)) >= .2) { cranes.delete(media); playClip(media, true); } else cranes.add(media); }, delay);
      if (again) return;
      captionOf(media).forEach((cap, i) => { cap.classList.remove('n-wait'); arrive(cap, delay + 900 + i * 60, 10); });
    };

    /* M2 + M4. Section heads and ruled rows: rule draws, then label/title/content arrive. The kicker is
       typeset; titles rise by line and word, except the 03 thesis, which is inked by the scroll. */
    const setOut = (el, delay) => {
      el.classList.remove('n-wait');
      setRule(el, delay);
      const title = el.querySelector('.section-title');
      if (title?.classList.contains('n-read')) arrive(title, delay + 260, 10);
      else if (title) riseLines(title, delay + 260, 70, 24);
      const parts = [];
      [...el.children].forEach(c => {
        if (c === title || c.matches('.cb-ddb-list, .n-indicator')) return;
        if (title && c.contains(title)) parts.push(...[...c.children].filter(x => x !== title)); else parts.push(c);
      });
      parts.forEach((part, i) => { if (part.matches('.kicker')) slideChars(part, delay + 120); else arrive(part, delay + 180 + i * 40, 10); });
    };

    const targets = new Map(); // observed element -> reveal function
    const observers = new Map(); // observed element -> the observer watching it
    const take = t => { observers.get(t)?.unobserve(t); observers.delete(t); const run = targets.get(t); targets.delete(t); return run; };
    const reveal = (entries, io) => {
      const min = io.thresholds[0] - .01; // an observer also reports entries below its threshold
      entries.filter(e => e.isIntersecting && e.intersectionRatio >= min)
        .map(e => e.target)
        .sort((a, b) => { const p = a.getBoundingClientRect(), q = b.getBoundingClientRect(); return (p.top - q.top) || (p.left - q.left); })
        .forEach(t => take(t)?.(slot()));
    };
    const watcher = new IntersectionObserver(reveal, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
    // A window opens once 35% of its figure shows, so the opening is seen from its start. One still ahead
    // of the viewer waits under its mask, at load and after a jump alike: the first screen's 48–213px strip
    // of the band stays paper, and the opening and the crane shot play when the viewer scrolls to them.
    // Passing 35% on the way elsewhere (a smooth return to the top, a fling) does not count: 120 ms later it
    // must still show 35%, and the page must have moved under a quarter of the viewport meanwhile; a faster
    // pass is left to the rest check. Each time the scroll rests (200 ms) every waiting window is checked
    // directly, and one the viewer has passed, its foot (over 24px) at the top edge, opens too, so it never
    // sits blank above the content.
    const shown = el => { const r = el.getBoundingClientRect(); return r.height ? (Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / r.height : 0; };
    const passed = r => r.top < 0 && r.bottom > 24;
    const windowWatch = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.intersectionRatio < .34) return;
      const y = scrollY;
      setTimeout(() => { if (targets.has(e.target) && shown(e.target) >= .35 && Math.abs(scrollY - y) < innerHeight / 4) take(e.target)?.(slot()); }, 120);
    }), { threshold: .35 });
    let rest = 0;
    const atRest = () => {
      clearTimeout(rest);
      rest = setTimeout(() => [...targets.keys()].filter(t => observers.get(t) === windowWatch)
        .forEach(t => { if (shown(t) >= .35 || passed(t.getBoundingClientRect())) take(t)?.(slot()); }), 200);
    };
    addEventListener('scroll', atRest, { passive: true });
    const watch = (el, run, io = watcher) => { targets.set(el, run); observers.set(el, io); io.observe(el); };
    // Keyboard focus never waits for a reveal: whatever holds the focused element lands at once.
    addEventListener('focusin', event => {
      const el = event.target;
      if (!el.matches?.(':focus-visible')) return;
      const host = [...targets.keys()].find(t => t.contains(el));
      if (host) take(host)(0);
      running.forEach(a => { const n = a.effect?.target; if (n && (n.contains(el) || el.contains(n))) a.finish(); });
    });
    const below = el => el.getBoundingClientRect().top > innerHeight * .94;
    const queue = (el, run, watchEl = el, io = watcher) => {
      // On screen at load: join the opening. A window joins only with 35% of its figure in view.
      if (isWindow(el) ? shown(watchEl) >= .35 : !below(el)) { run(el.closest('.cb-top') ? 400 : isWindow(el) ? 280 : 160); return; }
      el.classList.add('n-wait');
      watch(watchEl, run, io);
    };

    document.querySelectorAll(PHOTOS).forEach(media => {
      if (isWindow(media) ? shown(frameOf(media)) < .35 : below(media)) captionOf(media).forEach(cap => cap.classList.add('n-wait'));
      // A clipped element has no visible area for the observer: watch its unclipped parent.
      queue(media, d => risePhoto(media, d), isWindow(media) ? frameOf(media) : media.parentElement, isWindow(media) ? windowWatch : watcher);
    });
    document.querySelectorAll('main .section-head, main .cb-news-head, main .cb-ddb, main .cb-flow-step, main .news-card--story, main .cb-filters, .cf-office')
      .forEach(el => queue(el, d => setOut(el, d)));
    // The contact base arrives as vonder's footer does: its rule draws, then each line slides up out of its own
    // baseline, a line every 55 ms, the groups side by side. A link that carries the roll moves word by word
    // (each word's mask is the roll's own, 55 ms apart); any other line moves whole, its clip following the
    // move so it never shows outside its place (with room below for an email's underline).
    const base = document.querySelector('.cf-base');
    if (base) queue(base, d => {
      base.classList.remove('n-wait'); setRule(base, d);
      const from = at => d + 240 + at * 55;
      const line = (el, at) => {
        const words = el.querySelectorAll('.n-rw > .n-ro');
        if (words.length) { words.forEach((w, k) => play(w, [{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: 551, delay: from(at + k), easing: SLIDE })); return; }
        play(el, [{ transform: 'translateY(100%)', clipPath: 'inset(0 0 100% 0)' }, { transform: 'none', clipPath: 'inset(0 0 -.5em 0)' }], { duration: 551, delay: from(at), easing: SLIDE });
      };
      // Steps follow the rows as laid out at this width (lines within 4px share a row); icons ripple 27 ms apart.
      const els = [...base.querySelectorAll('.cf-base-head, .cf-base-group li, .cf-social li, .cf-base-line, .cf-copy')];
      const tops = els.map(el => el.getBoundingClientRect().top);
      const rows = [...new Set(tops)].sort((a, b) => a - b).reduce((r, t) => (r.length && t - r[r.length - 1] <= 4 ? r : [...r, t]), []);
      els.forEach((el, i) => line(el, rows.filter(t => t <= tops[i] + 4).length - 1 + (el.closest('.cf-social') ? [...el.parentElement.children].indexOf(el) * .5 : 0)));
    });
    // Without the footer lift (phones, tablets) the sign-off still makes an entrance: it rises by line.
    const sign = document.querySelector('.cf-sign');
    if (sign && !desk.matches) queue(sign, d => { sign.classList.remove('n-wait'); riseLines(sign, d, 90, 30); });

    // Photographs rise again each time they come back into view (Kim, 29 Oct). Once a revealed photograph
    // has left the screen entirely it re-arms under its mask, unseen, and replays when it returns.
    const photoHost = new Map(); // unclipped parent -> photograph
    document.querySelectorAll(PHOTOS).forEach(media => photoHost.set(media.parentElement, media));
    const rearm = new IntersectionObserver(entries => entries.forEach(entry => {
      const media = photoHost.get(entry.target);
      if (!media || entry.isIntersecting || media.classList.contains('n-wait') || !media.getClientRects().length) return;
      [media, ...media.querySelectorAll(':scope > :is(img, .n-clip, .n-dim)')].forEach(el => el.getAnimations().forEach(a => a.cancel()));
      media.classList.add('n-wait'); cranes.delete(media);
      if (isWindow(media)) watch(frameOf(media), d => risePhoto(media, d, true), windowWatch);
      else watch(entry.target, d => risePhoto(media, d, true));
    }), { threshold: 0 });
    photoHost.forEach((media, host) => rearm.observe(host));
    // A change of layout width can put a window that has opened back ahead of the viewer, as when the review
    // shell goes from Side by side (the whole band in view at 1280) to Option (a strip at the fold). It
    // re-arms then, as if it had left the screen, so its opening and crane play when the viewer reaches it.
    // Height-only resizes (a phone's address bar) leave it alone.
    let wide = innerWidth, resized = 0;
    const rewind = () => {
      if (innerWidth === wide) return;
      wide = innerWidth; clearTimeout(resized);
      resized = setTimeout(() => photoHost.forEach((media, host) => {
        const frame = frameOf(media);
        if (!isWindow(media) || media.classList.contains('n-wait') || targets.has(frame) || !media.getClientRects().length) return;
        if (frame.getBoundingClientRect().top <= 0 || shown(frame) >= .35) return;
        [media, ...media.querySelectorAll(':scope > :is(img, .n-clip, .n-dim)')].forEach(el => el.getAnimations().forEach(a => a.cancel()));
        clips.get(media)?.pause(); cranes.delete(media);
        media.classList.add('n-wait');
        watch(frame, d => risePhoto(media, d, true), windowWatch);
      }), 150);
    };
    addEventListener('resize', rewind);

    const clipHost = new Map();
    document.querySelectorAll('main .media[data-video]:not(.cb-door-media)').forEach(media => clipHost.set(media.parentElement, media));
    const clipWatch = new IntersectionObserver(entries => entries.forEach(entry => {
      const media = clipHost.get(entry.target);
      if (!media) return;
      const video = clips.get(media);
      if (!entry.isIntersecting) { video?.pause(); return; }
      // The window starts the crane shot; coming back mid-shot only resumes it, never while still masked.
      if (!media.closest('.cb-photo')) playClip(media, false);
      else if (cranes.has(media) && !media.classList.contains('n-wait')) { cranes.delete(media); playClip(media, true); }
      else if (video && video.currentTime > 0 && !video.ended && !media.classList.contains('n-wait')) playClip(media, false);
    }), { threshold: .2 });
    clipHost.forEach((media, host) => clipWatch.observe(host));
    document.querySelectorAll('main .cb-door-media[data-video]').forEach(media => {
      const door = media.closest('.cb-door');
      ['mouseenter', 'focus'].forEach(type => door.addEventListener(type, () => playClip(media, true)));
      ['mouseleave', 'blur'].forEach(type => door.addEventListener(type, () => clips.get(media)?.pause()));
    });

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
        finder.addEventListener('click', () => requestAnimationFrame(place)); // any finder control (Reset too) can move the pressed tab
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
              play(li.querySelector('.media'), [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 1100, delay: d, easing: RISE });
              // vonder's inner settle on incoming cards (power1 in-out); the scale keeps the photograph covering.
              li.querySelectorAll('.media > :is(img, .n-clip)').forEach(el => play(el, [{ transform: 'translateY(5%) scale(1.1)' }, { transform: 'none' }], { duration: 1100, delay: d, easing: 'cubic-bezier(.455,.03,.515,.955)' }));
              arrive(li.querySelector('.cb-proj-copy'), d + 160, 8);
            }
          });
          const h = grid.offsetHeight;
          if (h !== height) play(grid, [{ height: `${height}px` }, { height: `${h}px` }], { duration: 600, easing: SET, fill: 'none' });
          if (count.textContent !== text) arrive(count, 0, 6);
        });
      }, true);
    });

    /* Settle: motion turned off mid-way shows everything at rest. It runs once and stops watching:
       it changes the root's class itself, and the review deck's adapter also writes that attribute,
       so a live observer would ping-pong with it and lock the page. The scroll driver is torn down
       with it, so every lift, drift and fill returns to its static position. */
    const settle = () => {
      if (!off() || !root.classList.contains('cbm')) return;
      classWatch.disconnect();
      running.forEach(a => { try { a.finish(); } catch { a.cancel(); } });
      watcher.disconnect(); windowWatch.disconnect(); rearm.disconnect(); clipWatch.disconnect(); targets.clear(); observers.clear();
      removeEventListener('scroll', kick); removeEventListener('scroll', atRest); clearTimeout(rest); removeEventListener('resize', rewind); clearTimeout(resized); cranes.clear(); removeEventListener('resize', remeasure); bodyWatch.disconnect(); desk.removeEventListener?.('change', remeasure);
      cancelAnimationFrame(raf); raf = 0; scrubs.forEach(s => s.reset()); scrubs.length = 0; drifts.clear();
      clips.forEach(video => { video.pause(); video.remove(); }); clips.clear();
      document.querySelectorAll('.n-dim').forEach(el => el.remove());
      rolls.forEach(([a, node, roll]) => { roll.replaceWith(node); a.classList.remove('n-rolls'); }); rolls.length = 0;
      document.querySelectorAll('.n-wait').forEach(el => el.classList.remove('n-wait'));
      document.querySelectorAll('[data-n-rule]').forEach(el => el.classList.add('is-set'));
      document.getAnimations().forEach(a => { if (a instanceof CSSTransition && a.effect?.pseudoElement === '::before') a.finish(); });
      root.classList.remove('cbm');
    };
    const classWatch = new MutationObserver(settle);
    classWatch.observe(root, { attributes: true, attributeFilter: ['class'] });
    reduce.addEventListener?.('change', settle);
  }
})();
