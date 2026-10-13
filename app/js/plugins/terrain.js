/* ============================================================
 * official.terrain —— 参数化地形（v5.4 DESIGN §2.9）
 * ------------------------------------------------------------
 * 万物元素化定调后的核心元素卡：山脊/河流/湖泊 = 用户可编辑的
 * 控制点几何（存 S.cards.terrain，随场景簿存档/分享），渲染在
 * composer 通道一着色器（坡向光照/视差/雪线复用既有机制），
 * 材质由地形无接缝材质包（SET-01）经 schema v2 materials[] 填充
 * ——v0 先用程序化水色，材质贴图随后接入。
 * 本插件职责：卡注册 + 设置项 + 每帧向编辑器暴露控制点手柄。
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice, S = K.S;
  const save = ()=>K.saveCfg();

  K.registry.register({
    id:'official.terrain', api:1, type:'card',
    name:{zh:'地形', en:'Terrain'},
    description:{zh:'山脊/河流/湖泊控制点几何，编辑模式下可拖拽重塑',
                 en:'Editable ridge / river / lake control-point geometry'},
    cards:[
      { id:'terrain', slot:'mid' },
    ],
    settingsGroups:[
      { titleKey:'terrain', items:[
        { type:'select', labelKey:'terrain', card:'terrain',
          options:[['auto','mAuto'],['hide','mHide']],
          get:()=>S.cards.terrain.pref, set:v=>{ S.cards.terrain.pref=v; save(); } },
        { type:'select', labelKey:'river', card:'terrain',
          options:[['on','mAuto'],['off','mHide']],
          get:()=>S.cards.terrain.river.on===false?'off':'on',
          set:v=>{ S.cards.terrain.river.on=v!=='off'; save(); } },
        { type:'slider', labelKey:'lakeSize', min:50, max:200, step:5,
          get:()=>Math.round((S.cards.terrain.lake.scale??1)*100),
          set:v=>{ S.cards.terrain.lake.scale=v/100; save(); } },
        { type:'slider', labelKey:'riverWidth', min:8, max:50, step:1,
          get:()=>Math.round(S.cards.terrain.river.width*1000),
          set:v=>{ S.cards.terrain.river.width=v/1000; save(); } },
        { type:'slider', labelKey:'flow', min:0, max:300, step:10,
          get:()=>Math.round((S.cards.terrain.river.flow??1)*100),
          set:v=>{ S.cards.terrain.river.flow=v/100; save(); } },
      ]},
    ],
  }, {
    /* 每帧把控制点以手柄形式暴露给编辑器（uv 坐标；editor 负责命中/拖拽） */
    frame(now,t,st){
      st.terrainHandles=[];
      if(!st.terrainOn || !st.terrain) return;
      const T=st.terrain;
      T.ridge.forEach((p,i)=>st.terrainHandles.push({path:'ridge', i, x:p[0], y:p[1]}));
      if(T.river.on!==false)
        T.river.pts.forEach((p,i)=>st.terrainHandles.push({path:'river', i, x:p[0], y:p[1]}));
      st.terrainHandles.push({path:'lake', x:T.lake.x, y:T.lake.y});
    },
  });
})();
