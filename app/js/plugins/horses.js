/* ============================================================
 * official.horses —— 马群（第一个 Actor 交互实体，DESIGN §1.1 马群补全）
 * ------------------------------------------------------------
 * 渲染：独立 2D canvas 叠加（简笔画：墨线 + 平涂，昼夜间随 st.night 换色），
 *       与 §1.2 "程序化 2D 绘制，无图片" 一致。
 * 行为状态机（Actor behaviors 协议的参考实现）：
 *   wander  漫步（往返巡游，腿摆慢）
 *   gallop  奔跑（随机触发，加速 + 大摆幅，DESIGN 验收项"奔跑动画+巡游"）
 *   respond 互动回应（被点击的马跳跃嘶鸣，编辑器 emit actor:click 派发）
 * 状态存 S.cards.horses（pref 显隐 / count 数量），对编辑器与设置中心
 * 表现得和普通卡片一致（registry.cards 合并 actors 的原因）。
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice, S = K.S;
  const save = ()=>K.saveCfg();

  let cv=null, g=null, W=0, H=0;
  let herd=[];                                   // 每匹马的状态

  /* ---------- 画布 ---------- */
  function ensure(){
    if(cv) return;
    cv=document.createElement('canvas'); cv.id='actors';
    document.body.appendChild(cv);
    g=cv.getContext('2d');
    resize(); addEventListener('resize',resize);
  }
  function resize(){
    const dpr=Math.min(devicePixelRatio||1,1.5);
    W=innerWidth; H=innerHeight;
    cv.width=W*dpr; cv.height=H*dpr;
    g.setTransform(dpr,0,0,dpr,0,0);
  }

  /* ---------- 马群状态 ---------- */
  function makeHorse(i,n){
    return { u:.14+(i+.5)/n*.68,                 // uv x（中心）
             yb:.04+((i*.37)%1)*.12,             // uv 底缘（远近错落）
             dir:i%2?1:-1, sc:.8+((i*.61)%1)*.35,
             speed:.010+((i*.23)%1)*.007,
             phase:i*2.1, state:'wander', stT:0, stDur:1, jump:0 };
  }
  function sync(){
    const n=Math.round(S.cards.horses.count||3);
    while(herd.length<n) herd.push(makeHorse(herd.length,n));
    herd.length=n;
  }

  const rnd=Math.random;
  function update(dt){
    for(const h of herd){
      h.phase+=dt*(h.state==='gallop'?9:3.4);
      if(h.state==='wander'){
        h.u+=h.dir*h.speed*dt*(1+h.sc*.3);
        if(h.u<.05){ h.u=.05; h.dir=1; }
        if(h.u>.92){ h.u=.92; h.dir=-1; }
        if(rnd()<dt*.07){ h.state='gallop'; h.stDur=h.stT=1.2+rnd()*1.6; }
      }else{
        h.stT-=dt;
        if(h.state==='gallop'){
          h.u+=h.dir*h.speed*6*dt*(1+h.sc*.3);
          if(h.u<.04||h.u>.93){ h.dir*=-1; h.u=K.util.clamp(h.u,.04,.93); }
        }
        if(h.state==='respond') h.jump=Math.sin(Math.PI*Math.max(0,1-h.stT/h.stDur))*.32;
        if(h.stT<=0){ h.state='wander'; h.jump=0; }
      }
    }
  }

  /* ---------- 绘制（简笔画马：纸色平涂 + 墨线，侧面剪影） ---------- */
  const lerp=(a,b,t)=>a+(b-a)*t;
  const mixCol=(c1,c2,t)=>`rgb(${c1.map((v,i)=>Math.round(lerp(v,c2[i],t))).join(',')})`;
  function drawHorse(h,st,t){
    const hpx=H*.11*h.sc, w=hpx*1.62;            // 总高 hpx，总宽 w
    const px=h.u*W, py=(1-h.yb-h.jump)*H;
    const ink =mixCol([58,52,44],[222,232,245],st.night);
    const fill=mixCol([248,242,226],[52,62,92],  st.night);
    const lw=Math.max(1.8,hpx*.028);
    g.save(); g.translate(px,py); g.scale(h.dir,1);
    g.strokeStyle=ink; g.fillStyle=fill;
    g.lineCap='round'; g.lineJoin='round'; g.lineWidth=lw;

    /* 四腿（对角步态；膝下略后掠） */
    const amp=h.state==='gallop'?.55:.26;
    const legX=[-.30,-.16,.14,.28];
    for(let i=0;i<4;i++){
      const lx=legX[i]*w;
      const sw=Math.sin(h.phase+((i===1||i===2)?Math.PI:0))*amp;
      const kx=lx+Math.sin(sw)*hpx*.16, ky=-hpx*.34;
      g.beginPath();
      g.moveTo(lx,-hpx*.52);
      g.lineTo(kx,ky);
      g.lineTo(kx+Math.sin(sw*1.3)*hpx*.14, 0);
      g.stroke();
    }
    /* 尾（垂落后摆） */
    g.beginPath(); g.moveTo(-w*.35,-hpx*.62);
    g.quadraticCurveTo(-w*.50,-hpx*.50+Math.sin(t*2.6+h.phase*.3)*hpx*.05,
                       -w*.46,-hpx*.22);
    g.stroke();
    /* 身体（横向圆角躯干） */
    const bw=w*.36, bh=hpx*.15;
    g.beginPath();
    g.roundRect ? g.roundRect(-bw,-hpx*.66,bw*2,bh*2,bh) : g.ellipse(0,-hpx*.58,bw,bh,0,0,7);
    g.fill(); g.stroke();
    /* 颈（粗壮斜线）+ 头 + 口鼻 + 耳 */
    g.lineWidth=lw*1.9;
    g.beginPath(); g.moveTo(bw*.55,-hpx*.66); g.lineTo(bw+ w*.06,-hpx*.97); g.stroke();
    g.lineWidth=lw;
    g.beginPath(); g.ellipse(bw+w*.085,-hpx*.99,w*.085,hpx*.055,-.28,0,7); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(bw+w*.10,-hpx*1.02); g.lineTo(bw+w*.10+hpx*.02,-hpx*1.08); g.stroke();
    /* 鬃（沿颈背锯齿） */
    g.beginPath(); g.moveTo(bw*.55,-hpx*.72);
    g.lineTo(bw*.42,-hpx*.80); g.lineTo(bw*.62,-hpx*.78);
    g.lineTo(bw*.52,-hpx*.88); g.lineTo(bw*.72,-hpx*.84);
    g.lineTo(bw*.66,-hpx*.94); g.lineTo(bw*.84,-hpx*.90);
    g.stroke();
    /* 眼 */
    g.fillStyle=ink;
    g.beginPath(); g.arc(bw+w*.10,-hpx*1.0,Math.max(1.3,lw*.5),0,7); g.fill();
    g.restore();
  }

  /* ---------- 命中矩形（uv，y=底缘；编辑器与点击回应共用） ---------- */
  function rects(){
    return herd.map(h=>{
      const hpx=H*.11*h.sc, w=hpx*1.62;
      return { x:h.u-w/2/W, y:h.yb+h.jump, w:w/W, h:hpx*1.12/H };
    });
  }

  /* ---------- Actor 互动：点击回应 ---------- */
  K.ctx.on('actor:click',d=>{
    if(d.id!=='horses'||!herd.length) return;
    const h=herd[Math.max(0,Math.min(herd.length-1,d.index??0))];
    if(h.state!=='respond'){ h.state='respond'; h.stDur=h.stT=.8; }
  });

  /* ---------- 注册 ---------- */
  K.registry.register({
    id:'official.horses', api:1, type:'actor',
    name:{zh:'马群', en:'Horses'},
    description:{zh:'巡游与奔跑的简笔马，点击互动',
                 en:'Sketch horses that roam, gallop and respond to clicks'},
    actors:[
      { id:'horses', interactive:true,
        behaviors:['wander','gallop','respond'] },
    ],
    settingsGroups:[
      { titleKey:'horses', items:[
        { type:'slider', labelKey:'horsesCount', min:1, max:6, step:1,
          get:()=>S.cards.horses.count||3, set:v=>{ S.cards.horses.count=v; sync(); save(); } },
      ]},
    ],
  }, {
    frame(now,t,st){
      ensure();
      const hide=S.cards.horses.pref==='hide';
      if(hide){ herd=[]; st.horsesRects=[]; g.clearRect(0,0,W,H); return; }
      sync();
      const dt=Math.min(.1, (now-(this._p||now))/1000); this._p=now;
      update(dt);
      g.clearRect(0,0,W,H);
      for(const h of herd) drawHorse(h,st,t);
      st.horsesRects=rects();
    },
  });
})();
