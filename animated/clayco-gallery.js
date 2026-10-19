import { mountArcTransition } from './gallery-motion/arc-transition.js';
import { createQueuedReveal } from './gallery-motion/queued-reveal.js';

// Responsive counterpart of RBB's ES-module / GSAP presentation controller.
// Native document scrolling replaces its fixed-size HyperFrames scene canvas.
const gsap = window.gsap;
const root = document.documentElement;
const query = new URLSearchParams(location.search);
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = query.get('motion') === 'off';
const reduced = () => paused || systemMotion.matches || !gsap;
const running = new Set();
const masks = new Set();
function track(tween) {
  running.add(tween);
  tween.eventCallback('onComplete', () => running.delete(tween));
  return tween;
}
function settle() {
  for (const tween of running) { tween.progress(1); tween.kill(); }
  running.clear();
  for (const mask of masks) mask.dispose();
  masks.clear();
}

// RBB supporting-copy choreography, now triggered once on entering the viewport.
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      if (reduced()) continue;
      const el = entry.target;
      if (el.matches('[data-gallery-scene]')) {
        track(createQueuedReveal(el, { gsap, reducedMotion: reduced() })).play();
      } else if (el.matches('[data-gallery-arc]')) {
        const mask = mountArcTransition(el);
        masks.add(mask);
        const reveal = mask.begin(el, { curve: 7 });
        const state = { value: 0 };
        const tween = gsap.to(state, {
          value: 1, duration: 1.25, ease: 'power3.inOut',
          onUpdate: () => reveal.draw(state.value),
          onComplete: () => { mask.dispose(); masks.delete(mask); running.delete(tween); }
        });
        running.add(tween);
      } else {
        const photo = el.querySelector('[data-gallery-image]') || el.querySelector('.media');
        if (photo) track(gsap.fromTo(photo,
          { y: 24, opacity: .2 },
          { y: 0, opacity: 1, duration: .85, delay: (Array.from(el.parentElement.children).indexOf(el) % 3) * .075, ease: 'power3.out', clearProps: 'transform,opacity' }
        ));
      }
    }
  }, { threshold: .12, rootMargin: '0px 0px -3% 0px' });
  document.querySelectorAll('[data-gallery-scene],[data-gallery-arc],[data-gallery-reveal]').forEach(el => observer.observe(el));
  addEventListener('pagehide', () => { observer.disconnect(); settle(); }, { once: true });
}

// RBB / Osmo Footer Parallax: the actual page lifts beneath the directory.
// The native dialog is clipped during the reveal so background content remains
// visible without cloning the document or adding duplicate image layers.
const dialog = document.getElementById('gallery-menu');
const trigger = document.querySelector('[data-gallery-menu]');
const closeButton = dialog.querySelector('[data-gallery-close]');
const inner = dialog.querySelector('.cg-menu-inner');
const shade = dialog.querySelector('.cg-menu-shade');
const sheet = document.getElementById('gallery-sheet');
let phase = 'closed', timeline = null, returnFocus = null;
function finished(opening) {
  timeline = null;
  if (gsap) gsap.set([sheet,dialog], { clearProps: 'transform,clipPath,willChange' });
  phase = opening ? 'open' : 'closed';
  dialog.dataset.phase = phase;
  if (!opening) {
    dialog.close();
    root.classList.remove('has-dialog');
    trigger.setAttribute('aria-expanded', 'false');
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }
}
function openMenu() {
  if (phase !== 'closed') return;
  returnFocus = document.activeElement;
  phase = 'opening';
  dialog.dataset.phase = phase;
  dialog.showModal();
  dialog.scrollTop = 0;
  root.classList.add('has-dialog');
  trigger.setAttribute('aria-expanded', 'true');
  closeButton.focus({ preventScroll: true });
  if (reduced()) { if (gsap) gsap.set([inner, shade], { clearProps: 'transform,opacity' }); finished(true); return; }
  gsap.set(dialog, { clipPath: 'inset(100% 0% 0% 0%)' });
  gsap.set(sheet, { y: 0, willChange: 'transform' });
  gsap.set(inner, { yPercent: -25 });
  gsap.set(shade, { opacity: .5 });
  timeline = gsap.timeline({ onComplete: () => finished(true) });
  timeline.to(sheet, { y: -innerHeight, duration: 1.2, ease: 'power3.inOut' }, 0)
    .to(dialog, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power3.inOut' }, 0)
    .to(inner, { yPercent: 0, duration: 1.2, ease: 'power3.inOut' }, 0)
    .to(shade, { opacity: 0, duration: 1.2, ease: 'power3.inOut' }, 0);
}
function closeMenu() {
  if (phase === 'closed' || phase === 'closing') return;
  const fromOpening = phase === 'opening';
  timeline?.kill();
  phase = 'closing';
  dialog.dataset.phase = phase;
  if (reduced()) { finished(false); return; }
  if (!fromOpening) {
    gsap.set(sheet, { y: -innerHeight, willChange: 'transform' });
    gsap.set(dialog, { clipPath: 'inset(0% 0% 0% 0%)' });
  }
  timeline = gsap.timeline({ onComplete: () => finished(false) });
  timeline.to(sheet, { y: 0, duration: 1.2, ease: 'power3.inOut' }, 0)
    .to(dialog, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.2, ease: 'power3.inOut' }, 0)
    .to(inner, { yPercent: -25, duration: 1.2, ease: 'power3.inOut' }, 0)
    .to(shade, { opacity: .5, duration: 1.2, ease: 'power3.inOut' }, 0);
}
trigger.addEventListener('click', openMenu);
closeButton.addEventListener('click', closeMenu);
dialog.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
dialog.addEventListener('close', () => {
  timeline?.kill(); timeline = null; phase = 'closed';
  if (gsap) gsap.set([sheet,dialog], { clearProps: 'transform,clipPath,willChange' });
  root.classList.remove('has-dialog'); trigger.setAttribute('aria-expanded', 'false');
  if (window.parent !== window) window.parent.postMessage({ type: 'ljc-panel-state', panel: 'menu', open: false },'*');
});
dialog.querySelectorAll('details').forEach(detail => detail.addEventListener('toggle', () => {
  if (detail.open) dialog.querySelectorAll('details[open]').forEach(other => { if (other !== detail) other.open = false; });
}));
document.addEventListener('clayco-gallery-panel', event => { if (event.detail?.panel === 'menu') openMenu(); });
function motionChanged() {
  if (!reduced()) return;
  settle();
  if (timeline) { const opening = phase === 'opening'; timeline.kill(); timeline = null; if (gsap) gsap.set([inner,shade], {clearProps:'transform,opacity'}); finished(opening); }
}
addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== window.parent) return;
  if (event.data?.type === 'ljc-motion') { paused = Boolean(event.data.paused); motionChanged(); }
});
// The shared runtime owns the footer toggle and emits class changes immediately.
new MutationObserver(() => { paused = root.classList.contains('motion-off') && !systemMotion.matches; motionChanged(); }).observe(root, { attributes: true, attributeFilter: ['class'] });
systemMotion.addEventListener('change', motionChanged);
document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
if (query.get('panel') === 'menu') openMenu();
