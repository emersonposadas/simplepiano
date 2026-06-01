const NOTES = [
  { name: 'C', type: 'white', semitone: 0 },
  { name: 'C#', type: 'black', semitone: 1, afterWhite: 0 },
  { name: 'D', type: 'white', semitone: 2 },
  { name: 'D#', type: 'black', semitone: 3, afterWhite: 1 },
  { name: 'E', type: 'white', semitone: 4 },
  { name: 'F', type: 'white', semitone: 5 },
  { name: 'F#', type: 'black', semitone: 6, afterWhite: 3 },
  { name: 'G', type: 'white', semitone: 7 },
  { name: 'G#', type: 'black', semitone: 8, afterWhite: 4 },
  { name: 'A', type: 'white', semitone: 9 },
  { name: 'A#', type: 'black', semitone: 10, afterWhite: 5 },
  { name: 'B', type: 'white', semitone: 11 },
];

const KEYBOARD = ['a','w','s','e','d','f','t','g','y','h','u','j','k','o','l','p','ñ'];
const piano = document.querySelector('#piano');
const noteDisplay = document.querySelector('#noteDisplay');
const statusText = document.querySelector('#statusText');
const octaveReadout = document.querySelector('#octaveReadout');
const octaveCountInput = document.querySelector('#octaveCount');
const waveformInput = document.querySelector('#waveform');
const volumeInput = document.querySelector('#volume');
const fullscreenBtn = document.querySelector('#fullscreenBtn');
const installBtn = document.querySelector('#installBtn');
const octaveDown = document.querySelector('#octaveDown');
const octaveUp = document.querySelector('#octaveUp');

let audioContext;
let masterGain;
let startOctave = 3;
let activeNotes = new Map();
let pointerNotes = new Map();
let keyMap = new Map();
let deferredInstallPrompt = null;

function ensureAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.value = Number(volumeInput.value);
    masterGain.connect(audioContext.destination);
  }
  if (audioContext.state === 'suspended') audioContext.resume();
}

function frequencyFromNote(noteName, octave) {
  const semitone = NOTES.find(n => n.name === noteName).semitone;
  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function playNote(id, note, keyElement) {
  ensureAudio();
  if (activeNotes.has(id)) return;

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  oscillator.type = waveformInput.value;
  oscillator.frequency.setValueAtTime(note.frequency, now);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2600, now);
  filter.Q.setValueAtTime(0.6, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, Number(volumeInput.value)), now + 0.018);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0008, Number(volumeInput.value) * 0.52), now + 0.22);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  oscillator.start(now);

  keyElement.classList.add('active');
  noteDisplay.textContent = `${note.label}`;
  statusText.textContent = `${note.label} · ${Math.round(note.frequency)} Hz`;
  if (navigator.vibrate) navigator.vibrate(8);

  activeNotes.set(id, { oscillator, gain, keyElement });
}

function stopNote(id) {
  const active = activeNotes.get(id);
  if (!active || !audioContext) return;
  const now = audioContext.currentTime;
  active.gain.gain.cancelScheduledValues(now);
  active.gain.gain.setValueAtTime(Math.max(active.gain.gain.value, 0.0001), now);
  active.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  active.oscillator.stop(now + 0.18);
  active.keyElement.classList.remove('active');
  activeNotes.delete(id);
  if (activeNotes.size === 0) {
    setTimeout(() => {
      if (activeNotes.size === 0) {
        noteDisplay.textContent = 'Toca una tecla';
        statusText.textContent = 'Listo para tocar';
      }
    }, 120);
  }
}

function renderPiano() {
  const octaveCount = Number(octaveCountInput.value);
  const whiteKeyCount = octaveCount * 7 + 1;
  const viewportWidth = window.innerWidth;
  const targetVisibleWhites = viewportWidth < 560 ? 9 : viewportWidth < 900 ? 14 : whiteKeyCount;
  const whiteWidth = Math.max(44, Math.min(76, Math.floor((piano.parentElement.clientWidth - 8) / Math.min(whiteKeyCount, targetVisibleWhites))));
  const blackWidth = Math.round(whiteWidth * 0.62);

  piano.innerHTML = '';
  keyMap.clear();
  piano.style.width = `${whiteKeyCount * whiteWidth}px`;

  const whiteNotes = [];
  for (let octave = startOctave; octave < startOctave + octaveCount; octave += 1) {
    NOTES.filter(n => n.type === 'white').forEach(n => whiteNotes.push({ ...n, octave }));
  }
  whiteNotes.push({ name: 'C', type: 'white', semitone: 0, octave: startOctave + octaveCount });

  whiteNotes.forEach((note, index) => {
    const key = createKey(note, index * whiteWidth, whiteWidth, 'white');
    piano.appendChild(key);
  });

  for (let octaveIndex = 0; octaveIndex < octaveCount; octaveIndex += 1) {
    const octave = startOctave + octaveIndex;
    NOTES.filter(n => n.type === 'black').forEach(note => {
      const whiteIndex = octaveIndex * 7 + note.afterWhite;
      const left = (whiteIndex + 1) * whiteWidth - blackWidth / 2;
      const key = createKey({ ...note, octave }, left, blackWidth, 'black');
      piano.appendChild(key);
    });
  }

  buildKeyboardMap();
  octaveReadout.textContent = `C${startOctave}`;
}

function createKey(note, left, width, type) {
  const label = `${note.name}${note.octave}`;
  const button = document.createElement('button');
  button.className = `key ${type}`;
  button.type = 'button';
  button.style.left = `${left}px`;
  button.style.width = `${width}px`;
  button.dataset.note = note.name;
  button.dataset.octave = String(note.octave);
  button.dataset.label = label;
  button.dataset.frequency = String(frequencyFromNote(note.name, note.octave));
  button.setAttribute('aria-label', label);
  button.innerHTML = `<span>${label.replace('#', '♯')}</span>`;

  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    const id = `pointer-${event.pointerId}`;
    pointerNotes.set(event.pointerId, id);
    playNote(id, getNoteFromElement(button), button);
  });
  button.addEventListener('pointerup', event => stopPointer(event.pointerId));
  button.addEventListener('pointercancel', event => stopPointer(event.pointerId));
  button.addEventListener('lostpointercapture', event => stopPointer(event.pointerId));

  return button;
}

function stopPointer(pointerId) {
  const id = pointerNotes.get(pointerId);
  if (id) stopNote(id);
  pointerNotes.delete(pointerId);
}

function getNoteFromElement(key) {
  return {
    note: key.dataset.note,
    octave: Number(key.dataset.octave),
    label: key.dataset.label.replace('#', '♯'),
    frequency: Number(key.dataset.frequency),
  };
}

function buildKeyboardMap() {
  const keys = [...piano.querySelectorAll('.key')].sort((a, b) => Number(a.dataset.frequency) - Number(b.dataset.frequency));
  KEYBOARD.forEach((keyboardKey, index) => {
    if (keys[index]) keyMap.set(keyboardKey, keys[index]);
  });
}

window.addEventListener('keydown', event => {
  const keyboardKey = event.key.toLowerCase();
  if (event.repeat || !keyMap.has(keyboardKey)) return;
  event.preventDefault();
  const key = keyMap.get(keyboardKey);
  playNote(`keyboard-${keyboardKey}`, getNoteFromElement(key), key);
});

window.addEventListener('keyup', event => {
  const keyboardKey = event.key.toLowerCase();
  stopNote(`keyboard-${keyboardKey}`);
});

volumeInput.addEventListener('input', () => {
  if (masterGain) masterGain.gain.value = Number(volumeInput.value);
});
octaveCountInput.addEventListener('change', renderPiano);
octaveDown.addEventListener('click', () => {
  startOctave = Math.max(1, startOctave - 1);
  renderPiano();
});
octaveUp.addEventListener('click', () => {
  startOctave = Math.min(6, startOctave + 1);
  renderPiano();
});
fullscreenBtn.addEventListener('click', async () => {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
  else await document.exitFullscreen?.();
});

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installBtn.hidden = false;
});
installBtn.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installBtn.hidden = true;
});

window.addEventListener('resize', () => window.requestAnimationFrame(renderPiano));
window.addEventListener('orientationchange', () => setTimeout(renderPiano, 250));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

renderPiano();
