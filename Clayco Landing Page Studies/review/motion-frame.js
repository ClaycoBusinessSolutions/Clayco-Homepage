/**
 * Offline bridge, design side. The offline package adds this (bundled as a classic script) to each
 * packaged design page. It runs Sofia's adapter inside the page and answers RemoteMotionAdapter.
 */
import { MotionAdapter } from './motion-adapter.js';

const host = window.parent;
// Only from disk: served over http the review reaches the page directly and this stays out of the way.
if (host !== window && location.protocol === 'file:') {
  let adapter = null;
  // The adapter normally receives the review's <iframe>; inside the page it works on itself.
  const self = {contentDocument: document, contentWindow: window, ownerDocument: document};
  const reply = (id, data) => { if (id) host.postMessage({type: 'review-motion-reply', id, ...data}, '*'); };
  const setDevice = device => {
    document.querySelector('style[data-review-device]')?.remove();
    if (device !== 'mobile') return;
    // iPhone scrollbars overlay the page, so the design keeps the full 402px width.
    const style = document.createElement('style'); style.dataset.reviewDevice = 'mobile';
    style.textContent = 'html,html *{scrollbar-width:none!important}html::-webkit-scrollbar,html *::-webkit-scrollbar{display:none!important}';
    document.head.append(style);
  };
  const addStylesheet = href => new Promise(resolve => {
    if (!href || document.querySelector('[data-review-responsive]')) return resolve();
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href; link.dataset.reviewResponsive = '';
    link.onload = link.onerror = () => resolve(); document.head.append(link);
  });
  const methods = {
    async init({designId, device, responsive}) {
      adapter?.destroy(); adapter = null; setDevice(device); await addStylesheet(responsive);
      adapter = await new MotionAdapter(self, {designId, local: true}).initialize();
      return {sections: adapter.getSections(), href: location.href};
    },
    apply({settings, paused}) { adapter.apply(settings, {paused}); return {sections: adapter.getSections()}; },
    replay({section}) { return {result: section ? adapter.replay(section) : adapter.replay()}; },
    goto({section}) { adapter?.goTo(section); },
    device({device}) { setDevice(device); },
    top() { window.scrollTo({top: 0, behavior: 'instant'}); },
    // The design reports its native motion state to the review, which relays it back here.
    'native-state'() { adapter?.onNativeMotionState?.({origin: location.origin, source: window, data: {type: 'ljc-motion-state'}}); },
    destroy() { adapter?.destroy(); adapter = null; },
  };
  window.addEventListener('message', async event => {
    if (event.source !== host) return;
    // From disk the review's messages arrive with origin "null", which the designs reject.
    // Re-deliver them as the hosted review's would arrive. This listener is registered first.
    // Where file pages themselves report "null" (Firefox) the designs already accept them.
    if (event.isTrusted && event.origin === 'null' && location.origin !== 'null' && event.data?.type?.startsWith?.('ljc-')) {
      event.stopImmediatePropagation();
      window.dispatchEvent(new MessageEvent('message', {data: event.data, origin: location.origin, source: host}));
      return;
    }
    if (event.data?.type !== 'review-motion' || !methods[event.data.method]) return;
    const {id, method} = event.data;
    try { reply(id, (await methods[method](event.data)) || {}); }
    catch (error) { reply(id, {error: String(error?.message || error)}); }
  });
  // The review listens to these on same-origin pages; from disk the page forwards them.
  document.addEventListener('pointerdown', () => host.postMessage({type: 'review-frame-pointerdown'}, '*'), true);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') host.postMessage({type: 'review-frame-escape'}, '*'); });
  // Public links leave the review in a separate tab; local prototype pages stay embedded.
  document.addEventListener('click', event => {
    const a = event.target.closest?.('a[href]');
    if (!a || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(a.href, location.href);
    if (/^https?:$/.test(url.protocol) && url.origin !== location.origin) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  }, true);
  // Same for search forms that submit to a public site (Sam B's claycorp.com search).
  document.addEventListener('submit', event => {
    const form = event.target;
    const action = new URL(form.getAttribute('action') || location.href, location.href);
    if (/^https?:$/.test(action.protocol) && action.origin !== location.origin) form.target = '_blank';
  }, true);
}
