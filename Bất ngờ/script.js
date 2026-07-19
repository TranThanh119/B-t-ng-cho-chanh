/* ============================================================
   File vận hành — không cần sửa gì ở đây.
   Muốn đổi tên / lời nhắn / ảnh thì mở config.js
   ============================================================ */

document.getElementById('letter-sign').textContent = `— ${NAME_A}`;
document.getElementById('finaleTitle').textContent = FINALE_TITLE;
document.getElementById('finaleText').textContent = FINALE_TEXT;

// ---- Stars background ----
const starsEl = document.getElementById('stars');
for(let i=0;i<70;i++){
  const s = document.createElement('span');
  s.style.left = Math.random()*100+'%';
  s.style.top = Math.random()*100+'%';
  s.style.animationDelay = (Math.random()*4)+'s';
  s.style.width = s.style.height = (Math.random()*2+1)+'px';
  starsEl.appendChild(s);
}

// ---- Bokeh drifting light orbs ----
const bokehEl = document.getElementById('bokeh');
for(let i=0;i<10;i++){
  const s = document.createElement('span');
  const size = 60 + Math.random()*140;
  s.style.width = size+'px';
  s.style.height = size+'px';
  s.style.left = Math.random()*100+'%';
  s.style.top = Math.random()*100+'%';
  s.style.setProperty('--dx', (Math.random()*60-30)+'px');
  s.style.setProperty('--dy', (Math.random()*60-30)+'px');
  s.style.animationDuration = (14+Math.random()*10)+'s';
  s.style.animationDelay = (Math.random()*6)+'s';
  bokehEl.appendChild(s);
}

// ---- Gentle chime sound (synthesized, no external files) ----
let audioCtx = null;
let soundOn = true;
function ensureAudio(){
  if(!audioCtx){
    try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e){ audioCtx = null; }
  }
  if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function chime(freq=660, duration=0.5, vol=0.05){
  if(!soundOn || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}
function chimeArrival(){ chime(880, 0.7, 0.045); setTimeout(()=>chime(1108,0.8,0.035),110); }
function chimeTap(){ chime(520, 0.3, 0.04); }

// ---- Nhạc nền (file riêng, xem BG_MUSIC_URL trong config.js) ----
let bgMusic = null;
const savedVolume = parseFloat(localStorage.getItem('bgMusicVolume'));
let currentVolume = !isNaN(savedVolume) ? savedVolume
  : (typeof BG_MUSIC_VOLUME === 'number' ? BG_MUSIC_VOLUME : 0.35);
function ensureBgMusic(){
  if(bgMusic || !BG_MUSIC_URL) return;
  bgMusic = new Audio(BG_MUSIC_URL);
  bgMusic.loop = true;
  bgMusic.volume = currentVolume;
}
function playBgMusic(){
  ensureBgMusic();
  if(bgMusic) bgMusic.play().catch(()=>{}); // trình duyệt có thể chặn tới khi có tương tác đầu tiên
}
function pauseBgMusic(){
  if(bgMusic) bgMusic.pause();
}

const soundToggle = document.getElementById('soundToggle');
const iconOn = document.getElementById('soundIconOn');
const iconOff = document.getElementById('soundIconOff');
soundToggle.addEventListener('click', ()=>{
  ensureAudio();
  soundOn = !soundOn;
  iconOn.style.display = soundOn ? '' : 'none';
  iconOff.style.display = soundOn ? 'none' : '';
  if(soundOn){ chimeTap(); playBgMusic(); }
  else { pauseBgMusic(); }
});

// ---- Thanh trượt âm lượng nhạc nền ----
const volumePop = document.getElementById('volumePop');
const volumeSlider = document.getElementById('volumeSlider');
volumeSlider.value = Math.round(currentVolume * 100);
let volumeHideTimer = null;

function showVolumePop(){
  volumePop.classList.add('show');
  clearTimeout(volumeHideTimer);
  volumeHideTimer = setTimeout(()=> volumePop.classList.remove('show'), 3000);
}
soundToggle.addEventListener('click', showVolumePop);

volumeSlider.addEventListener('pointerdown', ()=> clearTimeout(volumeHideTimer));
volumeSlider.addEventListener('input', (e)=>{
  const v = Number(e.target.value) / 100;
  currentVolume = v;
  if(bgMusic) bgMusic.volume = v;
  localStorage.setItem('bgMusicVolume', String(v));
  if(v > 0 && !soundOn){ soundOn = true; iconOn.style.display=''; iconOff.style.display='none'; playBgMusic(); }
  if(v === 0 && soundOn){ soundOn = false; iconOn.style.display='none'; iconOff.style.display=''; pauseBgMusic(); }
});
volumeSlider.addEventListener('pointerup', ()=>{
  clearTimeout(volumeHideTimer);
  volumeHideTimer = setTimeout(()=> volumePop.classList.remove('show'), 1500);
});


// ---- Scene navigation with crossfade ----
const scenes = ['scene-lock','scene-intro','scene-carousel','scene-grid','scene-letter','scene-finale'];
let current = 0;
const progressEl = document.getElementById('progress');
scenes.forEach(()=>{ const i=document.createElement('i'); progressEl.appendChild(i); });

function goTo(i){
  // Chặn spam click trong lúc hiệu ứng chuyển cảnh đang chạy
  if(window.PageTransition && window.PageTransition.isAnimating) return;
  ensureAudio();

  const direction = i > current ? 1 : -1; // 1 = tiến (Tiếp theo), -1 = lùi (Quay lại)
  const fromEl = document.getElementById(scenes[current]);
  const toEl = document.getElementById(scenes[i]);

  current = i;
  [...progressEl.children].forEach((el,idx)=> el.classList.toggle('on', idx<=current));
  backBtn.classList.toggle('show', current > 0);
  chimeArrival();

  if(scenes[current]==='scene-intro') startTypewriter();
  if(scenes[current]==='scene-letter') startLetter();
  if(scenes[current]==='scene-finale') startHearts();

  if(window.PageTransition){
    window.PageTransition.transition(fromEl, toEl, direction);
  } else {
    // Fallback cực hiếm khi pageTransition.js chưa kịp load
    fromEl.classList.remove('active');
    toEl.classList.add('active');
  }
}

document.getElementById('sealBtn').addEventListener('click', function(){
  const seal = this;
  if(seal.classList.contains('cracking')) return; // chặn spam click
  ensureAudio();
  if(soundOn) playBgMusic();
  seal.classList.add('cracking');
  chime(300, 0.35, 0.05);
  setTimeout(()=> goTo(1), 320);
});
document.getElementById('btn-2').addEventListener('click', ()=> goTo(2));
document.getElementById('btn-3').addEventListener('click', ()=> goTo(3));
document.getElementById('btn-4').addEventListener('click', ()=> goTo(4));
document.getElementById('btn-5').addEventListener('click', ()=> goTo(5));
document.getElementById('replayBtn').addEventListener('click', ()=> {
  location.reload();
});

const backBtn = document.getElementById('backBtn');
backBtn.addEventListener('click', ()=> {
  if(current > 0) goTo(current-1);
});

// ---- Keyboard navigation (advance on ready next-button) ----
document.addEventListener('keydown', (e)=>{
  if(e.key === 'ArrowLeft'){
    if(window.PageTransition && window.PageTransition.isAnimating) return;
    if(current > 0) goTo(current-1); // hiệu ứng "Quay lại" ngược chiều
    return;
  }
  if(e.key !== 'ArrowRight' && e.key !== 'Enter') return;
  const sceneName = scenes[current];
  if(sceneName === 'scene-lock'){ document.getElementById('sealBtn').click(); return; }
  const btnMap = { 'scene-intro':'btn-2', 'scene-carousel':'btn-3', 'scene-grid':'btn-4', 'scene-letter':'btn-5' };
  const btnId = btnMap[sceneName];
  if(btnId){
    const btn = document.getElementById(btnId);
    if(btn.classList.contains('ready')) btn.click();
  }
});

// ---- Typewriter ----
function startTypewriter(){
  const el = document.getElementById('typewriter');
  el.innerHTML = '<span class="cursor">&nbsp;</span>';
  const btn = document.getElementById('btn-2');
  btn.classList.remove('ready');
  let lineIdx = 0, charIdx = 0;
  let full = "";
  function typeChar(){
    if(lineIdx >= INTRO_LINES.length){
      btn.classList.add('ready');
      return;
    }
    const line = INTRO_LINES[lineIdx];
    if(charIdx <= line.length){
      full = INTRO_LINES.slice(0,lineIdx).join('<br>') +
             (lineIdx>0?'<br>':'') + line.slice(0,charIdx);
      el.innerHTML = full + '<span class="cursor">&nbsp;</span>';
      charIdx++;
      setTimeout(typeChar, 32);
    } else {
      lineIdx++; charIdx=0;
      setTimeout(typeChar, 400);
    }
  }
  typeChar();
}

// ---- Letter ----
function startLetter(){
  document.getElementById('letter-body').textContent = LETTER_TEXT;
}

// ---- Gallery ảnh: Coverflow (xem components/CoverflowGallery.js) ----
CoverflowGallery({
  container: document.getElementById('carousel'),
  dotsEl: document.getElementById('dots'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  photos: CAROUSEL_PHOTOS
});



// ---- Memory grid (with tap-to-enlarge lightbox) ----
function placeholderSVG(){
  return `<svg class="placeholder-icon" width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" stroke="#d8b478" stroke-width="1.3"/><circle cx="12" cy="13" r="3.4" stroke="#d8b478" stroke-width="1.3"/></svg>`;
}
const gridEl = document.getElementById('memoryGrid');
const lightboxEl = document.getElementById('lightbox');
const lightboxImgEl = document.getElementById('lightboxImg');
GRID_PHOTOS.forEach((p,i)=>{
  const div = document.createElement('div');
  div.className = 'grid-item';
  div.style.setProperty('--r', (Math.random()*6-3)+'deg');
  div.style.setProperty('--i', i);
  if(p.url){
    div.style.backgroundImage = `url('${p.url}')`;
    div.addEventListener('click', ()=>{
      lightboxImgEl.style.backgroundImage = `url('${p.url}')`;
      lightboxEl.classList.add('show');
    });
  } else {
    div.innerHTML = placeholderSVG();
  }
  gridEl.appendChild(div);
});
lightboxEl.addEventListener('click', ()=> lightboxEl.classList.remove('show'));

// ---- Falling hearts on finale ----
function startHearts(){
  const wrap = document.getElementById('heartsFall');
  if(wrap.childElementCount>0) return;
  const symbols = ['♥','❥','✦'];
  for(let i=0;i<24;i++){
    const s = document.createElement('span');
    s.textContent = symbols[Math.floor(Math.random()*symbols.length)];
    s.style.left = Math.random()*100+'%';
    s.style.setProperty('--dx', (Math.random()*40-20)+'px');
    s.style.animationDuration = (6+Math.random()*6)+'s';
    s.style.animationDelay = (Math.random()*6)+'s';
    s.style.fontSize = (12+Math.random()*14)+'px';
    wrap.appendChild(s);
  }
}
