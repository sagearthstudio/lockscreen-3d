const scene = document.getElementById("scene");
const bg = document.getElementById("bg");
const fog = document.getElementById("fog");
const subject = document.getElementById("subject");
const light = document.getElementById("light");
const enableMotionBtn = document.getElementById("enableMotion");
const toggleUIBtn = document.getElementById("toggleUI");

const canvas = document.getElementById("fx");
const ctx = canvas.getContext("2d");

const bgFile = document.getElementById("bgFile");
const subjectFile = document.getElementById("subjectFile");
const scaleEl = document.getElementById("scale");
const posXEl = document.getElementById("posX");
const posYEl = document.getElementById("posY");
const wowEl = document.getElementById("wow");

let vw = 0, vh = 0, dpr = 1;

function resize() {
  dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  vw = window.innerWidth;
  vh = window.innerHeight;
  canvas.width = Math.floor(vw * dpr);
  canvas.height = Math.floor(vh * dpr);
  canvas.style.width = vw + "px";
  canvas.style.height = vh + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
function lerp(a,b,t){ return a + (b-a)*t; }

// ===== saved scene =====
const saved = JSON.parse(localStorage.getItem("ls3d_scene") || "{}");
if (saved.bgDataUrl) bg.style.backgroundImage = `url("${saved.bgDataUrl}")`;
if (saved.subjectDataUrl) subject.src = saved.subjectDataUrl;
if (saved.scale) scaleEl.value = saved.scale;
if (saved.posX) posXEl.value = saved.posX;
if (saved.posY) posYEl.value = saved.posY;
if (saved.wow) wowEl.value = saved.wow;
if (saved.hideUI) document.body.classList.add("hidden-ui");

function saveScene(){
  localStorage.setItem("ls3d_scene", JSON.stringify({
    bgDataUrl: saved.bgDataUrl || null,
    subjectDataUrl: saved.subjectDataUrl || null,
    scale: parseFloat(scaleEl.value),
    posX: parseInt(posXEl.value,10),
    posY: parseInt(posYEl.value,10),
    wow: parseInt(wowEl.value,10),
    hideUI: document.body.classList.contains("hidden-ui")
  }));
}

function applyControls(){
  const x = parseInt(posXEl.value,10);
  const y = parseInt(posYEl.value,10);
  const s = parseFloat(scaleEl.value);
  subject.style.left = x + "%";
  subject.style.bottom = y + "vh";
  subject.dataset.userScale = String(s);
  saveScene();
}

scaleEl.addEventListener("input", applyControls);
posXEl.addEventListener("input", applyControls);
posYEl.addEventListener("input", applyControls);
wowEl.addEventListener("input", applyControls);
applyControls();

toggleUIBtn.addEventListener("click", ()=>{
  document.body.classList.toggle("hidden-ui");
  toggleUIBtn.textContent = document.body.classList.contains("hidden-ui") ? "Mostra" : "Nascondi";
  saveScene();
});

// Upload BG
bgFile.addEventListener("change",(e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  const r = new FileReader();
  r.onload = ()=>{
    saved.bgDataUrl = r.result;
    bg.style.backgroundImage = `url("${saved.bgDataUrl}")`;
    saveScene();
  };
  r.readAsDataURL(file);
});

// Upload subject
subjectFile.addEventListener("change",(e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  const r = new FileReader();
  r.onload = ()=>{
    saved.subjectDataUrl = r.result;
    subject.src = saved.subjectDataUrl;
    saveScene();
  };
  r.readAsDataURL(file);
});

// ===== parallax =====
let tx=0, ty=0, cx=0, cy=0;

// touch fallback
let touching=false;
scene.addEventListener("pointerdown",(e)=>{touching=true; handlePointer(e);});
scene.addEventListener("pointermove",(e)=>{ if(touching) handlePointer(e); });
scene.addEventListener("pointerup",()=>{touching=false; tx=0; ty=0;});
scene.addEventListener("pointercancel",()=>{touching=false; tx=0; ty=0;});

function handlePointer(e){
  tx = (e.clientX / vw) * 2 - 1;
  ty = (e.clientY / vh) * 2 - 1;
  tx = clamp(tx,-1,1);
  ty = clamp(ty,-1,1);
}

function setFromOrientation(ev){
  const g = ev.gamma ?? 0;
  const b = ev.beta ?? 0;
  tx = clamp(g/30, -1, 1);
  ty = clamp((b-20)/30, -1, 1);
}

let motionEnabled=false;
function enableMotion(){
  if(motionEnabled) return;
  const needsPerm = (typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function");

  if(needsPerm){
    DeviceOrientationEvent.requestPermission().then(res=>{
      if(res==="granted"){
        window.addEventListener("deviceorientation", setFromOrientation, {passive:true});
        motionEnabled=true;
        enableMotionBtn.textContent="Movimento attivo";
      }else{
        enableMotionBtn.textContent="Permesso negato";
      }
    }).catch(()=> enableMotionBtn.textContent="Non supportato");
  }else{
    window.addEventListener("deviceorientation", setFromOrientation, {passive:true});
    motionEnabled=true;
    enableMotionBtn.textContent="Movimento attivo";
  }
}
enableMotionBtn.addEventListener("click", enableMotion);

// particles
const particles=[];
function initParticles(){
  particles.length=0;
  const count = Math.round(Math.min(85, 40 + (vw*vh)/42000));
  for(let i=0;i<count;i++){
    particles.push({
      x:Math.random()*vw, y:Math.random()*vh,
      r:1.2+Math.random()*2.2,
      a:0.14+Math.random()*0.32,
      vx:(-0.3+Math.random()*0.6),
      vy:(-0.25+Math.random()*0.5),
      p:Math.random()*Math.PI*2
    });
  }
}
initParticles();
window.addEventListener("resize", initParticles);

let t0=performance.now();
function frame(now){
  const dt = Math.min(0.05, (now-t0)/1000);
  t0=now;

  cx = lerp(cx, tx, 0.08);
  cy = lerp(cy, ty, 0.08);

  // LIMITI ANTI-MOZZO: clamp ancora più stretto sul movimento
  const px = clamp(cx, -0.85, 0.85);
  const py = clamp(cy, -0.85, 0.85);

  const wow = parseInt(wowEl.value || "12",10);
  const userScale = parseFloat(subject.dataset.userScale || "1.0");

  bg.style.transform  = `translate3d(${px*9}px,  ${py*9}px, 0) scale(1.06)`;
  fog.style.transform = `translate3d(${px*14}px, ${py*14}px,0) scale(1.08) rotateZ(${px*0.8}deg)`;

  // subject: movimento più “wow” ma controllato
  const sx = clamp(px*wow, -(wow*1.2), (wow*1.2));
  const sy = clamp(py*(wow*0.55), -(wow*0.9), (wow*0.9));
  subject.style.transform = `translate3d(calc(-50% + ${sx}px), ${sy}px, 0) scale(${userScale})`;

  light.style.transform = `translate3d(${px*18}px, ${py*18}px,0)`;
  light.style.opacity = (0.45 + Math.min(0.35, (Math.abs(px)+Math.abs(py))*0.2)).toFixed(3);

  ctx.clearRect(0,0,vw,vh);
  ctx.globalCompositeOperation="lighter";

  for(const p of particles){
    p.p += (0.8+Math.random()*0.4)*dt;
    p.x += (p.vx+Math.sin(p.p)*0.25)*(18*dt);
    p.y += (p.vy+Math.cos(p.p)*0.25)*(18*dt);

    if(p.x<-20) p.x=vw+20;
    if(p.x>vw+20) p.x=-20;
    if(p.y<-20) p.y=vh+20;
    if(p.y>vh+20) p.y=-20;

    const wobble=(Math.sin(p.p*2.2)*0.5+0.5);
    const alpha=p.a*(0.6+wobble*0.8);
    const x=p.x + px*10*wobble;
    const y=p.y + py*10*wobble;

    ctx.beginPath();
    ctx.fillStyle=`rgba(255,214,140,${alpha})`;
    ctx.shadowColor="rgba(255,214,140,0.9)";
    ctx.shadowBlur=18;
    ctx.arc(x,y,p.r,0,Math.PI*2);
    ctx.fill();
  }

  ctx.globalCompositeOperation="source-over";
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// offline
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  });
}
