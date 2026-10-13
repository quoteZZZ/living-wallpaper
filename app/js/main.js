/* ============================================================
 * Solstice 启动入口：装配内核服务 + 官方插件 + 渲染循环
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice;

  K.panel.init();
  if(K.CFG.ui){ K.editor.init(); K.hud.init(); }      // 壁纸态(ui=0)无 HUD，纯展示
  if(K.CFG.dbg) K.S.info.showDebug=true;               // 会话级，不入库

  K.composer.run((now,t)=>{
    const d=new Date();
    K.ctx.weather=K.S.weather;                          // T0 手动源；T1 由 provider 写入
    const sun=K.ctx.sunState(d);
    const pal=K.ctx.palette(sun.elev*180/Math.PI);
    const st=K.registry.resolveFrame({date:d,sun,pal,aspect:K.composer.aspect});
    for(const p of K.registry.plugins) p.impl.frame && p.impl.frame(now,t,st);
    if(K.CFG.ui) K.editor.tick(st);
    return st;
  });

  /* ============ Wallpaper Engine 属性桥（与面板驱动同一 S） ============
   * T1.0 起 Tauri 壳用同一协议注入设置（DESIGN §4.6）。 */
  window.wallpaperPropertyListener={
    applyUserProperties(p){
      const num=k=>parseFloat(p[k]&&p[k].value);
      const S=K.S;
      if(p.par)        S.par=Math.max(0,num('par')||0)/100;
      if(p.luminary)   S.cards.luminary.pref=String(p.luminary.value);
      if(p.clouds)     S.cards.clouds.pref=String(p.clouds.value);
      if(p.rain)       S.cards.rain.pref=String(p.rain.value);
      if(p.stars)      S.cards.stars.pref=p.stars.value?'auto':'hide';
      if(p.mountains)  S.cards.mountains.pref=p.mountains.value?'auto':'hide';
      if(p.weather)    S.weather=String(p.weather.value);
      if(p.timemode)   S.timeMode=String(p.timemode.value);
      if(p.lockedhour) S.lockedHour=num('lockedhour')||12;
      if(p.fps)        S.fps=Math.max(10,num('fps')||30);
      K.saveCfg();
    }
  };
})();
