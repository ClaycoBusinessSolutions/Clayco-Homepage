import { MOTION_SECTIONS } from './motion-catalog.js';

const CSS_URL = new URL('./motion-adapter.css?v=sam-b-20261019-5', import.meta.url).href;
const EASE = 'cubic-bezier(.2,.8,.2,1)';
const WIPE = 'cubic-bezier(.77,0,.18,1)';
const MAPS = {
  'dohyoung-task-first': {header:'.cs-header',hero:'.cb-photo',banner:'.cb-statement',industries:'#markets',cta:'#careers',approach:'#integrated',featured:'#finder',values:null,footer:'.cf-offices'},
  'dohyoung-gallery': {header:'.cg-header',hero:'.cg-cover',banner:'#intro',industries:'.cg-market-row',cta:null,approach:'#integrated',featured:'#work',values:null,footer:'.cf'},
  'sam-alcarez-new': {header:'.site-header',hero:'#home-hero',banner:'.mission',industries:'.markets',cta:'.careers-band',approach:'.integrated',featured:'.work',values:'.band-values',footer:'.site-footer'},
  'sam-bromley': {header:'.site-header',hero:'.hero#top',banner:'.mission',industries:'#mlist',cta:'.careers',approach:'.integrated',featured:'.work#work',values:null,footer:'.site-footer'},
  'sam-alcarez-original': {header:'.site-header',hero:'#home-hero',banner:'.mission',industries:'.units',cta:'.careers',approach:'.integrated',featured:'.work',values:'.values',footer:'.site-footer'},
};
const CARD_SELECTORS = {
  industries:'.cb-market, .market-tiles > li, .units .card, .cg-market-row li',
  approach:'.cb-flow-step, .cg-steps > li, .integrated-card',
  featured:'.cb-proj, .cg-project, .work-slide',
  values:'.band-values > li, .values-grid > .value',
  footer:'.office, .cf-og-details, .cf-office',
};
const ZONES = [['St. Louis','America/Chicago'],['Chicago','America/Chicago'],['South Carolina','America/New_York'],['Kansas City','America/Chicago'],['Phoenix','America/Phoenix'],['Culver City','America/Los_Angeles'],['Birmingham','America/Chicago'],['Atlanta','America/New_York'],['Raleigh','America/New_York']];

/** Same-origin comparison enhancement. Designer files are never rewritten. */
export class MotionAdapter {
  constructor(iframe, {designId, local=false} = {}) {
    this.iframe=iframe; this.designId=designId; this.local=local; this.contexts=new Map(); this.settings={}; this.paused=false; this.destroyed=false;
  }
  async initialize() {
    this.doc=this.iframe.contentDocument; this.win=this.iframe.contentWindow;
    if (!this.doc?.body) throw new Error('The design is not ready or is not on the same origin.');
    this.root=this.doc.documentElement; this.map=MAPS[this.designId] || {};
    this.motionWasOff=this.root.classList.contains('motion-off');
    if(this.designId==='sam-bromley')this.initializeSamB();
    this.reduce=this.win.matchMedia('(prefers-reduced-motion: reduce)');
    this.styleLink=this.doc.createElement('link'); this.styleLink.rel='stylesheet'; this.styleLink.href=CSS_URL; this.styleLink.dataset.reviewAdapter='true';
    this.doc.head.append(this.styleLink);
    await new Promise(resolve=>{this.styleLink.onload=resolve;this.styleLink.onerror=resolve;this.win.setTimeout(resolve,1500);});
    if(this.destroyed)return this;
    this.onPreference=()=>{if(this.reduce.matches){for(const ctx of this.contexts.values())for(const animation of ctx.animations)if(animation.effect?.getTiming().iterations!==Infinity){try{animation.finish();}catch{}}}this.syncActivity();};
    this.reduce.addEventListener('change',this.onPreference);
    this.onVisibility=()=>this.syncActivity(); this.doc.addEventListener('visibilitychange',this.onVisibility);
    this.onParentVisibility=()=>this.syncActivity(); this.iframe.ownerDocument.addEventListener('visibilitychange',this.onParentVisibility);
    this.nativeToggleStates=new Map([...this.doc.querySelectorAll('.slides-toggle')].map(button=>[button,{paused:this.reduce.matches,disabled:button.disabled}]));
    this.onNativeToggle=e=>{const state=this.nativeToggleStates.get(e.target.closest?.('.slides-toggle'));if(state)state.paused=!state.paused;};
    this.doc.addEventListener('click',this.onNativeToggle,true);
    this.onNativeMotionState=e=>{if(this.nativeSuppressed&&this.sameOrigin(e)&&e.source===this.win&&e.data?.type==='ljc-motion-state')for(const button of this.nativeMotionControls?.keys()||[])button.disabled=true;};
    this.iframe.ownerDocument.defaultView.addEventListener('message',this.onNativeMotionState);
    this.onNativePlay=e=>{if(this.nativeSuppressed && e.target?.tagName==='VIDEO')e.target.pause();};
    this.doc.addEventListener('play',this.onNativePlay,true);
    return this;
  }
  // Opened from disk the browser reports file pages as origin "null" and drops messages addressed to "file://".
  sameOrigin(e) { return e.origin===this.win.location.origin || (this.win.location.protocol==='file:' && e.origin==='null'); }
  notifyDesign(data) {
    if(!this.local){this.win.postMessage(data,this.win.location.origin);return;}
    // Running inside the page (offline package): deliver it as the review's message would arrive,
    // synchronously, then keep the designer's own motion toggles locked while Sofia's layer is on.
    this.win.dispatchEvent(new this.win.MessageEvent('message',{data,origin:this.win.location.origin,source:this.win.parent}));
    if(this.nativeSuppressed)for(const button of this.nativeMotionControls?.keys()||[])button.disabled=true;
  }
  target(id) { return this.map[id] ? this.doc.querySelector(this.map[id]) : null; }
  cards(id) {
    const target=this.target(id);
    const samSelectors={industries:':scope > li',approach:'.cos > .co',featured:'#show > .s',footer:'.offices > div'};
    return target ? [...target.querySelectorAll((this.designId==='sam-bromley'&&samSelectors[id])||CARD_SELECTORS[id]||':scope > *')] : [];
  }
  initializeSamB() {
    // This source keeps its project records and timer handles in top-level lexical
    // bindings. A small same-document bridge exposes only those documented hooks.
    // The supplied HTML stays unchanged, and Original restores both native timers.
    const script=this.doc.createElement('script');
    script.textContent=`(() => {
      if(typeof HERO==='undefined'||typeof M==='undefined'||typeof v!=='function'||typeof hero!=='function'||typeof go!=='function')return;
      const originalHero=window.hero, originalGo=window.go;let suspended=false;
      const project=p=>({src:v(p.i,'1.6571428571429',1400),alt:p.t,title:p.t,href:p.u,target:''});
      const stop=()=>{clearTimeout(ht);clearTimeout(timer);};
      window.hero=function(...args){const result=originalHero.apply(this,args);if(suspended)stop();return result;};
      window.go=function(...args){const result=originalGo.apply(this,args);if(suspended)stop();return result;};
      window.__claycoReviewSamB={
        items(kind){return (kind==='hero'?HERO:(M[mk]||M[0]).s).map(project);},
        suspend(on){if(suspended===on)return;suspended=on;if(on)stop();else{originalHero(hi<0?0:hi);originalGo(si);}},
        destroy(){window.hero=originalHero;window.go=originalGo;if(suspended){originalHero(hi<0?0:hi);originalGo(si);}delete window.__claycoReviewSamB;}
      };
    })();`;
    this.doc.head.append(script);script.remove();
    this.samB=this.win.__claycoReviewSamB;
    this.root.setAttribute('data-review-designer','sam-bromley');
  }
  projectItems(kind='featured') {
    if(this.designId==='sam-bromley')return this.samB?.items(kind)||[];
    return this.cards('featured').map(card=>{const image=card.querySelector('img'),link=card.querySelector('a[href]');return {src:image?.currentSrc||image?.src,alt:image?.alt||'',title:card.querySelector('h3,h4')?.textContent?.trim()||image?.alt||'Featured project',href:link?.href||'#',target:link?.target||'',project:link?.dataset.projectId};}).filter(item=>item.src);
  }
  getSections() {
    return MOTION_SECTIONS.map(section=>{
      const target=this.target(section.id); const cards=this.cards(section.id);
      let note='', available=Boolean(target);
      if(!target) note='This design has no corresponding section.';
      if(section.id==='hero') { available=this.projectItems('hero').length>1;note='Preview adaptation: replaces the original '+(this.designId.startsWith('sam-')?'video hero':'static image composition')+' with a slider using this design’s real featured-project images and names. Original restores the designer’s hero.'; }
      if(section.id==='featured'&&this.projectItems().length<2){available=false;note='At least two project cards are needed for this transition.';}
      if(section.id==='featured'&&available)note=this.designId.startsWith('sam-')?'Uses the original project images, titles and links in Sofia’s carousel styles. Continuous drift reverses at the end, so projects are not duplicated.':'Preview adaptation: the project grid becomes a carousel while motion is selected. Original restores the grid. Continuous drift reverses at the end, so projects are not duplicated.';
      if(section.id==='banner'&&target)note='Applied to this design’s mission section. In designs with a text-only brand statement, the same reveal is applied to the statement instead of a photograph.';
      if(section.id==='industries'&&this.designId==='dohyoung-gallery')note='This design uses text market links. Staggered rise is available; photo hover reveal is not.';
      if(section.id==='values'&&this.designId==='sam-alcarez-new')note='Applied to the three values within the mission band. Media-based effects are unavailable because these cards have no independent photographs.';
      if(section.id==='footer'&&this.designId.startsWith('dohyoung'))note='Applied to the visible office panel. Selecting an office reveals its details and local time.';
      if(this.designId==='sam-bromley'){
        if(section.id==='hero')note='Preview adaptation: uses the five photographs, names and project links from Sam B’s original hero. Original restores the original headline, statistics and slideshow.';
        if(section.id==='featured')note='Uses the projects in the selected market. Market tabs remain available; Original restores Sam B’s slideshow and thumbnails.';
        if(section.id==='industries')note='This design uses text market tabs. Staggered rise is available; photo hover reveal is not.';
        if(section.id==='approach')note='Applied to all five companies in Sam B’s original enterprise row.';
      }
      const options=section.options.map(option=>{
        let enabled=option.id==='o'||(option.available&&available), why=option.note;
        if(option.id!=='o'&&!available)why=note;
        if(section.id==='industries'&&option.id==='b'&&(this.designId==='dohyoung-gallery'||this.designId==='sam-bromley')){enabled=false;why='Photo hover reveal requires a photo grid; this design uses text links.';}
        if(section.id==='values'&&option.id==='a'&&this.designId==='sam-alcarez-new'){enabled=false;why='Fade & lift requires an image for each values block.';}
        if(section.id==='featured'&&option.id==='c'&&enabled)why='Adapted to a finite track that reverses at the end. All projects remain individually accessible without duplicate cards.';return {...option,available:enabled,...(why?{note:why}:{})};
      });
      return {...section,available,options,note};
    });
  }
  apply(settings={}, {paused=false}={}) {
    if(this.destroyed)return;
    const next={...(settings.m||settings)};
    const unchanged=MOTION_SECTIONS.every(s=>(next[s.id]||'o')===(this.settings[s.id]||'o'));
    this.settings=next;this.paused=paused;this.root.toggleAttribute('data-review-motion-paused',paused);
    if(unchanged&&this.contexts.size){this.syncActivity();return;}
    this.clear();
    const sections=this.getSections();
    for(const s of sections){const mode=this.settings[s.id]||'o';if(!s.options.some(o=>o.id===mode&&o.available))this.settings[s.id]='o';}
    const hasCustom=sections.some(s=>(this.settings[s.id]||'o')!=='o');
    this.suppressNative(hasCustom||paused||this.reduce.matches);
    this.root.classList.toggle('review-motion-active',hasCustom);
    if(this.reduce.matches)return;
    for(const s of sections){const mode=this.settings[s.id]||'o';if(mode!=='o')this.setup(s.id,mode);}
    this.syncActivity();
  }
  suppressNative(on) {
    if(on&&!this.nativeSuppressed){
      this.nativeSuppressed=true;this.nativeVideos=[];this.nativeToggles=[];this.nativeMotionControls=new Map([...this.doc.querySelectorAll('[data-motion-toggle]')].map(button=>[button,button.disabled]));
      for(const button of this.nativeMotionControls.keys())button.disabled=true;
      this.root.classList.add('motion-off','review-native-paused');
      this.samB?.suspend(true);
      if(this.designId.startsWith('dohyoung'))this.notifyDesign({type:'ljc-motion',paused:true});
      // Use the designers’ own controls when their slideshows expose a pause control.
      for(const [button,state] of this.nativeToggleStates){if(!state.paused){button.click();this.nativeToggles.push(button);}button.disabled=true;}
      for(const video of this.doc.querySelectorAll('video')){if(!video.paused)this.nativeVideos.push(video);video.pause();}
      this.doc.querySelectorAll('.reveal-ready').forEach(el=>el.classList.add('is-revealed'));
      // Settle Sam’s fullscreen introduction through its documented skip interaction.
      if(this.root.classList.contains('intro-lock'))this.win.dispatchEvent(new this.win.Event('wheel'));
    }else if(!on&&this.nativeSuppressed){
      this.nativeSuppressed=false;this.root.classList.remove('review-native-paused');
      this.samB?.suspend(false);
      this.root.classList.toggle('motion-off',this.motionWasOff);
      if(this.designId.startsWith('dohyoung'))this.notifyDesign({type:'ljc-motion',paused:this.motionWasOff});
      for(const [button,disabled] of this.nativeMotionControls||[])if(button.isConnected)button.disabled=disabled;
      this.nativeMotionControls=new Map();
      for(const [button,state] of this.nativeToggleStates)button.disabled=state.disabled;
      for(const b of this.nativeToggles||[])if(b.isConnected&&this.nativeToggleStates.get(b)?.paused)b.click();
      for(const video of this.nativeVideos||[])if(video.isConnected&&this.visible(video)&&!this.reduce.matches)video.play().catch(()=>{});
      this.nativeVideos=[];this.nativeToggles=[];
    }
  }
  context(id) {
    const ctx={id,el:this.target(id),animations:new Set(),cleanups:[],nodes:[],styles:new Map(),attributes:new Map(),active:false,seen:false,activities:[]};
    this.contexts.set(id,ctx);return ctx;
  }
  style(ctx,el,props) {
    if(!el)return;
    for(const [property,value] of Object.entries(props)){
      const key=property.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
      if(!ctx.styles.has(el))ctx.styles.set(el,new Map());
      if(!ctx.styles.get(el).has(key))ctx.styles.get(el).set(key,[el.style.getPropertyValue(key),el.style.getPropertyPriority(key)]);
      el.style.setProperty(key,value);
    }
  }
  attribute(ctx,el,name,value){if(!ctx.attributes.has(el))ctx.attributes.set(el,new Map());if(!ctx.attributes.get(el).has(name))ctx.attributes.get(el).set(name,el.getAttribute(name));value===null?el.removeAttribute(name):el.setAttribute(name,value);}
  listen(ctx,target,type,fn,options){target.addEventListener(type,fn,options);ctx.cleanups.push(()=>target.removeEventListener(type,fn,options));}
  node(ctx,parent,tag='span',className='',text='') {const el=this.doc.createElement(tag);el.className=className;el.textContent=text;el.dataset.reviewMotion='';parent.append(el);ctx.nodes.push(el);return el;}
  animate(ctx,el,frames,duration=800,delay=0,extra={}) {
    if(!el||this.paused||this.reduce.matches||this.destroyed)return null;
    const animation=el.animate(frames,{duration,delay,easing:EASE,fill:'backwards',...extra});
    ctx.animations.add(animation);animation.finished.then(()=>{if(!['forwards','both'].includes(extra.fill)){ctx.animations.delete(animation);animation.cancel();}},()=>ctx.animations.delete(animation));return animation;
  }
  visible(el){const r=el.getBoundingClientRect();return r.bottom>0&&r.top<this.win.innerHeight&&r.width>0&&r.height>0;}
  watch(ctx,callback,{repeat=false}={}){
    const io=new this.win.IntersectionObserver(entries=>entries.forEach(entry=>{ctx.active=entry.isIntersecting;if(ctx.active&&(!ctx.seen||repeat)){ctx.seen=true;callback();}this.syncActivity();}),{threshold:.08});
    io.observe(ctx.watchEl||ctx.el);ctx.cleanups.push(()=>io.disconnect());
  }
  loop(ctx,callback,delay){let timer=null;const tick=()=>{timer=null;if(!this.contexts.has(ctx.id)||!this.canRun(ctx))return;callback();timer=this.win.setTimeout(tick,delay);};ctx.activities.push(active=>{if(active&&timer===null)timer=this.win.setTimeout(tick,delay);else if(!active&&timer!==null){this.win.clearTimeout(timer);timer=null;}});ctx.cleanups.push(()=>this.win.clearTimeout(timer));}
  canRun(ctx){return !this.paused&&!this.reduce.matches&&!this.doc.hidden&&!this.iframe.ownerDocument.hidden&&ctx.active&&!ctx.hover&&!ctx.userPaused;}
  syncActivity(){for(const ctx of this.contexts.values()){const active=this.canRun(ctx);if(ctx.pauseControl){const locked=this.paused||this.reduce.matches;ctx.pauseControl.disabled=locked;ctx.pauseControl.textContent=this.reduce.matches?'Reduced motion':this.paused?'Paused':ctx.userPaused?'Play':'Pause';ctx.pauseControl.setAttribute('aria-label',locked?'Motion paused by the review controls':(ctx.userPaused?'Play ':'Pause ')+(ctx.id==='hero'?'hero':'project')+' motion');}for(const a of ctx.animations)if(a.playState!=='finished'){if(active)a.play();else a.pause();}ctx.activities.forEach(fn=>fn(active));}}
  setup(id,mode){const ctx=this.context(id);if(!ctx.el)return;this.attribute(ctx,ctx.el,'data-review-section',id);this.attribute(ctx,ctx.el,'data-review-mode',mode);this[id](ctx,mode);}
  goTo(id){const el=this.contexts.get(id)?.watchEl||this.target(id);if(!el)return false;el.scrollIntoView({behavior:this.paused||this.reduce.matches?'instant':'smooth',block:'start'});return true;}
  replay(id){if(this.paused||this.reduce.matches)return false;if(!id){const modes={...this.settings};this.clear();for(const section of this.getSections()){const mode=modes[section.id]||'o';if(mode!=='o')this.setup(section.id,mode);}this.syncActivity();return true;}const mode=this.settings[id]||'o';this.goTo(id);if(mode==='o')return false;this.clearContext(id);this.setup(id,mode);return true;}
  clearContext(id){const ctx=this.contexts.get(id);if(!ctx)return;this.contexts.delete(id);ctx.cleanups.reverse().forEach(fn=>fn());ctx.animations.forEach(a=>a.cancel());ctx.nodes.reverse().forEach(n=>n.remove());for(const[el,props]of ctx.styles)for(const[prop,[value,priority]]of props)value?el.style.setProperty(prop,value,priority):el.style.removeProperty(prop);for(const[el,attrs]of ctx.attributes)for(const[name,value]of attrs)value===null?el.removeAttribute(name):el.setAttribute(name,value);}
  clear(){for(const id of [...this.contexts.keys()])this.clearContext(id);}
  destroy(){if(this.destroyed)return;this.clear();this.suppressNative(false);this.root.classList.remove('review-motion-active');this.root.removeAttribute('data-review-motion-paused');this.styleLink?.remove();this.samB?.destroy();if(this.designId==='sam-bromley')this.root.removeAttribute('data-review-designer');this.reduce?.removeEventListener('change',this.onPreference);this.doc?.removeEventListener('visibilitychange',this.onVisibility);this.iframe.ownerDocument.removeEventListener('visibilitychange',this.onParentVisibility);this.doc?.removeEventListener('play',this.onNativePlay,true);this.doc?.removeEventListener('click',this.onNativeToggle,true);this.iframe.ownerDocument.defaultView.removeEventListener('message',this.onNativeMotionState);this.destroyed=true;}

  header(ctx,mode){
    ctx.active=true;const el=ctx.el,logo=el.querySelector('.brand,.cg-brand,.logo,.site-logo,a:first-child');
    if(this.win.getComputedStyle(el).position==='static')this.style(ctx,el,{position:'sticky',top:'0',zIndex:'30'});
    let lastY=this.win.scrollY,frame=0,headerHidden=false;const progress=mode==='a'?this.node(ctx,el,'span','motion-header-rule'):null;
    if(progress){this.style(ctx,el,{position:this.win.getComputedStyle(el).position==='static'?'relative':this.win.getComputedStyle(el).position});this.animate(ctx,logo,[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0)'}],1100);}
    const update=()=>{frame=0;if(this.paused||this.reduce.matches)return;const y=this.win.scrollY,dy=y-lastY;lastY=y;if(mode==='a')progress.style.transform=`scaleX(${Math.max(0,Math.min(1,y/Math.max(1,this.root.scrollHeight-this.win.innerHeight)))})`;if(mode==='b'&&!el.contains(this.doc.activeElement)){const hide=dy>3&&y>this.win.innerHeight*.6?true:dy<-3||y<120?false:headerHidden;if(hide!==headerHidden){const from=this.win.getComputedStyle(el).transform;headerHidden=hide;const transform=hide?'translateY(-110%)':'translateY(0)';this.style(ctx,el,{transform});this.animate(ctx,el,[{transform:from==='none'?'translateY(0)':from},{transform}],450);}}if(mode==='c'){const p=Math.min(1,y/240);this.style(ctx,el,{backdropFilter:`blur(${p*14}px)`,backgroundColor:`rgba(255,255,255,${p*.9})`});if(logo)this.style(ctx,logo,{transform:`${this.designId==='sam-bromley'?'translate(-50%,-50%) ':''}scale(${1-p*.12})`,transformOrigin:'left center'});}};
    this.style(ctx,el,{transition:'transform .45s cubic-bezier(.2,.8,.2,1)'});this.listen(ctx,this.win,'scroll',()=>{if(!frame)frame=this.win.requestAnimationFrame(update);},{passive:true});ctx.cleanups.push(()=>this.win.cancelAnimationFrame(frame));update();
    if(mode==='a'&&this.designId==='sam-bromley'){
      const observer=new this.win.MutationObserver(()=>{if(this.doc.body.classList.contains('menu-open'))[...this.doc.querySelectorAll('.nav-panel > ul > li')].forEach((link,i)=>this.animate(ctx,link,[{opacity:0,transform:'translateX(-20px)'},{opacity:1,transform:'translateX(0)'}],550,Math.min(i*45,450)));});
      observer.observe(this.doc.body,{attributes:true,attributeFilter:['class']});ctx.cleanups.push(()=>observer.disconnect());
    }
    if(mode==='a'){const observer=new this.win.MutationObserver(records=>{for(const r of records){const dialog=r.target;if(dialog.matches?.('dialog[open]')){const links=[...dialog.querySelectorAll('nav a,.nav-link,.cmm-title')].slice(0,20);links.forEach((link,i)=>this.animate(ctx,link,[{opacity:0,transform:'translateX(-24px)'},{opacity:1,transform:'translateX(0)'}],550,Math.min(i*45,500)));}}});observer.observe(this.doc.body,{subtree:true,attributes:true,attributeFilter:['open']});ctx.cleanups.push(()=>observer.disconnect());}
  }
  hero(ctx,mode) {
    const items=this.projectItems('hero');
    if(items.length<2)return;
    const original=this.designId==='dohyoung-gallery'?ctx.el.querySelector('.cg-cover-images'):ctx.el;
    const bounds=original.getBoundingClientRect();
    const shell=this.node(ctx,original.parentElement,'section','motion-hero');original.after(shell);
    shell.setAttribute('aria-label','Featured project hero motion preview');shell.setAttribute('aria-roledescription','carousel');
    const heightCap=Math.max(420,this.designId.startsWith('sam-')?595:bounds.height);
    shell.style.height=this.designId.startsWith('sam-alcarez-')?'clamp(26.25rem,72svh,37.1875rem)':`clamp(420px,72svh,${heightCap}px)`;
    this.attribute(ctx,original,'hidden','');this.style(ctx,original,{display:'none'});this.attribute(ctx,original,'aria-hidden','true');this.attribute(ctx,original,'inert','');ctx.watchEl=shell;
    const slides=items.map((item,i)=>{const slide=this.node(ctx,shell,'article','motion-hero-slide');slide.setAttribute('aria-label',`${i+1} of ${items.length}`);const link=this.node(ctx,slide,'a','motion-hero-link');link.href=item.href;if(item.target){link.target=item.target;link.rel='noopener';}if(item.project){link.dataset.projectStudy='';link.dataset.projectId=item.project;}const image=this.node(ctx,link,'img','motion-hero-image');image.src=item.src;image.alt=item.alt;image.loading=i>1?'lazy':'eager';image.draggable=false;const caption=this.node(ctx,link,'div','motion-hero-caption');this.node(ctx,caption,'p','','Featured project');this.node(ctx,caption,'h2','',item.title);this.node(ctx,caption,'span','','Explore project ↗');return slide;});
    const curtain=this.node(ctx,shell,'span','motion-hero-curtain');curtain.setAttribute('aria-hidden','true');
    const controls=this.node(ctx,shell,'div','motion-hero-controls');const prev=this.node(ctx,controls,'button','','←');prev.type='button';prev.setAttribute('aria-label','Previous hero project');const counter=this.node(ctx,controls,'span','','1 / '+items.length);const play=this.node(ctx,controls,'button','','Pause');play.type='button';play.setAttribute('aria-label','Pause hero motion');ctx.pauseControl=play;const next=this.node(ctx,controls,'button','','→');next.type='button';next.setAttribute('aria-label','Next hero project');
    let index=0,busy=false,photoAnimation;
    const set=i=>{index=i;counter.textContent=`${i+1} / ${items.length}`;slides.forEach((slide,j)=>{slide.style.visibility=j===i?'visible':'hidden';slide.style.zIndex=j===i?'2':'1';slide.inert=j!==i;});const active=slides[i];if(photoAnimation){photoAnimation.cancel();ctx.animations.delete(photoAnimation);}if(mode==='c'){photoAnimation=this.animate(ctx,active.querySelector('img'),[{transform:'scale(1.12) translateX(-1%)'},{transform:'scale(1)'}],7000,0,{fill:'forwards'});const words=active.querySelectorAll('h2,p,span');words.forEach((word,j)=>this.animate(ctx,word,[{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],850,j*100+150));}else [...active.querySelector('.motion-hero-caption').children].forEach((child,j)=>this.animate(ctx,child,[{opacity:0,transform:'translateX(-28px)'},{opacity:1,transform:'translateX(0)'}],750,j*100));};
    const go=direction=>{if(busy)return;const old=slides[index],n=(index+direction+slides.length)%slides.length,incoming=slides[n];if(this.paused||this.reduce.matches){set(n);return;}busy=true;
      if(mode==='a'){const enter=this.animate(ctx,curtain,[{transform:'scaleX(0)',transformOrigin:'left'},{transform:'scaleX(1)',transformOrigin:'left'}],480,0,{easing:WIPE,fill:'forwards'});enter?.finished.then(()=>{set(n);return this.animate(ctx,curtain,[{transform:'scaleX(1)',transformOrigin:'right'},{transform:'scaleX(0)',transformOrigin:'right'}],600,0,{easing:WIPE,fill:'forwards'})?.finished;}).then(()=>busy=false,()=>busy=false);
      }else{incoming.style.visibility='visible';incoming.style.zIndex='3';const options=mode==='b'?[{transform:`translateX(${direction*100}%)`},{transform:'translateX(0)'}]:[{opacity:0},{opacity:1}];if(mode==='b')this.animate(ctx,old,[{transform:'translateX(0)'},{transform:`translateX(${-direction*100}%)`}],700);this.animate(ctx,incoming,options,mode==='b'?700:1200)?.finished.then(()=>{set(n);busy=false;},()=>busy=false);}
    };
    this.listen(ctx,prev,'click',()=>go(-1));this.listen(ctx,next,'click',()=>go(1));this.listen(ctx,play,'click',()=>{ctx.userPaused=!ctx.userPaused;play.textContent=ctx.userPaused?'Play':'Pause';play.setAttribute('aria-label',ctx.userPaused?'Play hero motion':'Pause hero motion');this.syncActivity();});
    this.listen(ctx,shell,'pointerenter',()=>{ctx.hover=true;this.syncActivity();});this.listen(ctx,shell,'pointerleave',()=>{ctx.hover=false;this.syncActivity();});this.listen(ctx,shell,'focusin',()=>{ctx.hover=true;this.syncActivity();});this.listen(ctx,shell,'focusout',e=>{if(!shell.contains(e.relatedTarget)){ctx.hover=false;this.syncActivity();}});
    if(mode==='b'){let down=null,moved=false;this.listen(ctx,shell,'pointerdown',e=>{if(e.button===0&&!e.target.closest('button')){down=e.clientX;moved=false;}});this.listen(ctx,shell,'pointermove',e=>{if(down!==null&&Math.abs(e.clientX-down)>8)moved=true;});this.listen(ctx,shell,'pointerup',e=>{if(down===null)return;const delta=e.clientX-down;down=null;if(Math.abs(delta)>50)go(delta<0?1:-1);});this.listen(ctx,shell,'pointercancel',()=>down=null);this.listen(ctx,shell,'click',e=>{if(moved){e.preventDefault();moved=false;}},true);}
    this.listen(ctx,shell,'keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();go(e.key==='ArrowRight'?1:-1);}});
    set(0);this.watch(ctx,()=>{});this.loop(ctx,()=>go(1),7000);
  }
  media(el){return el.querySelector('.cg-cover-lead [data-gallery-arc], .media, .band-slides, figure, .hero-media')||el.querySelector('img')?.parentElement||el;}
  cover(ctx,el,kind='lift',delay=0){
    if(this.paused||this.reduce.matches)return;
    if(el.matches('img,video'))el=el.parentElement;const pos=this.win.getComputedStyle(el).position;if(pos==='static')this.style(ctx,el,{position:'relative'});
    const panel=this.node(ctx,el,'span','motion-cover');panel.setAttribute('aria-hidden','true');
    const frames=kind==='wipe'?[{transform:'scaleX(1)',transformOrigin:'right'},{transform:'scaleX(0)',transformOrigin:'right'}]:[{transform:'scaleY(1)',transformOrigin:'top'},{transform:'scaleY(0)',transformOrigin:'top'}];
    this.animate(ctx,panel,frames,1050,delay,{easing:WIPE,fill:'forwards'})?.finished.then(()=>panel.remove(),()=>{});
  }
  banner(ctx,mode){const media=this.media(ctx.el);this.watch(ctx,()=>{if(mode==='a'){this.cover(ctx,media,'lift');this.animate(ctx,media.querySelector('img')||media,[{transform:'translateY(28px)'},{transform:'translateY(0)'}],1200);}else if(mode==='b'){this.animate(ctx,media,[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0)'}],1400,0,{easing:WIPE});const edge=this.node(ctx,media,'span','motion-leading-edge');this.style(ctx,media,{position:'relative'});this.animate(ctx,edge,[{left:'0%',opacity:1},{left:'100%',opacity:0}],1400,0,{fill:'forwards'})?.finished.then(()=>edge.remove(),()=>{});}else{this.style(ctx,media,{position:'relative'});const line=this.node(ctx,media,'span','motion-center-rule');this.animate(ctx,line,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],500);this.animate(ctx,media,[{clipPath:'inset(49.8% 0 49.8% 0)'},{clipPath:'inset(0)'}],1000,500,{easing:WIPE});this.animate(ctx,line,[{opacity:1},{opacity:0}],200,1300,{fill:'forwards'})?.finished.then(()=>line.remove(),()=>{});}});}
  industries(ctx,mode){const cards=this.cards('industries');this.watch(ctx,()=>cards.forEach((card,i)=>{if(mode==='c'){this.animate(ctx,card,[{opacity:0,transform:'translateY(36px)'},{opacity:1,transform:'translateY(0)'}],850,(i%3)*100);const img=card.querySelector('img');this.animate(ctx,img,[{transform:'scale(1.06)'},{transform:'scale(1)'}],1100,(i%3)*100);}else{const media=this.media(card);this.animate(ctx,media,[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0)'}],1000,(i%3)*100,{easing:WIPE});}}));if(mode==='b')cards.forEach(card=>{const img=card.querySelector('img'),title=card.querySelector('h3,h4,.cb-market-name,.unit-caption');const over=this.node(ctx,this.media(card),'span','motion-explore-bar','Explore →');over.setAttribute('aria-hidden','true');this.style(ctx,this.media(card),{position:'relative',overflow:'hidden'});const enter=()=>{this.animate(ctx,img,[{transform:'scale(1)'},{transform:'scale(1.06)'}],600,0,{fill:'forwards'});this.animate(ctx,over,[{transform:'translateY(100%)'},{transform:'translateY(0)'}],450,0,{fill:'forwards'});if(title)this.style(ctx,title,{textDecoration:'underline',textDecorationColor:'#e2231a',textUnderlineOffset:'8px'});};const leave=()=>{this.animate(ctx,img,[{transform:'scale(1.06)'},{transform:'scale(1)'}],600,0,{fill:'forwards'});this.animate(ctx,over,[{transform:'translateY(0)'},{transform:'translateY(100%)'}],350,0,{fill:'forwards'});if(title)this.style(ctx,title,{textDecoration:'none'});};this.listen(ctx,card,'pointerenter',enter);this.listen(ctx,card,'pointerleave',leave);this.listen(ctx,card,'focusin',enter);this.listen(ctx,card,'focusout',leave);});}
  splitWords(ctx,el){if(!el)return[];const words=[],walker=this.doc.createTreeWalker(el,4);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const original of nodes){if(!original.textContent.trim())continue;const frag=this.doc.createDocumentFragment(),wrappers=[];for(const token of original.textContent.split(/(\s+)/)){if(!token.trim()){frag.append(this.doc.createTextNode(token));continue;}const span=this.doc.createElement('span');span.className='motion-word';span.textContent=token;frag.append(span);words.push(span);wrappers.push(span);}const marker=this.doc.createComment('motion words');original.replaceWith(marker,frag);ctx.cleanups.push(()=>{const first=marker.nextSibling;let node=first;let text='';while(node&&text.length<original.textContent.length){const next=node.nextSibling;text+=node.textContent;node.remove();node=next;}marker.replaceWith(original);});}return words;}
  cta(ctx,mode){const heading=ctx.el.querySelector('h1,h2,h3');if(mode==='a'){const words=this.splitWords(ctx,heading);this.watch(ctx,()=>{words.forEach((word,i)=>{this.animate(ctx,word,[{opacity:0,transform:'translateY(1em)'},{opacity:1,transform:'translateY(0)'}],650,i*70);if(/clayco/i.test(word.textContent)){this.style(ctx,word,{backgroundImage:'linear-gradient(#e2231a,#e2231a)',backgroundRepeat:'no-repeat',backgroundPosition:'0 100%'});this.animate(ctx,word,[{backgroundSize:'0% 40%'},{backgroundSize:'100% 40%'}],600,words.length*70);}});[...ctx.el.querySelectorAll('a,button')].forEach((b,i)=>this.animate(ctx,b,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],500,words.length*70+i*80));});}else if(mode==='b'){this.watch(ctx,()=>{this.cover(ctx,ctx.el,'wipe');[...ctx.el.querySelectorAll('a,button')].forEach(b=>this.style(ctx,b,{borderColor:'#e2231a'}));});}else{this.style(ctx,ctx.el,{position:'relative',overflow:'hidden',isolation:'isolate'});const marquee=this.node(ctx,ctx.el,'div','motion-marquee');marquee.setAttribute('aria-hidden','true');marquee.textContent=('Build with Clayco — Careers — Subcontractors & Vendors — ').repeat(4);const anim=this.animate(ctx,marquee,[{transform:'translateX(0)'},{transform:'translateX(-50%)'}],40000,0,{iterations:Infinity,easing:'linear'});this.watch(ctx,()=>{});let previous=this.win.scrollY;this.listen(ctx,this.win,'scroll',()=>{if(!anim||!ctx.active)return;const delta=this.win.scrollY-previous;previous=this.win.scrollY;anim.playbackRate=(delta<0?-1:1)*Math.min(3,1+Math.abs(delta)/80);},{passive:true});}}
  approach(ctx,mode){const cards=this.cards('approach');if(!cards.length)return;const parent=cards[0].parentElement;if(mode==='a'){
      this.attribute(ctx,parent,'data-motion-expanding','');cards.forEach((c,i)=>this.style(ctx,c,{'--motion-company':this.designId==='sam-bromley'?this.win.getComputedStyle(c).getPropertyValue('--c').trim():['#66676b','#5b3d59','#e2231a'][i%3]}));let current=0;const choose=i=>{current=i;cards.forEach((c,j)=>this.attribute(ctx,c,'data-motion-selected',String(j===i)));if(this.win.innerWidth>760)this.style(ctx,parent,{gridTemplateColumns:cards.map((_,j)=>j===i?'1.35fr':'1fr').join(' ')});};cards.forEach((c,i)=>{this.listen(ctx,c,'pointerenter',()=>{ctx.hover=true;choose(i);this.syncActivity();});this.listen(ctx,c,'focusin',()=>{ctx.hover=true;choose(i);this.syncActivity();});});this.listen(ctx,parent,'pointerleave',()=>{ctx.hover=parent.contains(this.doc.activeElement);this.syncActivity();});this.listen(ctx,parent,'focusout',e=>{if(!parent.contains(e.relatedTarget)){ctx.hover=parent.matches(':hover');this.syncActivity();}});this.watch(ctx,()=>choose(0));this.loop(ctx,()=>choose((current+1)%cards.length),4000);
    }else this.watch(ctx,()=>cards.forEach((c,i)=>{this.style(ctx,c,{position:'relative'});const rail=this.node(ctx,c,'span','motion-relay-rule');rail.style.background=mode==='b'?'#252622':'#e2231a';this.animate(ctx,rail,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],650,i*450);this.animate(ctx,c,[{opacity:.5,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],600,i*450);}));}
  featured(ctx,mode){
    const originalContainer=ctx.el.querySelector(this.designId==='sam-bromley'?'#show':'.cb-finder-grid,.cg-project-grid,.work-frame');if(!originalContainer)return;
    const items=this.projectItems().map(item=>({...item,image:item.src}));
    if(items.length<2)return;this.attribute(ctx,originalContainer,'hidden','');this.attribute(ctx,originalContainer,'aria-hidden','true');this.attribute(ctx,originalContainer,'inert','');
    for(const controls of ctx.el.querySelectorAll(this.designId==='sam-bromley'?'#thumbs':'.work-dots,.cb-finder-controls,.cb-finder-status,.cb-filters'))this.attribute(ctx,controls,'hidden','');
    const shell=this.node(ctx,originalContainer.parentElement,'div','motion-carousel');originalContainer.after(shell);shell.setAttribute('aria-roledescription','carousel');shell.setAttribute('aria-label','Featured projects motion preview');shell.dataset.kind=mode;
    const viewport=this.node(ctx,shell,'div','motion-carousel-viewport');const track=this.node(ctx,viewport,'div','motion-carousel-track');
    const slides=items.map((item,i)=>{const slide=this.node(ctx,track,'article','motion-carousel-slide');slide.setAttribute('role','group');slide.setAttribute('aria-label',`${i+1} of ${items.length}`);const link=this.node(ctx,slide,'a','motion-carousel-link');link.href=item.href;if(item.target){link.target=item.target;link.rel='noopener';}if(item.project){link.dataset.projectStudy='';link.dataset.projectId=item.project;}
      const img=this.node(ctx,link,'img','motion-carousel-image');img.src=item.image;img.alt=item.alt;img.loading=i?'lazy':'eager';img.decoding='async';img.draggable=false;const caption=this.node(ctx,link,'div','motion-carousel-caption');this.node(ctx,caption,'h3','',item.title);this.node(ctx,caption,'span','','Explore project ↗');return slide;});
    const controls=this.node(ctx,shell,'div','motion-carousel-controls');const prev=this.node(ctx,controls,'button','','←');prev.type='button';prev.setAttribute('aria-label','Previous project');const count=this.node(ctx,controls,'span','','1 / '+items.length);count.setAttribute('aria-live','polite');const play=this.node(ctx,controls,'button','','Pause');play.type='button';play.setAttribute('aria-label','Pause project motion');ctx.pauseControl=play;const next=this.node(ctx,controls,'button','','→');next.type='button';next.setAttribute('aria-label','Next project');
    let index=0,busy=false,userPause=false,drift;
    const update=()=>{count.textContent=`${index+1} / ${items.length}`;slides.forEach((s,i)=>{s.toggleAttribute('data-current',i===index);if(mode==='a'){s.style.visibility=i===index?'visible':'hidden';s.inert=i!==index;}else{s.style.visibility='visible';s.inert=false;}});if(mode==='b'){const target=slides[index];track.style.transform=`translateX(${-target.offsetLeft+(viewport.clientWidth-target.offsetWidth)/2}px)`;}};
    const go=direction=>{if(busy)return;if(mode==='c'){viewport.scrollBy({left:direction*(slides[0].offsetWidth+24),behavior:'smooth'});return;}const old=index;index=(index+direction+items.length)%items.length;if(this.paused||this.reduce.matches){update();return;}if(mode==='a'){busy=true;slides[index].style.visibility='visible';slides[index].style.zIndex='2';this.animate(ctx,slides[index],[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0)'}],900,0,{easing:WIPE})?.finished.then(()=>{slides[old].style.zIndex='';slides[index].style.zIndex='';update();busy=false;},()=>{busy=false;});this.animate(ctx,slides[index].querySelector('.motion-carousel-caption'),[{opacity:0,transform:'translateX(-24px)'},{opacity:1,transform:'translateX(0)'}],700,350);}else update();};
    this.listen(ctx,prev,'click',()=>go(-1));this.listen(ctx,next,'click',()=>go(1));this.listen(ctx,play,'click',()=>{userPause=!userPause;play.textContent=userPause?'Play':'Pause';play.setAttribute('aria-label',userPause?'Play project motion':'Pause project motion');ctx.userPaused=userPause;this.syncActivity();});
    this.listen(ctx,shell,'pointerenter',()=>{ctx.hover=true;this.syncActivity();});this.listen(ctx,shell,'pointerleave',()=>{ctx.hover=false;this.syncActivity();});this.listen(ctx,shell,'focusin',()=>{ctx.hover=true;this.syncActivity();});this.listen(ctx,shell,'focusout',e=>{if(!shell.contains(e.relatedTarget)){ctx.hover=false;this.syncActivity();}});
    let startX=null,moved=false;this.listen(ctx,viewport,'pointerdown',e=>{if(e.button!==0)return;startX=e.clientX;moved=false;});this.listen(ctx,viewport,'pointermove',e=>{if(startX!==null&&Math.abs(e.clientX-startX)>8)moved=true;});this.listen(ctx,viewport,'pointerup',e=>{if(startX===null)return;const dx=e.clientX-startX;startX=null;if(Math.abs(dx)>50)go(dx<0?1:-1);});this.listen(ctx,viewport,'pointercancel',()=>startX=null);this.listen(ctx,viewport,'click',e=>{if(moved){e.preventDefault();moved=false;}},true);
    this.listen(ctx,shell,'keydown',e=>{if(e.target.closest('input,textarea'))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();go(e.key==='ArrowRight'?1:-1);}});
    update();this.watch(ctx,()=>{});this.loop(ctx,()=>{if(!userPause&&mode!=='c')go(1);},6000);
    if(mode==='c'){
      // The leading card is the current project; at the far end select the final visible card.
      // Updating the label never changes the transform or scroll position.
      const syncDriftIndex=()=>{const left=viewport.scrollLeft,max=viewport.scrollWidth-viewport.clientWidth,origin=slides[0].offsetLeft;let nearest=0,distance=Infinity;if(max>1&&left>=max-1)nearest=slides.length-1;else slides.forEach((slide,i)=>{const d=Math.abs(slide.offsetLeft-origin-left);if(d<distance){distance=d;nearest=i;}});if(nearest===index)return;index=nearest;count.textContent=`${index+1} / ${items.length}`;slides.forEach((slide,i)=>slide.toggleAttribute('data-current',i===index));};
      this.listen(ctx,viewport,'scroll',syncDriftIndex,{passive:true});this.listen(ctx,this.win,'resize',syncDriftIndex,{passive:true});syncDriftIndex();
      // Continuous drift uses a finite, reversible track. It never fabricates projects or traps vertical scrolling.
      let last=0,raf=0,direction=1;const tick=time=>{raf=0;if(!this.canRun(ctx)||userPause)return;const delta=Math.min(40,time-(last||time));const max=viewport.scrollWidth-viewport.clientWidth;viewport.scrollLeft+=direction*delta*.035;if(viewport.scrollLeft>=max-1)direction=-1;else if(viewport.scrollLeft<=1)direction=1;last=time;raf=this.win.requestAnimationFrame(tick);};ctx.activities.push(active=>{if(active&&!raf){last=0;raf=this.win.requestAnimationFrame(tick);}else if(!active&&raf){this.win.cancelAnimationFrame(raf);raf=0;last=0;}});ctx.cleanups.push(()=>this.win.cancelAnimationFrame(raf));
    }
    this.listen(ctx,this.win,'resize',update,{passive:true});
    if(this.designId==='sam-bromley')this.listen(ctx,this.doc.querySelector('#mlist'),'click',e=>{
      if(!e.target.closest('button[data-k]'))return;
      this.clearContext('featured');this.setup('featured',mode);this.syncActivity();
    });
  }
  values(ctx,mode){const cards=this.cards('values');this.watch(ctx,()=>cards.forEach((card,i)=>{if(mode==='a'){const media=this.media(card);this.cover(ctx,media,'lift',i*100);[...card.querySelectorAll('h3,p,a')].forEach((text,j)=>this.animate(ctx,text,[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],700,i*100+j*90));}else if(mode==='b'){const media=card.querySelector('.media');if(media)this.animate(ctx,media,[{opacity:0,transform:'translateX(44px)'},{opacity:1,transform:'translateX(0)'}],1000,i*100);[...card.children].filter(x=>x!==media).forEach(x=>this.animate(ctx,x,[{opacity:0,transform:'translateX(-36px)'},{opacity:1,transform:'translateX(0)'}],1000,i*100));}else{const number=this.node(ctx,card,'div','motion-drawn-number');card.prepend(number);number.setAttribute('aria-hidden','true');const svg=this.doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 190 116');const text=this.doc.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('x','2');text.setAttribute('y','100');text.textContent=String(i+1).padStart(2,'0');svg.append(text);number.append(svg);this.animate(ctx,text,[{strokeDashoffset:1000},{strokeDashoffset:0}],1800,i*200);}}));}
  footer(ctx,mode){const cards=this.cards('footer');if(mode==='b'){
      const clocks=cards.map(card=>{const label=card.querySelector(this.designId==='sam-bromley'?'b':'h3,strong')?.textContent?.trim()||card.textContent;const zone=ZONES.find(([name])=>label.includes(name));if(!zone)return null;const clock=this.node(ctx,card,'p','motion-office-clock');const formatter=new Intl.DateTimeFormat('en-US',{timeZone:zone[1],hour:'numeric',minute:'2-digit',second:'2-digit',timeZoneName:'short'});const heading=card.querySelector(this.designId==='sam-bromley'?'b':'h3,strong');if(heading)this.attribute(ctx,heading,'data-motion-office-name','');return {clock,formatter};}).filter(Boolean);const tick=()=>clocks.forEach(({clock,formatter})=>clock.textContent=formatter.format(new Date()));tick();this.watch(ctx,()=>tick());this.loop(ctx,tick,1000);
    }else{
      const reveal=card=>{if(!this.visible(card))return;const i=cards.indexOf(card);if(mode==='a'){this.style(ctx,card,{position:'relative'});this.cover(ctx,card,'lift',Math.floor(i/3)*80);const rule=this.node(ctx,card,'span','motion-relay-rule');rule.style.background='#e2231a';}else{this.animate(ctx,card,[{opacity:0,transform:'translateY(-22px)'},{opacity:1,transform:'translateY(0)'}],750,i*70);this.style(ctx,card,{position:'relative'});const rule=this.node(ctx,card,'span','motion-relay-rule');this.animate(ctx,rule,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],700,i*70+200);}};
      this.watch(ctx,()=>cards.forEach(reveal));if(this.designId.startsWith('dohyoung')){const observer=new this.win.MutationObserver(records=>{for(const record of records)if(record.target.matches('.cf-og-panel')&&!record.target.hidden){const card=record.target.querySelector('.cf-og-details');if(card)reveal(card);}});observer.observe(ctx.el,{subtree:true,attributes:true,attributeFilter:['hidden']});ctx.cleanups.push(()=>observer.disconnect());}
    }
  }
}
