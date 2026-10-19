/* Offline package: links to pages that are not in the package show a note instead of an error page. */
(() => {
  if (location.protocol !== 'file:') return;
  const missing = new Set(["animated/case-studies.html", "animated/ljc.html", "animated/reverberation.html"]);
  const root = new URL('../../', document.currentScript.src);
  let note = null, timer = 0;
  const show = () => {
    if (!note) {
      note = document.createElement('div'); note.setAttribute('role', 'status');
      note.textContent = 'This page is not included in the offline package.';
      note.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;max-width:90vw;padding:12px 18px;border-radius:6px;background:#252622;color:#fff;font:14px/1.4 -apple-system,Helvetica,Arial,sans-serif;text-align:center;box-shadow:0 6px 24px #0003';
    }
    document.body.append(note); clearTimeout(timer); timer = setTimeout(() => note.remove(), 3500);
  };
  // Capture phase, registered first: the designs' own handlers skip clicks that are already handled.
  document.addEventListener('click', event => {
    const a = event.target.closest?.('a[href]');
    if (!a) return;
    const url = new URL(a.getAttribute('href'), location.href);
    if (url.protocol !== 'file:' || !url.href.startsWith(root.href)) return;
    if (!missing.has(decodeURIComponent(url.pathname.slice(root.pathname.length)))) return;
    event.preventDefault(); event.stopImmediatePropagation(); show();
  }, true);
})();
