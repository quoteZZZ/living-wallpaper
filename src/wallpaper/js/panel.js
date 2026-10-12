/* ============================================================
 * Solstice 设置中心（内核服务⑤）
 * ------------------------------------------------------------
 * 遍历 registry 各插件 manifest.settingsGroups → 自动生成设置 UI。
 * item 协议：
 *   { type:'select'|'slider'|'check', labelKey | label:{zh,en},
 *     options:[[val,labelKey]], min,max,step,
 *     get():any, set(v), show?():bool, rebuild?:bool, hintKey?, card? }
 * card 字段标注该设置属于哪个卡实例（编辑器右键"卡片设置"跳转用）。
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice;
  let panelEl, open=false;
  const bindings=[];                        // {def, refresh()}

  const labelOf = d => d.label ? d.label[K.i18n.lang] : K.i18n.t(d.labelKey);

  function row(def){
    const rowEl=document.createElement('div'); rowEl.className='row';
    const span=document.createElement('span');
    span.textContent=labelOf(def);
    if(def.hintKey){ span.title=K.i18n.t(def.hintKey); }
    rowEl.appendChild(span);

    let ctl;
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

  let builtLang=null;                       // 上次 UI 构建所用语言
  function build(){
    builtLang=K.i18n.lang;
    bindings.length=0;
    panelEl.innerHTML='';
    const cap=t=>{ const c=document.createElement('div'); c.className='cap'; c.textContent=t; return c; };
    const hr=()=>panelEl.appendChild(document.createElement('hr'));
    let first=true;

    for(const p of K.registry.plugins){
      const groups=p.manifest.settingsGroups||[];
      if(!groups.length) continue;
      if(!first) hr();
      first=false;
      const sec=document.createElement('div');
      sec.className='sec'; sec.dataset.p=p.manifest.id;
      const secTitle=p.manifest.name[K.i18n.lang];
      sec.appendChild(cap(secTitle));
      for(const g of groups){
        const gt=K.i18n.t(g.titleKey);
        if(gt!==secTitle) sec.appendChild(cap(gt));   // 组名与插件同名时不重复
        for(const def of g.items) sec.appendChild(row(def));
      }
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
      const gear=document.getElementById('gear');
      gear.onclick=()=>this.toggle();
      if(!K.CFG.ui) gear.style.display='none';
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
      if(sec) sec.scrollIntoView({behavior:'smooth', block:'start'});
    },
    get isOpen(){ return open; },
  };
})();
