import { MOTION_SECTIONS, MOTION_PRESETS } from './motion-catalog.js';
import { MotionAdapter } from './motion-adapter.js?v=20261029';
import { RemoteMotionAdapter, FRAME_TARGET, fromFrame } from './motion-bridge.js?v=20261019-offline';

const DESIGNS = {
  'dohyoung-task-first': {designer:'Dohyoung Kim',title:'Task-first',home:'../../animated/clayco-b.html',theme:'clayco-b',projects:'../../animated/project-clayco-b.html',cases:'../../animated/clayco-case-studies.html'},
  'dohyoung-gallery': {designer:'Dohyoung Kim',title:'Gallery',home:'../../animated/clayco-gallery.html',theme:'clayco-gallery',projects:'../../animated/project-clayco-gallery.html',cases:'../../animated/clayco-gallery-case-studies.html'},
  'sam-alcarez-new': {designer:'Sam Alcarez',title:'New version',home:'designs/sam-alcarez-new/index.html',notes:'Supplied prototype: Search and some links are placeholders. News copy is sample content.'},
  'sam-alcarez-original': {designer:'Sam Alcarez',title:'Tweaked original',home:'designs/sam-alcarez-original/index.html',notes:'Supplied prototype: Menu, Search and some links are placeholders. News copy is sample content.'},
  'sam-bromley': {designer:'Sam Bromley',title:'Homepage redesign',home:'../Sam%20B%20homepage-redesign.html'}
};
const $ = id => document.getElementById(id);
const frame = $('preview');
const REVIEW_VERSION = '20261019-review-ready-2';
const keys = MOTION_SECTIONS.map(s=>s.id);
const query = new URLSearchParams(location.search);
// The review opens on Sam Alcarez's first option unless the link names a design.
let designId = DESIGNS[query.get('design')] ? query.get('design') : 'sam-alcarez-original';
let settings = Object.fromEntries(keys.map(id=>[id,'o']));
const initialMix = query.get('mix');
if (initialMix && /^[oabc]{9}$/.test(initialMix)) keys.forEach((id,i)=>settings[id]=initialMix[i]);
else if (query.has('family')) settings = preset(query.get('family'));
let paused = query.get('motion') === 'off';
let device = query.get('device') === 'mobile' ? 'mobile' : 'desktop';
// On a phone-sized window the design already renders at phone width, so the mockup is skipped.
const narrowScreen = matchMedia('(max-width: 700px)');
const PHONE = {width:434,height:906};
let activeSection = keys.includes(query.get('at')) ? query.get('at') : '';
let adapter = null, pendingAdapter = null, availability = [], currentPage = null, generation = 0, loadTimer = 0, toastTimer = 0;
let documentCleanup = null, presenting = false, readerPresent = false, controlsOpen = false;
let saved = [], selectedSaved = '', lastSearch = location.search;
const STORAGE = 'claycoLeadership.motionSets.v1';
try { const value=JSON.parse(localStorage.getItem(STORAGE)||'[]'); if(Array.isArray(value)) saved=value.filter(s=>typeof s?.name==='string'&&typeof s?.id==='string'&&s.settings&&keys.every(k=>['o','a','b','c'].includes(s.settings[k]))).slice(0,30); } catch {}

function preset(id) {
  if(id==='o') return Object.fromEntries(keys.map(k=>[k,'o']));
  const p=MOTION_PRESETS.find(p=>p.id===id);
  return {...Object.fromEntries(keys.map(k=>[k,'o'])),...(p?.settings||{})};
}
function family() { return ['o','a','b','c'].find(id=>keys.every(k=>preset(id)[k]===settings[k])) || 'custom'; }
function status(message) { $('toast').textContent=message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3500); }
function urlState(replace=true) {
  const url=new URL(location.href); url.search=''; url.searchParams.set('design',designId);
  if(family()!=='custom') url.searchParams.set('family',family()); else url.searchParams.set('mix',keys.map(k=>settings[k]).join(''));
  if(paused) url.searchParams.set('motion','off');
  if(device==='mobile') url.searchParams.set('device','mobile');
  if(activeSection)url.searchParams.set('at',activeSection);
  history[replace?'replaceState':'pushState'](null,'',url);lastSearch=location.search;
}
function isHome() { try{return new URL(currentPage||DESIGNS[designId].home,location.href).pathname===new URL(DESIGNS[designId].home,location.href).pathname;}catch{return false;} }
function renderTop() {
  const d=DESIGNS[designId];
  document.querySelectorAll('[data-design]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.design===designId)));
  document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preset===family())));
  $('selected-credit').textContent=`${d.designer} / ${d.title}`;
  $('preview-description').textContent=`${d.designer} · ${d.title}${isHome()?'':' · Inside the design'}`;
  frame.title=`${d.designer} — ${d.title} design`;
  $('home').hidden=isHome();
  $('full-page').href=currentPage||d.home;
  $('pause').innerHTML=paused?'<span aria-hidden="true">▷</span> Play':'<span aria-hidden="true">Ⅱ</span> Pause';
  $('pause').setAttribute('aria-pressed',String(paused));
  const names={o:'Original design motion',a:'Block family',b:'Swipe family',c:'Linear family',custom:'Custom section mix'};
  $('motion-summary').textContent=names[family()];
  $('source-notes').hidden=!d.notes; $('source-note-copy').textContent=d.notes||'';
}
function renderControls() {
  const container=$('section-controls');
  const focusedId=container.contains(document.activeElement)?document.activeElement.id:null;
  container.replaceChildren();
  MOTION_SECTIONS.forEach((section,i)=>{
    const supported=availability.find(s=>s.id===section.id);
    const available=supported?.available!==false && !!supported;
    const row=document.createElement('article'); row.className='section-control';row.dataset.unavailable=String(!available);
    const top=document.createElement('div');top.className='section-top';
    const num=document.createElement('span');num.className='section-number';num.textContent=String(i+1).padStart(2,'0');
    const heading=document.createElement('h2');heading.textContent=section.label;
    const replay=document.createElement('button');replay.className='section-replay';replay.textContent='↻';replay.type='button';replay.setAttribute('aria-label',`Replay ${section.label}`);replay.disabled=!available;replay.addEventListener('click',()=>replaySection(section.id));
    top.append(num,heading,replay);
    const select=document.createElement('select');select.id=`motion-${section.id}`;select.setAttribute('aria-label',`${section.label} motion`);select.disabled=!available;
    const opts=supported?.options||section.options;
    section.options.forEach(option=>{
      const opt=document.createElement('option');opt.value=option.id;const match=opts?.find(o=>o.id===option.id);
      opt.textContent=option.id==='o'?'Original':`${option.id.toUpperCase()} · ${option.label}`;
      opt.disabled=option.available===false||match?.available===false;
      if(opt.disabled) opt.textContent+=' — unavailable';
      select.append(opt);
    });
    select.value=settings[section.id]||'o';
    select.addEventListener('change',()=>{settings[section.id]=select.value;selectedSaved='';applySettings();});
    const chosen=section.options.find(o=>o.id===settings[section.id]);
    const desc=document.createElement('p');desc.className='section-description';desc.textContent=chosen?.description||section.original||'';
    const note=document.createElement('p');note.className='section-note';
    const mode=opts?.find(o=>o.id===settings[section.id]);
    note.textContent=!available?(supported?.note||'This design does not include a matching section.'):(mode?.note||supported?.note||'');
    if(available&&mode?.available===false) note.textContent=`This treatment is unavailable here. Original layout retained. ${mode.note||''}`;
    row.append(top,select,desc);if(note.textContent)row.append(note);container.append(row);
  });
  const oldJump=activeSection; $('jump').replaceChildren(new Option('Top of page',''));
  availability.filter(s=>s.available!==false).forEach(s=>$('jump').append(new Option(s.label||MOTION_SECTIONS.find(c=>c.id===s.id)?.label,s.id)));
  if([...$('jump').options].some(o=>o.value===oldJump))$('jump').value=oldJump;
  if(controlsOpen&&focusedId){const control=$(focusedId);if(control&&!control.disabled)control.focus({preventScroll:true});}
}
function renderSaved() {
  $('saved-set').replaceChildren(new Option('Choose a saved set',''));
  saved.forEach(s=>$('saved-set').append(new Option(s.name,s.id)));
  $('saved-set').value=selectedSaved;
  $('delete-set').hidden=!selectedSaved;
}
function storeSets() { try{localStorage.setItem(STORAGE,JSON.stringify(saved));return true;}catch{$('storage-note').textContent='Browser storage unavailable; use Copy review link';status('Could not save in this browser. Copy the review link to keep your mix.');return false;} }
async function applySettings({write=true}={}) {
  const current=adapter;
  if(current) {try{await current.apply(settings,{paused});availability=current.getSections();}catch(error){if(current!==adapter)return;console.error('Motion could not be applied',error);status('This treatment could not be applied. Try Original.');}}
  if(current!==adapter)return;
  if(write)urlState();renderTop();renderControls();renderSaved();
}
function effectiveDevice() { return narrowScreen.matches ? 'desktop' : device; }
function renderDevice() {
  $('preview-stage').dataset.device=effectiveDevice();
  document.querySelectorAll('#device-toggle [data-device]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.device===device)));
  try{if(frame.contentDocument?.head)applyDeviceStyle(frame.contentDocument);}catch{}
  adapter?.setDevice?.(effectiveDevice());
  fitDevice();
}
function applyDeviceStyle(doc) {
  doc.querySelector('style[data-review-device]')?.remove();
  if(effectiveDevice()!=='mobile')return;
  // iPhone scrollbars overlay the page, so the design keeps the full 402px width.
  const style=doc.createElement('style');style.dataset.reviewDevice='mobile';
  style.textContent='html,html *{scrollbar-width:none!important}html::-webkit-scrollbar,html *::-webkit-scrollbar{display:none!important}';
  doc.head.append(style);
}
function fitDevice() {
  const stage=$('preview-stage');
  if(effectiveDevice()!=='mobile'){stage.style.removeProperty('--device-scale');stage.style.removeProperty('--device-x');return;}
  const width=stage.clientWidth,height=stage.clientHeight,margin=28,caption=36;
  let scale=Math.max(.2,Math.min(1,(height-margin*2-caption)/PHONE.height,(width-margin*2)/PHONE.width));
  // With the controls open, slide the phone left to clear the panel, shrinking it (to 60%) when the space is narrow.
  const panelLeft=controlsOpen?$('review-controls').getBoundingClientRect().left-24:width;
  if(controlsOpen)scale=Math.min(scale,Math.max(.6,(panelLeft-margin)/PHONE.width));
  let center=width/2;const half=PHONE.width*scale/2;
  if(center+half>panelLeft)center=Math.max(margin+half,panelLeft-half);
  stage.style.setProperty('--device-scale',scale.toFixed(4));
  stage.style.setProperty('--device-x',`${Math.round(center-width/2)}px`);
}
function setDevice(next) {
  if(next===device)return;
  device=next;renderDevice();
  // Reload so each design lays out from the start at the new width.
  loadDesign(currentPage);
}
function toggleControls(open,{focus=false}={}) {
  controlsOpen=open;$('review-controls').hidden=!open;
  $('controls-toggle').setAttribute('aria-expanded',String(open));
  $('controls-toggle').setAttribute('aria-label',open?'Close design and motion controls':'Open design and motion controls');
  $('controls-toggle').title=open?'Close controls':'Design & motion controls';
  if(!open&&focus)$('controls-toggle').focus({preventScroll:true});
  fitDevice();
}
$('controls-toggle').addEventListener('click',()=>toggleControls(!controlsOpen));
document.querySelectorAll('#device-toggle [data-device]').forEach(button=>button.addEventListener('click',()=>setDevice(button.dataset.device)));
document.addEventListener('pointerdown',event=>{if(controlsOpen&&!$('review-controls').contains(event.target)&&!$('controls-toggle').contains(event.target)&&!$('device-toggle').contains(event.target)&&!$('save-dialog').open)toggleControls(false);});
window.addEventListener('resize',fitDevice);
narrowScreen.addEventListener('change',renderDevice);
function toggleSettings(open){$('motion-panel').hidden=!open;$('settings-toggle').setAttribute('aria-expanded',String(open));$('settings-toggle').lastElementChild.textContent=open?'−':'+';}
async function replaySection(id) {if(!adapter)return;if(paused){status('Motion is paused. Select Play to preview.');return;}activeSection=id;toggleControls(false,{focus:true});await new Promise(requestAnimationFrame);await adapter.replay(id);$('jump').value=id;urlState();}

async function loadDesign(page=null,{push=false}={}) {
  generation++; const token=generation;
  adapter?.destroy();adapter=null;pendingAdapter?.destroy();pendingAdapter=null;documentCleanup?.();documentCleanup=null;availability=[];
  clearTimeout(loadTimer); $('loading').hidden=false;$('load-error').hidden=true;
  currentPage=new URL(page||DESIGNS[designId].home,location.href).href;
  // The adapter records native motion before applying the comparison layer,
  // so Original can return to the designer's own behavior without a reload.
  const url=new URL(currentPage);url.searchParams.set('motion','on');url.searchParams.set('leadership','1');url.searchParams.set('review',REVIEW_VERSION);
  frame.src=url.href;
  if(push)urlState(false);else urlState();renderTop();renderControls();
  loadTimer=setTimeout(()=>{if(token===generation){$('loading').hidden=true;$('load-error').hidden=false;}},20000);
}
function responsiveLayout() {
  return ['sam-alcarez-new','sam-alcarez-original'].includes(designId) ? new URL(`designs/${designId}-responsive.css?v=${REVIEW_VERSION}`, location.href).href : '';
}
async function loadResponsiveLayout(doc) {
  if (!responsiveLayout()) return;
  if (doc.querySelector('[data-review-responsive]')) return;
  const style = doc.createElement('link');
  style.rel = 'stylesheet';
  style.dataset.reviewResponsive = designId;
  style.href = responsiveLayout();
  await new Promise((resolve, reject) => {
    style.onload = resolve;
    style.onerror = () => reject(new Error('Responsive layout could not load'));
    doc.head.append(style);
  });
}
async function initializeRemote(token) {
  documentCleanup?.();documentCleanup=null;
  adapter?.destroy();adapter=null;pendingAdapter?.destroy();
  const remote=new RemoteMotionAdapter(frame,{designId});pendingAdapter=remote;
  try {
    await remote.initialize({device:effectiveDevice(),responsive:responsiveLayout()});
    if(token!==generation||pendingAdapter!==remote){remote.destroy();return;}
    pendingAdapter=null;adapter=remote;currentPage=remote.href||currentPage;
    await applySettings({write:false});
    if(token!==generation)return;
    if(isHome()&&activeSection)adapter?.goTo(activeSection);
  } catch(error) {
    if(token!==generation)return;
    remote.destroy();if(pendingAdapter===remote)pendingAdapter=null;
    console.error('Offline motion bridge unavailable',error);availability=[];renderControls();status('Design loaded; motion controls are unavailable on this page.');
  }
  $('loading').hidden=true;$('load-error').hidden=true;renderTop();
}
frame.addEventListener('load',async()=>{
  if(frame.src==='about:blank')return;
  const token=++generation;clearTimeout(loadTimer);
  let previewAvailable=false, initializingAdapter=null;
  try {
    const doc=frame.contentDocument;
    // Opened from disk the design is a separate origin: its packaged copy runs the motion layer and answers by message.
    if(!doc&&location.protocol==='file:'){await initializeRemote(token);return;}
    if(!doc?.documentElement||!doc.body)throw new Error('Preview document unavailable');
    currentPage=frame.contentWindow.location.href;previewAvailable=true;
    applyDeviceStyle(doc);
    await loadResponsiveLayout(doc);
    if(token!==generation)return;
    documentCleanup?.();
    // Public links leave the review in a separate tab; local prototype pages stay embedded.
    const linkHandler=event=>{const a=event.target.closest?.('a[href]');if(!a||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const href=new URL(a.href);if(/^https?:$/.test(href.protocol)&&href.origin!==location.origin){a.target='_blank';a.rel='noopener noreferrer';}};
    doc.addEventListener('click',linkHandler,true);
    const dismissControls=()=>{if(controlsOpen&&!$('save-dialog').open)toggleControls(false);};
    const previewKey=event=>{if(event.key==='Escape'&&controlsOpen){toggleControls(false,{focus:true});}};
    doc.addEventListener('pointerdown',dismissControls,true);doc.addEventListener('keydown',previewKey);
    documentCleanup=()=>{doc.removeEventListener('click',linkHandler,true);doc.removeEventListener('pointerdown',dismissControls,true);doc.removeEventListener('keydown',previewKey);};
    adapter?.destroy();adapter=null;pendingAdapter?.destroy();initializingAdapter=new MotionAdapter(frame,{designId});pendingAdapter=initializingAdapter;await initializingAdapter.initialize();
    if(token!==generation||pendingAdapter!==initializingAdapter){initializingAdapter.destroy();return;}
    pendingAdapter=null;adapter=initializingAdapter;
    await applySettings({write:false});
    if(isHome()&&activeSection)adapter.goTo?.(activeSection);
    $('loading').hidden=true;$('load-error').hidden=true;renderTop();
  } catch(error){if(token!==generation)return;initializingAdapter?.destroy();if(adapter===initializingAdapter)adapter=null;if(pendingAdapter===initializingAdapter)pendingAdapter=null;console.error('Preview initialization failed',error);$('loading').hidden=true;$('load-error').hidden=previewAvailable;availability=[];renderControls();if(previewAvailable)status('Design loaded; motion controls are unavailable on this page.');}
});

document.querySelectorAll('[data-design]').forEach(button=>button.addEventListener('click',()=>{if(designId===button.dataset.design)return;designId=button.dataset.design;loadDesign(null,{push:true});}));
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{settings=preset(button.dataset.preset);selectedSaved='';applySettings();}));
$('settings-toggle').addEventListener('click',()=>toggleSettings($('motion-panel').hidden));
$('pause').addEventListener('click',()=>{paused=!paused;applySettings();});
$('replay-all').addEventListener('click',()=>{if(!adapter)return;if(paused){status('Motion is paused. Select Play to preview.');return;}toggleControls(false,{focus:true});if(family()==='o')loadDesign(currentPage);else adapter.replay();status('Replaying motion in the current view');});
$('jump').addEventListener('change',()=>{activeSection=$('jump').value;toggleControls(false,{focus:true});if(activeSection)adapter?.goTo?.(activeSection);else if(adapter?.scrollTop)adapter.scrollTop();else frame.contentWindow?.scrollTo({top:0,behavior:'instant'});urlState();});
$('home').addEventListener('click',()=>loadDesign());$('retry').addEventListener('click',()=>loadDesign());
$('save-set').addEventListener('click',()=>{$('set-name').value='';$('save-dialog').showModal();$('set-name').focus();});
['cancel-save','cancel-save-bottom'].forEach(id=>$(id).addEventListener('click',()=>$('save-dialog').close()));
$('save-form').addEventListener('submit',event=>{event.preventDefault();const name=$('set-name').value.trim();if(!name)return;const id=`set-${Date.now()}`;saved.push({id,name,settings:{...settings}});if(saved.length>30)saved.shift();selectedSaved=id;if(storeSets())status(`Saved “${name}”`);renderSaved();$('save-dialog').close();});
$('saved-set').addEventListener('change',()=>{selectedSaved=$('saved-set').value;const item=saved.find(s=>s.id===selectedSaved);if(item){settings={...item.settings};applySettings();}else renderSaved();});
$('delete-set').addEventListener('click',()=>{const item=saved.find(s=>s.id===selectedSaved);saved=saved.filter(s=>s.id!==selectedSaved);selectedSaved='';storeSets();renderSaved();status(`Removed “${item?.name||'set'}”`);});
$('copy-link').addEventListener('click',async()=>{urlState();try{await navigator.clipboard.writeText(location.href);status(location.protocol==='file:'?'Link copied. It opens this offline package on this computer only.':'Review link copied with this design and motion mix.');}catch{status('Copy the address in your browser to keep this design and motion mix.');}});
function setPresentation(value,{reader=false}={}) {
  if(!value&&readerPresent)frame.contentWindow.postMessage({type:'ljc-reader-fullscreen-state',expanded:false},FRAME_TARGET);
  presenting=value;readerPresent=reader&&value;
  document.body.classList.toggle('presenting',value);
  $('presentation').setAttribute('aria-pressed',String(value));
  $('presentation').innerHTML=value?'Exit full screen <span aria-hidden="true">↙</span>':'Full screen <span aria-hidden="true">⤢</span>';
  toggleControls(false,{focus:$('review-controls').contains(document.activeElement)});
}
$('presentation').addEventListener('click',async()=>{
  if(presenting){setPresentation(false);if(document.fullscreenElement)await document.exitFullscreen?.();return;}
  setPresentation(true);try{await document.documentElement.requestFullscreen?.();}catch{status('The website fills this window. Browser fullscreen is unavailable.');}
});
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)setPresentation(false);});
document.addEventListener('keydown',event=>{if(event.key!=='Escape'||$('save-dialog').open)return;if(controlsOpen){event.preventDefault();toggleControls(false,{focus:true});}else if(presenting&&!document.fullscreenElement)setPresentation(false);});
window.addEventListener('message',event=>{
  if(!fromFrame(event,frame)||!event.data)return;
  const data=event.data,d=DESIGNS[designId];
  // Forwarded by the packaged pages, which cannot reach this document directly.
  if(data.type==='review-frame-pointerdown'&&controlsOpen&&!$('save-dialog').open)toggleControls(false);
  if(data.type==='review-frame-escape'&&controlsOpen)toggleControls(false,{focus:true});
  if(data.type==='ljc-motion-state')adapter?.nativeMotionState?.();
  if(data.type==='ljc-project'&&d.projects&&typeof data.project==='string'){const url=new URL(d.projects,location.href);url.searchParams.set('project',data.project);loadDesign(url.href);}
  if(data.type==='ljc-cases'&&d.cases){const url=new URL(d.cases,location.href);if(data.case)url.searchParams.set('case',data.case);loadDesign(url.href);}
  if(data.type==='ljc-home'){const url=new URL(d.home,location.href);if(data.section)url.searchParams.set('section',data.section);loadDesign(url.href);}
  if(data.type==='ljc-reverberation'){const url=new URL('../../animated/reverberation.html',location.href);url.searchParams.set('theme','ljc');for(const key of ['mode','story','chapter'])if(typeof data[key]==='string')url.searchParams.set(key,data[key]);window.open(url.href,'_blank','noopener');}
  if(data.type==='ljc-brand-project'&&typeof data.project==='string'){const url=new URL('../../animated/project-ljc.html',location.href);url.searchParams.set('project',data.project);window.open(url.href,'_blank','noopener');}
  if(data.type==='ljc-reader-fullscreen'){setPresentation(data.expanded===true,{reader:true});frame.contentWindow.postMessage({type:'ljc-reader-fullscreen-state',expanded:presenting},FRAME_TARGET);}
});
window.addEventListener('popstate',()=>{
  // A fragment-only change (the Skip to design link) is not a history step between reviews.
  if(location.search===lastSearch)return;lastSearch=location.search;
  const p=new URLSearchParams(location.search);if(DESIGNS[p.get('design')])designId=p.get('design');const mix=p.get('mix');settings=mix&&/^[oabc]{9}$/.test(mix)?Object.fromEntries(keys.map((k,i)=>[k,mix[i]])):preset(p.get('family')||'o');activeSection=keys.includes(p.get('at'))?p.get('at'):'';paused=p.get('motion')==='off';device=p.get('device')==='mobile'?'mobile':'desktop';renderDevice();loadDesign();});
window.addEventListener('pagehide',event=>{if(event.persisted)return;adapter?.destroy();pendingAdapter?.destroy();documentCleanup?.();});
renderSaved();renderDevice();loadDesign();
