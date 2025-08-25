function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }
function fmt(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

const ring = document.getElementById('ring');
const timeDisplay = document.getElementById('timeDisplay');
const statusText = document.getElementById('statusText');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const hours = document.getElementById('hours');
const minutes = document.getElementById('minutes');
const seconds = document.getElementById('seconds');
const footerStatus = document.getElementById('footerStatus');


let startTime = 0;
let endTime = 0;
let duration = 0;
let pausedAt = 0;
let rafId = null;
let running = false;
let finished = false;


const saved = localStorage.getItem('timer_duration_ms');
if (saved) {
  const ms = parseInt(saved, 10);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  hours.value = clamp(h, 0, 99);
  minutes.value = clamp(m, 0, 59);
  seconds.value = clamp(s, 0, 59);
  timeDisplay.textContent = fmt(ms);
}

function getInputDuration() {
  const h = clamp(parseInt(hours.value || '0', 10), 0, 99);
  const m = clamp(parseInt(minutes.value || '0', 10), 0, 59);
  const s = clamp(parseInt(seconds.value || '0', 10), 0, 59);
  const ms = (h * 3600 + m * 60 + s) * 1000;
  return ms;
}

function setStatus(text, pulse=false) {
  statusText.textContent = text;
  footerStatus.textContent = text;
  footerStatus.classList.toggle('pulse', pulse);
}

function updateRing(msLeft) {
  const progress = duration === 0 ? 0 : (duration - msLeft) / duration;
  ring.style.setProperty('--progress', Math.min(Math.max(progress, 0), 1));
}

function tick() {
  const now = performance.now();
  const msLeft = Math.max(0, Math.round(endTime - now));
  timeDisplay.textContent = fmt(msLeft);
  updateRing(msLeft);
  document.title = (running ? '⏳' : finished ? '✅' : '⏱️') + ' ' + fmt(msLeft) + ' — Timer';

  if (msLeft <= 0) {
    stop(true);
    notifyDone();
    beep();
    vibrate();
    return;
  }
  rafId = requestAnimationFrame(tick);
}

function start() {
  const ms = getInputDuration();
  if (ms <= 0) {
    shakeInputs();
    setStatus('Please set a duration > 0');
    return;
  }
  localStorage.setItem('timer_duration_ms', String(ms));

  duration = ms;
  startTime = performance.now();
  endTime = startTime + duration;
  running = true;
  finished = false;
  setStatus('Running…', true);
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  resetBtn.disabled = false;
  hours.disabled = minutes.disabled = seconds.disabled = true;
  rafId = requestAnimationFrame(tick);
}

function pause() {
  if (!running) return;
  pausedAt = performance.now();
  running = false;
  cancelAnimationFrame(rafId);
  setStatus('Paused');
  pauseBtn.textContent = '▶ Resume';
}

function resume() {
  const pausedFor = performance.now() - pausedAt;
  endTime += pausedFor;
  running = true;
  setStatus('Running…', true);
  pauseBtn.textContent = '⏸ Pause';
  rafId = requestAnimationFrame(tick);
}

function reset() {
  cancelAnimationFrame(rafId);
  running = false;
  finished = false;
  setStatus('Ready');
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  pauseBtn.textContent = '⏸ Pause';
  resetBtn.disabled = true;
  hours.disabled = minutes.disabled = seconds.disabled = false;
  const ms = getInputDuration();
  timeDisplay.textContent = fmt(ms);
  updateRing(ms);
  document.title = 'Timer ⏱️';
}

function stop(markFinished) {
  cancelAnimationFrame(rafId);
  running = false;
  if (markFinished) {
    finished = true;
    setStatus('Done!');
    timeDisplay.textContent = '00:00:00';
    updateRing(0);
  }
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  pauseBtn.textContent = '⏸ Pause';
  resetBtn.disabled = false;
  hours.disabled = minutes.disabled = seconds.disabled = false;
}

function shakeInputs() {
  [hours, minutes, seconds].forEach(el => {
    el.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(6px)' },
      { transform: 'translateX(0)' }
    ], { duration: 250, iterations: 1 });
  });
}


function notifyDone() {
  try {
    if (document.hidden && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Timer finished', { body: 'Your countdown reached 00:00:00.' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') new Notification('Timer finished', { body: 'Your countdown reached 00:00:00.' });
        });
      }
    }
  } catch {}
}
function beep() {
try {
const ctx = new (window.AudioContext || window.webkitAudioContext)();
const o = ctx.createOscillator();
const g = ctx.createGain();
o.type = 'sine';
o.frequency.value = 440;
o.connect(g);
g.connect(ctx.destination);
g.gain.setValueAtTime(0.0001, ctx.currentTime);
g.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 0.05);
o.start();
g.gain.setValueAtTime(0.6, ctx.currentTime + 0.1);
g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 5);
o.stop(ctx.currentTime + 5);
} catch {}
}
function vibrate() {
  try { if (navigator.vibrate) navigator.vibrate([100, 100, 100]); } catch {}
}

startBtn.addEventListener('click', () => {
  if (running) return;
  start();
});
pauseBtn.addEventListener('click', () => {
  if (!running) return resume();
  pause();
});
resetBtn.addEventListener('click', reset);

[hours, minutes, seconds].forEach(el => {
  el.addEventListener('input', () => {
    const h = clamp(parseInt(hours.value || '0', 10), 0, 99);
    const m = clamp(parseInt(minutes.value || '0', 10), 0, 59);
    const s = clamp(parseInt(seconds.value || '0', 10), 0, 59);
    hours.value = h; minutes.value = m; seconds.value = s;
    const ms = getInputDuration();
    timeDisplay.textContent = fmt(ms);
    updateRing(ms);
  });
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (pauseBtn.disabled && !running) start();
    else if (running) pause();
    else resume();
  } else if (e.key.toLowerCase() === 'r') {
    e.preventDefault();
    reset();
  }
});

if ('Notification' in window && Notification.permission === 'default') {
  setTimeout(() => {
    try { Notification.requestPermission(); } catch {}
  }, 800);
}

const ms0 = getInputDuration();
timeDisplay.textContent = fmt(ms0);
updateRing(ms0);
setStatus('Ready');
