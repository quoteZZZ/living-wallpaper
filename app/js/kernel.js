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
    winter: Q.get('winter')==='1',                            // 调试：强制冬季雪山
  };

  /* ---------- ⑥ i18n：字符串表 + t() ---------- */
  const DICT = {
    zh: {
      title:'Solstice 场景设置',
      time:'时间', followReal:'跟随真实', lock:'锁定时段', lockedHour:'锁定时刻',
      cards:'元素卡片',
      luminary:'太阳 / 月亮', clouds:'云', rain:'雨 / 雪', stars:'星空', mountains:'山峦', tree:'前景树',
      lumAuto:'跟随时间', lumShow:'强制显示', lumHide:'隐藏',
      clAuto:'跟随天气',   clOff:'隐藏',
      rainAuto:'跟随天气', rainOn:'强制', rainOff:'关闭',
      stAuto:'夜晚显示',   stShow:'常显', stHide:'隐藏',
      mAuto:'显示',        mHide:'隐藏',
      snowLine:'山顶积雪', snAuto:'自动 · 冬季', snWinter:'常年雪山', snOff:'无积雪',
      tAuto:'跟随季节',    tShow:'自选变体', tHide:'隐藏',
      variant:'变体', spring:'春 · 花', summer:'夏 · 绿', autumn:'秋 · 橙', winter:'冬 · 雪',
      anchor:'位置', left:'左', center:'中', right:'右', sway:'摇曳',
      weather:'天气', weatherHint:'T0 手动 · T1 接真实', clear:'晴', cloudy:'多云',
      rainy:'雨', snowy:'雪', foggy:'雾', intensity:'强度',
      preset:'预设', pMin:'极简', pFull:'完整', pNight:'深夜护眼', dim:'整体亮度',
      parallax:'视差', fpsCap:'帧率上限',
      ui:'界面', lang:'语言', editMode:'编辑模式（拖拽 / 右键）', resetDefs:'恢复全部默认',
      hint1:'设置自动保存（localStorage）。',
      hint2:'「隐藏太阳」只隐藏圆盘，天空仍按真实时辰变亮变暗。',
      infoTitle:'信息组件', showSec:'显示秒', showDate:'显示日期',
      showWeather:'显示天气', showDebug:'详细信息（调试）', infoScale:'缩放',
      menuHide:'隐藏卡片', menuShow:'显示卡片', menuReset:'重置位置',
      menuSettings:'卡片设置…', menuScene:'场景设置…',
      menuWeather:'天气', menuPreset:'预设', menuResetAll:'重置全部卡片',
      menuVariant:'更换变体', menuTreeAdd:'添加前景树', menuTreeDel:'移除前景树',
      menuAdd:'添加素材', radialBack:'关闭',
      tipEdit:'编辑模式', tipReset:'重置全部卡片', tipPanel:'场景设置',
      hubEdit:'编辑模式', hubReset:'重置全部卡片', hubPanel:'场景设置',
      hintBar:'提示：右键卡片 / 天空可编辑，拖拽太阳调位置大小，双击卡片重置。',
      gotIt:'知道了',
      /* ---- 游戏 HUD（v0.5） ---- */
      dockWeather:'天气', dockTime:'时间', dockBuild:'搭建', dockPets:'伙伴',
      dockScene:'场景', dockEdit:'编辑', dockSettings:'设置',
      intensity:'强度', modeReal:'跟随真实', modeLock:'锁定时段',
      lockedAt:'当前时刻', buildTitle:'元素架', buildNature:'自然', buildPlants:'草木', buildSky:'天象',
      invClouds:'云', invMountains:'山峦', invStars:'星空', invRain:'雨雪',
      sceneTitle:'场景簿', sceneSave:'存', sceneLoad:'读', sceneClear:'清',
      sceneEmpty:'空', horses:'马群', horsesCount:'数量',
      devTitle:'开发者', hintPlayer:'改动即时生效并自动保存。',
      terrain:'地形', ridge:'山脊', river:'河流', lake:'湖泊',
      riverWidth:'河宽', flow:'流速', lakeSize:'湖面大小',
    },
    en: {
      title:'Solstice Scene Settings',
      time:'Time', followReal:'Real time', lock:'Locked period', lockedHour:'Hour',
      cards:'Element cards',
      luminary:'Sun / Moon', clouds:'Clouds', rain:'Rain / Snow', stars:'Stars', mountains:'Mountains', tree:'Foreground tree',
      lumAuto:'Follow time', lumShow:'Always show', lumHide:'Hide',
      clAuto:'Follow weather', clOff:'Hide',
      rainAuto:'Follow weather', rainOn:'Force on', rainOff:'Off',
      stAuto:'Night only', stShow:'Always show', stHide:'Hide',
      mAuto:'Show', mHide:'Hide',
      snowLine:'Snow caps', snAuto:'Auto (winter)', snWinter:'Always snowy', snOff:'None',
      tAuto:'Follow season', tShow:'Pick variant', tHide:'Hide',
      variant:'Variant', spring:'Spring', summer:'Summer', autumn:'Autumn', winter:'Winter',
      anchor:'Position', left:'Left', center:'Center', right:'Right', sway:'Sway',
      weather:'Weather', weatherHint:'T0 manual · live in T1', clear:'Clear', cloudy:'Cloudy',
      rainy:'Rain', snowy:'Snow', foggy:'Fog', intensity:'Intensity',
      preset:'Preset', pMin:'Minimal', pFull:'Full', pNight:'Night care', dim:'Brightness',
      parallax:'Parallax', fpsCap:'FPS cap',
      ui:'Interface', lang:'Language', editMode:'Edit mode (drag / right-click)', resetDefs:'Restore defaults',
      hint1:'Settings persist automatically (localStorage).',
      hint2:'Hiding the sun only removes the disc; the sky still follows real daylight.',
      infoTitle:'Info widget', showSec:'Seconds', showDate:'Date',
      showWeather:'Weather line', showDebug:'Details (debug)', infoScale:'Scale',
      menuHide:'Hide card', menuShow:'Show card', menuReset:'Reset transform',
      menuSettings:'Card settings…', menuScene:'Scene settings…',
      menuWeather:'Weather', menuPreset:'Preset', menuResetAll:'Reset all cards',
      menuVariant:'Change variant', menuTreeAdd:'Add tree', menuTreeDel:'Remove tree',
      menuAdd:'Add asset', radialBack:'Close',
      tipEdit:'Edit mode', tipReset:'Reset all cards', tipPanel:'Scene settings',
      hubEdit:'Edit mode', hubReset:'Reset all cards', hubPanel:'Scene settings',
      hintBar:'Tip: right-click a card or the sky to edit; drag the sun to move/resize; double-click resets.',
      gotIt:'Got it',
      /* ---- Game HUD (v0.5) ---- */
      dockWeather:'Weather', dockTime:'Time', dockBuild:'Build', dockPets:'Companion',
      dockScene:'Scene', dockEdit:'Edit', dockSettings:'Settings',
      intensity:'Intensity', modeReal:'Real time', modeLock:'Locked',
      lockedAt:'Current', buildTitle:'Element shelf', buildNature:'Nature', buildPlants:'Plants', buildSky:'Sky',
      invClouds:'Clouds', invMountains:'Mountains', invStars:'Stars', invRain:'Rain / Snow',
      sceneTitle:'Scene book', sceneSave:'Save', sceneLoad:'Load', sceneClear:'Del',
      sceneEmpty:'Empty', horses:'Horses', horsesCount:'Count',
      devTitle:'Developer', hintPlayer:'Changes apply instantly and persist.',
      terrain:'Terrain', ridge:'Ridge', river:'River', lake:'Lake',
      riverWidth:'River width', flow:'Flow', lakeSize:'Lake size',
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
    weather:'clear', weatherI:1,              // T0 手动；T1 provider 写 ctx.weather
    par:1, fps:30, editor:true, dim:1, preset:null,
    cards:{                                   // 卡实例：三态偏好 + 位置/缩放变换
      luminary:{pref:'auto', dx:0, dy:0, scale:1},
      clouds  :{pref:'auto', dy:0},
      stars   :{pref:'auto'},
      mountains:{pref:'auto', dy:0, scale:1, snow:'auto'},
      rain    :{pref:'auto'},
      tree    :{pref:'auto', dx:0, dy:0, scale:1, anchor:'left', sway:.4,
                variant:'summer'},          // variant 在 pref=show 时生效；auto=跟随季节
      horses  :{pref:'auto', count:3},        // Actor：马群（数量=count）
      /* 参数化地形（v5.4 §2.9）：控制点几何 + 材质填充，全部可编辑/可存档
       * ridge: 近山山脊控制点 [u, v]（v=uv.y 自下而上），Catmull-Rom 平滑
       * river.pts: 河流路径控制点（自山上流向湖）；lake: 湖中心+半径（uv） */
      terrain :{ pref:'auto',
        ridge:[[.06,.66],[.24,.52],[.42,.60],[.58,.47],[.76,.58],[.97,.52]],
        river:{ on:true, pts:[[.74,.46],[.70,.40],[.65,.34],[.62,.28],[.60,.24]], width:.020, flow:1 },
        lake: { x:.60, y:.17, rx:.15, ry:.065, scale:1 },
      },
    },
    info:{ expanded:true, showSec:true, showDate:true, showWeather:true,
           showDebug:false, scale:1, dx:0, dy:0 },
  };
  function loadCfg(){
    const raw = storage.get('lw.cfg.v1', {}) || {};
    const S = JSON.parse(JSON.stringify(DEFAULTS));
    const card = (id,def)=>{                    // v1 平铺键 → cards.<id> 迁移 + 深合并
      const o=Object.assign({pref:'auto',dx:0,dy:0,scale:1},def||{});
      if(typeof raw[id]==='string') o.pref=raw[id];
      else if(typeof raw[id]==='boolean') o.pref=raw[id]?'auto':'hide';
      return Object.assign(o,(raw.cards&&raw.cards[id])||{});
    };
    for(const id of Object.keys(DEFAULTS.cards))
      S.cards[id]=card(id, DEFAULTS.cards[id]);
    for(const k of ['timeMode','lockedHour','weather','par','dim','preset','weatherI'])
      if(k in raw) S[k]=raw[k];
    if('fps' in raw) S.fps=raw.fps;
    if('editor' in raw) S.editor=raw.editor;
    S.info=Object.assign(S.info,(raw.info)||{});
    S.par = CFG.par!==1 ? CFG.par : S.par;      // URL ?par 一次性覆盖
    S.fps = Q.has('fps') ? Math.max(10,parseFloat(Q.get('fps'))) : S.fps;
    return S;
  }
  const S = loadCfg();
  function saveCfg(){ storage.set('lw.cfg.v1', S); ctx.emit('cfg',S); }
  function resetCfg(){                          // 恢复默认（保留在原对象上改，引用不变）
    const d=JSON.parse(JSON.stringify(DEFAULTS));
    for(const k of Object.keys(d)) S[k]=d[k];
    ctx.weather=S.weather;
    saveCfg();
  }

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
  /* 真实季节（北半球近似）→ 树变体；"跟随季节"= 与真实世界同步的产品支柱 */
  function seasonOf(date){
    const m=(date||new Date()).getMonth();                  // 0-11
    return m>=2&&m<=4?'spring' : m>=5&&m<=7?'summer' : m>=8&&m<=10?'autumn' : 'winter';
  }

  const listeners = new Map();
  const ctx = {
    weather:'clear',                            // provider 插件写入；消费方只读/订阅
    on(evt,fn){ (listeners.get(evt)??listeners.set(evt,[]).get(evt)).push(fn); },
    emit(evt,data){ (listeners.get(evt)||[]).forEach(f=>{ try{f(data);}catch(e){console.error(e);} }); },
    sunState, palette, luminary, seasonOf,
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
    /* 卡实例视图：偏好与变换统一存 S.cards[id]。
     * v0.5：actors[] 是 cards[] 的演进（交互实体：行为 + 互动钩子），
     * 状态同存 S.cards[id]，编辑器/设置中心对两者一视同仁。 */
    _entries(){
      const out=[];
      for(const p of this.plugins)
        for(const c of [...(p.manifest.cards||[]), ...(p.manifest.actors||[])]){
          if(!S.cards[c.id]) S.cards[c.id]={pref:'auto',dx:0,dy:0,scale:1};
          out.push({plugin:p, card:c, st:S.cards[c.id]});
        }
      return out;
    },
    cards(){ return this._entries(); },
    /* Actor 视图：仅交互实体（宠物/动物/可回应元素） */
    actors(){ return this._entries().filter(e=>e.card.behaviors); },
    /* 冲突仲裁：元素卡决定"有没有"，世界决定"什么样"（§4.2 矩阵 + §4.4 五种天气） */
    resolveFrame(env){
      const C=S.cards, w=ctx.weather, I=S.weatherI??1;
      const st={ pal:env.pal, weather:w };

      /* 降水/效果强度：雨雪共用一张"雨/雪"效果卡（auto 跟随天气型） */
      const rp=C.rain.pref;
      const gate = rp==='off'?0 : rp==='on'?I : (w==='rain'||w==='snow')?I:0;
      st.rainI = w==='rain'?0.75*gate:0;
      st.snowI = w==='snow'?0.9 *gate:0;
      st.fogI  = w==='fog'?0.8 *I  :0;
      const overcast = w==='rain'||w==='snow'||w==='cloudy'||w==='fog';

      /* 世界的调色：各种天气对"世界外观"的偏移（§4.4） */
      let pal=env.pal;
      if(w==='rain'){
        pal=Object.assign({},pal,{ top:util.mix3(pal.top,[.42,.47,.55],.5),
          hor:util.mix3(pal.hor,[.50,.56,.64],.5), fog:util.mix3(pal.fog,[.58,.63,.70],.35),
          night:Math.min(1,pal.night+.15) });
      }else if(w==='snow'){
        pal=Object.assign({},pal,{ top:util.mix3(pal.top,[.72,.78,.88],.45),
          hor:util.mix3(pal.hor,[.80,.85,.92],.45), fog:util.mix3(pal.fog,[.85,.89,.95],.4),
          night:Math.min(1,pal.night+.10) });
      }else if(w==='cloudy'){
        const g=(c)=>{ const l=(c[0]+c[1]+c[2])/3; return util.mix3(c,[l,l,l*1.04],.38); };
        pal=Object.assign({},pal,{ top:g(pal.top), hor:g(pal.hor), fog:util.mix3(pal.fog,[.62,.65,.70],.3),
          night:Math.min(1,pal.night+.06), star:0 });
      }else if(w==='fog'){
        pal=Object.assign({},pal,{ hor:util.mix3(pal.hor,[.75,.79,.85],.4),
          fog:util.mix3(pal.fog,[.80,.84,.90],.45), star:0 });
      }
      st.pal=pal; st.night=pal.night;

      /* 日/月：hide=0；show 强制（压过天气隐去）；auto 按天气自动衰减 */
      const L = ctx.luminary(env.sun, env.aspect);
      const lm = C.luminary;
      if(lm.pref==='hide') L.a=0;
      else if(lm.pref==='show') L.a=1;
      else{
        const dim = w==='rain'?.12 : w==='snow'?.5 : w==='cloudy'?.45 : w==='fog'?.25 : 1;
        L.a*=dim;
      }
      L.x+=lm.dx; L.y+=lm.dy; L.r*=lm.scale;
      st.lum=L;

      /* 云：auto 跟天气云量；off 隐藏装饰云但降水照下（粒子属天气系统层） */
      let ci = w==='clear'?.4 : w==='fog'?.55 : .95;
      if(C.clouds.pref==='off') ci=0;
      else if(C.clouds.pref==='on') ci=Math.max(ci,.7);
      st.cloudI=ci; st.cloudDy=C.clouds.dy;

      /* 星空 / 山峦 */
      const sp=C.stars.pref;
      st.starI = sp==='hide'?0 : sp==='show'?Math.max(pal.star,overcast?0:0.85) : pal.star;
      st.mtnOn = C.mountains.pref!=='hide';
      st.mtnDy=C.mountains.dy; st.mtnScale=C.mountains.scale;
      /* 山顶积雪：off=无 / winter=常年 / auto=真实季节（冬季满雪，其余季高海拔残雪） */
      const snowP=C.mountains.snow||'auto';
      st.mtnSnow = CFG.winter ? 1
                 : snowP==='off'   ? 0
                 : snowP==='winter'? 1
                 : (seasonOf(env.date)==='winter' ? 1 : .25);

      /* 参数化地形（v5.4 §2.9）：近山控制点山脊 + 河流路径 + 湖泊（composer 着色器消费） */
      st.terrainOn = C.terrain.pref!=='hide';
      st.terrain   = st.terrainOn ? C.terrain : null;

      /* 前景树：auto=跟随真实季节；show=自选变体 */
      const t=C.tree;
      st.treeOn = t.pref!=='hide';
      st.treeVariant = t.pref==='auto' ? seasonOf(env.date) : t.variant;
      st.treeDx=t.dx; st.treeDy=t.dy; st.treeScale=t.scale;
      st.treeAnchor=t.anchor; st.treeSway=t.sway;

      st.raining = st.rainI>0 || st.snowI>0;
      return st;
    },
  };

  i18n.init();

  /* ---------- 素材包运行时注册（文件包加载器写入，见 assets/packs/） ---------- */
  const assets = { treeImages:null };         // {variantId: imageUrl}

  /* ---------- 场景簿：把"当前场景"作为一级对象保存/读取（核心循环②搭建） ----------
   * 快照 = 环境(天气/时辰/亮度/预设) + 全部卡片与 Actor 状态；存 lw.scene.v1.<i>。 */
  const scenes = {
    slots:3,
    key(i){ return 'lw.scene.v1.'+i; },
    snapshot(){
      return { ts:Date.now(),
        weather:S.weather, weatherI:S.weatherI, timeMode:S.timeMode,
        lockedHour:S.lockedHour, dim:S.dim, preset:S.preset,
        cards:JSON.parse(JSON.stringify(S.cards)) };
    },
    list(){ const a=[]; for(let i=0;i<this.slots;i++){
      const d=storage.get(this.key(i),null); a.push(d?{i,ts:d.ts}:null); } return a; },
    save(i){ storage.set(this.key(i), this.snapshot()); ctx.emit('cfg',S); },
    load(i){ const d=storage.get(this.key(i),null); if(!d) return false;
      S.weather=d.weather; S.weatherI=d.weatherI; S.timeMode=d.timeMode;
      S.lockedHour=d.lockedHour; S.dim=d.dim; S.preset=d.preset;
      S.cards=JSON.parse(JSON.stringify(d.cards));
      ctx.weather=S.weather; saveCfg(); return true; },
    del(i){ try{ localStorage.removeItem(this.key(i)); }catch(e){} },
  };

  return { version:'0.5', Q, CFG, S, DEFAULTS, saveCfg, resetCfg, util, i18n, storage, ctx, registry, assets, scenes };
})();
