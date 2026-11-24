// Procedural sound: no audio files, everything is an oscillator or a burst of
// noise shaped by the Web Audio API. The context only starts on a user
// gesture (a key or a click); before that every call is a silent no-op, which
// is also how the screenshot scenes stay quiet.
import { CAR } from './config.js';

function makeNoiseBuffer(context) {
  const length = context.sampleRate * 0.3;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  return buffer;
}

/** The real sound engine, created lazily on the first gesture. */
export function createAudio() {
  let context = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenOn = false;
  let muted = false;
  let noiseBuffer = null;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
      noiseBuffer = makeNoiseBuffer(context);
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineFilter = context.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = context.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 720;
      sirenGain = context.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
    } catch {
      context = null;
      return false;
    }
    return true;
  }

  function blip(frequency, duration, type, volume, when) {
    if (!ensure()) return;
    const t0 = context.currentTime + (when || 0);
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume || 0.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  function noise(duration, volume, frequency) {
    if (!ensure()) return;
    const t0 = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency || 900;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume || 0.3, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(t0);
    source.stop(t0 + duration + 0.02);
  }

  return {
    /** Call on a gesture: starts the context the browser allows. */
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    /** The engine hum follows the player's car speed, 0 to 1. */
    engine(speed01, driving) {
      if (!context) return;
      const target = driving ? 0.05 + speed01 * 0.11 : 0;
      engineGain.gain.setTargetAtTime(target, context.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(55 + speed01 * 165, context.currentTime, 0.08);
      engineFilter.frequency.setTargetAtTime(380 + speed01 * 900, context.currentTime, 0.1);
    },
    /** The two-tone police siren, on or off. */
    siren(on) {
      sirenOn = on;
      if (!context) return;
      sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, context.currentTime, 0.2);
    },
    /** Called every frame so the siren can wail between its two tones. */
    update(time) {
      if (!context || !sirenOn) return;
      sirenOsc.frequency.value = Math.sin(time * 4.4) > 0 ? 740 : 960;
    },
    steal() { blip(520, 0.12, 'square', 0.12); blip(780, 0.14, 'square', 0.1, 0.09); },
    punch() { noise(0.12, 0.35, 700); },
    swing() { noise(0.08, 0.12, 1800); },
    thud() { noise(0.16, 0.4, 420); },
    crash() { noise(0.35, 0.5, 500); blip(90, 0.3, 'sawtooth', 0.2); },
    pickup() { blip(880, 0.1, 'sine', 0.16); blip(1320, 0.16, 'sine', 0.14, 0.08); },
    click() { blip(660, 0.06, 'square', 0.1); },
    /** A short happy arpeggio for a win, a low one for a loss. */
    jingle(win) {
      const notes = win ? [523, 659, 784, 1047] : [392, 330, 262, 196];
      notes.forEach((note, i) => blip(note, 0.22, 'triangle', 0.16, i * 0.11));
    },
  };
}

/** The silent stand-in the screenshot scenes use: every method does nothing. */
export function createSilentAudio() {
  const noop = () => {};
  return {
    unlock: noop, setMuted: noop, isMuted: () => true,
    engine: noop, siren: noop, update: noop,
    steal: noop, punch: noop, swing: noop, thud: noop, crash: noop,
    pickup: noop, click: noop, jingle: noop,
  };
}
