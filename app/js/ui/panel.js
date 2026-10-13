/* ============================================================
 * Solstice 设置中心（内核服务⑤）
 * ------------------------------------------------------------
 * 遍历 registry 各插件 manifest.settingsGroups → 自动生成设置 UI。
 * · 顶部：预设快捷行（official.presets）
 * · 分区可折叠（会话内记忆）
 * item 协议：
 *   { type:'select'|'slider'|'check'|'button', labelKey | label:{zh,en},
 *     options:[[val,labelKey]], min,max,step,
 *     get():any, set(v), onclick?, show?():bool, rebuild?:bool, hintKey?, card? }
 * card 字段标注该设置属于哪个卡实例（编辑器右键"卡片设置"跳转用）。
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice;
  let panelEl, open=false, builtLang=null;
  const bindings=[];                        // {def, refresh()}
  const folds=new Set();                    // 折叠的分区 id（会话级）

  const labelOf = d => d.label ? d.label[K.i18n.lang] : K.i18n.t(d.labelKey);

  function row(def){
    const rowEl=document.createElement('div'); rowEl.className='row';
    let ctl;
    if(def.type==='button'){
      const span=document.createElement('span'); span.textContent=labelOf(def);
      rowEl.appendChild(span);
      ctl=document.createElement('button'); ctl.className='pbtn';
      ctl.textContent='↺';
      ctl.onclick=()=>def.onclick();
      rowEl.appendChild(ctl);
      return rowEl;
    }
    const span=document.createElement('span');
    span.textContent=labelOf(def);
    if(def.hintKey) span.title=K.i18n.t(def.hintKey);
    rowEl.appendChild(span);

    if(def.type==='select'){
      ctl=document.createElement('select');
      for(const [val,lk] of def.options){
        const o=document.createElement('option'); o.value=val;
        o.textContent = /^\d+$/.test(lk) ? lk : K.i18n.t(lk);
        ctl.appendChild(o);
      }
      ctl.onchange=()=>{ def.set(ctl.value); if(def.rebuild) build(); };
      bindings.push({def, refresh:()=>ctl.value=def.get()});
    }else if(def.type==='slider'){
      ctl=document.createElement('input');
      ctl.type='range'; ctl.min=def.min; ctl.max=def.max; ctl.step=def.step;
      ctl.oninput=()=>def.set(parseFloat(ctl.value));
      bindings.push({def, refresh:()=>ctl.value=def.get()});
    }else{
      ctl=document.createElement('input');
      ctl.type='checkbox';
      ctl.onchange=()=>def.set(ctl.checked);
      bindings.push({def, refresh:()=>ctl.checked=!!def.get()});
    }
    rowEl.appendChild(ctl);
    def._ctl=ctl;
    return rowEl;
  }

  function presetRow(){
    const pPreset=K.registry.plugin('official.presets');
    if(!pPreset) return null;
    const wrap=document.createElement('div'); wrap.className='prow';
    for(const [id,p] of Object.entries(pPreset.manifest.presets)){
      const b=document.createElement('button'); b.className='pbtn wide';
      b.textContent=p[K.i18n.lang]||id;
      b.onclick=()=>{ pPreset.impl.apply(id); refresh(); };
      wrap.appendChild(b);
    }
    return wrap;
  }

  function build(){
    builtLang=K.i18n.lang;
    bindings.length=0;
    panelEl.innerHTML='';
    const cap=t=>{ const c=document.createElement('div'); c.className='cap'; c.textContent=t; return c; };
    const hr=()=>panelEl.appendChild(document.createElement('hr'));

    const pr=presetRow();
    if(pr){ panelEl.appendChild(pr); hr(); }

    let first=true;
    for(const p of K.registry.plugins){
      const groups=p.manifest.settingsGroups||[];
      if(!groups.length) continue;
      if(!first) hr();
      first=false;
      const secTitle=p.manifest.name[K.i18n.lang];
      const sec=document.createElement('div');
      sec.className='sec'; sec.dataset.p=p.manifest.id;
      const head=document.createElement('div'); head.className='sec-h';
      head.innerHTML=`<span>${secTitle}</span><i>${folds.has(p.manifest.id)?'▸':'▾'}</i>`;
      head.onclick=()=>{
        const id=p.manifest.id;
        folds.has(id)?folds.delete(id):folds.add(id);
        sec.classList.toggle('fold',folds.has(id));
        head.querySelector('i').textContent=folds.has(id)?'▸':'▾';
      };
      sec.appendChild(head);
      const body=document.createElement('div'); body.className='sec-b';
      if(folds.has(p.manifest.id)) sec.classList.add('fold');
      for(const g of groups){
        const gt=K.i18n.t(g.titleKey);
        if(gt!==secTitle) body.appendChild(cap(gt));   // 组名与插件同名时不重复
        for(const def of g.items) body.appendChild(row(def));
      }
      sec.appendChild(body);
      panelEl.appendChild(sec);
    }

    const hint=document.createElement('div'); hint.className='hint';
    hint.innerHTML=`${K.i18n.t('hint1')}<br>${K.i18n.t('hint2')}`;
    panelEl.appendChild(hint);

    refresh();
  }

  function refresh(){
    for(const b of bindings){
      const vis = !b.def.show || b.def.show();
      b.def._ctl.parentElement.style.display = vis?'':'none';
      if(vis) b.refresh();
    }
  }

  K.panel = {
    init(){
      panelEl=document.getElementById('panel');
      const gear=document.getElementById('gear');           // 旧入口（已由信息中枢取代）
      if(gear) gear.onclick=()=>this.toggle();
      build();
      K.ctx.on('cfg',()=>{                          // 任意来源切语言 → 重建标签
        if(K.i18n.lang!==builtLang) build();
        else refresh();
      });
      if(K.CFG.dbg) this.open();
    },
    build, refresh,
    toggle(){ open=!open; panelEl.classList.toggle('open',open); if(open) refresh(); },
    open(pluginId){
      open=true; panelEl.classList.add('open'); refresh();
      if(!pluginId) return;
      const sec=panelEl.querySelector(`.sec[data-p="${pluginId}"]`);
      if(sec){ sec.classList.remove('fold');
        sec.querySelector('.sec-h i').textContent='▾'; folds.delete(pluginId);
        sec.scrollIntoView({behavior:'smooth', block:'start'}); }
    },
    get isOpen(){ return open; },
  };
})();
