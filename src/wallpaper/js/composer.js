/* ============================================================
 * Solstice 合成器（内核服务①）：WebGL2 全屏着色器渲染循环
 * ------------------------------------------------------------
 * · 单程序化管线：天空/星/云/山/雨 + 日月辉光；可选图片+深度图模式
 * · 图层状态 st 由 registry.resolveFrame() 仲裁产生（见 kernel.js）
 * · 性能治理（§4.7）：fps 上限 / hidden 跳帧 / DPR≤1.5 / low-power
 * · fps 计数：按"墙钟秒 × 实际渲染帧"统计（修复旧版丢帧高估）
 * ============================================================ */
"use strict";
(function(){
  const K = window.Solstice;
  const { S, CFG } = K;

  const canvas = document.getElementById('gl');
  const gl = canvas.getContext('webgl2', { antialias:false, alpha:false, powerPreference:'low-power' });
  if(!gl){
    const d=document.createElement('div');
    d.style.cssText='position:fixed;left:10px;top:10px;color:#cfe;font:13px system-ui;background:rgba(0,10,20,.6);padding:8px 12px;border-radius:8px';
    d.textContent='此环境不支持 WebGL2 / WebGL2 not supported';
    document.body.appendChild(d);
    throw new Error('no webgl2');
  }

  const VS = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos*.5+.5; gl_Position = vec4(aPos,0.,1.); }`;

  const FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 outColor;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uPar;
uniform vec3  uTop, uHor, uLumC, uFog, uAmb;
uniform float uStar, uNight;
uniform vec3  uLum;                     // xy 屏幕位置(suv), z 半径（已含编辑器变换）
uniform float uLumA;                    // 日/月可见度（隐藏=0）
uniform float uMode;                    // 0 程序化 / 1 图片+深度
uniform float uHasStars, uHasMountains, uCloud, uRain;
uniform vec2  uMtn;                     // x 山峦垂直偏移, y 起伏缩放（编辑器变换）
uniform float uCloudOff;                // 云带垂直偏移（编辑器变换）
uniform sampler2D uScene, uDepth;

float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),u.x),
             mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),u.x),u.y);
}
float fbm(vec2 p){ float v=0.,a=.5;
  for(int i=0;i<5;i++){ v+=a*vnoise(p); p=p*2.03+vec2(19.7,7.3); a*=.5; } return v; }
float stars(vec2 uv,float t){
  vec2 g=uv*90.; vec2 id=floor(g); float h=hash21(id);
  if(h<.93) return 0.;
  vec2 c=fract(g)-.5-(vec2(hash21(id+7.1),hash21(id+3.7))-.5)*.6;
  float tw=.55+.45*sin(t*(1.+h*3.)+h*40.);
  return smoothstep(.09,0.,length(c))*tw;
}
/* 雨条带：按行错位的稀疏竖条，两层不同速度尺度 */
float rainLayer(vec2 uv,float t,float sc){
  vec2 p=vec2(uv.x*(34.*sc), uv.y*(2.4*sc)-t*(2.8*sc));
  p.x+=floor(p.y)*7.13;
  vec2 id=floor(p);
  float h=hash21(id);
  if(h<.80) return 0.;
  vec2 f=fract(p)-vec2(0.,.45);
  return smoothstep(.03,.006,abs(f.x))*smoothstep(.40,.03,abs(f.y))*.9;
}

void main(){
  float aspect=uRes.x/uRes.y;
  vec2 uv=vUv;
  vec2 suv=vec2((uv.x-.5)*aspect, uv.y-.5);
  vec3 col;

  if(uMode>.5){
    /* 图片模式：深度视差 */
    vec2 tuv=(uv-.5)*.94+.5;
    float d=texture(uDepth,tuv).r;
    vec2 off=uMouse*uPar*.055*d;
    vec2 puv=clamp(tuv-off*vec2(1.,.6),.001,.999);
    col=texture(uScene,puv).rgb;
    col=mix(col*(1.+.05*(1.-uNight)), col*uAmb+uTop*.10, uNight*.6);
  }else{
    /* 程序化：天空 / 星空 / 云 */
    float h=clamp(uv.y,0.,1.);
    col=mix(uHor,uTop,pow(h,.8));
    col+=vec3(stars(uv,uTime)*uStar*uHasStars*smoothstep(.18,.55,h));
    float cl=fbm(vec2(uv.x*2.6+uTime*.004, uv.y*5.));
    float band=smoothstep(.42+uCloudOff,.6+uCloudOff,h)*smoothstep(.97+uCloudOff,.8+uCloudOff,h);
    col=mix(col, mix(vec3(1.), uTop*.55+uFog*.45, uNight),
            smoothstep(.58,.78,cl)*band*.65*uCloud);
  }

  /* 日/月（uLumA=0 即元素卡"隐藏"，光照不受影响，§4.2） */
  float gd=length(suv-uLum.xy);
  col+=uLumC*exp(-gd*gd*26.)*.55*uLumA;
  col+=uLumC*smoothstep(uLum.z,uLum.z*.5,gd)*uLumA*(1.25-uNight*.8);

  /* 山峦分层视差（uMtn = 编辑器垂直偏移/起伏缩放） */
  if(uMode<.5 && uHasMountains>.5){
    for(int i=0;i<4;i++){
      float fi=float(i);
      float d =.35+fi*.2166;
      float px=uMouse.x*uPar*.27*d;
      float py=uMouse.y*uPar*.05*d;
      float ridge=.44-fi*.07+uMtn.x
                 +fbm(vec2(uv.x*(1.2+fi*1.2)-px+fi*13.1, fi*7.7))*(.08+fi*.03)*uMtn.y
                 +py;
      float m=smoothstep(ridge, ridge-.012, uv.y);
      vec3 mc=mix(uFog*.85+uHor*.35, uFog*.25+vec3(.015,.02,.05), pow(d,1.3));
      col=mix(col,mc,m*.97);
    }
  }

  /* 雨粒子层（系统层：属于天气，不属于装饰云卡片） */
  if(uRain>.001){
    float r1=rainLayer(uv,uTime,1.);
    float r2=rainLayer(uv+vec2(3.1,1.7),uTime*1.4,1.5);
    float rr=clamp((r1+r2)*uRain,0.,1.);
    col=mix(col, vec3(.72,.78,.88)*(1.-uNight*.82), rr*.5);
    col*=1.-.10*uRain;
  }

  col*=1.-.32*dot(suv,suv);
  col+=(hash21(uv*uRes+fract(uTime)*61.7)-.5)*.02;
  outColor=vec4(max(col,vec3(0.)),1.);
}`;

  function sh(type,src){
    const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
      console.error(gl.getShaderInfoLog(s)); throw new Error('shader compile'); }
    return s;
  }
  const prog=gl.createProgram();
  gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));
  gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));
  gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){
    console.error(gl.getProgramInfoLog(prog)); throw new Error('program link'); }
  gl.useProgram(prog);

  const buf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1, 3,-1, -1,3]),gl.STATIC_DRAW);
  const aPos=gl.getAttribLocation(prog,'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);

  const U={};
  for(const n of ['uRes','uTime','uMouse','uPar','uTop','uHor','uLumC','uFog','uAmb',
                  'uStar','uNight','uLum','uLumA','uMode',
                  'uHasStars','uHasMountains','uCloud','uRain','uMtn','uCloudOff',
                  'uScene','uDepth'])
    U[n]=gl.getUniformLocation(prog,n);

  /* ---------- 可选正式素材（assets/scene.png + depth.png） ---------- */
  let mode=0;
  function makeTex(img,unit,uni){
    gl.activeTexture(gl.TEXTURE0+unit);
    const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.uniform1i(U[uni],unit);
  }
  function loadImg(src){ return new Promise((res,rej)=>{
    const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src; }); }
  (async()=>{
    try{
      const [img,dep]=await Promise.all([loadImg('assets/scene.png'),loadImg('assets/depth.png')]);
      makeTex(img,0,'uScene'); makeTex(dep,1,'uDepth'); mode=1;
    }catch(e){ /* 无素材，保持程序化占位 */ }
  })();

  /* ---------- 尺寸 / 指针视差 ---------- */
  let W=0, H=0;
  function resize(){
    const dpr=Math.min(devicePixelRatio||1, 1.5);
    W=canvas.width =Math.floor(innerWidth *dpr);
    H=canvas.height=Math.floor(innerHeight*dpr);
    gl.viewport(0,0,W,H);
  }
  addEventListener('resize',resize); resize();

  const M={x:0,y:0,tx:0,ty:0,last:0};
  addEventListener('pointermove',e=>{
    M.tx=(e.clientX/innerWidth)*2-1;
    M.ty=-((e.clientY/innerHeight)*2-1);
    M.last=performance.now();
  });

  /* ---------- 渲染循环（帧率门控 + 修复后的 fps 统计） ---------- */
  let prev=performance.now(), acc=0, frames=0, fpsT0=prev, fps=0, buildFn=null;
  /* 隐藏页 rAF 停摆：setTimeout 低频兜底；?nohid=1 缩短间隔供自动化测试；
   * step() 供测试/无头环境手动推帧。 */
  function schedule(loop){
    if(document.hidden) setTimeout(()=>loop(performance.now()), CFG.nohid?120:400);
    else requestAnimationFrame(loop);
  }
  function tickFrame(now){
    const dt=(now-prev)/1000; prev=now;
    acc+=dt;
    if(acc < 1/S.fps) return;
    acc=Math.min(acc-1/S.fps, .25);
    frames++;
    if(now-fpsT0>=1000){ fps=frames*1000/(now-fpsT0); frames=0; fpsT0=now; }

    const t=now/1000;
    if(now-M.last>4000){ M.tx=Math.sin(t*.07)*.5; M.ty=Math.cos(t*.052)*.35; }
    const k=Math.min(1,dt*3.5);
    M.x+=(M.tx-M.x)*k; M.y+=(M.ty-M.y)*k;

    const st=buildFn && buildFn(now,t); if(!st) return;

    gl.uniform2f(U.uRes,W,H);
    gl.uniform1f(U.uTime,t);
    gl.uniform2f(U.uMouse,M.x,M.y);
    gl.uniform1f(U.uPar,S.par);
    const p=st.pal;
    gl.uniform3fv(U.uTop,p.top);  gl.uniform3fv(U.uHor,p.hor);
    gl.uniform3fv(U.uLumC,p.lum); gl.uniform3fv(U.uFog,p.fog); gl.uniform3fv(U.uAmb,p.amb);
    gl.uniform1f(U.uStar,st.starI); gl.uniform1f(U.uNight,st.night);
    gl.uniform3f(U.uLum,st.lum.x,st.lum.y,st.lum.r); gl.uniform1f(U.uLumA,st.lum.a);
    gl.uniform1f(U.uMode,mode);
    gl.uniform1f(U.uHasStars,S.cards.stars.pref!=='hide'?1:0);
    gl.uniform1f(U.uHasMountains,st.mtnOn?1:0);
    gl.uniform1f(U.uCloud,st.cloudI);
    gl.uniform1f(U.uRain,st.rainI);
    gl.uniform2f(U.uMtn,st.mtnDy,st.mtnScale);
    gl.uniform1f(U.uCloudOff,st.cloudDy);
    gl.drawArrays(gl.TRIANGLES,0,3);
  }
  function loop(now){ schedule(loop); tickFrame(now); }
  function run(build){ buildFn=build; schedule(loop); }

  K.composer = {
    canvas, gl, run,
    step(){ acc=Math.max(acc,1/S.fps); tickFrame(performance.now()); },  // 强制出帧（测试/无头）
    get fps(){ return fps; },
    get mode(){ return mode; },
    /* suv 坐标系 = 着色器 uv 系（y 向上、x 含 aspect）；供编辑器命中/拖拽换算 */
    get aspect(){ return innerWidth/innerHeight; },
  };
})();
