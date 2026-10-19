(() => {
  'use strict';
  const theme = document.body.dataset.projectTheme;
  // Every theme id that renders through this script, with its page-title label.
  const themeTitles = {ljc:'LJC project study', gallery:'LJC Gallery project study', editorial:'LJC Editorial project study',
    colophon:'LJC Colophon project study', refresh:'LJC Refresh project study', studio:'LJC Studio project study'};
  const query = new URLSearchParams(location.search);
  const library = JSON.parse(document.getElementById('project-library').textContent).projects;
  const requestedProject = query.get('project');
  const project = library.find(item => item.id === requestedProject) || library.find(item => item.id === document.body.dataset.projectId) || library[0];
  const renderedTitle = (library.find(item => item.id === document.body.dataset.projectId) || project).title;
  if (project.id !== document.body.dataset.projectId) {
    const template = document.getElementById(`project-template-${project.id}`);
    if (template) document.getElementById('project-page').replaceChildren(template.content.cloneNode(true));
  }
  document.body.dataset.projectId = project.id;
  document.documentElement.classList.remove('project-selecting');
  document.title = themeTitles[theme] ? `${project.title} — ${themeTitles[theme]}` : document.title.replace(renderedTitle, project.title);
  document.querySelector('meta[name="description"]')?.setAttribute('content', project.summary);
  if (requestedProject && !library.some(item => item.id === requestedProject)) {
    const note = document.createElement('p');
    note.className = 'project-route-notice';
    note.setAttribute('role', 'status');
    note.textContent = `That project is not in this collection. Showing ${project.title}.`;
    document.querySelector('main').prepend(note);
  }
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = query.get('motion') === 'off';
  const dialogFocus = new WeakMap();
  const photos = project.images;
  const viewer = document.getElementById('photo-viewer');
  const info = document.getElementById('project-information');
  let photoIndex = 0;
  const reduced = () => paused || media.matches;

  const embedded = parent !== window;
  const modified = event => event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  document.querySelectorAll('[data-home-section]').forEach(link => link.addEventListener('click', event => {
    if (!embedded || modified(event)) return;
    event.preventDefault();
    parent.postMessage({type:'ljc-home',section:link.dataset.homeSection},'*');
  }));
  // Standalone links carry the motion choice; inside the review deck the deck routes.
  function withMotion(link) {
    if (!paused) return;
    const url = new URL(link.getAttribute('href'), location.href);
    url.searchParams.set('motion', 'off');
    link.href = url.href;
  }
  // Standalone: every same-site link carries a paused-motion choice to the next page.
  if (!embedded) document.addEventListener('click', event => {
    if (modified(event)) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.getAttribute('href').startsWith('#')) return;
    if (new URL(link.href, location.href).origin !== location.origin) return;
    withMotion(link);
  }, true);
  // Joint projects: the same project on the other brand (data-target-theme names it).
  document.querySelectorAll('[data-brand-project]').forEach(link => link.addEventListener('click', event => {
    if (modified(event) || !embedded) return;
    event.preventDefault();
    parent.postMessage({type:'ljc-brand-project',theme:link.dataset.targetTheme,project:link.dataset.projectId},'*');
  }));
  document.querySelectorAll('[data-project-link]').forEach(link => link.addEventListener('click', event => {
    if (modified(event) || !embedded) return;
    event.preventDefault();
    parent.postMessage({type:'ljc-project',theme,project:link.dataset.projectId},'*');
  }));

  function setMotion(value, notify = true) {
    paused = Boolean(value);
    document.body.classList.toggle('motion-paused', reduced());
    document.documentElement.style.scrollBehavior = reduced() ? 'auto' : 'smooth';
    if (reduced()) document.getAnimations().forEach(animation => { try { animation.finish(); } catch (_) { animation.cancel(); } });
    if (notify && parent !== window) parent.postMessage({type:'ljc-motion-state', paused, reduced:reduced(), system:media.matches},'*');
  }

  function showDialog(dialog, trigger) {
    if (!dialog || dialog.open) return;
    dialogFocus.set(dialog, trigger || document.activeElement);
    dialog.showModal();
    if (!reduced()) dialog.animate(
      dialog === info ? [{transform:'translateX(35px)',opacity:0},{transform:'none',opacity:1}] : [{opacity:0},{opacity:1}],
      {duration:320,easing:'cubic-bezier(.22,.7,.2,1)'}
    );
  }

  document.querySelector('.project-info-trigger')?.addEventListener('click', event => showDialog(info, event.currentTarget));
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const box = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => dialogFocus.get(dialog)?.focus({preventScroll:true}));
  });

  function selectPhoto(index) {
    photoIndex = Math.max(0, Math.min(photos.length - 1, index));
    const photo = photos[photoIndex];
    const image = document.getElementById('viewer-image');
    image.width = photo.width;
    image.height = photo.height;
    image.src = photo.src;
    image.alt = photo.alt;
    document.getElementById('viewer-count').textContent = `${String(photoIndex + 1).padStart(2,'0')} / ${String(photos.length).padStart(2,'0')}`;
    document.getElementById('viewer-caption').textContent = [photo.caption || photo.alt, photo.draft ? 'Draft image · Reverberation 2026 R01' : '', photo.credit].filter(Boolean).join(' — ');
    document.getElementById('previous-photo').disabled = photoIndex === 0;
    document.getElementById('next-photo').disabled = photoIndex === photos.length - 1;
  }
  document.querySelectorAll('[data-photo]').forEach(button => button.addEventListener('click', event => {
    selectPhoto(Number(button.dataset.photo));
    showDialog(viewer, event.currentTarget);
  }));
  document.getElementById('previous-photo').addEventListener('click', () => selectPhoto(photoIndex - 1));
  document.getElementById('next-photo').addEventListener('click', () => selectPhoto(photoIndex + 1));
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      selectPhoto(photoIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });

  const casePages = project.caseStudy?.pages || [];
  const track = document.querySelector('.case-pages-track');
  const caseCards = Array.from(document.querySelectorAll('.case-page'));
  let caseIndex = 0;
  let caseScrollFrame = 0;
  function syncCaseControls() {
    document.querySelector('.case-strip-count').textContent = `${String(caseIndex + 1).padStart(2,'0')} / ${String(casePages.length).padStart(2,'0')}`;
    document.querySelectorAll('[data-case-step]').forEach(button => {
      button.disabled = Number(button.dataset.caseStep) < 0 ? caseIndex === 0 : caseIndex === casePages.length - 1;
    });
  }
  function showCasePage(index) {
    caseIndex = Math.max(0, Math.min(casePages.length - 1, index));
    syncCaseControls();
    track.scrollTo({left:caseCards[caseIndex].offsetLeft - track.offsetLeft,behavior:reduced() ? 'instant' : 'smooth'});
  }
  function openCase(index, trigger) {
    window.LJCCaseReader?.open({id:project.id,title:project.title,pages:casePages},index,trigger);
  }
  if (track && casePages.length) {
    document.querySelectorAll('[data-case-page]').forEach(button => button.addEventListener('click', event => openCase(Number(button.dataset.casePage),event.currentTarget)));
    document.querySelector('[data-read-case]').addEventListener('click', event => openCase(caseIndex,event.currentTarget));
    document.querySelectorAll('[data-case-step]').forEach(button => button.addEventListener('click', () => showCasePage(caseIndex + Number(button.dataset.caseStep))));
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(caseScrollFrame);
      caseScrollFrame = requestAnimationFrame(() => {
        caseIndex = caseCards.reduce((nearest, card, index) => Math.abs(card.offsetLeft - track.offsetLeft - track.scrollLeft) < Math.abs(caseCards[nearest].offsetLeft - track.offsetLeft - track.scrollLeft) ? index : nearest, 0);
        syncCaseControls();
      });
    }, {passive:true});
    track.addEventListener('keydown', event => {
      if (event.target !== track || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      showCasePage(caseIndex + (event.key === 'ArrowRight' ? 1 : -1));
    });
    syncCaseControls();
  }


  // Motion never gates access to an image or text. Reveal once, then disconnect.
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      if (!reduced()) entry.target.animate([{opacity:.5,transform:'translateY(14px)'},{opacity:1,transform:'none'}], {duration:650,easing:'cubic-bezier(.22,.7,.2,1)'});
      revealObserver.unobserve(entry.target);
    });
  }, {threshold:.12});
  document.querySelectorAll('[data-reveal]').forEach(element => revealObserver.observe(element));

  const indexLinks = Array.from(document.querySelectorAll('.colophon-index nav a'));
  if (indexLinks.length) {
    const indexObserver = new IntersectionObserver(entries => {
      const current = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!current) return;
      indexLinks.forEach(link => {
        if (link.hash === `#${current.target.id}`) link.setAttribute('aria-current','true');
        else link.removeAttribute('aria-current');
      });
    }, {rootMargin:'-15% 0px -30% 0px',threshold:[0,.3,.6]});
    document.querySelectorAll('.colophon-photo-entry figure').forEach(figure => indexObserver.observe(figure));
  }

  const sectionAliases = {home:'overview',intro:'overview',work:'photographs',about:'story',paths:'story',news:'facts',contact:'facts',case:'case-study',joint:'delivered-together'};
  function section(id) {
    const destination = document.getElementById(sectionAliases[id] || id);
    if (destination) destination.scrollIntoView({behavior:'instant'});
  }
  addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent) return;
    if (event.data?.type === 'ljc-motion') setMotion(event.data.paused);
    if (event.data?.type === 'ljc-section') section(event.data.id);
  });
  media.addEventListener('change', () => setMotion(paused));
  setMotion(paused, false);
  if (query.get('section')) section(query.get('section'));
  if (query.get('reader') === '1' && casePages.length) openCase(0,document.querySelector('[data-read-case]'));
  document.dispatchEvent(new CustomEvent('ljc-project-rendered', {detail:{theme,project:project.id}}));
  if (parent !== window) parent.postMessage({type:'ljc-ready',theme,view:'project',project:project.id},'*');
})();
