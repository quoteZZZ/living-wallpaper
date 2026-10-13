/* ============================================================
 * Solstice 合成器（内核服务①）
 * ------------------------------------------------------------
 * · 通道一（全屏着色器）：天空/星/云/山/雨/雪/雾 + 日月辉光 + 积雪
 * · 通道二（精灵着色器）：前景树等贴图卡——运行时 Canvas 生成贴图，
 *   与 T1 真实 PNG 素材卡走同一管线（纹理+锚点+变体，§3.3/§5.3）
 * · 图层状态 st 由 registry.resolveFrame() 仲裁产生
 * · 性能治理（§4.7）：fps 上限 / hidden 跳帧降级 / DPR≤1.5 / low-power
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

  /* ================= 通道一：全屏程序化场景 ================= */
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
uniform float uHasStars, uHasMountains, uCloud, uRain, uSnow, uFogA, uDim;
uniform vec2  uMtn;                     // x 山峦垂直偏移, y 起伏缩放（编辑器变换）
uniform float uMtnSnow;                 // 山顶积雪 0–1（雪线高度，冬季=1）
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
/* 山脊高度场：山体填充与坡向光照（中心差分）共用；含一座程序化主峰（视差一致） */
float ridgeH(float u,float fi,float px,float py){
  float us=u-px/(1.2+fi*1.2);
  return .44-fi*.07+uMtn.x
       +fbm(vec2(us*(1.2+fi*1.2)+fi*13.1, fi*7.7))*(.08+fi*.03)*uMtn.y
       +.12*exp(-pow((us-.58-fi*.05)*(5.0+fi*.5),2.))*uMtn.y*(1.-fi*.15)
       +.035*fbm(vec2(us*(6.+fi*2.)+fi*31.7, 11.3))*uMtn.y
       +py;
}
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
/* 雪片：各向同性网格 + 随风漂移，两层 */
float snowLayer(vec2 uv,float t,float sc){
  vec2 q=vec2(uv.x*22., uv.y*22.);
  q.y-=t*(.55*sc);
  q.x+=sin(t*.6+uv.y*9.)*.45;
  vec2 id=floor(q), f=fract(q)-.5;
  float h=hash21(id);
  if(h<.62) return 0.;
  float r=.05+.06*h;
  return smoothstep(r,0.,length(f))*.95;
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

  /* 山峦分层视差：坡向光照（法线·日/月向）+ 雪线积雪（uMtnSnow，陡坡露岩）
   * uSnow 仍为天气降雪盖白（世界系统层），与山顶积雪相互独立 */
  if(uMode<.5 && uHasMountains>.5){
    float psx=(uv.x-.5)*aspect;
    for(int i=0;i<4;i++){
      float fi=float(i);
      float d =.35+fi*.2166;
      float px=uMouse.x*uPar*.27*d;
      float py=uMouse.y*uPar*.05*d;
      float rg=ridgeH(uv.x,fi,px,py);
      float m=smoothstep(rg, rg-.012, uv.y);
      /* 坡向光照：中心差分求坡度，向阳面提亮、背阳面压暗（光带仅限山脊面） */
      float e=.004;
      float dh=(ridgeH(uv.x+e,fi,px,py)-ridgeH(uv.x-e,fi,px,py))/(2.*e*aspect);
      vec2 N=normalize(vec2(-dh*2.2,1.));
      vec2 Ld=normalize(vec2(uLum.x-psx, max(uLum.y+.5-uv.y,.12)));
      float lit=clamp(dot(N,Ld),0.,1.);
      lit=mix(.60,1.06,lit)*mix(.72,1.,uLumA);
      lit=mix(1., lit, 1.-uNight*.55);          // 夜晚方向光减弱，雪面趋平
      vec3 mc=mix(uFog*.85+uHor*.35, uFog*.25+vec3(.015,.02,.05), pow(d,1.3));
      /* 绝对雪线：只有主峰与最高脊线积雪（冬季雪线下移），陡坡露岩 */
      float sl=.455-uMtnSnow*.035+fbm(vec2(uv.x*6., 3.7))*.03;
      float steep=clamp(abs(dh)*1.2,0.,1.);
      float snowA=clamp(uMtnSnow*smoothstep(sl, sl+.02, uv.y)*(1.-steep*.6),0.,1.);
      mc=mix(mc, mix(vec3(.70,.76,.88), vec3(.95,.97,1.), lit)*mix(1.,.32,uNight), snowA);
      /* 山体岩石微纹理；方向光只作用于山脊面带，往下衰减回大气透视色 */
      mc*=.93+.14*fbm(vec2(uv.x*(9.+fi*3.), uv.y*7.-fi*4.));
      mc*=mix(1., lit, exp(-(rg-uv.y)*22.)*mix(.35,1.,smoothstep(.25,.85,d)));
      mc=mix(mc, vec3(.88,.91,.96)*(1.-uNight*.55), uSnow*smoothstep(.45,1.,d)*.7);
      col=mix(col,mc,m*.97);
    }
  }

  /* 雨（系统层：属于天气，不属于装饰云卡片） */
  if(uRain>.001){
    float r1=rainLayer(uv,uTime,1.);
    float r2=rainLayer(uv+vec2(3.1,1.7),uTime*1.4,1.5);
    float rr=clamp((r1+r2)*uRain,0.,1.);
    col=mix(col, vec3(.72,.78,.88)*(1.-uNight*.82), rr*.5);
    col*=1.-.10*uRain;
  }
  /* 雪 */
  if(uSnow>.001){
    float s1=snowLayer(uv,uTime,1.);
    float s2=snowLayer(uv+vec2(7.3,2.9),uTime*1.35,1.7);
    float ss=clamp((s1+s2)*uSnow,0.,1.);
    col=mix(col, vec3(.93,.95,1.)*(1.-uNight*.7), ss*.85);
  }
  /* 雾：地平线带 + 呼吸噪声 */
  if(uFogA>.001){
    float band=smoothstep(.02,.40,uv.y)*smoothstep(1.0,.30,uv.y);
    float fn=fbm(vec2(uv.x*3.-uTime*.02, uv.y*6.))*.55+.45;
    col=mix(col, clamp(uFog*1.15+vec3(.10),0.,1.), band*fn*uFogA*.8);
  }

  col*=1.-.32*dot(suv,suv);
  col+=(hash21(uv*uRes+fract(uTime)*61.7)-.5)*.02;
  outColor=vec4(max(col,vec3(0.))*uDim,1.);
}`;

  /* ================= 通道二：前景精灵（树等贴图卡） ================= */
  const VS2 = `#version 300 es
in vec2 aP; in vec2 aU; out vec2 vU;
void main(){ vU=aU; gl_Position=vec4(aP,0.,1.); }`;
  const FS2 = `#version 300 es
precision highp float;
in vec2 vU; out vec4 o;
uniform sampler2D uT;
uniform vec3 uTint;
void main(){ vec4 c=texture(uT,vU); o=vec4(c.rgb*uTint, c.a); }`;

  function sh(type,src){
    const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
      console.error(gl.getShaderInfoLog(s)); throw new Error('shader compile'); }
    return s;
  }
  function program(vs,fs){
    const p=gl.createProgram();
    gl.attachShader(p,sh(gl.VERTEX_SHADER,vs));
    gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));
    gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)){
      console.error(gl.getProgramInfoLog(p)); throw new Error('program link'); }
    return p;
  }

  const prog=program(VS,FS);
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
                  'uHasStars','uHasMountains','uCloud','uRain','uSnow','uFogA','uDim',
                  'uMtn','uMtnSnow','uCloudOff','uScene','uDepth'])
    U[n]=gl.getUniformLocation(prog,n);

  /* ---- 精灵通道资源 ---- */
  const prog2=program(VS2,FS2);
  const U2={ aP:gl.getAttribLocation(prog2,'aP'), aU:gl.getAttribLocation(prog2,'aU'),
             uT:gl.getUniformLocation(prog2,'uT'), uTint:gl.getUniformLocation(prog2,'uTint') };
  const buf2=gl.createBuffer();
  let treeTex=null, treeSourceKey=null;

  /* 可选正式素材（assets/scene.png + depth.png） */
  let mode=0;
  function makeTex(img,unit,uni){
    gl.activeTexture(gl.TEXTURE0+unit);
    const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t);
    /* 仅本纹理翻转行序：WebGL t=0 是图像首行，而 vUv.y=0 在屏幕底部 */
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
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

  /* ---------- 前景树贴图：素材包图片优先（assets/packs/），程序化兜底 ---------- */
  function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296; }; }
  function makeTreeTexture(variant){
    const TW=480, TH=640;
    const cv=document.createElement('canvas'); cv.width=TW; cv.height=TH;
    const g=cv.getContext('2d');
    const seed={spring:11,summer:7,autumn:23,winter:5}[variant]||7;
    const rng=mulberry32(seed);
    const tips=[];
    const trunkC='#221912';
    (function branch(x,y,ang,len,w,depth){
      const x2=x+Math.cos(ang)*len, y2=y+Math.sin(ang)*len;
      g.strokeStyle=trunkC; g.lineWidth=w; g.lineCap='round';
      g.beginPath(); g.moveTo(x,y);
      g.quadraticCurveTo(x+Math.cos(ang+.25)*len*.5, y+Math.sin(ang+.25)*len*.5, x2,y2);
      g.stroke();
      if(variant==='winter'){                      // 雪压枝头
        g.strokeStyle='rgba(232,240,246,.9)'; g.lineWidth=w*.55;
        g.beginPath(); g.moveTo(x2,y2+2);
        g.lineTo(x2+Math.cos(ang)*len*.28, y2+Math.sin(ang)*len*.28+1);
        g.stroke();
        g.strokeStyle=trunkC;
      }
      if(depth<=0){ tips.push([x2,y2,w]); return; }
      const n=depth>3?3:2;
      for(let i=0;i<n;i++)
        branch(x2,y2, ang+(rng()-.5)*1.1, len*(.62+rng()*.14), w*.6, depth-1);
    })(TW/2, TH, -Math.PI/2+(rng()-.5)*.06, 150, 30, 5);

    if(variant!=='winter'){
      const base={spring:['#6f9a63','#e9bcd3'], summer:['#39663c','#2e5734','#4a7a48'],
                  autumn:['#d0813a','#b85c2a','#e0a04f']}[variant]||['#39663c'];
      for(const [tx,ty,tw] of tips){
        const n=2+(rng()*3|0);
        for(let i=0;i<n;i++){
          const r=(12+rng()*20)*(tw/14);
          g.fillStyle=base[(rng()*base.length)|0];
          g.globalAlpha=.85+rng()*.15;
          g.beginPath(); g.arc(tx+(rng()-.5)*34, ty+(rng()-.5)*30, r, 0, 7); g.fill();
        }
      }
      g.globalAlpha=1;
    }
    return cv;
  }
  function uploadTreeTexture(src){
    gl.activeTexture(gl.TEXTURE0);
    if(!treeTex) treeTex=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,treeTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  }
  /* 素材包图片优先（K.assets.treeImages[variant]=url），无图回退程序化生成；
   * 同时登记缩略图（圆盘选择器用真实素材图，所见即所得） */
  function ensureTreeTexture(variant){
    const url=((K.assets&&K.assets.treeImages)||{})[variant];
    const key=url?('url:'+url):('proc:'+variant);
    if(treeSourceKey===key && treeTex) return;
    treeSourceKey=key;
    if(url){
      const im=new Image();
      im.onload=()=>{ if(treeSourceKey===key) uploadTreeTexture(im); };
      im.onerror=()=>{ delete K.assets.treeImages[variant]; treeSourceKey=null;
                       ensureTreeTexture(variant); };
      im.src=url;
    }else{
      const cv=makeTreeTexture(variant);
      uploadTreeTexture(cv);
      if(!K.assets.treeThumbs) K.assets.treeThumbs={};
      if(!K.assets.treeThumbs[variant])
        K.assets.treeThumbs[variant]=cv.toDataURL('image/png');
    }
  }

  /* 树的屏幕矩形（uv 单位；供渲染与编辑器共用） */
  function treeRect(st){
    const t=S.cards.tree;
    const ax=t.anchor==='center'?.5 : t.anchor==='right'?.84 : .16;
    const h=.60*t.scale, w=h*(480/640);
    return { x:ax+t.dx-w/2, y:.06+t.dy, w, h };     // x=左缘, y=底缘
  }

  function drawTree(st,t){
    if(!st.treeOn) return;
    ensureTreeTexture(st.treeVariant);
    gl.useProgram(prog2);
    gl.bindBuffer(gl.ARRAY_BUFFER,buf2);
    const r=treeRect(st);
    const bend=Math.sin(t*1.4)*.5*st.treeSway;       // 顶端摆幅（uv 比例）
    const V=(u,v)=>{                                 // u,v ∈ [0,1]，v=1 为底
      const sw=bend*(1-v)*(1-v);
      return [(r.x+u*r.w+sw*r.w)*2-1, (r.y+v*r.h)*2-1, u, 1-v];
    };
    const a=V(0,0), b=V(1,0), c=V(0,1), d=V(1,1);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([
      a[0],a[1],a[2],a[3],  b[0],b[1],b[2],b[3],  c[0],c[1],c[2],c[3],
      b[0],b[1],b[2],b[3],  d[0],d[1],d[2],d[3],  c[0],c[1],c[2],c[3] ]),gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(U2.aP);
    gl.vertexAttribPointer(U2.aP,2,gl.FLOAT,false,16,0);
    gl.enableVertexAttribArray(U2.aU);
    gl.vertexAttribPointer(U2.aU,2,gl.FLOAT,false,16,8);

    const p=st.pal, k=(1-.5*st.night)*(1-.12*Math.max(st.rainI,st.snowI));
    let tint=[p.amb[0]*k, p.amb[1]*k, p.amb[2]*k];
    if(st.snowI>0) tint=tint.map((v,i)=>v+(1-v)*st.snowI*.25);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,treeTex);
    gl.uniform1i(U2.uT,0);
    gl.uniform3fv(U2.uTint,tint);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);     // 预乘 alpha
    gl.drawArrays(gl.TRIANGLES,0,6);
    gl.disable(gl.BLEND);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);
  }

  /* ---------- 渲染循环（帧率门控 + 墙钟 fps 统计） ---------- */
  let prev=performance.now(), acc=0, frames=0, fpsT0=prev, fps=0, buildFn=null;
  /* 隐藏页 rAF 停摆：setTimeout 低频兜底；?nohid=1 缩短间隔供自动化测试；
   * step() 供测试/无头环境强制推帧。 */
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
    gl.uniform1f(U.uSnow,st.snowI||0);
    gl.uniform1f(U.uFogA,st.fogI||0);
    gl.uniform1f(U.uDim,S.dim??1);
    gl.uniform2f(U.uMtn,st.mtnDy,st.mtnScale);
    gl.uniform1f(U.uMtnSnow, st.mtnSnow||0);
    gl.uniform1f(U.uCloudOff,st.cloudDy);
    gl.drawArrays(gl.TRIANGLES,0,3);

    drawTree(st,t);                                  // 通道二：前景精灵
  }
  function loop(now){ schedule(loop); tickFrame(now); }
  function run(build){ buildFn=build; schedule(loop); }

  K.composer = {
    canvas, gl, run,
    step(){ acc=Math.max(acc,1/S.fps); tickFrame(performance.now()); },  // 强制出帧（测试/无头）
    get fps(){ return fps; },
    get mode(){ return mode; },
    treeRect,                                        // 编辑器包围盒共用
    /* suv 坐标系 = 着色器 uv 系（y 向上、x 含 aspect）；供编辑器命中/拖拽换算 */
    get aspect(){ return innerWidth/innerHeight; },
  };
})();
