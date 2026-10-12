/* ============================================================
 * official.weather —— 天气：手动源（T0）+ 雨效果层 + 装饰云卡
 * ------------------------------------------------------------
 * T1 将 provider（Open-Meteo）独立为 provider 插件写入
 * K.ctx.weather；本插件的粒子/云量消费总线事件（§4.4）。
 * 冲突仲裁在内核 registry.resolveFrame（雨照下、云可单独关）。
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice, S = K.S;
  const save = ()=>K.saveCfg();

  K.registry.register({
    id:'official.weather', api:1, type:'effect',
    name:{zh:'天气 · 云雨', en:'Weather · Clouds & Rain'},
    description:{zh:'雨粒子与装饰云；T0 手动切换，T1 接真实天气',
                 en:'Rain particles and decorative clouds; manual in T0, live in T1'},
    cards:[
      { id:'clouds', slot:'clouds', movable:true },
      { id:'rain',   slot:'overlay-rain' },
    ],
    settingsGroups:[
      { titleKey:'weather', items:[
        { type:'select', labelKey:'weather', hintKey:'weatherHint', options:[['clear','clear'],['rain','rainy']],
          get:()=>S.weather, set:v=>{ S.weather=v; K.ctx.weather=v; save(); } },
        { type:'select', labelKey:'rain', card:'rain',
          options:[['auto','rainAuto'],['on','rainOn'],['off','rainOff']],
          get:()=>S.cards.rain.pref, set:v=>{ S.cards.rain.pref=v; save(); } },
      ]},
      { titleKey:'clouds', items:[
        { type:'select', labelKey:'clouds', card:'clouds',
          options:[['auto','clAuto'],['off','clOff']],
          get:()=>S.cards.clouds.pref, set:v=>{ S.cards.clouds.pref=v; save(); } },
      ]},
    ],
  }, {});
})();
