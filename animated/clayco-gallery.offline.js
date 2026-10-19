(() => {
'use strict';
const __bundleURL = document.currentScript.src;
const __modules = {};
__modules['gallery-motion/arc-transition.js'] = (() => {
/**
 * Arc geometry adapted from Osmo, Arc Scroll Transition.
 * Licensed resource copied from the user's signed-in Vault on 2026-10-14.
 * https://www.osmo.supply/resource/arc-scroll-transition
 * Original drawArc math is preserved; slide progress replaces ScrollTrigger.
 */
let serial=0;
function mountArcTransition(host){
 const ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');
 svg.setAttribute('aria-hidden','true');svg.style.cssText='position:absolute;width:0;height:0;pointer-events:none';
 const defs=document.createElementNS(ns,'defs');svg.append(defs);host.append(svg);
 let current;
 function begin(element,{direction=1,curve=12}={}){
  current?.dispose();
  const id=`clayco-gallery-arc-${++serial}`,clip=document.createElementNS(ns,'clipPath'),path=document.createElementNS(ns,'path');
  clip.id=id;clip.setAttribute('clipPathUnits','objectBoundingBox');clip.append(path);defs.append(clip);
  const aspect=element.clientWidth/Math.max(1,element.clientHeight),depth=curve/100*aspect;
  element.style.clipPath=`url(#${id})`;
  const draw=progress=>{
   const fill=Math.max(0,Math.min(1,progress)),bend=depth*Math.sin(fill*Math.PI);
   if(direction>=0){const edge=1-fill,control=edge-bend*2;path.setAttribute('d',`M0 1 L0 ${edge} Q.5 ${control} 1 ${edge} L1 1 Z`);}
   else{const edge=fill,control=edge+bend*2;path.setAttribute('d',`M0 0 L0 ${edge} Q.5 ${control} 1 ${edge} L1 0 Z`);}
  };
  draw(0);
  current={draw,dispose(){element.style.removeProperty('clip-path');clip.remove();if(current===this)current=null;}};
  return current;
 }
 return{begin,dispose(){current?.dispose();svg.remove();}};
}

return {mountArcTransition};
})();
__modules['gallery-motion/queued-reveal.js'] = (() => {
/**
 * Supporting-text reveal adapted from Osmo, Queued Scroll Reveal.
 * Licensed source: build/research/osmo/queued-js.txt (accessed 2026-10-14).
 * https://www.osmo.supply/resource/queued-scroll-reveal
 * The slide timeline replaces ScrollTrigger and delayed-call queue scheduling.
 */
const SELECTOR = [
  '.statement-tail', '.closing-note', '#spotlight-credit',
  '.voices-copy > p:not(.eyebrow)', '.model-copy', '.model-note',
  '.film-note', '.history-credit', '[data-queued-reveal]'
].join(',');
const MAX_ITEMS = 3;
const START = .1, STAGGER = .075, DURATION = .8, TRAVEL = '.65em';
const reducedByDefault = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function targetsFor(scene) {
  if (!scene?.querySelectorAll) throw new TypeError('Queued reveal requires a scene element.');
  if (scene.classList.contains('cover')) return [];
  return [...scene.querySelectorAll(SELECTOR)]
    .filter(el => !el.closest('h1,h2,h3,h4,h5,h6,button,a,canvas,video'))
    .filter(el => el.textContent.trim() && !el.hidden)
    .slice(0, MAX_ITEMS);
}

/**
 * Return a paused GSAP timeline without changing initial visibility.
 * instant/reducedMotion explicitly settle supporting text for static exports.
 */
function createQueuedReveal(scene, {
  gsap = globalThis.gsap,
  reducedMotion = reducedByDefault(),
  instant = false
} = {}) {
  if (!gsap?.timeline) throw new TypeError('Queued reveal requires GSAP.');
  const targets = targetsFor(scene);
  const timeline = gsap.timeline({ paused: true });
  timeline.data = { kind: 'rbb-queued-reveal', count: targets.length, instant: !!(instant || reducedMotion) };
  if (!targets.length) return timeline;
  if (instant || reducedMotion) {
    gsap.set(targets, { clearProps: 'opacity,visibility,transform' });
    return timeline;
  }
  // This set is deferred until the parent reaches the child; construction stays visible.
  timeline.set(targets, { autoAlpha: 0, y: TRAVEL, immediateRender: false }, 0);
  targets.forEach((target, index) => {
    const at = START + index * STAGGER;
    const opacity = Number.parseFloat(getComputedStyle(target).opacity);
    timeline.fromTo(target, { autoAlpha: 0 }, {
      autoAlpha: Number.isFinite(opacity) ? opacity : 1,
      duration: DURATION, ease: 'power1.out', immediateRender: false
    }, at);
    timeline.fromTo(target, { y: TRAVEL }, {
      y: 0, duration: DURATION, ease: 'expo.out', immediateRender: false
    }, at);
    timeline.set(target, { clearProps: 'opacity,visibility,transform' }, at + DURATION);
  });
  return timeline;
}

/** Add the child before unpausing it, so the parent owns all playback/seeking. */
function addQueuedReveal(parent, scene, { at = .18, ...options } = {}) {
  if (!parent?.add) throw new TypeError('Queued reveal requires a parent timeline.');
  const timeline = createQueuedReveal(scene, options);
  parent.add(timeline, at);
  timeline.paused(false);
  return timeline;
}

return {createQueuedReveal, addQueuedReveal};
})();
__modules['clayco-gallery.js'] = (() => {
const {mountArcTransition} = __modules['gallery-motion/arc-transition.js'];
const {createQueuedReveal} = __modules['gallery-motion/queued-reveal.js'];


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

return {};
})();
})();
