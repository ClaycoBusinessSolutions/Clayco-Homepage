/**
 * Offline bridge, review side. Opened from disk (file://) every page is its own origin, so the
 * review cannot reach into the design. The packaged design pages run Sofia's adapter themselves
 * (motion-frame.js) and this class carries the same calls over postMessage.
 */
export const FRAME_TARGET = location.protocol === 'file:' ? '*' : location.origin;

/** A message from the preview frame. From disk the browser reports the origin as "null". */
export function fromFrame(event, frame) {
  if (event.source !== frame.contentWindow) return false;
  return event.origin === location.origin || (location.protocol === 'file:' && event.origin === 'null');
}

export class RemoteMotionAdapter {
  constructor(iframe, {designId} = {}) {
    this.iframe = iframe; this.designId = designId; this.sections = []; this.href = null;
    this.calls = new Map(); this.sequence = 0; this.destroyed = false;
    this.onMessage = event => {
      if (!fromFrame(event, this.iframe) || event.data?.type !== 'review-motion-reply') return;
      const call = this.calls.get(event.data.id);
      if (!call) return;
      this.calls.delete(event.data.id); clearTimeout(call.timer);
      if (Array.isArray(event.data.sections)) this.sections = event.data.sections;
      if (typeof event.data.href === 'string') this.href = event.data.href;
      if (event.data.error) call.reject(new Error(event.data.error)); else call.resolve(event.data.result);
    };
    window.addEventListener('message', this.onMessage);
  }
  post(message) { try { this.iframe.contentWindow?.postMessage({type:'review-motion', ...message}, '*'); } catch {} }
  call(method, payload = {}, timeout = 8000) {
    if (this.destroyed) return Promise.reject(new Error('The motion bridge was closed.'));
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.calls.delete(id); reject(new Error(`The design did not answer “${method}”.`)); }, timeout);
      this.calls.set(id, {resolve, reject, timer});
      this.post({id, method, ...payload});
    });
  }
  async initialize(options = {}) { await this.call('init', {designId: this.designId, ...options}, 6000); return this; }
  async apply(settings = {}, {paused = false} = {}) { await this.call('apply', {settings, paused}); }
  getSections() { return this.sections; }
  replay(id) { return this.call('replay', {section: id || null}); }
  goTo(id) { this.post({method: 'goto', section: id}); return true; }
  setDevice(device) { this.post({method: 'device', device}); }
  scrollTop() { this.post({method: 'top'}); }
  nativeMotionState() { this.post({method: 'native-state'}); }
  destroy() {
    if (this.destroyed) return;
    this.post({method: 'destroy'}); this.destroyed = true;
    window.removeEventListener('message', this.onMessage);
    for (const call of this.calls.values()) { clearTimeout(call.timer); call.reject(new Error('The motion bridge was closed.')); }
    this.calls.clear();
  }
}
