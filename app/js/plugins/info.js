/* ============================================================
 * official.info —— 信息纸签（v0.5 降级：不再是唯一 UI）
 * ------------------------------------------------------------
 * v0.5 变化：时间/日期/天气保留为右下角小纸签；控制功能
 * （编辑/重置/设置）移交游戏 HUD（ui/hud.js）。职责变化：
 * · 每帧把 st.night 写入 body.night → 全 UI 纸墨主题昼夜间过渡
 * · 收缩/拖拽/缩放保留；WE 壁纸态纯展示（无 Dock）
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice, S = K.S;
  const save = ()=>K.saveCfg();

  let el, timeEl, secEl, dateEl, wxEl, wxIcoEl, dbgEl, minBtn, lastAcc='', lastNight=null;

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
      </div>`;
    document.body.appendChild(el);
    timeEl=el.querySelector('.ic-hm'); secEl=el.querySelector('.ic-sec');
    dateEl=el.querySelector('.ic-date'); wxEl=el.querySelector('.ic-wx');
    wxIcoEl=el.querySelector('.ic-wxico');
    dbgEl=el.querySelector('.ic-dbg');
    minBtn=el.querySelector('[data-a=min]');

    minBtn.innerHTML=K.icon('minus',15);
    minBtn.onclick=e=>{
      e.stopPropagation();
      S.info.expanded=!S.info.expanded; apply(); save();
    };
    K.ctx.on('cfg',apply);

    /* 编辑模式拖拽（DOM 卡）：按钮不触发 */
    let drag=null;
    el.addEventListener('pointerdown',e=>{
      if(e.target.closest('.ic-btn')) return;
      if(!(K.editor&&K.editor.enabled())) return;
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

  function apply(){
    el.classList.toggle('min', !S.info.expanded);
    minBtn.innerHTML=K.icon(S.info.expanded?'minus':'plus',15);
    const i=S.info;
    el.style.transform=`translate(${i.dx}px,${i.dy}px) scale(${i.scale})`;
    el.style.display='flex';                          // WE 版也显示（是壁纸内容）
    dateEl.style.display =i.showDate?'':'none';
    wxEl.style.display   =i.showWeather?'':'none';
    wxIcoEl.style.display=i.showWeather?'':'none';
    secEl.style.display  =i.showSec?'':'none';
    dbgEl.style.display  =i.showDebug?'':'none';
  }
  const t=(k)=>K.i18n.t(k);

  const pad=n=>String(n).padStart(2,'0');
  const wIcon={clear:'sun',cloudy:'cloud',rain:'rain',snow:'snow',fog:'fog'};
  const wxKey=w=>w==='rain'?'rainy':w==='snow'?'snowy':w==='fog'?'foggy':w==='cloudy'?'cloudy':'clear';
  function tick(now, st){
    if(!el){ build(); }
    const d=new Date();
    const tag=K.i18n.lang==='zh'?'zh-CN':'en';
    timeEl.textContent=`${pad(d.getHours())}:${pad(d.getMinutes())}`;
    secEl.textContent=S.info.showSec?`:${pad(d.getSeconds())}`:'';
    dateEl.textContent=d.toLocaleDateString(tag,{month:'long',day:'numeric',weekday:'short'});
    const w=S.weather;
    wxIcoEl.innerHTML=K.icon(st&&st.night>0.5&&w==='clear'?'moon':(wIcon[w]||'sun'),13,2);
    wxEl.textContent=t(wxKey(w));

    /* 昼夜主题：夜晚系数 → body.night（全 UI 纸墨令牌随场景切换） */
    const night=st ? st.night>0.5 : false;
    if(night!==lastNight){
      document.body.classList.toggle('night',night);
      lastNight=night;
    }

    /* 主题点缀色跟随天空：调色板顶色 → CSS 变量（HUD/纸签 hover 用） */
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
      dbgEl.textContent=
        `${t('time')} ${d.toLocaleTimeString()}  ·  ${t('fpsCap')} ${K.composer.fps.toFixed(0)}/${S.fps}\n`+
        `☉ ${(sun.elev*180/Math.PI).toFixed(1)}°  ·  ${t('weather')} ${t(wxKey(w))}\n`+
        `${t('luminary')} ${C.luminary.pref} · ${t('clouds')} ${C.clouds.pref} · `+
        `${t('horses')} ${C.horses?C.horses.pref:'-'} · ${t('parallax')} ${(S.par*100)|0}%`+
        (K.composer.mode?'\n[img+depth]':'');
    }
  }

  K.registry.register({
    id:'official.info', api:1, type:'behavior',
    name:{zh:'信息纸签', en:'Info tag'},
    description:{zh:'时间 / 日期 / 天气小纸签，可收缩', en:'Time / date / weather tag, collapsible'},
    cards:[],
    settingsGroups:[
      { titleKey:'infoTitle', items:[
        { type:'check', label:{zh:'展开纸签', en:'Expand tag'},
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
