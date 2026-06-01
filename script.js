const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const WHITE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_OFFSETS = { 'C#': .68, 'D#': 1.68, 'F#': 3.68, 'G#': 4.68, 'A#': 5.68 };
const KEYBOARD_MAP = ['KeyA','KeyW','KeyS','KeyE','KeyD','KeyF','KeyT','KeyG','KeyY','KeyH','KeyU','KeyJ','KeyK','KeyO','KeyL','KeyP','Semicolon','Quote'];

const piano = document.getElementById('piano');
const octaveLabel = document.getElementById('octaveLabel');
const volumeInput = document.getElementById('volume');
const sustainBtn = document.getElementById('sustainBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const octaveDown = document.getElementById('octaveDown');
const octaveUp = document.getElementById('octaveUp');

let audioCtx;
let master;
let convolver;
let startOctave = 3;
let octaveCount = matchMedia('(orientation: landscape)').matches ? 4 : 3;
let sustain = false;
const activePointers = new Map();
const heldKeyboard = new Map();

function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
function noteToMidi(noteName, octave) { return (octave + 1) * 12 + NOTE_NAMES.indexOf(noteName); }

function createImpulseResponse(ctx) {
  const seconds = 1.35;
  const length = ctx.sampleRate * seconds;
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.4) * 0.16;
    }
  }
  return impulse;
}

function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
  master = audioCtx.createGain();
  master.gain.value = Number(volumeInput.value);

  convolver = audioCtx.createConvolver();
  convolver.buffer = createImpulseResponse(audioCtx);
  const dry = audioCtx.createGain();
  const wet = audioCtx.createGain();
  dry.gain.value = 0.9;
  wet.gain.value = 0.18;
  dry.connect(master);
  wet.connect(convolver);
  convolver.connect(master);
  master.connect(audioCtx.destination);
  master.dry = dry;
  master.wet = wet;
}

function makePianoTone(freq, velocity = 1) {
  ensureAudio();
  const now = audioCtx.currentTime;
  const output = audioCtx.createGain();
  const hammer = audioCtx.createGain();
  const brightness = audioCtx.createBiquadFilter();
  const body = audioCtx.createBiquadFilter();

  brightness.type = 'lowpass';
  brightness.frequency.setValueAtTime(Math.min(12000, freq * 15), now);
  brightness.frequency.exponentialRampToValueAtTime(Math.max(2200, freq * 5.5), now + 0.65);
  brightness.Q.value = 0.55;

  body.type = 'peaking';
  body.frequency.value = Math.min(420, Math.max(120, freq * 1.3));
  body.Q.value = 0.9;
  body.gain.value = 4;

  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(0.42 * velocity, now + 0.012);
  output.gain.exponentialRampToValueAtTime(0.18 * velocity, now + 0.22);
  output.gain.exponentialRampToValueAtTime(0.035 * velocity, now + (sustain ? 2.4 : 1.05));
  output.gain.exponentialRampToValueAtTime(0.0001, now + (sustain ? 4.2 : 2.1));

  const partials = [
    [1, 1.0, 0], [2.01, .45, 3], [3.02, .24, -4], [4.01, .14, 5],
    [5.02, .08, -7], [6.03, .05, 6], [8.01, .025, -5]
  ];

  partials.forEach(([mult, amp, cents], idx) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = idx < 2 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq * mult * Math.pow(2, cents / 1200), now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(amp * velocity, now + 0.008 + idx * 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, now + (sustain ? 3.7 : 1.6) / (1 + idx * .18));
    osc.connect(g).connect(brightness);
    osc.start(now);
    osc.stop(now + (sustain ? 4.35 : 2.35));
  });

  const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.055, audioCtx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseData.length, 2);
  const noise = audioCtx.createBufferSource();
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = Math.min(9000, freq * 9);
  noiseFilter.Q.value = 1.2;
  hammer.gain.setValueAtTime(0.18 * velocity, now);
  hammer.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  noise.buffer = noiseBuffer;
  noise.connect(noiseFilter).connect(hammer).connect(brightness);
  noise.start(now);

  brightness.connect(body).connect(output);
  output.connect(master.dry);
  output.connect(master.wet);
  return { output, stopAt: now + (sustain ? 4.35 : 2.35) };
}

function buildPiano() {
  piano.innerHTML = '';
  const whiteWidth = Math.max(42, Math.floor(piano.clientWidth / (octaveCount * 7)));
  const blackWidth = Math.round(whiteWidth * 0.62);
  const totalWhite = octaveCount * 7;
  piano.style.minWidth = `${totalWhite * whiteWidth}px`;
  piano.style.width = `${Math.max(piano.clientWidth, totalWhite * whiteWidth)}px`;

  for (let o = 0; o < octaveCount; o++) {
    const octave = startOctave + o;
    WHITE_ORDER.forEach((name, idx) => {
      const key = document.createElement('button');
      const midi = noteToMidi(name, octave);
      key.className = 'key white';
      key.dataset.freq = midiToFreq(midi);
      key.dataset.note = `${name}${octave}`;
      key.style.left = `${(o * 7 + idx) * whiteWidth}px`;
      key.style.width = `${whiteWidth}px`;
      key.innerHTML = `<span class="note-label">${name}${octave}</span>`;
      piano.appendChild(key);
    });
    Object.entries(BLACK_OFFSETS).forEach(([name, offset]) => {
      const key = document.createElement('button');
      const midi = noteToMidi(name, octave);
      key.className = 'key black';
      key.dataset.freq = midiToFreq(midi);
      key.dataset.note = `${name}${octave}`;
      key.style.left = `${(o * 7 + offset) * whiteWidth - blackWidth / 2}px`;
      key.style.width = `${blackWidth}px`;
      key.innerHTML = `<span class="note-label">${name}</span>`;
      piano.appendChild(key);
    });
  }
  octaveLabel.textContent = `C${startOctave}–B${startOctave + octaveCount - 1}`;
}

function keyFromPoint(x, y) {
  const items = document.elementsFromPoint(x, y);
  return items.find(el => el.classList && el.classList.contains('key'));
}
function startKey(key, id = Symbol('note')) {
  if (!key) return;
  ensureAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  key.classList.add('active');
  navigator.vibrate?.(8);
  const voice = makePianoTone(Number(key.dataset.freq), 1);
  activePointers.set(id, { key, voice });
}
function endKey(id) {
  const state = activePointers.get(id);
  if (!state) return;
  state.key.classList.remove('active');
  activePointers.delete(id);
}

piano.addEventListener('pointerdown', e => {
  const key = e.target.closest('.key');
  if (!key) return;
  e.preventDefault();
  key.setPointerCapture?.(e.pointerId);
  startKey(key, e.pointerId);
});
piano.addEventListener('pointermove', e => {
  if (!activePointers.has(e.pointerId)) return;
  const current = activePointers.get(e.pointerId).key;
  const next = keyFromPoint(e.clientX, e.clientY);
  if (next && next !== current) {
    endKey(e.pointerId);
    startKey(next, e.pointerId);
  }
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(type => piano.addEventListener(type, e => endKey(e.pointerId)));

document.addEventListener('keydown', e => {
  if (e.repeat || heldKeyboard.has(e.code)) return;
  const idx = KEYBOARD_MAP.indexOf(e.code);
  if (idx < 0) return;
  const noteIndex = idx % 12;
  const oct = startOctave + Math.floor(idx / 12);
  const note = NOTE_NAMES[noteIndex];
  const key = [...piano.querySelectorAll('.key')].find(k => k.dataset.note === `${note}${oct}`);
  if (key) {
    heldKeyboard.set(e.code, e.code);
    startKey(key, e.code);
  }
});
document.addEventListener('keyup', e => {
  heldKeyboard.delete(e.code);
  endKey(e.code);
});

volumeInput.addEventListener('input', () => { if (master) master.gain.value = Number(volumeInput.value); });
sustainBtn.addEventListener('click', () => {
  sustain = !sustain;
  sustainBtn.classList.toggle('on', sustain);
  sustainBtn.setAttribute('aria-pressed', String(sustain));
});
fullscreenBtn.addEventListener('click', async () => {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
  else await document.exitFullscreen?.();
});
octaveDown.addEventListener('click', () => { startOctave = Math.max(1, startOctave - 1); buildPiano(); });
octaveUp.addEventListener('click', () => { startOctave = Math.min(5, startOctave + 1); buildPiano(); });

function responsiveOctaves() {
  const landscape = matchMedia('(orientation: landscape)').matches;
  octaveCount = landscape ? (innerWidth > 1000 ? 5 : 4) : (innerWidth > 560 ? 4 : 3);
  buildPiano();
}
addEventListener('resize', responsiveOctaves);
addEventListener('orientationchange', () => setTimeout(responsiveOctaves, 150));
responsiveOctaves();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
