/* ============================================================
 * official.mountains —— 山峦卡：T0 程序化山峦迁为声明式参数
 * （DESIGN §3.6：程序化渲染器 + 声明式参数，保留零素材可用性）
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice, S = K.S;
  const save = ()=>K.saveCfg();

  K.registry.register({
    id:'official.mountains', api:1, type:'card',
    name:{zh:'山峦', en:'Mountains'},
    description:{zh:'四层程序化山峦，深度视差', en:'Four procedural ridge layers with depth parallax'},
    cards:[
      { id:'mountains', slot:'mountains', movable:true, resizable:true },
    ],
    settingsGroups:[
      { titleKey:'mountains', items:[
        { type:'select', labelKey:'mountains', card:'mountains',
          options:[['auto','mAuto'],['hide','mHide']],
          get:()=>S.cards.mountains.pref, set:v=>{ S.cards.mountains.pref=v; save(); } },
        { type:'select', labelKey:'snowLine', card:'mountains',
          options:[['auto','snAuto'],['winter','snWinter'],['off','snOff']],
          get:()=>S.cards.mountains.snow||'auto', set:v=>{ S.cards.mountains.snow=v; save(); } },
      ]},
    ],
  }, {});
})();
