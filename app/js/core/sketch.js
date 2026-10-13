/* ============================================================
 * Solstice 简笔画渲染器（StyleSystem 渲染后端 #2）
 * ------------------------------------------------------------
 * 与 WebGL 程序化渲染器（composer.js）互为后端，吃同一份内核
 * 状态 st（太阳位置/调色/夜晚系数/卡片开关），由 composer 主循环
 * 按 S.style 分发。
 * 美术：暖纸底 + 墨线描边 + 平涂色块（湖泊/草原/远山/云/日/马群）
 * 全部程序化绘制，无图片素材；昼夜=纸色/墨色切换 + 星月。
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice;
  const S = K.S;
  let cv = null, ctx = null, W = 0, H = 0;

  function init(){
    cv = document.getElementById('paper');
    ctx = cv.getContext('2d');
    resize();
    addEventListener('resize', resize);
  }
  function resize(){
    W = cv.width  = Math.floor(innerWidth);
    H = cv.height = Math.floor(innerHeight);
  }

  /* ---------- 确定性伪随机（山脊/星点/草叶用） ---------- */
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  /* ---------- 调色（纸色随昼夜切换） ---------- */
  function colors(night){
    const t = Math.min(1, night);
    const mix = (a, b) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const c = {
      paper:  mix([251, 246, 234], [30, 38, 58]),
      ink:    mix([58, 52, 44],   [222, 232, 245]),
      grass:  mix([169, 209, 126], [46, 64, 55]),
      mtFar:  mix([197, 210, 230], [43, 56, 84]),
      mtNear: mix([139, 163, 199], [30, 42, 69]),
      lake:   mix([143, 203, 228], [40, 73, 95]),
      sun:    [246, 196, 83],
      moon:   [232, 238, 246],
      horse:  mix([222, 178, 148], [94, 78, 70]),
    };
    for (const k in c) if (k !== 'sun' && k !== 'moon' && k !== 'horse') c[k] = `rgb(${c[k].join(',')})`;
    return c;
  }

  /* ---------- 场景几何（供渲染与编辑器共用，css px） ---------- */
  function geo(){
    return {
      horizon: H * 0.46,
      meadowTop: H * 0.56,
      lake: { x: W * 0.60 - W * 0.16, y: H * 0.70, w: W * 0.32, h: H * 0.16 },
      horseBandTop: H * 0.64, horseBandH: H * 0.22,
    };
  }
  function lakeBox(){ const g = geo(); return g.lake; }
  function horseBand(){ const g = geo(); return { x: 0, y: g.horseBandTop, w: W, h: g.horseBandH }; }

  /* ---------- 绘制元件 ---------- */
  function drawSunMoon(st, c, night){
    const a = K.composer.aspect;
    const x = (0.5 + st.lum.x / a) * W;
    const y = (1 - (0.5 + st.lum.y)) * H;
    const r = Math.max(st.lum.r * H * 1.15, 20);
    ctx.lineWidth = Math.max(2.5, r * 0.09);
    ctx.strokeStyle = c.ink; ctx.fillStyle = `rgb(${c.sun.join(',')})`;
    if (night < 0.5) {                                     // 太阳 + 光芒
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const ang = i * Math.PI / 4 + 0.4;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * r * 1.35, y + Math.sin(ang) * r * 1.35);
        ctx.lineTo(x + Math.cos(ang) * r * 1.8,  y + Math.sin(ang) * r * 1.8);
        ctx.stroke();
      }
    } else {                                               // 月亮（圆 + 掩圆成月牙）
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
      ctx.fillStyle = `rgb(${c.moon.join(',')})`; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + r * 0.42, y - r * 0.18, r * 0.82, 0, 7);
      ctx.fillStyle = c.paper; ctx.fill();
    }
    return { x, y };
  }

  function drawStars(night){
    if (night < 0.35) return;
    ctx.fillStyle = `rgba(235,240,250,${(night - 0.3) * 1.4})`;
    for (let i = 0; i < 60; i++) {
      const x = rnd(i) * W, y = rnd(i + 99) * H * 0.55, r2 = 1 + rnd(i + 7) * 1.6;
      ctx.beginPath(); ctx.arc(x, y, r2, 0, 7); ctx.fill();
    }
  }

  function drawClouds(t, c, nightV){
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const spd = 7 + i * 4;
      const cx = ((t * spd + i * W / 2.6) % (W + 280)) - 140;
      const cy = H * (0.13 + 0.085 * i);
      const s = (1 + i * 0.18) * W / 1280 * 46;
      ctx.beginPath();
      ctx.arc(cx, cy, s, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(cx + s * 0.9, cy - s * 0.55, s * 0.72, Math.PI, 0);
      ctx.arc(cx + s * 1.8, cy, s * 0.85, Math.PI * 1.4, Math.PI * 0.5);
      ctx.closePath();
      ctx.fillStyle = nightV > 0.5 ? '#c8d2de' : '#ffffff';
      ctx.fill(); ctx.strokeStyle = c.ink; ctx.stroke();
    }
  }

  function drawMountains(c){
    // 远山
    ctx.beginPath(); ctx.moveTo(0, geo().horizon + H * 0.06);
    for (let i = 0; i <= 8; i++)
      ctx.lineTo(W * i / 8, H * (0.40 - 0.09 * Math.abs(Math.sin(i * 1.9 + 0.6))));
    ctx.lineTo(W, geo().meadowTop); ctx.lineTo(0, geo().meadowTop); ctx.closePath();
    ctx.fillStyle = c.mtFar; ctx.fill();
    ctx.strokeStyle = c.ink; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const x = W * i / 8, y = H * (0.40 - 0.09 * Math.abs(Math.sin(i * 1.9 + 0.6)));
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    // 近山
    ctx.beginPath(); ctx.moveTo(0, geo().meadowTop + H * 0.02);
    for (let i = 0; i <= 6; i++)
      ctx.lineTo(W * i / 6, H * (0.52 - 0.07 * Math.abs(Math.sin(i * 2.4 + 2.1))));
    ctx.lineTo(W, geo().meadowTop + H * 0.03); ctx.lineTo(W, geo().meadowTop + H * 0.02);
    ctx.closePath();
    ctx.fillStyle = c.mtNear; ctx.fill();
    ctx.strokeStyle = c.ink;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const x = W * i / 6, y = H * (0.52 - 0.07 * Math.abs(Math.sin(i * 2.4 + 2.1)));
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }

  function drawMeadow(c){
    ctx.fillStyle = c.grass;
    ctx.fillRect(0, geo().meadowTop, W, H - geo().meadowTop);
    ctx.strokeStyle = c.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, geo().meadowTop); ctx.lineTo(W, geo().meadowTop); ctx.stroke();
    // 草叶与小花
    for (let i = 0; i < 26; i++) {
      const x = rnd(i * 3) * W, y = geo().meadowTop + rnd(i * 3 + 1) * (H - geo().meadowTop) * 0.9;
      const h2 = 6 + rnd(i * 3 + 2) * 9;
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 2, y - h2 * 0.6, x + 4, y - h2); ctx.stroke();
      if (i % 4 === 0) {
        ctx.fillStyle = i % 8 === 0 ? '#e6a2b5' : '#f2e2a0';
        ctx.beginPath(); ctx.arc(x + 7, y - h2, 2.6, 0, 7); ctx.fill();
      }
    }
  }

  function drawLake(c, t, sunX){
    const { x, y, w, h } = geo().lake;
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 7);
    ctx.fillStyle = c.lake; ctx.fill();
    ctx.strokeStyle = c.ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 3; i++) {
      const yy = y + h * (0.38 + i * 0.2), ww = w * (0.3 + i * 0.12);
      const wob = Math.sin(t * 1.4 + i * 2) * 6;
      ctx.beginPath();
      ctx.moveTo(x + w / 2 - ww / 2 + wob, yy);
      ctx.quadraticCurveTo(x + w / 2, yy + 3.5, x + w / 2 + ww / 2 + wob, yy);
      ctx.stroke();
    }
    // 日/月倒影光带
    const a = K.composer.aspect;
    const sx = (0.5 + (window.__lumX || 0) / a) * W;
    if (sx > x && sx < x + w) {
      ctx.strokeStyle = 'rgba(255,244,200,.8)'; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const yy = y + h * (0.25 + i * 0.18);
        const ww2 = w * (0.06 + 0.03 * Math.sin(t * 2 + i));
        ctx.beginPath(); ctx.moveTo(sx - ww2, yy); ctx.lineTo(sx + ww2, yy); ctx.stroke();
      }
    }
  }

  function drawHorse(x, y, h, dirFlip, phase, c, nightV){
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dirFlip * h / 100, h / 100);          // 单位化：肩高≈100
    ctx.lineCap = 'round';
    const lw = 7;
    // 四腿（奔跑相位）
    ctx.strokeStyle = c.ink; ctx.lineWidth = lw;
    const leg = (ox, ph) => {
      const sw = Math.sin(phase + ph) * 16;
      ctx.beginPath();
      ctx.moveTo(ox, -38);
      ctx.quadraticCurveTo(ox + sw * 0.4, -20, ox + sw, 2);
      ctx.stroke();
    };
    leg(-26, 0); leg(-14, Math.PI); leg(16, Math.PI * 0.5); leg(28, Math.PI * 1.5);
    // 身体
    ctx.beginPath();
    ctx.ellipse(0, -52, 40, 22, 0, 0, 7);
    ctx.fillStyle = nightV > 0.5 ? '#4a4038' : `rgb(${c.horse.replace(/[^\d,]/g, '')})`;
    ctx.fill(); ctx.stroke();
    // 颈 + 头
    ctx.beginPath();
    ctx.moveTo(30, -62);
    ctx.quadraticCurveTo(46, -78, 52, -92);
    ctx.quadraticCurveTo(58, -98, 64, -94);
    ctx.quadraticCurveTo(66, -88, 58, -84);
    ctx.quadraticCurveTo(48, -80, 42, -66);
    ctx.closePath();
    ctx.fillStyle = ctx.fillStyle; ctx.fill(); ctx.stroke();
    // 鬃毛 / 尾
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath(); ctx.moveTo(44, -88); ctx.quadraticCurveTo(38, -96, 34, -100); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-38, -60); ctx.quadraticCurveTo(-58, -54, -60, -34); ctx.stroke();
    ctx.restore();
  }

  function drawHorses(t, c, nightV){
    const g = geo();
    const defs = [
      { bx: 0.16, ph: 0.0,  h: 0.105, row: 0.00 },
      { bx: 0.46, ph: 2.1,  h: 0.085, row: 0.10 },
      { bx: 0.74, ph: 4.4,  h: 0.120, row: 0.18 },
    ];
    defs.forEach((d, i) => {
      const h = H * d.h;
      const range = W * 0.13;
      const drift = Math.sin(t * 0.11 + d.ph) * range;
      const x = W * d.bx + drift;
      const y = g.horseBandTop + g.horseBandH * (0.55 + d.row) ;
      const dirFlip = Math.cos(t * 0.11 + d.ph) >= 0 ? 1 : -1;   // 行进方向
      const phase = t * 7 + d.ph * 3;
      drawHorse(x, y, h, dirFlip, phase, c, nightV);
    });
  }

  function drawSketchTrees(c){
    // 简笔树两棵（对应 tree 卡）
    const defs = [[0.09, 0.62, 0.9], [0.88, 0.58, 0.7]];
    defs.forEach(([ux, uy, s]) => {
      const x = ux * W, base = uy * H, h = H * 0.16 * s;
      ctx.strokeStyle = c.ink; ctx.lineWidth = Math.max(3, h * 0.06); ctx.lineCap = 'round';
      ctx.fillStyle = '#7fb069';
      ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - h * 0.55); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, base - h * 0.72, h * 0.30, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x - h * 0.2, base - h * 0.58, h * 0.2, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + h * 0.2, base - h * 0.6, h * 0.21, 0, 7); ctx.fill(); ctx.stroke();
    });
  }

  function drawPrecip(st){
    if (st.rainI > 0.01) {
      ctx.strokeStyle = `rgba(90,120,160,${Math.min(0.8, st.rainI)})`; ctx.lineWidth = 2;
      for (let i = 0; i < 40; i++) {
        const x = (rnd(i) * W + performance.now() * 0.12 * (0.6 + rnd(i + 3))) % W;
        const y = (rnd(i + 11) * H + performance.now() * 0.55 * (0.6 + rnd(i + 5))) % H;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 16); ctx.stroke();
      }
    }
    if (st.snowI > 0.01) {
      ctx.fillStyle = `rgba(250,252,255,${Math.min(0.95, st.snowI)})`;
      for (let i = 0; i < 34; i++) {
        const x = (rnd(i + 40) * W + Math.sin(performance.now() / 900 + i) * 30 + W) % W;
        const y = (rnd(i + 51) * H + performance.now() * 0.06 * (0.6 + rnd(i + 8))) % H;
        ctx.beginPath(); ctx.arc(x, y, 1.6 + rnd(i) * 2.2, 0, 7); ctx.fill();
      }
    }
  }

  /* ---------- 主入口（composer 主循环按 S.style 分发到这里） ---------- */
  function frame(st, t){
    if (!ctx) init();
    const nightV = st.night;
    const c = colors(nightV);
    ctx.fillStyle = c.paper; ctx.fillRect(0, 0, W, H);
    drawStars(nightV);
    const sunPos = drawSunMoon(st, c, nightV);
    window.__lumX = sunPos.x;
    drawClouds(t, c);
    drawMountains(c);
    drawMeadow(c);
    if (S.cards.lake.pref !== 'hide') drawLake(c, t);
    drawSketchTrees(c);
    if (S.cards.horses.pref !== 'hide') drawHorses(t, c, nightV);
    drawPrecip(st);
    // 夜幕压暗（保留线条可读）
    if (nightV > 0.05) {
      ctx.fillStyle = `rgba(18,28,52,${nightV * 0.28})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  K.sketch = { init, frame, lakeBox, horseBand };
})();
