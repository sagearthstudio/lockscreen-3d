// Lock Screen 3D WOW - Android friendly
// Parallax: deviceorientation (when available) + touch fallback
// Extra: particles + light sweep + smooth damping

const scene = document.getElementById("scene");
const bg = document.getElementById("bg");
const fog = document.getElementById("fog");
const subject = document.getElementById("subject");
const light = document.getElementById("light");
const enableMotionBtn = document.getElementById("enableMotion");

const canvas = document.getElementById("fx");
const ctx = canvas.getContext("2d");

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

// Target parallax values (normalized -1..1)
let tx = 0, ty = 0;
// Smoothed current values
let cx = 0, cy = 0;

// Touch fallback
let touching = false;
scene.addEventListener("pointerdown", (e) => { touching = true; handlePointer(e); });
scene.addEventListener("pointermove", (e) => { if (touching) handlePointer(e); });
scene.addEventListener("pointerup", () => { touching = false; tx = 0; ty = 0; });
scene.addEventListener("pointercancel", () => { touching = false; tx = 0; ty = 0; });

function handlePointer(e){
  const x = (e.clientX / vw) * 2 - 1;
  const y = (e.clientY / vh) * 2 - 1;
  tx = x;
  ty = y;
}

// Motion
function setFromOrientation(event){
  // gamma: left/right (-90..90), beta: front/back (-180..180)
  const g = event.gamma ?? 0;
  const b = event.beta ?? 0;
  // Normalize & clamp
  tx = Math.max(-1, Math.min(1, g / 25));
  ty = Math.max(-1, Math.min(1, (b - 20) / 25)); // slight bias feels nicer
}

let motionEnabled = false;
function enableMotion(){
  if (motionEnabled) return;

  // Some browsers require permission. Android Chrome usually doesn't, but we handle both.
  const maybeRequest = (typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function");

  if (maybeRequest){
    DeviceOrientationEvent.requestPermission().then((res)=>{
      if (res === "granted"){
        window.addEventListener("deviceorientation", setFromOrientation, { passive: true });
        motionEnabled = true;
        enableMotionBtn.textContent = "Movimento attivo";
      } else {
        enableMotionBtn.textContent = "Permesso negato";
      }
    }).catch(()=>{
      enableMotionBtn.textContent = "Non supportato";
    });
  } else {
    window.addEventListener("deviceorientation", setFromOrientation, { passive: true });
    motionEnabled = true;
    enableMotionBtn.textContent = "Movimento attivo";
  }
}

enableMotionBtn.addEventListener("click", enableMotion);

// Particle system (glowing fireflies)
const particles = [];
function initParticles(){
  particles.length = 0;
  const count = Math.round(Math.min(90, 45 + (vw*vh)/35000));
  for (let i=0;i<count;i++){
    particles.push({
      x: Math.random()*vw,
      y: Math.random()*vh,
      r: 1.2 + Math.random()*2.4,
      a: 0.15 + Math.random()*0.35,
      vx: (-0.3 + Math.random()*0.6),
      vy: (-0.25 + Math.random()*0.5),
      p: Math.random()*Math.PI*2,
      s: 0.008 + Math.random()*0.012
    });
  }
}
initParticles();
window.addEventListener("resize", initParticles);

// Animation loop
function lerp(a,b,t){ return a + (b-a)*t; }

let t0 = performance.now();
function frame(now){
  const dt = Math.min(0.05, (now - t0)/1000);
  t0 = now;

  // Smooth damping
  cx = lerp(cx, tx, 0.08);
  cy = lerp(cy, ty, 0.08);

  const px = cx;
  const py = cy;

  // Parallax transforms (different depths)
  // Background: small move
  bg.style.transform = `translate3d(${px*10}px, ${py*10}px, 0) scale(1.06)`;
  // Fog: bigger move + subtle rotate
  fog.style.transform = `translate3d(${px*18}px, ${py*18}px, 0) scale(1.08) rotateZ(${px*1.2}deg)`;
  // Subject: strongest move
  subject.style.transform = `translate3d(calc(-50% + ${px*26}px), ${py*22}px, 0) scale(1.02)`;
  // Light sweep follows motion
  light.style.transform = `translate3d(${px*22}px, ${py*22}px, 0)`;
  light.style.opacity = (0.45 + Math.min(0.35, (Math.abs(px)+Math.abs(py))*0.2)).toFixed(3);

  // Draw particles
  ctx.clearRect(0,0,vw,vh);
  ctx.globalCompositeOperation = "lighter";

  // Soft glow background for particles
  for (const p of particles){
    // drift
    p.p += (0.8 + Math.random()*0.4) * dt;
    p.x += (p.vx + Math.sin(p.p)*0.25) * (20*dt);
    p.y += (p.vy + Math.cos(p.p)*0.25) * (20*dt);

    // wrap
    if (p.x < -20) p.x = vw+20;
    if (p.x > vw+20) p.x = -20;
    if (p.y < -20) p.y = vh+20;
    if (p.y > vh+20) p.y = -20;

    const wobble = (Math.sin(p.p*2.2) * 0.5 + 0.5);
    const alpha = p.a * (0.6 + wobble*0.8);

    // Parallax the particles slightly for depth
    const x = p.x + px*12*wobble;
    const y = p.y + py*12*wobble;

    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 214, 140, ${alpha})`;
    ctx.shadowColor = "rgba(255, 214, 140, 0.9)";
    ctx.shadowBlur = 18;
    ctx.arc(x, y, p.r, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Service worker (offline)
if ("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  });
}
