const NOTES = [
  { name: "C", type: "white", semitone: 0, key: "a" },
  { name: "C#", type: "black", semitone: 1, key: "w" },
  { name: "D", type: "white", semitone: 2, key: "s" },
  { name: "D#", type: "black", semitone: 3, key: "e" },
  { name: "E", type: "white", semitone: 4, key: "d" },
  { name: "F", type: "white", semitone: 5, key: "f" },
  { name: "F#", type: "black", semitone: 6, key: "t" },
  { name: "G", type: "white", semitone: 7, key: "g" },
  { name: "G#", type: "black", semitone: 8, key: "y" },
  { name: "A", type: "white", semitone: 9, key: "h" },
  { name: "A#", type: "black", semitone: 10, key: "u" },
  { name: "B", type: "white", semitone: 11, key: "j" }
];

const EXTRA_KEYS = ["k", "o", "l", "p", "ñ"];
const keyboard = document.getElementById("keyboard");
const octaveValue = document.getElementById("octaveValue");
const noteDisplay = document.getElementById("noteDisplay");
const statusText = document.getElementById("statusText");
const octaveDown = document.getElementById("octaveDown");
const octaveUp = document.getElementById("octaveUp");
const rangeSelect = document.getElementById("rangeSelect");
const toneSelect = document.getElementById("toneSelect");
const volumeSlider = document.getElementById("volumeSlider");
const secondVoiceSwitch = document.getElementById("secondVoiceSwitch");
const secondVoiceSwitchText = document.getElementById("secondVoiceSwitchText");
const installBtn = document.getElementById("installBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function updateViewportUnit() {
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty("--vh", `${viewportHeight * 0.01}px`);
}


let audioCtx;
let masterGain;
let baseOctave = 3;
let octaves = 3;
let deferredInstallPrompt = null;
let secondVoiceMode = 0;
const SECOND_VOICE_MODES = [-1, 0, 1];
const SECOND_VOICE_LABELS = {
  "-1": "Grave segunda voz",
  0: "Neutral",
  1: "Aguda segunda voz"
};

// Reglas de segunda voz estilo norteño indicadas por el usuario.
// Primera voz: DO RE MI FA SOL LA SI
// Aguda:       MI FA# SOL# LA SI DO# RE#
// Grave:       SOL# LA# DO DO# RE# FA SOL
const SECOND_VOICE_RULES = {
  0: { up: 4, down: 8 },   // DO -> MI / SOL#
  2: { up: 6, down: 10 },  // RE -> FA# / LA#
  4: { up: 8, down: 0 },   // MI -> SOL# / DO
  5: { up: 9, down: 1 },   // FA -> LA / DO#
  7: { up: 11, down: 3 },  // SOL -> SI / RE#
  9: { up: 1, down: 5 },   // LA -> DO# / FA
  11: { up: 3, down: 7 }   // SI -> RE# / SOL
};
const CHROMATIC_FALLBACK_INTERVAL = 4;
const activePointers = new Map();
const pressedKeys = new Set();

function setupAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = Number(volumeSlider.value);
  masterGain.connect(audioCtx.destination);
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function noteToMidi(note, octave) {
  return 12 * (octave + 1) + note.semitone;
}

function normalizePitchClass(midi) {
  return ((midi % 12) + 12) % 12;
}

function getSecondVoiceMidi(midi) {
  if (secondVoiceMode === 0) return null;

  const pitchClass = normalizePitchClass(midi);
  const rule = SECOND_VOICE_RULES[pitchClass];

  if (!rule) {
    // Para teclas negras no incluidas en la tabla, se conserva la relación cromática.
    return midi + (secondVoiceMode * CHROMATIC_FALLBACK_INTERVAL);
  }

  const targetPitchClass = secondVoiceMode === 1 ? rule.up : rule.down;
  const rawDistance = targetPitchClass - pitchClass;
  const interval = secondVoiceMode === 1
    ? (rawDistance + 12) % 12
    : -((pitchClass - targetPitchClass + 12) % 12);

  return midi + interval;
}

function midiToNoteName(midi) {
  const note = NOTES.find(n => n.semitone === normalizePitchClass(midi));
  const octave = Math.floor(midi / 12) - 1;
  return `${note?.name || "?"}${octave}`;
}

function getKeyByMidi(midi) {
  return keyboard.querySelector(`.piano-key[data-midi="${midi}"]`);
}

function flashHarmonyKey(midi) {
  const harmonyKey = getKeyByMidi(midi);
  if (!harmonyKey) return;
  harmonyKey.classList.add("active", "harmony-active");
  window.setTimeout(() => harmonyKey.classList.remove("active", "harmony-active"), 170);
}

function updateSecondVoiceSwitch() {
  secondVoiceSwitch.dataset.mode = String(secondVoiceMode);
  secondVoiceSwitchText.textContent = SECOND_VOICE_LABELS[secondVoiceMode];
  secondVoiceSwitch.setAttribute("aria-label", `Modo de segunda voz: ${SECOND_VOICE_LABELS[secondVoiceMode]}`);
}

function playPiano(freq, velocity = 1) {
  setupAudio();
  const now = audioCtx.currentTime;
  const tone = toneSelect.value;
  const output = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  const compressor = audioCtx.createDynamicsCompressor();

  const gainAmount = Number(volumeSlider.value) * 0.72 * velocity;
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(gainAmount, now + 0.012);
  output.gain.exponentialRampToValueAtTime(gainAmount * 0.34, now + 0.18);
  output.gain.exponentialRampToValueAtTime(0.0001, now + 1.65);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(tone === "bright" ? 5400 : tone === "warm" ? 2600 : 3800, now);
  filter.Q.value = tone === "bright" ? 0.85 : 0.55;

  compressor.threshold.value = -18;
  compressor.knee.value = 18;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.15;

  const partials = tone === "bright"
    ? [1, 0.58, 0.34, 0.18, 0.11, 0.055]
    : tone === "warm"
      ? [1, 0.42, 0.22, 0.12, 0.055]
      : [1, 0.50, 0.27, 0.14, 0.07];

  partials.forEach((amp, index) => {
    const osc = audioCtx.createOscillator();
    const partialGain = audioCtx.createGain();
    const harmonic = index + 1;
    const detune = index % 2 === 0 ? 1.8 : -1.6;

    osc.type = index === 0 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freq * harmonic, now);
    osc.detune.setValueAtTime(detune, now);

    partialGain.gain.setValueAtTime(amp, now);
    partialGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, amp * 0.16), now + 0.22 + index * 0.035);
    partialGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2 + index * 0.1);

    osc.connect(partialGain);
    partialGain.connect(output);
    osc.start(now);
    osc.stop(now + 1.75);
  });

  // Soft hammer/noise transient, very short and filtered.
  const bufferSize = Math.floor(audioCtx.sampleRate * 0.028);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2.5);
  }
  const noise = audioCtx.createBufferSource();
  const noiseGain = audioCtx.createGain();
  const noiseFilter = audioCtx.createBiquadFilter();
  noise.buffer = buffer;
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = tone === "bright" ? 2100 : 1550;
  noiseFilter.Q.value = 1.4;
  noiseGain.gain.setValueAtTime(gainAmount * 0.055, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(output);
  noise.start(now);
  noise.stop(now + 0.05);

  output.connect(filter);
  filter.connect(compressor);
  compressor.connect(masterGain);
}

function buildKeyboard() {
  keyboard.innerHTML = "";
  octaveValue.textContent = `C${baseOctave}`;
  const whiteNotes = [];
  const allKeys = [];

  for (let o = 0; o < octaves; o++) {
    NOTES.forEach((note) => {
      allKeys.push({ ...note, octave: baseOctave + o });
    });
  }
  allKeys.push({ name: "C", type: "white", semitone: 0, octave: baseOctave + octaves });

  allKeys.filter(n => n.type === "white").forEach((note) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "white-key piano-key";
    const midi = noteToMidi(note, note.octave);
    el.dataset.note = `${note.name}${note.octave}`;
    el.dataset.midi = midi;
    el.dataset.freq = midiToFreq(midi);
    el.innerHTML = `<span class="key-label">${note.name}${note.octave}</span>`;
    keyboard.appendChild(el);
    whiteNotes.push({ note, el });
  });

  const whiteWidth = () => whiteNotes[0]?.el.getBoundingClientRect().width || 69;

  requestAnimationFrame(() => {
    allKeys.filter(n => n.type === "black").forEach((note) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "black-key piano-key";
      const midi = noteToMidi(note, note.octave);
      el.dataset.note = `${note.name}${note.octave}`;
      el.dataset.midi = midi;
      el.dataset.freq = midiToFreq(midi);
      el.innerHTML = `<span class="key-label">${note.name}${note.octave}</span>`;

      const whiteIndex = whiteNotes.findIndex(w => w.note.octave === note.octave && w.note.name === note.name.replace("#", ""));
      const left = (whiteIndex + 1) * whiteWidth();
      el.style.left = `${left}px`;
      keyboard.appendChild(el);
    });
  });
}

function getKeyFromPoint(x, y) {
  const elements = document.elementsFromPoint(x, y);
  return elements.find(el => el.classList?.contains("piano-key"));
}

function pressVisual(key) {
  key.classList.add("active");
  noteDisplay.textContent = key.dataset.note;
  statusText.textContent = `Sonando ${key.dataset.note}`;
}

function releaseVisual(key) {
  key.classList.remove("active");
}

function triggerKey(key, velocity = 1) {
  if (!key) return;
  setupAudio();
  if (audioCtx.state === "suspended") audioCtx.resume();

  const midi = Number(key.dataset.midi);
  const secondVoiceMidi = getSecondVoiceMidi(midi);
  const secondVoiceName = secondVoiceMidi === null ? "" : midiToNoteName(secondVoiceMidi);

  pressVisual(key);
  if (secondVoiceName) {
    noteDisplay.textContent = `${key.dataset.note} + ${secondVoiceName}`;
    statusText.textContent = `Sonando ${key.dataset.note} con ${SECOND_VOICE_LABELS[secondVoiceMode].toLowerCase()} (${secondVoiceName})`;
  }

  playPiano(midiToFreq(midi), velocity);
  if (secondVoiceMidi !== null) {
    playPiano(midiToFreq(secondVoiceMidi), velocity * 0.86);
    flashHarmonyKey(secondVoiceMidi);
  }
  navigator.vibrate?.(8);
}

keyboard.addEventListener("pointerdown", (event) => {
  const key = getKeyFromPoint(event.clientX, event.clientY);
  if (!key) return;
  event.preventDefault();
  keyboard.setPointerCapture?.(event.pointerId);
  activePointers.set(event.pointerId, key);
  triggerKey(key);
});

keyboard.addEventListener("pointermove", (event) => {
  if (!activePointers.has(event.pointerId)) return;
  const previous = activePointers.get(event.pointerId);
  const next = getKeyFromPoint(event.clientX, event.clientY);
  if (!next || next === previous) return;
  releaseVisual(previous);
  activePointers.set(event.pointerId, next);
  triggerKey(next, 0.92);
});

function endPointer(event) {
  const key = activePointers.get(event.pointerId);
  if (key) releaseVisual(key);
  activePointers.delete(event.pointerId);
  if (activePointers.size === 0) {
    statusText.textContent = "Listo para tocar";
  }
}

keyboard.addEventListener("pointerup", endPointer);
keyboard.addEventListener("pointercancel", endPointer);
keyboard.addEventListener("pointerleave", endPointer);

const keyMap = new Map();
function refreshKeyMap() {
  keyMap.clear();
  const keys = [...keyboard.querySelectorAll(".piano-key")];
  const physical = ["a","w","s","e","d","f","t","g","y","h","u","j", ...EXTRA_KEYS];
  physical.forEach((letter, index) => {
    if (keys[index]) keyMap.set(letter, keys[index]);
  });
}

window.addEventListener("keydown", (event) => {
  const letter = event.key.toLowerCase();
  if (pressedKeys.has(letter)) return;
  const key = keyMap.get(letter);
  if (!key) return;
  event.preventDefault();
  pressedKeys.add(letter);
  triggerKey(key);
});

window.addEventListener("keyup", (event) => {
  const letter = event.key.toLowerCase();
  const key = keyMap.get(letter);
  pressedKeys.delete(letter);
  if (key) releaseVisual(key);
});

octaveDown.addEventListener("click", () => {
  baseOctave = Math.max(1, baseOctave - 1);
  buildKeyboard();
  setTimeout(refreshKeyMap, 50);
});

octaveUp.addEventListener("click", () => {
  baseOctave = Math.min(6, baseOctave + 1);
  buildKeyboard();
  setTimeout(refreshKeyMap, 50);
});

rangeSelect.addEventListener("change", () => {
  octaves = Number(rangeSelect.value);
  buildKeyboard();
  setTimeout(refreshKeyMap, 50);
});

volumeSlider.addEventListener("input", () => {
  if (masterGain) masterGain.gain.value = Number(volumeSlider.value);
});

secondVoiceSwitch.addEventListener("click", () => {
  const currentIndex = SECOND_VOICE_MODES.indexOf(secondVoiceMode);
  secondVoiceMode = SECOND_VOICE_MODES[(currentIndex + 1) % SECOND_VOICE_MODES.length];
  updateSecondVoiceSwitch();
  statusText.textContent = `Modo: ${SECOND_VOICE_LABELS[secondVoiceMode]}`;
});

if (isIOS || !document.documentElement.requestFullscreen) {
  fullscreenBtn.hidden = true;
} else {
  fullscreenBtn.addEventListener("click", async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen?.();
    }
  });
}

document.addEventListener("gesturestart", (event) => event.preventDefault());
document.addEventListener("gesturechange", (event) => event.preventDefault());
document.addEventListener("gestureend", (event) => event.preventDefault());

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installBtn.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

window.addEventListener("resize", () => {
  updateViewportUnit();
  buildKeyboard();
  setTimeout(refreshKeyMap, 50);
});

window.visualViewport?.addEventListener("resize", () => {
  updateViewportUnit();
  buildKeyboard();
  setTimeout(refreshKeyMap, 50);
});

window.addEventListener("orientationchange", () => {
  window.setTimeout(() => {
    updateViewportUnit();
    buildKeyboard();
    refreshKeyMap();
  }, 180);
});

updateViewportUnit();
updateSecondVoiceSwitch();
buildKeyboard();
setTimeout(refreshKeyMap, 80);
