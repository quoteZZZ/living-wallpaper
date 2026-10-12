/* ============================================================
 * official.info —— 信息组件（通用信息插件）
 * ------------------------------------------------------------
 * 用户需求：时间/天气/调试信息原来分散多处，合并为一个 DOM 悬浮卡：
 *   · 默认展开：时间(+秒) / 日期 / 天气行
 *   · 可收缩为迷你时间胶囊（– / +）
 *   · ⚙ → 打开设置中心本插件分区（秒/日期/天气/详细信息/缩放）
 *   · 编辑模式下可拖拽移动（变换持久化 S.info.dx/dy）
 * 调试信息（旧 #dbg 浮层）并入"详细信息"分区，?debug=1 时自动显示。
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice, S = K.S;
  const save = ()=>K.saveCfg();

  let el, timeEl, secEl, dateEl, wxEl, dbgEl, minBtn, collapsedBox;

  function build(){
    el=document.createElement('div');
    el.id='infoCard';
    el.innerHTML=`
      <div class="ic-main">
        <div class="ic-time"><span class="ic-hm">--:--</span><span class="ic-sec"></span></div>
        <div class="ic-sub"><span class="ic-date"></span><span class="ic-wx"></span></div>
      </div>
      <div class="ic-dbg"></div>
      <div class="ic-btns">
        <button class="ic-btn" data-a="min" title="-">–</button>
        <button class="ic-btn" data-a="cfg" title="⚙">⚙</button>
      </div>`;
    document.getElementById('infoHost').appendChild(el);
    timeEl=el.querySelector('.ic-hm'); secEl=el.querySelector('.ic-sec');
    dateEl=el.querySelector('.ic-date'); wxEl=el.querySelector('.ic-wx');
    dbgEl=el.querySelector('.ic-dbg');
    minBtn=el.querySelector('[data-a=min]');

    el.querySelector('[data-a=cfg]').onclick=e=>{ e.stopPropagation(); K.panel.open('official.info'); };
    minBtn.onclick=e=>{
      e.stopPropagation();
      S.info.expanded=!S.info.expanded; apply(); save();
    };

    /* 编辑模式拖拽（DOM 卡）：按钮/链接不触发 */
    let drag=null;
    el.addEventListener('pointerdown',e=>{
      if(e.target.closest('.ic-btn')) return;
      if(!editorOn()) return;
      drag={x:e.clientX,y:e.clientY,dx:S.info.dx,dy:S.info.dy};
      try{ el.setPointerCapture(e.pointerId); }catch(_){/* 合成事件 */}
    });
    el.addEventListener('pointermove',e=>{
      if(!drag) return;
      S.info.dx=drag.dx+e.clientX-drag.x;
      S.info.dy=drag.dy+e.clientY-drag.y;
      apply();
    });
    el.addEventListener('pointerup',()=>{ if(drag){ drag=null; save(); } });

    apply();
  }
  function editorOn(){ return K.editor && K.editor.enabled(); }

  function apply(){
    el.classList.toggle('min', !S.info.expanded);
    minBtn.textContent=S.info.expanded?'–':'+';
    minBtn.title=S.info.expanded?'+':'-';
    const i=S.info;
    el.style.transform=`translate(${i.dx}px,${i.dy}px) scale(${i.scale})`;
    el.style.display=(K.CFG.ui||true)?'flex':'none';   // WE 版也显示（是壁纸内容）
    dateEl.style.display =i.showDate?'':'none';
    wxEl.style.display   =i.showWeather?'':'none';
    secEl.style.display  =i.showSec?'':'none';
    dbgEl.style.display  =i.showDebug?'':'none';
  }

  const pad=n=>String(n).padStart(2,'0');
  function tick(now, st){
    if(!el){ build(); K.ctx.on('cfg',apply); }
    const d=new Date();
    const tag=K.i18n.lang==='zh'?'zh-CN':'en';
    timeEl.textContent=`${pad(d.getHours())}:${pad(d.getMinutes())}`;
    secEl.textContent=S.info.showSec?`:${pad(d.getSeconds())}`:'';
    dateEl.textContent=d.toLocaleDateString(tag,{month:'long',day:'numeric',weekday:'short'});
    const icon=S.weather==='rain'?'🌧':(st&&st.night>0.5?'🌙':'☀');
    wxEl.textContent=icon+' '+K.i18n.t(S.weather==='rain'?'rainy':'clear');

    if(S.info.showDebug){
      const C=S.cards, sun=K.ctx.sunState(d);
      dbgEl.textContent=
        `${K.i18n.t('time')} ${d.toLocaleTimeString()}  ·  ${K.i18n.t('fpsCap')} ${K.composer.fps.toFixed(0)}/${S.fps}\n`+
        `☉ ${(sun.elev*180/Math.PI).toFixed(1)}°  ·  ${K.i18n.t('weather')} ${K.i18n.t(S.weather==='rain'?'rainy':'clear')}\n`+
        `${K.i18n.t('luminary')} ${C.luminary.pref} · ${K.i18n.t('clouds')} ${C.clouds.pref} · `+
        `${K.i18n.t('rain')} ${C.rain.pref} · ${K.i18n.t('parallax')} ${(S.par*100)|0}%`+
        (K.composer.mode?'\n[img+depth]':'');
    }
  }

  K.registry.register({
    id:'official.info', api:1, type:'behavior',
    name:{zh:'信息组件', en:'Info widget'},
    description:{zh:'时间 / 日期 / 天气悬浮卡，可收缩', en:'Collapsible time / date / weather widget'},
    cards:[],
    settingsGroups:[
      { titleKey:'infoTitle', items:[
        { type:'check', label:{zh:'展开信息卡', en:'Expand widget'},
          get:()=>S.info.expanded, set:v=>{ S.info.expanded=v; save(); if(el) apply(); } },
        { type:'check', labelKey:'showSec',
          get:()=>S.info.showSec, set:v=>{ S.info.showSec=v; save(); } },
        { type:'check', labelKey:'showDate',
          get:()=>S.info.showDate, set:v=>{ S.info.showDate=v; save(); } },
        { type:'check', labelKey:'showWeather',
          get:()=>S.info.showWeather, set:v=>{ S.info.showWeather=v; save(); } },
        { type:'check', labelKey:'showDebug',
          get:()=>S.info.showDebug, set:v=>{ S.info.showDebug=v; save(); } },
        { type:'slider', labelKey:'infoScale', min:70, max:160, step:5,
          get:()=>Math.round(S.info.scale*100), set:v=>{ S.info.scale=v/100; save(); if(el) apply(); } },
      ]},
    ],
  }, { frame:tick });
})();
