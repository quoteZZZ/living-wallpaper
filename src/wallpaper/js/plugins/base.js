/* ============================================================
 * official.base —— 基础场景：天空 + 时辰光照 + 日/月/星空卡
 * （DESIGN §3.6 自举：官方内容 = 第一批插件）
 * 天空与光照是内核唯一内置的"画面内容"（§3.1 例外），其用户设置
 * （时间模式 / 日月卡 / 星空卡 / 界面）在此声明。
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice, S = K.S;
  const save = ()=>K.saveCfg();

  K.registry.register({
    id:'official.base', api:1, type:'card',
    name:{zh:'基础场景 · 天空与光照', en:'Base · Sky & Lighting'},
    description:{zh:'时辰光照内核层，含太阳/月亮与星空卡',
                 en:'Time-of-day lighting layer with sun/moon and star cards'},
    cards:[
      { id:'luminary', slot:'luminary', movable:true, resizable:true },
      { id:'stars',    slot:'overlay-stars' },
    ],
    settingsGroups:[
      { titleKey:'time', items:[
        { type:'select', labelKey:'time', options:[['real','followReal'],['locked','lock']],
          get:()=>S.timeMode, set:v=>{ S.timeMode=v; save(); } },
        { type:'slider', labelKey:'lockedHour', min:0, max:24, step:0.1,
          show:()=>S.timeMode==='locked',
          get:()=>S.lockedHour, set:v=>{ S.lockedHour=v; save(); } },
      ]},
      { titleKey:'cards', items:[
        { type:'select', labelKey:'luminary', card:'luminary',
          options:[['auto','lumAuto'],['show','lumShow'],['hide','lumHide']],
          get:()=>S.cards.luminary.pref, set:v=>{ S.cards.luminary.pref=v; save(); } },
        { type:'select', labelKey:'stars', card:'stars',
          options:[['auto','stAuto'],['show','stShow'],['hide','stHide']],
          get:()=>S.cards.stars.pref, set:v=>{ S.cards.stars.pref=v; save(); } },
      ]},
      { titleKey:'ui', items:[
        { type:'select', labelKey:'lang', options:[['zh','中文'],['en','English']], rebuild:true,
          get:()=>K.i18n.lang, set:v=>K.i18n.set(v) },
        { type:'check', labelKey:'editMode',
          get:()=>S.editor, set:v=>{ S.editor=v; save(); if(K.editor) K.editor.setEnabled(v); } },
        { type:'slider', labelKey:'dim', min:40, max:100, step:5,
          get:()=>Math.round(S.dim*100), set:v=>{ S.dim=v/100; save(); } },
        { type:'slider', labelKey:'parallax', min:0, max:200, step:5,
          get:()=>Math.round(S.par*100), set:v=>{ S.par=v/100; save(); } },
        { type:'select', labelKey:'fpsCap', options:[['15','15'],['30','30'],['60','60']],
          get:()=>String(S.fps), set:v=>{ S.fps=parseInt(v,10); save(); } },
        { type:'button', labelKey:'resetDefs',
          onclick:()=>{ K.resetCfg(); if(K.editor) K.editor.setEnabled(S.editor); } },
      ]},
    ],
  }, {});
})();
