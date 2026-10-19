/* Clayco joint-project pages: pick the project from ?project=<id> (all three
   are embedded as templates), then open its images in the shared reader.
   Runs before clayco.js, which posts ljc-ready with the chosen project id. */
(() => {
  'use strict';
  const body = document.body;
  const theme = body.dataset.projectTheme || body.dataset.theme || 'clayco-b';
  const label = theme === 'clayco-gallery' ? 'Gallery' : theme === 'clayco-b' ? 'Option B · Task-first, market-led' : 'Option A · Family resemblance';
  let library = { projects: [] };
  try { library = JSON.parse(document.getElementById('clayco-project-library').textContent); } catch { library = { projects: [] }; }
  const projects = Array.isArray(library.projects) ? library.projects : [];
  const requested = new URLSearchParams(location.search).get('project');
  const fallback = body.dataset.projectId || library.default;
  const known = id => projects.some(project => project.id === id);
  const id = known(requested) ? requested : fallback;
  const mount = document.getElementById('clayco-project');
  if (mount && id !== body.dataset.projectId) {
    const template = document.getElementById(`cp-template-${id}`);
    if (template) mount.replaceChildren(template.content.cloneNode(true));
  }
  body.dataset.projectId = id;
  document.documentElement.classList.remove('project-selecting');
  const project = projects.find(item => item.id === id) || projects[0];
  if (project) {
    document.title = `${project.title} — Clayco ${label} (concept study)`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', project.summary || project.title);
  }
  if (requested && !known(requested) && project && mount) {
    const notice = document.createElement('p');
    notice.className = 'cp-route-notice';
    notice.setAttribute('role', 'status');
    notice.textContent = `That project is not in this collection. Showing ${project.title}.`;
    mount.querySelector('.cp-top')?.prepend(notice);
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-photo]');
    if (!button || !project || !mount?.contains(button)) return;
    event.preventDefault();
    const index = Math.max(0, Math.min(project.pages.length - 1, Number(button.dataset.photo) || 0));
    const opened = window.LJCCaseReader?.open({ id: `clayco-${project.id}`, kind: 'gallery', title: project.title, pages: project.pages }, index, button);
    if (!opened && project.pages[index]) window.open(project.pages[index].src, '_blank', 'noopener');
  });
})();
