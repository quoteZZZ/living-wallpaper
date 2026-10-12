/* ============================================================
 * Solstice 场景编辑器（内核服务，设置中心可开关）
 * ------------------------------------------------------------
 * 直接操纵方案（DESIGN §4.8）：
 *   · 悬停高亮 + 抓取光标；点击选中（Gizmo 虚线框 + 缩放手柄）
 *   · 拖拽移动（太阳/树任意方向；云带/山峦垂直）；手柄缩放
 *   · 双击卡片 = 重置变换；方向键微调（Shift×5）；Del 隐藏；Esc 取消
 *   · 右键卡片：显示/隐藏 · 更换变体▸ · 重置位置 · 卡片设置…
 *   · 右键背景：场景设置… · 天气▸ · 预设▸ · 前景树显隐 · 重置全部
 *   · 悬浮工具条：编辑开关 / 重置全部 / 场景设置
 * 变换写入 S.cards[id] 持久化；命中为近似包围盒，T1 图片卡改用
 * manifest 锚点区。前景树在最高层，命中优先级最高。
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice, S = K.S;
  let canvas, gizmo, handle, ghost, menu;
  let st=null;
  let sel=null, hover=null;
  let drag=null;
  let on=false;

  const cssH=()=>innerHeight, cssW=()=>innerWidth;
  const enabled=()=>on && K.CFG.ui && S.editor;
  const DRAGGABLE=new Set(['luminary','clouds','mountains','tree']);

  /* ---------- 命中检测（前景树 > 日/月 > 云带 > 山峦 > 天空） ---------- */
  function hitTest(x,y){
    if(!st) return null;
    const W=cssW(), H=cssH();
    if(st.treeOn){
      const r=K.composer.treeRect(st);
      if(x>=r.x*W && x<=(r.x+r.w)*W && y<=(r.y+r.h)*H && y>=r.y*H) return 'tree';
    }
    const a=K.composer.aspect, uvy=1-y/H, uvx=(x/W-0.5)*a;
    const L=st.lum;
    if(Math.hypot(uvx-L.x,(uvy-0.5)-L.y) < Math.max(L.r*1.7,.045)) return 'luminary';
    if(uvy > 0.60 + S.cards.clouds.dy) return null;
    if(uvy > 0.52 + S.cards.clouds.dy) return 'clouds';
    return 'mountains';
  }

  /* ---------- Gizmo / 悬停包围盒（css px） ---------- */
  function bbox(id){
    const W=cssW(), H=cssH(), a=K.composer.aspect;
    if(id==='tree' && st){
      const r=K.composer.treeRect(st);
      return {x:r.x*W, y:(1-(r.y+r.h))*H, w:r.w*W, h:r.h*H, round:false};
    }
    if(id==='luminary' && st){
      const L=st.lum;
      const cx=(0.5+L.x/a)*W, cy=(1-(0.5+L.y))*H;
      const r=Math.max(L.r*H*1.35, 26);
      return {x:cx-r, y:cy-r, w:r*2, h:r*2, round:true};
    }
    if(id==='clouds' && st){
      const d=S.cards.clouds.dy;
      return {x:0, y:(0.03+d)*H, w:W, h:0.45*H, round:false};
    }
    if(id==='mountains' && st){
      const d=S.cards.mountains.dy;
      return {x:0, y:(0.42-d)*H, w:W, h:H-(0.42-d)*H, round:false};
    }
    return null;
  }
  function place(el,b,thin){
    el.style.display='block';
    el.style.left=b.x+'px'; el.style.top=b.y+'px';
    el.style.width=b.w+'px'; el.style.height=b.h+'px';
    el.style.borderRadius=b.round?'50%':'8px';
    el.classList.toggle('thin',!!thin);
  }
  function drawGizmo(){
    if(!enabled()||!sel||!gizmo){ if(gizmo) gizmo.style.display='none'; }
    else{
      const b=bbox(sel);
      if(!b) gizmo.style.display='none';
      else { place(gizmo,b); handle.style.display=DRAGGABLE.has(sel)?'block':'none'; }
    }
    if(!gizmo) return;
    if(!enabled()||!hover||hover===sel||drag){ ghost.style.display='none'; }
    else { const hb=bbox(hover); hb?place(ghost,hb,true):ghost.style.display='none'; }
    canvas.style.cursor = drag?'grabbing' : (hover&&DRAGGABLE.has(hover))?'grab':'default';
  }

  /* ---------- 变换换算 ---------- */
  const CLAMP={ luminary:{dx:1.2,dy:.55,sc:[.4,2.4]}, mountains:{dy:[-.2,.28],sc:[.4,2.2]},
                clouds:{dy:[-.25,.25]}, tree:{dx:[-.2,.6],dy:[-.12,.2],sc:[.5,2.0]} };
  function move(id,dxPx,dyPx){
    const u=1/cssH(), c=S.cards[id];
    if(id==='luminary'){
      c.dx=K.util.clamp(c.dx+dxPx*u,-CLAMP.luminary.dx,CLAMP.luminary.dx);
      c.dy=K.util.clamp(c.dy-dyPx*u,-CLAMP.luminary.dy,CLAMP.luminary.dy);
    }else if(id==='tree'){
      c.dx=K.util.clamp(c.dx+dxPx/cssW(),CLAMP.tree.dx[0],CLAMP.tree.dx[1]);
      c.dy=K.util.clamp(c.dy-dyPx*u,CLAMP.tree.dy[0],CLAMP.tree.dy[1]);
    }else{
      c.dy=K.util.clamp(c.dy-dyPx*u,CLAMP[id].dy[0],CLAMP[id].dy[1]);
    }
  }
  function resetCard(id){
    const c=S.cards[id], d=K.DEFAULTS.cards[id]||{};
    for(const k of ['dx','dy']) if(k in c) c[k]=d[k]??0;
    if('scale' in c) c.scale=d.scale??1;
    if(c.pref==='hide') c.pref=d.pref||'auto';
    K.saveCfg();
  }

  /* ---------- 右键菜单（选择器项点击后展开圆盘） ---------- */
  let lastMenu={x:0,y:0,target:null};
  function menuButton(en){
    const b=document.createElement('button');
    b.textContent=(en.children?'› ':'')+(en.checked?'✓ ':'')+en.label;
    b.onclick=e=>{ e.stopPropagation();
      if(en.children) buildMenuPage(en.label,en.children);
      else { closeMenu(); en.fn&&en.fn(e); } };
    return b;
  }
  function buildMenuPage(title,entries){
    menu.innerHTML='';
    const back=document.createElement('button');
    back.className='back'; back.textContent='‹ '+title;
    back.onclick=e=>{ e.stopPropagation(); openMenu(lastMenu.x,lastMenu.y,lastMenu.target); };
    menu.appendChild(back);
    for(const en of entries) menu.appendChild(menuButton(en));
    menu.style.display='block';
    menu.style.left=Math.min(lastMenu.x,cssW()-menu.offsetWidth-8)+'px';
    menu.style.top =Math.min(lastMenu.y,cssH()-menu.offsetHeight-8)+'px';
  }
  function openMenu(x,y,target){
    lastMenu={x,y,target};
    menu.innerHTML='';
    const t=k=>K.i18n.t(k);
    const wxLabel=w=>t(w==='rain'?'rainy':w==='snow'?'snowy':w==='fog'?'foggy':w);
    if(target){
      const rec=K.registry.cards().find(c=>c.card.id===target);
      const hidden=S.cards[target].pref==='hide';
      menu.appendChild(menuButton({ label:hidden?t('menuShow'):t('menuHide'),
        fn:()=>{ S.cards[target].pref=hidden?(K.DEFAULTS.cards[target].pref||'auto'):'hide'; K.saveCfg(); } }));
      if(rec && rec.card.variants && rec.card.variants.length){
        const cur = S.cards[target].pref==='auto' ? K.ctx.seasonOf(new Date()) : S.cards[target].variant;
        const icons={spring:'🌸',summer:'🍃',autumn:'🍂',winter:'❄'};
        menu.appendChild(menuButton({ label:t('menuVariant'), fn:ev=>{
          openRadial(ev.clientX,ev.clientY,t('variant'),
            rec.card.variants.map(v=>({ icon:icons[v.id]||'•', label:v.name[K.i18n.lang]||v.id,
              checked:v.id===cur,
              fn:()=>{ S.cards[target].variant=v.id; S.cards[target].pref='show'; K.saveCfg(); } })));
        } }));
      }
      if('dx' in S.cards[target]||'dy' in S.cards[target])
        menu.appendChild(menuButton({ label:t('menuReset'), fn:()=>resetCard(target) }));
      if(rec) menu.appendChild(menuButton({ label:t('menuSettings'),
        fn:()=>K.panel.open(rec.plugin.manifest.id) }));
    }else{
      const pPreset=K.registry.plugin('official.presets');
      const adds=addableAssets();
      menu.appendChild(menuButton({ label:t('menuScene'), fn:()=>K.panel.open() }));
      if(adds.length)
        menu.appendChild(menuButton({ label:t('menuAdd'), fn:ev=>{
          openRadial(ev.clientX,ev.clientY,t('menuAdd'),adds);
        } }));
      menu.appendChild(menuButton({ label:t('menuWeather'), fn:ev=>{
        const icons={clear:'☀',cloudy:'☁',rain:'🌧',snow:'❄',fog:'🌫'};
        openRadial(ev.clientX,ev.clientY,t('weather'),
          ['clear','cloudy','rain','snow','fog'].map(w=>({ icon:icons[w], label:wxLabel(w),
            checked:S.weather===w,
            fn:()=>{ S.weather=w; K.ctx.weather=w; K.saveCfg(); } })));
      } }));
      if(pPreset) menu.appendChild(menuButton({ label:t('menuPreset'), fn:ev=>{
        const icons={minimal:'🍃',full:'🏞',night:'🌙'};
        openRadial(ev.clientX,ev.clientY,t('preset'),
          Object.entries(pPreset.manifest.presets).map(([id,p])=>({ icon:icons[id]||'•',
            label:p[K.i18n.lang]||id, checked:S.preset===id, fn:()=>pPreset.impl.apply(id) })));
      } }));
      menu.appendChild(menuButton({ label:t('menuResetAll'),
        fn:()=>{ for(const c of K.registry.cards()) resetCard(c.card.id); } }));
    }
    menu.style.display='block';
    menu.style.left=Math.min(x,cssW()-menu.offsetWidth-8)+'px';
    menu.style.top =Math.min(y,cssH()-menu.offsetHeight-8)+'px';
  }
  function closeMenu(){ menu.style.display='none'; }
  function select(id){ sel=id; drawGizmo(); }
  function setEnabled(v){
    on=v;
    if(!v){ select(null); hover=null; closeMenu(); closeRadial(); }
    drawGizmo();
  }

  /* ---------- 圆盘放射菜单（添加素材/变体/天气/预设，§4.8） ---------- */
  let radial=null;
  function closeRadial(){ if(radial){ radial.remove(); radial=null; } }
  function openRadial(x,y,title,items){
    closeRadial(); closeMenu();
    radial=document.createElement('div'); radial.id='radial';
    const R=94;
    const center=document.createElement('div'); center.className='rd-c';
    center.textContent=title;
    center.onclick=e=>{ e.stopPropagation(); closeRadial(); };
    radial.appendChild(center);
    const N=items.length;
    items.forEach((it,i)=>{
      const a=-Math.PI/2 + i*2*Math.PI/N;
      const el=document.createElement('div');
      el.className='rd-i'+(it.checked?' on':'');
      el.style.left=Math.cos(a)*R+'px';
      el.style.top =Math.sin(a)*R+'px';
      el.innerHTML=`<div class="rd-b">${it.icon||'•'}</div><div class="rd-l">${it.label}</div>`;
      el.onclick=e=>{ e.stopPropagation(); closeRadial(); it.fn&&it.fn(); };
      radial.appendChild(el);
    });
    document.body.appendChild(radial);
    radial.style.left=Math.min(Math.max(x,150),cssW()-150)+'px';
    radial.style.top =Math.min(Math.max(y,150),cssH()-150)+'px';
  }
  /* 可添加素材清单：未显示的声明式卡（随素材包自动扩充） */
  function addableAssets(){
    const t=k=>K.i18n.t(k);
    const out=[];
    for(const c of K.registry.cards()){
      if(c.card.id==='tree' && S.cards.tree.pref==='hide')
        out.push({ icon:'🌳', label:t('tree'), fn:()=>{ S.cards.tree.pref='auto'; K.saveCfg(); } });
    }
    return out;
  }

  /* ---------- 初始化 ---------- */
  function init(){
    canvas=K.composer.canvas;
    on=true;

    gizmo=document.createElement('div'); gizmo.id='gizmo';
    handle=document.createElement('div'); handle.id='gzHandle';
    gizmo.appendChild(handle);
    ghost=document.createElement('div'); ghost.id='ghost';
    menu=document.createElement('div'); menu.id='ctxMenu';
    document.body.append(gizmo,ghost,menu);

    canvas.addEventListener('pointerdown',e=>{
      if(e.button!==0) return;
      closeMenu();
      const target=hitTest(e.clientX,e.clientY);
      select(target);
      if(target && DRAGGABLE.has(target)){
        drag={mode:'move',id:target,x:e.clientX,y:e.clientY};
        try{ canvas.setPointerCapture(e.pointerId); }catch(_){/* 合成事件 */}
      }
    });
    canvas.addEventListener('pointermove',e=>{
      if(drag&&drag.mode==='move'){
        move(drag.id, e.clientX-drag.x, e.clientY-drag.y);
        drag.x=e.clientX; drag.y=e.clientY;
        drawGizmo();
        return;
      }
      const h=hitTest(e.clientX,e.clientY);
      if(h!==hover){ hover=h; drawGizmo(); }
    });
    canvas.addEventListener('pointerup',()=>{ if(drag){ drag=null; K.saveCfg(); } });
    canvas.addEventListener('pointerleave',()=>{ hover=null; drawGizmo(); });
    canvas.addEventListener('dblclick',e=>{
      const target=hitTest(e.clientX,e.clientY);
      if(target) resetCard(target);
    });
    canvas.addEventListener('contextmenu',e=>{
      e.preventDefault();
      const target=hitTest(e.clientX,e.clientY);
      select(target);
      openMenu(e.clientX,e.clientY,target);
    });

    handle.addEventListener('pointerdown',e=>{
      e.stopPropagation();
      const id=sel, b=bbox(id);
      if(!b) return;
      const cx=b.x+b.w/2, cy=b.y+b.h/2;
      drag={mode:'scale',id,d0:Math.max(20,Math.hypot(e.clientX-cx,e.clientY-cy)),s0:S.cards[id].scale||1};
      try{ handle.setPointerCapture(e.pointerId); }catch(_){/* 合成事件 */}
    });
    handle.addEventListener('pointermove',e=>{
      if(!drag||drag.mode!=='scale') return;
      const id=drag.id, b=bbox(id);
      const cx=b.x+b.w/2, cy=b.y+b.h/2;
      const f=Math.hypot(e.clientX-cx,e.clientY-cy)/drag.d0;
      const c=S.cards[id];
      const [lo,hi]=id==='tree'?CLAMP.tree.sc:(id==='luminary'?CLAMP.luminary.sc:CLAMP.mountains.sc);
      c.scale=K.util.clamp(drag.s0*f, lo, hi);
      drawGizmo();
    });
    handle.addEventListener('pointerup',()=>{ if(drag){ drag=null; K.saveCfg(); } });

    addEventListener('pointerdown',e=>{
      if(!menu.contains(e.target) && e.target!==canvas) closeMenu();
      if(radial && !radial.contains(e.target)) closeRadial();
    },true);
    addEventListener('keydown',e=>{
      if(e.key==='Escape'){ select(null); closeMenu(); closeRadial(); return; }
      if(!sel) return;
      const step=e.shiftKey?.02:.004, c=S.cards[sel];
      if(c && e.key==='ArrowLeft')  { if('dx'in c) c.dx-=step; K.saveCfg(); }
      if(c && e.key==='ArrowRight') { if('dx'in c) c.dx+=step; K.saveCfg(); }
      if(c && e.key==='ArrowUp')    { if('dy'in c) c.dy+=step; K.saveCfg(); }
      if(c && e.key==='ArrowDown')  { if('dy'in c) c.dy-=step; K.saveCfg(); }
      if(c && (e.key==='Delete'||e.key==='Backspace')){ c.pref='hide'; K.saveCfg(); }
      drawGizmo();
    });
    addEventListener('resize',drawGizmo);
  }

  K.editor = {
    init,
    tick(s){ st=s; drawGizmo(); },
    setEnabled,
    enabled:()=>enabled(),
    toggle(){ S.editor=!S.editor; setEnabled(S.editor); K.saveCfg(); },
    resetAll(){ for(const c of K.registry.cards()) resetCard(c.card.id); },
    get selected(){ return sel; },
  };
})();
