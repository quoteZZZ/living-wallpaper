/* ============================================================
 * Solstice 微内核（原型版 · T0.2）
 * ------------------------------------------------------------
 * DESIGN.md §3.1 六服务的原型实现：
 *   ① 合成器   → composer.js（本文件定义图层状态协议 + 仲裁结果）
 *   ② 上下文总线 → ctx：时钟/太阳/调色板（纯数学）+ 天气状态 + 事件
 *   ③ 插件注册表 → registry：register() + 卡实例视图 + 冲突仲裁
 *   ④ 存储     → storage：lw.cfg.v1（全局 S）+ lw.p.<id>.v1（插件命名空间）
 *   ⑤ 设置中心  → panel.js（由各插件 settings schema 自动生成，双语）
 *   ⑥ i18n    → i18n：zh/en 字符串表（DESIGN §6）
 *
 * 插件以经典 <script> 顺序加载（零构建、file:// 双击可用）；
 * manifest 以 JS 对象内联声明，T1.1（Tauri/http 环境）迁为
 * manifest.json + fetch，服务 API 不变。
 * ============================================================ */
"use strict";
window.Solstice = (function(){

  const util = {
    clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),
    lerp:(a,b,t)=>a+(b-a)*t,
    mix3:(a,b,t)=>[a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t],
  };

  /* ---------- 启动参数（时辰三级优先：URL > 面板锁定 > 真实，§5.4） ---------- */
  const Q = new URLSearchParams(location.search);
  const CFG = {
    lat : parseFloat(Q.get('lat') ?? '39.9'),
    hour: Q.has('hour') ? parseFloat(Q.get('hour')) : null,   // 调试覆盖，最高优先
    par : Math.max(0, parseFloat(Q.get('par') ?? '100'))/100,
    dbg : Q.get('debug')==='1',
    ui  : Q.get('ui')!=='0',                                  // WE 工坊版传 ui=0
    nohid: Q.get('nohid')==='1',                              // 调试：忽略 hidden 跳帧（截图/自动化测试）
  };

  /* ---------- ⑥ i18n：字符串表 + t() ---------- */
  const DICT = {
    zh: {
      title:'Solstice 场景设置',
      time:'时间', followReal:'跟随真实', lock:'锁定时段', lockedHour:'锁定时刻',
      cards:'元素卡片',
      luminary:'太阳 / 月亮', clouds:'云', rain:'雨', stars:'星空', mountains:'山峦',
      lumAuto:'跟随时间', lumShow:'强制显示', lumHide:'隐藏',
      clAuto:'跟随天气',   clOff:'隐藏',
      rainAuto:'跟随天气', rainOn:'强制', rainOff:'关闭',
      stAuto:'夜晚显示',   stShow:'常显', stHide:'隐藏',
      mAuto:'显示',        mHide:'隐藏',
      weather:'天气', weatherHint:'T0 手动 · T1 接真实', clear:'晴', rainy:'雨',
      parallax:'视差', fpsCap:'帧率上限',
      ui:'界面', lang:'语言', editMode:'编辑模式（拖拽 / 右键）',
      hint1:'设置自动保存（localStorage）。',
      hint2:'「隐藏太阳」只隐藏圆盘，天空仍按真实时辰变亮变暗。',
      infoTitle:'信息组件', showSec:'显示秒', showDate:'显示日期',
      showWeather:'显示天气', showDebug:'详细信息（调试）', infoScale:'缩放',
      menuHide:'隐藏卡片', menuShow:'显示卡片', menuReset:'重置位置',
      menuSettings:'卡片设置…', menuScene:'场景设置…',
      menuWeather:'切换天气', menuResetAll:'重置全部卡片',
    },
    en: {
      title:'Solstice Scene Settings',
      time:'Time', followReal:'Real time', lock:'Locked period', lockedHour:'Hour',
      cards:'Element cards',
      luminary:'Sun / Moon', clouds:'Clouds', rain:'Rain', stars:'Stars', mountains:'Mountains',
      lumAuto:'Follow time', lumShow:'Always show', lumHide:'Hide',
      clAuto:'Follow weather', clOff:'Hide',
      rainAuto:'Follow weather', rainOn:'Force on', rainOff:'Off',
      stAuto:'Night only', stShow:'Always show', stHide:'Hide',
      mAuto:'Show', mHide:'Hide',
      weather:'Weather', weatherHint:'T0 manual · live in T1', clear:'Clear', rainy:'Rain',
      parallax:'Parallax', fpsCap:'FPS cap',
      ui:'Interface', lang:'Language', editMode:'Edit mode (drag / right-click)',
      hint1:'Settings persist automatically (localStorage).',
      hint2:'Hiding the sun only removes the disc; the sky still follows real daylight.',
      infoTitle:'Info widget', showSec:'Seconds', showDate:'Date',
      showWeather:'Weather line', showDebug:'Details (debug)', infoScale:'Scale',
      menuHide:'Hide card', menuShow:'Show card', menuReset:'Reset transform',
      menuSettings:'Card settings…', menuScene:'Scene settings…',
      menuWeather:'Toggle weather', menuResetAll:'Reset all cards',
    },
  };
  const i18n = {
    lang:'zh',
    init(){ this.lang = S.lang || (/^zh/i.test(navigator.language||'zh') ? 'zh' : 'en'); },
    set(l){ this.lang=l; S.lang=l; saveCfg(); },
    t(k){ return (DICT[this.lang]&&DICT[this.lang][k]) ?? DICT.zh[k] ?? k; },
  };

  /* ---------- ④ 存储：全局键 + 插件命名空间 ---------- */
  const storage = {
    get(k,d){ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } },
    set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} },
    ns(pluginId){                              // → { get(field, def), set(field, val) }
      const key='lw.p.'+pluginId+'.v1';
      return {
        get:(f,d)=>{ const o=storage.get(key,{}); return (o&&f in o)?o[f]:d; },
        set:(f,v)=>{ const o=storage.get(key,{}); o[f]=v; storage.set(key,o); },
      };
    },
  };

  /* ---------- 全局配置 S（附录 A 扩展：卡片三态 + 变换 + 信息组件） ---------- */
  const DEFAULTS = {
    lang:null,
    timeMode:'real', lockedHour:12,
    weather:'clear',                          // T0 手动；T1 provider 写 ctx.weather
    par:1, fps:30, editor:true,
    cards:{                                   // 卡实例：三态偏好 + 位置/缩放变换
      luminary:{pref:'auto', dx:0, dy:0, scale:1},
      clouds  :{pref:'auto', dy:0},
      stars   :{pref:'auto'},
      mountains:{pref:'auto', dy:0, scale:1},
      rain    :{pref:'auto'},
    },
    info:{ expanded:true, showSec:true, showDate:true, showWeather:true,
           showDebug:false, scale:1, dx:0, dy:0 },
  };
  function loadCfg(){
    const raw = storage.get('lw.cfg.v1', {}) || {};
    const S = JSON.parse(JSON.stringify(DEFAULTS));
    const card = (id)=>{                        // v1 平铺键 → cards.<id>.pref 迁移
      const o={pref:'auto',dx:0,dy:0,scale:1};
      if(typeof raw[id]==='string') o.pref=raw[id];
      else if(typeof raw[id]==='boolean') o.pref=raw[id]?'auto':'hide';
      return o;
    };
    for(const id of ['luminary','clouds','stars','mountains','rain'])
      S.cards[id]=Object.assign(card(id), (raw.cards&&raw.cards[id])||{});
    for(const k of ['timeMode','lockedHour','weather','par']) if(k in raw) S[k]=raw[k];
    if('fps' in raw) S.fps=raw.fps;
    if('editor' in raw) S.editor=raw.editor;
    S.info=Object.assign(S.info,(raw.info)||{});
    S.par = CFG.par!==1 ? CFG.par : S.par;      // URL ?par 一次性覆盖
    S.fps = Q.has('fps') ? Math.max(10,parseFloat(Q.get('fps'))) : S.fps;
    return S;
  }
  const S = loadCfg();
  function saveCfg(){ storage.set('lw.cfg.v1', S); ctx.emit('cfg',S); }

  /* ---------- ② 上下文总线：太阳数学 / 调色板（§4.3，纯数学无网络） ---------- */
  const STOPS = [
    { e:-90, top:'#050810', hor:'#0d1230', lum:'#ccd6ff', fog:'#0b1020', star:1.0, night:1.0, amb:[.55,.60,.85] },
    { e:-12, top:'#070b1a', hor:'#232a55', lum:'#b8c2f2', fog:'#151a33', star:.75, night:.90, amb:[.66,.70,.92] },
    { e:  0, top:'#2b3a6b', hor:'#ff9d5c', lum:'#ffd9a6', fog:'#7a6488', star:.12, night:.35, amb:[.96,.84,.80] },
    { e:  8, top:'#4a74b8', hor:'#ffc98c', lum:'#fff0c8', fog:'#9aa0b8', star:0,   night:.08, amb:[1.00,.94,.86] },
    { e: 25, top:'#3d7fd6', hor:'#c3ddf2', lum:'#ffffff', fog:'#c8daea', star:0,   night:0,   amb:[1.02,1.00,.98] },
    { e: 60, top:'#2f74d0', hor:'#d0e4f4', lum:'#ffffff', fog:'#d4e2f0', star:0,   night:0,   amb:[1.04,1.02,1.00] },
  ];
  function hex2rgb(hx){ const n=parseInt(hx.slice(1),16); return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]; }
  function palette(elevDeg){
    let a=STOPS[0], b=STOPS[STOPS.length-1];
    for(let i=0;i<STOPS.length-1;i++)
      if(elevDeg>=STOPS[i].e && elevDeg<=STOPS[i+1].e){ a=STOPS[i]; b=STOPS[i+1]; break; }
    if(elevDeg<=STOPS[0].e){ a=b=STOPS[0]; }
    if(elevDeg>=STOPS[STOPS.length-1].e){ a=b=STOPS[STOPS.length-1]; }
    const t    = a===b ? 0 : (elevDeg-a.e)/(b.e-a.e);
    const mix  = (x,y)=>x+(y-x)*t;
    const mixv = (x,y)=>x.map((v,i)=>mix(v,y[i]));
    const mixh = (x,y)=>mixv(hex2rgb(x),hex2rgb(y));
    return { top:mixh(a.top,b.top), hor:mixh(a.hor,b.hor), lum:mixh(a.lum,b.lum),
             fog:mixh(a.fog,b.fog), star:mix(a.star,b.star), night:mix(a.night,b.night),
             amb:mixv(a.amb,b.amb) };
  }
  function sunState(date){
    const doy  = Math.floor((date - new Date(date.getFullYear(),0,0)) / 864e5);
    const decl = 23.44*Math.PI/180 * Math.sin(2*Math.PI*(284+doy)/365);
    const real = date.getHours()+date.getMinutes()/60+date.getSeconds()/3600;
    const h    = CFG.hour ?? (S.timeMode==='locked' ? S.lockedHour : real);
    const H    = Math.PI*(h-12)/12;
    const phi  = CFG.lat*Math.PI/180;
    const elev = Math.asin(Math.sin(phi)*Math.sin(decl)+Math.cos(phi)*Math.cos(decl)*Math.cos(H));
    return { h, H, elev, real };
  }
  function luminary(s, aspect){
    if(s.elev > 0){
      return { x:-Math.sin(s.H)*aspect*0.42, y:-0.30+(s.elev/1.35)*0.72, r:0.050, a:1.0 };
    }
    const mh = Math.PI*(((s.h+12)%24)-12)/12;
    const me = -s.elev;
    return { x:-Math.sin(mh)*aspect*0.42, y:-0.30+Math.max(me,0)/1.35*0.72,
             r:0.034, a:Math.min(1, -s.elev/0.20) };
  }

  const listeners = new Map();
  const ctx = {
    weather:'clear',                            // provider 插件写入；消费方只读/订阅
    on(evt,fn){ (listeners.get(evt)??listeners.set(evt,[]).get(evt)).push(fn); },
    emit(evt,data){ (listeners.get(evt)||[]).forEach(f=>{ try{f(data);}catch(e){console.error(e);} }); },
    sunState, palette, luminary,
  };

  /* ---------- ③ 插件注册表 + 卡槽仲裁（§3.4 / §4.2） ---------- */
  const registry = {
    plugins:[],
    register(manifest, impl){
      const p={manifest,impl};
      this.plugins.push(p);
      return p;
    },
    plugin(id){ return this.plugins.find(p=>p.manifest.id===id); },
    /* 卡实例视图：偏好与变换统一存 S.cards[id] */
    cards(){
      const out=[];
      for(const p of this.plugins)
        for(const c of (p.manifest.cards||[])){
          if(!S.cards[c.id]) S.cards[c.id]={pref:'auto',dx:0,dy:0,scale:1};
          out.push({plugin:p, card:c, st:S.cards[c.id]});
        }
      return out;
    },
    /* 冲突仲裁：元素卡决定"有没有"，世界决定"什么样"（§4.2 矩阵） */
    resolveFrame(env){
      const C=S.cards, w=ctx.weather;
      const st={ pal:env.pal };

      /* 雨（效果层）：先算雨，雨是"世界状态"的输入 */
      const rp=C.rain.pref;
      st.rainI = rp==='off'?0 : rp==='on'?0.75 : (w==='rain'?0.75:0);
      const raining = st.rainI>0;

      /* 世界的调色：下雨则整体压暗偏灰（与雨卡是否显示无关？——不，
       * T0 将调色绑定 rainI（雨粒子）；auto 下两者一致，off 时用户
       * 明确不要雨的氛围。DESIGN §4.2 行2"雨=跟随"即此语义。 */
      if(raining){
        st.pal = Object.assign({}, env.pal, {
          top : util.mix3(env.pal.top,[.42,.47,.55],.5),
          hor : util.mix3(env.pal.hor,[.50,.56,.64],.5),
          fog : util.mix3(env.pal.fog,[.58,.63,.70],.35),
          night:Math.min(1,env.pal.night+.15),
        });
      }

      /* 日/月：hide=0；show 强制（压过雨天隐去）；auto 雨天自动隐去 */
      const L = ctx.luminary(env.sun, env.aspect);
      const lm = C.luminary;
      if(lm.pref==='hide') L.a=0;
      else if(lm.pref==='show') L.a=1;
      else if(raining) L.a*=.12;
      L.x+=lm.dx; L.y+=lm.dy; L.r*=lm.scale;    // 编辑器拖拽/缩放变换
      st.lum=L;

      /* 云：auto 跟天气云量；off 隐藏装饰云但雨照下（粒子属天气系统层） */
      let ci = raining?0.95:0.4;
      if(C.clouds.pref==='off') ci=0;
      else if(C.clouds.pref==='on') ci=Math.max(ci,0.7);
      st.cloudI=ci; st.cloudDy=C.clouds.dy;

      /* 星空 / 山峦 */
      const sp=C.stars.pref;
      st.starI = sp==='hide'?0 : sp==='show'?Math.max(env.pal.star,0.85) : env.pal.star;
      st.mtnOn = C.mountains.pref!=='hide';
      st.mtnDy=C.mountains.dy; st.mtnScale=C.mountains.scale;

      st.night=st.pal.night;
      st.raining=raining;
      return st;
    },
  };

  i18n.init();

  return { version:'0.2', Q, CFG, S, DEFAULTS, saveCfg, util, i18n, storage, ctx, registry };
})();
