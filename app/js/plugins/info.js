/* ============================================================
 * official.info —— 信息中枢（唯一悬浮 UI 组件）
 * ------------------------------------------------------------
 * 版式：细字重大时钟 + 日期·天气行 + 分隔线 + 图标按钮列
 * 主题色 --acc 实时取自当前时辰调色板（UI 与天空同步，品牌语言）
 * 按钮：– 收缩 / ✎ 编辑 / ↺ 重置 / ⚙ 设置；WE 壁纸态自动隐藏控制列
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice, S = K.S;
  const save = ()=>K.saveCfg();

  let el, timeEl, secEl, dateEl, wxEl, wxIcoEl, dbgEl, minBtn, editBtn, lastAcc='';

  function build(){
    el=document.createElement('div');
    el.id='infoCard';
    el.innerHTML=`
      <div class="ic-left">
        <div class="ic-time"><span class="ic-hm">--:--</span><span class="ic-sec"></span></div>
        <div class="ic-sub"><span class="ic-wxico"></span><span class="ic-date"></span><i class="ic-dot">·</i><span class="ic-wx"></span></div>
      </div>
      <div class="ic-dbg"></div>
      <div class="ic-btns">
        <button class="ic-btn" data-a="min"></button>
        <button class="ic-btn" data-a="edit" title=""></button>
        <button class="ic-btn" data-a="reset" title=""></button>
        <button class="ic-btn" data-a="cfg" title=""></button>
      </div>`;
    document.getElementById('infoHost').appendChild(el);
    timeEl=el.querySelector('.ic-hm'); secEl=el.querySelector('.ic-sec');
    dateEl=el.querySelector('.ic-date'); wxEl=el.querySelector('.ic-wx');
    wxIcoEl=el.querySelector('.ic-wxico');
    dbgEl=el.querySelector('.ic-dbg');
    minBtn=el.querySelector('[data-a=min]');
    editBtn=el.querySelector('[data-a=edit]');

    const t=k=>K.i18n.t(k);
    el.querySelector('[data-a=cfg]').innerHTML=K.icon('gear',15);
    el.querySelector('[data-a=cfg]').title=t('hubPanel');
    editBtn.innerHTML=K.icon('pencil',15);
    editBtn.title=t('hubEdit');
    el.querySelector('[data-a=reset]').innerHTML=K.icon('rotate',15);
    el.querySelector('[data-a=reset]').title=t('hubReset');

    el.querySelector('[data-a=cfg]').onclick=e=>{ e.stopPropagation(); K.panel.open(); };
    editBtn.onclick=e=>{ e.stopPropagation(); K.editor && K.editor.toggle(); };
    el.querySelector('[data-a=reset]').onclick=e=>{
      e.stopPropagation(); K.editor && K.editor.resetAll(); };
    minBtn.onclick=e=>{
      e.stopPropagation();
      S.info.expanded=!S.info.expanded; apply(); save();
    };
    K.ctx.on('cfg',apply);

    /* 编辑模式拖拽（DOM 卡）：按钮不触发 */
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
    minBtn.innerHTML=K.icon(S.info.expanded?'minus':'plus',15);
    const i=S.info;
    el.style.transform=`translate(${i.dx}px,${i.dy}px) scale(${i.scale})`;
    el.style.display='flex';                          // WE 版也显示（是壁纸内容）
    const ui=!!K.CFG.ui;
    for(const b of el.querySelectorAll('[data-a=edit],[data-a=reset],[data-a=cfg]'))
      b.style.display=ui?'':'none';
    editBtn.classList.toggle('on', ui && editorOn());
    editBtn.title=t('hubEdit');
    dateEl.style.display =i.showDate?'':'none';
    wxEl.style.display   =i.showWeather?'':'none';
    wxIcoEl.style.display=i.showWeather?'':'none';
    secEl.style.display  =i.showSec?'':'none';
    dbgEl.style.display  =i.showDebug?'':'none';
  }
  const t=(k)=>K.i18n.t(k);

  const pad=n=>String(n).padStart(2,'0');
  const wIcon={clear:'sun',cloudy:'cloud',rain:'rain',snow:'snow',fog:'fog'};
  function tick(now, st){
    if(!el){ build(); }
    const d=new Date();
    const tag=K.i18n.lang==='zh'?'zh-CN':'en';
    timeEl.textContent=`${pad(d.getHours())}:${pad(d.getMinutes())}`;
    secEl.textContent=S.info.showSec?`:${pad(d.getSeconds())}`:'';
    dateEl.textContent=d.toLocaleDateString(tag,{month:'long',day:'numeric',weekday:'short'});
    const w=S.weather;
    wxIcoEl.innerHTML=K.icon(st&&st.night>0.5&&w==='clear'?'moon':(wIcon[w]||'sun'),13,2);
    wxEl.textContent=t(w==='rain'?'rainy':w==='snow'?'snowy':w==='fog'?'foggy':w==='cloudy'?'cloudy':'clear');

    /* 主题色跟随天空：调色板顶色 → 归一化亮度 → CSS 变量 */
    if(st && st.pal){
      const a=st.pal.top.map(v=>Math.round((0.40+0.42*v)*255));
      const css=`rgb(${a[0]},${a[1]},${a[2]})`;
      if(css!==lastAcc){
        document.documentElement.style.setProperty('--acc',css);
        lastAcc=css;
      }
    }

    if(S.info.showDebug){
      const C=S.cards, sun=K.ctx.sunState(d);
      const wLabel=t(w==='rain'?'rainy':w==='snow'?'snowy':w==='fog'?'foggy':w==='cloudy'?'cloudy':'clear');
      dbgEl.textContent=
        `${t('time')} ${d.toLocaleTimeString()}  ·  ${t('fpsCap')} ${K.composer.fps.toFixed(0)}/${S.fps}\n`+
        `☉ ${(sun.elev*180/Math.PI).toFixed(1)}°  ·  ${t('weather')} ${wLabel}\n`+
        `${t('luminary')} ${C.luminary.pref} · ${t('clouds')} ${C.clouds.pref} · `+
        `${t('rain')} ${C.rain.pref} · ${t('parallax')} ${(S.par*100)|0}%`+
        (K.composer.mode?'\n[img+depth]':'');
    }
  }

  K.registry.register({
    id:'official.info', api:1, type:'behavior',
    name:{zh:'信息中枢', en:'Info hub'},
    description:{zh:'时间 / 日期 / 天气 + 控制中枢，可收缩', en:'Time / date / weather + control hub, collapsible'},
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
