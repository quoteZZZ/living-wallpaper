/* ============================================================
 * Solstice 场景编辑器（内核服务，设置中心可开关）
 * ------------------------------------------------------------
 * 直接操纵方案（DESIGN §4.8，源自用户构想并完善）：
 *   · 点击卡片 → 选中（显示 Gizmo 边框）；点天空=背景（只弹菜单）
 *   · 按住拖拽 → 移动卡片位置（太阳任意移、云带/山峦垂直移）
 *   · 右下角手柄 → 缩放（太阳圆盘半径 / 山峦起伏 / 云带厚度）
 *   · 右键卡片 → 菜单：显示/隐藏 · 重置位置 · 卡片设置…
 *   · 右键背景 → 菜单：场景设置… · 切换天气 · 重置全部卡片
 * 变换写入 S.cards[id].dx/dy/scale 并持久化；命中区域是程序化
 * 场景的近似包围盒（圆盘/水平带），T1 图片卡将改用 manifest 锚点区。
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice, S = K.S;
  let canvas, gizmo, handle, menu;
  let st=null;                       // 最近一帧仲裁状态（供命中/包围盒）
  let sel=null;                      // 选中的卡 id | null
  let drag=null;                     // {mode:'move'|'scale', ...}
  let on=false;

  const cssH=()=>innerHeight, cssW=()=>innerWidth;
  const enabled=()=>on && K.CFG.ui && S.editor;

  /* ---------- 命中检测（近似区域，优先级：日/月 > 云带 > 山峦） ---------- */
  function hitTest(x,y){
    if(!st) return null;
    const a=K.composer.aspect, uvy=1-y/cssH(), uvx=(x/cssW()-0.5)*a;
    const L=st.lum;
    const dx=uvx-L.x, dy=(uvy-0.5)-L.y;
    if(Math.hypot(dx,dy) < Math.max(L.r*1.7, .045)) return 'luminary';
    if(uvy > 0.60 + S.cards.clouds.dy) return null;           // 天空=背景
    if(uvy > 0.52 + S.cards.clouds.dy) return 'clouds';
    return 'mountains';
  }

  /* ---------- Gizmo 包围盒（css px） ---------- */
  function bbox(id){
    const a=K.composer.aspect;
    if(id==='luminary' && st){
      const L=st.lum;
      const cx=(0.5 + L.x/a)*cssW(), cy=(1-(0.5+L.y))*cssH();
      const r=Math.max(L.r*cssH()*1.35, 26);
      return {x:cx-r, y:cy-r, w:r*2, h:r*2, round:true};
    }
    if(id==='clouds' && st){
      const d=S.cards.clouds.dy;
      return {x:0, y:(0.03+d)*cssH(), w:cssW(), h:(0.45)*cssH(), round:false};
    }
    if(id==='mountains' && st){
      const d=S.cards.mountains.dy;
      return {x:0, y:(0.42-d)*cssH(), w:cssW(), h:cssH()-(0.42-d)*cssH(), round:false};
    }
    return null;
  }
  function drawGizmo(){
    if(!sel || !enabled()){ gizmo.style.display='none'; return; }
    const b=bbox(sel);
    if(!b){ gizmo.style.display='none'; return; }
    gizmo.style.display='block';
    gizmo.style.left=b.x+'px'; gizmo.style.top=b.y+'px';
    gizmo.style.width=b.w+'px'; gizmo.style.height=b.h+'px';
    gizmo.style.borderRadius=b.round?'50%':'6px';
    handle.style.display = (sel==='luminary'||sel==='mountains'||sel==='clouds')?'block':'none';
  }

  /* ---------- 变换换算 ---------- */
  const CLAMP={ luminary:{dx:1.2,dy:.55,sc:[.4,2.4]}, mountains:{dy:[-.2,.28],sc:[.4,2.2]}, clouds:{dy:[-.25,.25]} };
  function move(id,dxPx,dyPx){
    const u=1/cssH();                                    // css px → uv/suv 单位
    const c=S.cards[id];
    if(id==='luminary'){
      c.dx=K.util.clamp(c.dx+dxPx*u, -CLAMP.luminary.dx, CLAMP.luminary.dx);
      c.dy=K.util.clamp(c.dy-dyPx*u, -CLAMP.luminary.dy, CLAMP.luminary.dy);
    }else{
      c.dy=K.util.clamp(c.dy-dyPx*u, CLAMP[id].dy[0], CLAMP[id].dy[1]);
    }
  }
  function resetCard(id){
    const c=S.cards[id];
    c.dx=0; c.dy=0; if('scale' in c) c.scale=1;
    if(c.pref==='hide') c.pref='auto';
    K.saveCfg();
  }

  /* ---------- 右键菜单 ---------- */
  function item(label,fn){
    const b=document.createElement('button');
    b.textContent=label; b.onclick=e=>{ e.stopPropagation(); closeMenu(); fn(); };
    return b;
  }
  function openMenu(x,y,target){
    menu.innerHTML='';
    const t=k=>K.i18n.t(k);
    if(target){
      const rec=K.registry.cards().find(c=>c.card.id===target);
      const hidden=S.cards[target].pref==='hide';
      menu.appendChild(item(hidden?t('menuShow'):t('menuHide'),
        ()=>{ S.cards[target].pref=hidden?'auto':'hide'; K.saveCfg(); }));
      if('dx' in S.cards[target]||'dy' in S.cards[target])
        menu.appendChild(item(t('menuReset'),()=>resetCard(target)));
      if(rec) menu.appendChild(item(t('menuSettings'),()=>K.panel.open(rec.plugin.manifest.id)));
    }else{
      menu.appendChild(item(t('menuScene'),()=>K.panel.open()));
      menu.appendChild(item(t('menuWeather'),
        ()=>{ S.weather=S.weather==='clear'?'rain':'clear'; K.ctx.weather=S.weather; K.saveCfg(); }));
      menu.appendChild(item(t('menuResetAll'),()=>{
        for(const c of K.registry.cards()) resetCard(c.card.id);
      }));
    }
    menu.style.display='block';
    const mw=menu.offsetWidth, mh=menu.offsetHeight;
    menu.style.left=Math.min(x, cssW()-mw-8)+'px';
    menu.style.top =Math.min(y, cssH()-mh-8)+'px';
  }
  function closeMenu(){ menu.style.display='none'; }

  function select(id){ sel=id; drawGizmo(); }

  /* ---------- 初始化 ---------- */
  function init(){
    canvas=K.composer.canvas;
    on=true;

    gizmo=document.createElement('div'); gizmo.id='gizmo';
    handle=document.createElement('div'); handle.id='gzHandle';
    gizmo.appendChild(handle);
    menu=document.createElement('div'); menu.id='ctxMenu';
    document.body.append(gizmo,menu);

    canvas.addEventListener('pointerdown',e=>{
      if(e.button!==0) return;
      closeMenu();
      const target=hitTest(e.clientX,e.clientY);
      select(target);
      if(target && (target==='luminary'||target==='clouds'||target==='mountains')){
        drag={mode:'move',id:target,x:e.clientX,y:e.clientY};
        try{ canvas.setPointerCapture(e.pointerId); }catch(_){/* 合成事件 */}
      }
    });
    canvas.addEventListener('pointermove',e=>{
      if(!drag||drag.mode!=='move') return;
      move(drag.id, e.clientX-drag.x, e.clientY-drag.y);
      drag.x=e.clientX; drag.y=e.clientY;
      drawGizmo();
    });
    canvas.addEventListener('pointerup',()=>{ if(drag){ drag=null; K.saveCfg(); } });

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
      const [lo,hi]=id==='luminary'?CLAMP.luminary.sc:CLAMP.mountains.sc;
      c.scale=K.util.clamp(drag.s0*f, lo, hi);
      drawGizmo();
    });
    handle.addEventListener('pointerup',()=>{ if(drag){ drag=null; K.saveCfg(); } });

    canvas.addEventListener('contextmenu',e=>{
      e.preventDefault();
      const target=hitTest(e.clientX,e.clientY);
      select(target);
      openMenu(e.clientX,e.clientY,target);
    });
    addEventListener('pointerdown',e=>{
      if(!menu.contains(e.target) && e.target!==canvas) closeMenu();
    },true);
    addEventListener('keydown',e=>{ if(e.key==='Escape'){ select(null); closeMenu(); } });
    addEventListener('resize',drawGizmo);
  }

  K.editor = {
    init,
    tick(s){ st=s; drawGizmo(); },
    setEnabled(v){ on=v; if(!v){ select(null); closeMenu(); } },
    enabled:()=>enabled(),
    get selected(){ return sel; },
  };
})();
