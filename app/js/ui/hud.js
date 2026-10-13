/* ============================================================
 * Solstice 游戏 HUD（v0.5 新增，内核服务⑦）
 * ------------------------------------------------------------
 * 底部 Dock = 玩法动词入口（天气/时间/搭建/伙伴/场景/编辑/设置），
 * 按钮注册制：插件可贡献按钮（K.hud.add），与 settingsGroups 同思路。
 * 弹出面板 = 纸签风 popover，单例容器，点外部关闭。
 * 游戏为主、壁纸为输出：壁纸态(ui=0)整条 Dock 不渲染。
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice, S = K.S;
  const save = ()=>K.saveCfg();
  const t = k=>K.i18n.t(k);

  let dockEl=null, popEl=null, openId=null;

  /* ---------- 注册表 ---------- */
  const defs = [];
  function add(def){ const i=defs.findIndex(d=>d.id===def.id);
    i>=0 ? defs[i]=def : defs.push(def);
    defs.sort((a,b)=>(a.order??50)-(b.order??50));
    if(dockEl) render(); }

  /* ---------- popover 管理 ---------- */
  function closePop(){ openId=null; if(popEl) popEl.classList.remove('show'); }
  function togglePop(id){
    if(openId===id){ closePop(); return; }
    const def=defs.find(d=>d.id===id); if(!def||!def.pop) return;
    openId=id;
    popEl.innerHTML='';
    const cap=document.createElement('div'); cap.className='pp-cap';
    cap.innerHTML=`<i></i>${t(def.labelKey)}`;
    popEl.appendChild(cap);
    const body=def.pop(); if(body) popEl.appendChild(body);
    popEl.classList.add('show');
    for(const b of dockEl.querySelectorAll('.dk-b')) b.classList.toggle('on', b.dataset.id===id);
  }

  /* ---------- 通用控件 ---------- */
  function slider(min,max,step,get,set,fmt){
    const w=document.createElement('div'); w.className='pp-row';
    const r=document.createElement('input'); r.type='range';
    r.min=min; r.max=max; r.step=step; r.value=get();
    const v=document.createElement('span'); v.className='pp-val';
    const show=()=>v.textContent=fmt?fmt(get()):get();
    r.oninput=()=>{ set(parseFloat(r.value)); show(); };
    show(); w.append(r,v); return w;
  }
  function chipRow(items){                    // items: [{icon?,label,on,fn}]
    const w=document.createElement('div'); w.className='pp-chips';
    for(const it of items){
      const b=document.createElement('button'); b.className='pp-chip'+(it.on?' on':'');
      b.innerHTML=(it.icon?K.icon(it.icon,16):'')+`<span>${it.label}</span>`;
      b.onclick=()=>{ it.fn(); refreshPop(); };
      w.appendChild(b);
    }
    return w;
  }
  function refreshPop(){ if(openId) togglePop(openId); }   // 重建以刷新选中态

  /* ---------- 默认按钮：天气 ---------- */
  function popWeather(){
    const w=document.createElement('div');
    const wx=[['clear','sun'],['cloudy','cloud'],['rain','rain'],['snow','snow'],['fog','fog']];
    w.appendChild(chipRow(wx.map(([k,ic])=>({
      icon:ic, label:t(k==='rain'?'rainy':k==='snow'?'snowy':k==='fog'?'foggy':k),
      on:S.weather===k,
      fn:()=>{ S.weather=k; K.ctx.weather=k; save(); } }))));
    w.appendChild(slider(20,200,5,
      ()=>Math.round((S.weatherI??1)*100),
      v=>{ S.weatherI=v/100; save(); },
      v=>v+'%'));
    return w;
  }

  /* ---------- 默认按钮：时间 ---------- */
  function popTime(){
    const w=document.createElement('div');
    w.appendChild(chipRow([
      { label:t('modeReal'), on:S.timeMode==='real', fn:()=>S.timeMode='real' },
      { label:t('modeLock'), on:S.timeMode==='locked', fn:()=>S.timeMode='locked' },
    ]));
    if(S.timeMode==='locked'){
      const fmt=h=>`${String(Math.floor(h)%24).padStart(2,'0')}:${String(Math.round(h%1*60)).padStart(2,'0')}`;
      w.appendChild(slider(0,24,0.1,()=>S.lockedHour,v=>{ S.lockedHour=v; save(); },fmt));
    }
    return w;
  }

  /* ---------- 默认按钮：搭建（元素架） ---------- */
  function shelfBtn(icon,labelKey,on,fn){
    const b=document.createElement('button'); b.className='pp-shelf'+(on?' on':'');
    b.innerHTML=K.icon(icon,20,1.8)+`<span>${t(labelKey)}</span>`;
    b.onclick=()=>{ fn(); refreshPop(); };
    return b;
  }
  function popBuild(){
    const w=document.createElement('div');
    const grp=name=>{ const g=document.createElement('div'); g.className='pp-grp';
      g.innerHTML=`<div class="pp-grp-t">${name}</div>`; return g; };
    const nat=grp(t('buildNature'));
    nat.appendChild(shelfBtn('cloud','invClouds',S.cards.clouds.pref!=='off',
      ()=>{ S.cards.clouds.pref=S.cards.clouds.pref==='off'?'auto':'off'; save(); }));
    nat.appendChild(shelfBtn('grid','invMountains',S.cards.mountains.pref!=='hide',
      ()=>{ S.cards.mountains.pref=S.cards.mountains.pref==='hide'?'auto':'hide'; save(); }));
    nat.appendChild(shelfBtn('moon','invStars',S.cards.stars.pref!=='hide',
      ()=>{ S.cards.stars.pref=S.cards.stars.pref==='hide'?'auto':'hide'; save(); }));
    nat.appendChild(shelfBtn('rain','invRain',S.cards.rain.pref!=='off',
      ()=>{ S.cards.rain.pref=S.cards.rain.pref==='off'?'auto':'off'; save(); }));
    w.appendChild(nat);
    const plant=grp(t('buildPlants'));
    const tree=S.cards.tree;
    const thumbs=(K.assets&&K.assets.treeThumbs)||{};
    for(const v of ['spring','summer','autumn','winter']){
      const b=document.createElement('button');
      b.className='pp-leaf'+(tree.pref!=='hide'&&tree.pref!=='auto'&&tree.variant===v?' on':'');
      if(thumbs[v]) b.style.backgroundImage=`url('${thumbs[v]}')`;
      else b.innerHTML=K.icon(v==='spring'?'flower':v==='autumn'?'leaf':'tree',20,1.8);
      b.title=t(v);
      b.onclick=()=>{ const same=tree.pref!=='hide'&&tree.pref!=='auto'&&tree.variant===v;
        if(same){ tree.pref='hide'; }
        else { tree.variant=v; tree.pref='show'; }
        save(); refreshPop(); };
      plant.appendChild(b);
    }
    w.appendChild(plant);
    return w;
  }

  /* ---------- 默认按钮：伙伴（马群，未来宠物入口） ---------- */
  function popPets(){
    const w=document.createElement('div');
    w.appendChild(chipRow([
      { label:t('horses'), icon:'paw', on:S.cards.horses.pref!=='hide',
        fn:()=>{ S.cards.horses.pref=S.cards.horses.pref==='hide'?'auto':'hide'; save(); } },
    ]));
    if(S.cards.horses.pref!=='hide')
      w.appendChild(slider(1,6,1,()=>S.cards.horses.count||3,
        v=>{ S.cards.horses.count=v; save(); }));
    return w;
  }

  /* ---------- 默认按钮：场景簿 ---------- */
  function popScenes(){
    const w=document.createElement('div'); w.className='pp-scenes';
    for(const slot of K.scenes.list()){
      const row=document.createElement('div'); row.className='pp-slot';
      const name=document.createElement('span'); name.className='pp-slot-n';
      name.textContent=slot?new Date(slot.ts).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : t('sceneEmpty');
      const mk=(k,fn,dis)=>{ const b=document.createElement('button');
        b.className='pp-slot-b'; b.textContent=t(k); b.disabled=!!dis; b.onclick=fn; return b; };
      row.append(name,
        mk('sceneLoad',()=>{ K.scenes.load(slot.i); closePop(); },!slot),
        mk('sceneSave',()=>{ K.scenes.save(slot.i); refreshPop(); }),
        mk('sceneClear',()=>{ K.scenes.del(slot.i); refreshPop(); },!slot));
      w.appendChild(row);
    }
    return w;
  }

  /* ---------- Dock 渲染 ---------- */
  function render(){
    dockEl.innerHTML='';
    for(const def of defs){
      const b=document.createElement('button');
      b.className='dk-b'; b.dataset.id=def.id;
      b.innerHTML=K.icon(def.icon,20,1.8);
      b.title=t(def.labelKey);
      b.onclick=e=>{ e.stopPropagation();
        def.pop ? togglePop(def.id) : (closePop(), def.fn&&def.fn());
        if(!def.pop) for(const x of dockEl.querySelectorAll('.dk-b')) x.classList.remove('on'); };
      dockEl.appendChild(b);
    }
  }

  K.hud = {
    add,
    init(){
      dockEl=document.createElement('div'); dockEl.id='dock';
      popEl=document.createElement('div'); popEl.id='hudPop';
      document.body.append(dockEl,popEl);

      add({ id:'weather', icon:'cloud',    labelKey:'dockWeather', order:10, pop:popWeather });
      add({ id:'time',    icon:'clock',    labelKey:'dockTime',    order:20, pop:popTime });
      add({ id:'build',   icon:'grid',     labelKey:'dockBuild',   order:30, pop:popBuild });
      add({ id:'pets',    icon:'paw',      labelKey:'dockPets',    order:40, pop:popPets });
      add({ id:'scene',   icon:'bookmark', labelKey:'dockScene',   order:50, pop:popScenes });
      add({ id:'edit',    icon:'pencil',   labelKey:'dockEdit',    order:60,
        fn:()=>{ K.editor&&K.editor.toggle();
          const b=dockEl.querySelector('[data-id=edit]');
          if(b) b.classList.toggle('on', K.editor.enabled()); } });
      add({ id:'settings',icon:'gear',     labelKey:'dockSettings',order:70,
        fn:()=>K.panel.open() });

      addEventListener('pointerdown',e=>{
        if(openId && !popEl.contains(e.target) && !dockEl.contains(e.target)) closePop();
      },true);
      addEventListener('keydown',e=>{ if(e.key==='Escape') closePop(); });
    },
    closePop,
  };
})();
