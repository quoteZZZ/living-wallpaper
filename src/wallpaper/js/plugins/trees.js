/* ============================================================
 * pack.trees —— 前景树素材包（声明式卡 + 程序化贴图）
 * ------------------------------------------------------------
 * T0.3 用运行时 Canvas 生成贴图证明"贴图卡"管线（纹理+锚点+变体），
 * T1 换成真实 AI 素材 PNG 后 manifest 无需改动（§3.3 包格式）。
 * 变体：春樱/夏绿/秋橙/冬雪；pref=auto 时跟随真实季节（§4.9 同步支柱）。
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice, S = K.S;
  const save = ()=>K.saveCfg();

  K.registry.register({
    id:'pack.trees', api:1, type:'card',
    name:{zh:'前景树 · 四季', en:'Trees · Seasons'},
    description:{zh:'前景树剪影，四季变体；auto 跟随真实季节',
                 en:'Foreground tree silhouettes; auto follows the real season'},
    cards:[
      { id:'tree', slot:'foreground-tree', movable:true, resizable:true,
        anchors:['left','center','right'],
        variants:[
          { id:'spring', name:{zh:'春 · 花', en:'Spring'}, season:'spring' },
          { id:'summer', name:{zh:'夏 · 绿', en:'Summer'}, season:'summer' },
          { id:'autumn', name:{zh:'秋 · 橙', en:'Autumn'}, season:'autumn' },
          { id:'winter', name:{zh:'冬 · 雪', en:'Winter'}, season:'winter' },
        ] },
    ],
    settingsGroups:[
      { titleKey:'tree', items:[
        { type:'select', labelKey:'tree', card:'tree',
          options:[['auto','tAuto'],['show','tShow'],['hide','tHide']],
          get:()=>S.cards.tree.pref, set:v=>{ S.cards.tree.pref=v; save(); } },
        { type:'select', labelKey:'variant', card:'tree', show:()=>S.cards.tree.pref==='show',
          options:[['spring','spring'],['summer','summer'],['autumn','autumn'],['winter','winter']],
          get:()=>S.cards.tree.variant, set:v=>{ S.cards.tree.variant=v; save(); } },
        { type:'select', labelKey:'anchor', card:'tree',
          options:[['left','left'],['center','center'],['right','right']],
          get:()=>S.cards.tree.anchor, set:v=>{ S.cards.tree.anchor=v; save(); } },
        { type:'slider', labelKey:'sway', min:0, max:100, step:5,
          get:()=>Math.round(S.cards.tree.sway*100), set:v=>{ S.cards.tree.sway=v/100; save(); } },
      ]},
    ],
  }, {});

  /* ---------- 可选文件素材包（assets/packs/trees/，见 tools/PACKS_GUIDE.md） ----------
   * 存在 manifest.json 则用真实 PNG 变体贴图；file:// 或缺文件时静默回退程序化。 */
  if(location.protocol!=='file:'){
    fetch('assets/packs/trees/manifest.json')
      .then(r=>r.ok?r.json():null)
      .then(m=>{
        if(!m || !Array.isArray(m.variants)) return;
        const imgs={}, thumbs={};
        for(const v of m.variants) if(v.id && v.image){
          imgs[v.id]='assets/packs/trees/'+v.image;
          thumbs[v.id]='assets/packs/trees/'+v.image;   // 圆盘缩略图 = 真实素材
        }
        if(Object.keys(imgs).length){ K.assets.treeImages=imgs; K.assets.treeThumbs=thumbs; K.ctx.emit('cfg'); }
      })
      .catch(()=>{ /* 无文件包，程序化占位 */ });
  }
})();
