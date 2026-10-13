/* ============================================================
 * official.presets —— 预设插件（纯声明式，§4.6）
 * ------------------------------------------------------------
 * 预设 = 配置 diff（声明式，无代码逻辑）；apply 由内核面板/菜单调用。
 * 极简 = 只留光照与山峦；完整 = 全卡片；深夜护眼 = 压暗 + 静夜。
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice, S = K.S;

  const PRESETS = {
    minimal:{ zh:'极简', en:'Minimal', diff:{
      weather:'clear', dim:1, par:.8,
      cards:{ tree:{pref:'hide'}, clouds:{pref:'off'}, rain:{pref:'auto'},
              mountains:{pref:'auto'}, stars:{pref:'auto'}, luminary:{pref:'auto'} } } },
    full:{ zh:'完整', en:'Full', diff:{
      weather:'clear', dim:1, par:1,
      cards:{ tree:{pref:'auto'}, clouds:{pref:'auto'}, rain:{pref:'auto'},
              mountains:{pref:'auto'}, stars:{pref:'auto'}, luminary:{pref:'auto'} } } },
    night:{ zh:'深夜护眼', en:'Night care', diff:{
      dim:.62, weather:'clear',
      cards:{ tree:{pref:'hide'}, clouds:{pref:'off'}, rain:{pref:'off'},
              stars:{pref:'auto'}, luminary:{pref:'auto'} } } },
  };

  function apply(id){
    const p=PRESETS[id]; if(!p) return;
    const d=JSON.parse(JSON.stringify(p.diff));
    for(const k of Object.keys(d)){
      if(k==='cards'){ for(const c in d.cards) Object.assign(S.cards[c], d.cards[c]); }
      else S[k]=d[k];
    }
    S.preset=id;
    K.ctx.weather=S.weather;
    K.saveCfg();
  }

  K.registry.register({
    id:'official.presets', api:1, type:'preset',
    name:{zh:'预设', en:'Presets'},
    description:{zh:'极简 / 完整 / 深夜护眼', en:'Minimal / Full / Night care'},
    cards:[],
    presets:PRESETS,
    settingsGroups:[],
  }, { apply });
})();
