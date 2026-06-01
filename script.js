const keyboard = document.getElementById("keyboard");
const keyboardWrap = document.querySelector(".keyboard-wrap");
const startOctaveSelect = document.getElementById("startOctave");
const octaveCountSelect = document.getElementById("octaveCount");
const volumeInput = document.getElementById("volume");
const waveformSelect = document.getElementById("waveform");
const currentNote = document.getElementById("currentNote");
const centerKeyboardButton = document.getElementById("centerKeyboard");
const fullscreenButton = document.getElementById("fullscreen");

const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const whiteNotes = ["C", "D", "E", "F", "G", "A", "B"];
const blackNoteOffsets = {
  "C#": 0.68,
  "D#": 1.68,
  "F#": 3.68,
  "G#": 4.68,
  "A#": 5.68,
};

const computerKeys = [
  "a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j",
  "k", "o", "l", "p", "ñ", "'", "z", "x", "c", "v", "b", "n"
];

let audioContext = null;
let masterGain = null;
let activeOscillators = new Map();
let keyMap = new Map();
let noteElements = new Map();
let resizeTimer = null;
let lastVibrationTime = 0;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.value = Number(volumeInput.value);
    masterGain.connect(audioContext.destination);
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function noteToFrequency(note, octave) {
  const noteIndex = noteNames.indexOf(note);
  const midiNumber = 12 * (octave + 1) + noteIndex;
  return 440 * Math.pow(2, (midiNumber - 69) / 12);
}

function vibrateOnTouch() {
  const now = Date.now();
  if (navigator.vibrate && now - lastVibrationTime > 35) {
    navigator.vibrate(10);
    lastVibrationTime = now;
  }
}

function playNote(noteId, frequency, shouldVibrate = false) {
  const ctx = getAudioContext();

  if (activeOscillators.has(noteId)) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = waveformSelect.value;
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.012);

  oscillator.connect(gain);
  gain.connect(masterGain);

  oscillator.start();

  activeOscillators.set(noteId, { oscillator, gain });
  setKeyActive(noteId, true);
  if (shouldVibrate) vibrateOnTouch();
  currentNote.textContent = noteId;
}

function stopNote(noteId) {
  const ctx = getAudioContext();
  const active = activeOscillators.get(noteId);

  if (!active) return;

  active.gain.gain.cancelScheduledValues(ctx.currentTime);
  active.gain.gain.setValueAtTime(Math.max(active.gain.gain.value, 0.0001), ctx.currentTime);
  active.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
  active.oscillator.stop(ctx.currentTime + 0.1);

  activeOscillators.delete(noteId);
  setKeyActive(noteId, false);

  if (activeOscillators.size === 0) {
    currentNote.textContent = "Listo para tocar";
  }
}

function stopAllNotes() {
  for (const noteId of [...activeOscillators.keys()]) {
    stopNote(noteId);
  }
}

function setKeyActive(noteId, isActive) {
  const element = noteElements.get(noteId);
  if (element) element.classList.toggle("active", isActive);
}

function getKeySizes() {
  const width = window.innerWidth;
  const isLandscapeCompact = window.matchMedia("(orientation: landscape) and (max-height: 520px)").matches;

  if (isLandscapeCompact) return { white: 54, black: 36 };
  if (width <= 380) return { white: 50, black: 34 };
  if (width <= 600) return { white: 54, black: 36 };
  return { white: 62, black: 40 };
}

function createKey(note, octave, type, leftPosition = null) {
  const noteId = `${note}${octave}`;
  const frequency = noteToFrequency(note, octave);
  const key = document.createElement("button");

  key.type = "button";
  key.className = type === "white" ? "white-key" : "black-key";
  key.dataset.noteId = noteId;
  key.dataset.frequency = String(frequency);
  key.setAttribute("aria-label", noteId);

  if (leftPosition !== null) {
    key.style.left = `${leftPosition}px`;
  }

  key.innerHTML = `<span class="key-name">${noteId}</span>`;

  key.addEventListener("pointerdown", event => {
    event.preventDefault();
    key.setPointerCapture(event.pointerId);
    playNote(noteId, frequency, event.pointerType !== "mouse");
  });

  key.addEventListener("pointerup", () => stopNote(noteId));
  key.addEventListener("pointercancel", () => stopNote(noteId));
  key.addEventListener("pointerleave", event => {
    if (event.buttons) stopNote(noteId);
  });
  key.addEventListener("lostpointercapture", () => stopNote(noteId));

  noteElements.set(noteId, key);
  return key;
}

function renderKeyboard() {
  stopAllNotes();
  keyboard.innerHTML = "";
  keyMap = new Map();
  noteElements = new Map();

  const startOctave = Number(startOctaveSelect.value);
  const octaveCount = Number(octaveCountSelect.value);
  const sizes = getKeySizes();

  keyboard.style.setProperty("--white-width", `${sizes.white}px`);
  keyboard.style.setProperty("--black-width", `${sizes.black}px`);

  for (let octave = startOctave; octave < startOctave + octaveCount; octave++) {
    for (const note of whiteNotes) {
      keyboard.appendChild(createKey(note, octave, "white"));
    }
  }

  for (let octave = startOctave; octave < startOctave + octaveCount; octave++) {
    const octaveOffset = (octave - startOctave) * 7 * sizes.white;

    for (const [note, offset] of Object.entries(blackNoteOffsets)) {
      const left = octaveOffset + offset * sizes.white - sizes.black / 2;
      keyboard.appendChild(createKey(note, octave, "black", left));
    }
  }

  const sortedNotes = [];
  for (let octave = startOctave; octave < startOctave + octaveCount; octave++) {
    for (const note of noteNames) {
      sortedNotes.push(`${note}${octave}`);
    }
  }

  sortedNotes.forEach((noteId, index) => {
    if (computerKeys[index]) keyMap.set(computerKeys[index], noteId);
  });
}

function playByComputerKey(event) {
  const key = event.key.toLowerCase();
  const noteId = keyMap.get(key);

  if (!noteId || event.repeat) return;

  const element = noteElements.get(noteId);
  if (!element) return;

  playNote(noteId, Number(element.dataset.frequency), false);
}

function stopByComputerKey(event) {
  const key = event.key.toLowerCase();
  const noteId = keyMap.get(key);

  if (noteId) stopNote(noteId);
}

function centerKeyboard() {
  const maxScroll = keyboardWrap.scrollWidth - keyboardWrap.clientWidth;
  keyboardWrap.scrollTo({ left: Math.max(0, maxScroll / 2), behavior: "smooth" });
}

async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen?.();
    fullscreenButton.textContent = "Salir";
  } else {
    await document.exitFullscreen?.();
    fullscreenButton.textContent = "Pantalla completa";
  }
}

function updateFullscreenLabel() {
  fullscreenButton.textContent = document.fullscreenElement ? "Salir" : "Pantalla completa";
}

volumeInput.addEventListener("input", () => {
  if (masterGain) masterGain.gain.value = Number(volumeInput.value);
});

startOctaveSelect.addEventListener("change", renderKeyboard);
octaveCountSelect.addEventListener("change", renderKeyboard);
centerKeyboardButton.addEventListener("click", centerKeyboard);
fullscreenButton.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", updateFullscreenLabel);

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderKeyboard, 120);
});

window.addEventListener("orientationchange", () => {
  setTimeout(renderKeyboard, 160);
});

window.addEventListener("keydown", playByComputerKey);
window.addEventListener("keyup", stopByComputerKey);
window.addEventListener("blur", stopAllNotes);

renderKeyboard();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // La app sigue funcionando aunque el navegador no permita cache offline.
    });
  });
}
