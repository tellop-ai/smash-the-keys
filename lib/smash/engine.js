/**
 * The toy's play loop: the key trap, the emoji on screen, the made-up sounds and
 * the spoken words.
 *
 * React owns the screens and the saved values; this owns what changes on every
 * key, so a fast run of keys never re-renders the page. It touches nothing until
 * `start()`, and `stop()` takes away everything `start()` added.
 *
 * - **The key trap.** While playing, one capture-phase `keydown` listener on the
 *   document swallows every key so a small hand cannot fire a browser shortcut or
 *   type into anything. A press on one of the corner controls (an element inside
 *   `[data-smash-control]`) passes through, so the parent's mouse and keyboard
 *   still work there. Esc stops play. A held key pops one emoji, not a stream.
 *   The computer's own shortcuts (switching or closing apps) never reach a page;
 *   this is a toy, not a lock.
 * - **Emoji.** Each is a `div` whose text is the emoji, placed by picking one of
 *   a fixed set of classes (`smash-spot-N`, `smash-tilt-N`, `smash-size-N`), so no
 *   styling is ever written from here. At most 24 are on screen; the oldest goes
 *   first, and each goes by itself after five seconds.
 * - **Sound and speech.** The Start press is the gesture that lets the page make
 *   sound, so the sound maker is created then. With "Say it" on, one big emoji
 *   sits in the middle and its name is said in the chosen language with the
 *   computer's own voice; with it off and Sound on, each key makes one of three
 *   short made-up sounds. Every sound and speech call is guarded: if one fails,
 *   the toy keeps going silently.
 */

import { pickForKey, spokenName } from './emoji.js';

/** The most emoji on screen at once. */
export const MAX_EMOJI = 24;
/** How long one emoji stays, in milliseconds (the fade in the stylesheet matches). */
export const EMOJI_LIFETIME_MS = 5000;
/** How many spot, tilt and size classes the stylesheet defines. */
export const SPOT_COUNT = 40;
export const TILT_COUNT = 7;
export const SIZE_COUNT = 5;

/** @param {unknown} promise */
function quietly(promise) {
  if (promise && typeof (/** @type {any} */ (promise)).then === 'function') {
    /** @type {Promise<unknown>} */ (promise).then(undefined, () => undefined);
  }
}

/**
 * @param {{
 *   root: HTMLElement,
 *   emojiLayer: HTMLElement,
 *   centerSlot: HTMLElement,
 *   counter: HTMLElement,
 *   getSettings: () => { soundOn: boolean, voiceOn: boolean, voiceTag: string },
 *   onKey?: (runCount: number) => void,
 *   onStop?: () => void,
 *   random?: () => number,
 * }} options
 */
export function createSmashEngine({ root, emojiLayer, centerSlot, counter, getSettings, onKey, onStop, random = Math.random }) {
  const doc = root?.ownerDocument ?? globalThis.document;
  let playing = false;
  let runCount = 0;
  /** @type {Array<{ el: HTMLElement, timer: ReturnType<typeof setTimeout> | null }>} */
  const nodes = [];
  /** @type {any} */
  let audio = null;
  /** @type {any[] | null} */
  let voices = null;

  /** @param {number} size */
  function roll(size) {
    const value = Number(random());
    const index = Number.isFinite(value) ? Math.floor(value * size) : 0;
    return Math.min(size - 1, Math.max(0, index));
  }

  function settings() {
    try {
      const current = getSettings();
      return {
        soundOn: current?.soundOn === true,
        voiceOn: current?.voiceOn === true,
        voiceTag: typeof current?.voiceTag === 'string' && current.voiceTag.length > 0 ? current.voiceTag : 'en-US',
      };
    } catch {
      return { soundOn: false, voiceOn: false, voiceTag: 'en-US' };
    }
  }

  function writeCount() {
    try {
      if (counter) counter.textContent = String(runCount);
    } catch {
      // The counter is only a display; counting goes on without it.
    }
  }

  /* ---------- emoji on screen ---------- */

  /** @param {{ el: HTMLElement, timer: ReturnType<typeof setTimeout> | null }} entry */
  function removeNode(entry) {
    if (entry.timer !== null) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    if (entry.el.parentNode) entry.el.parentNode.removeChild(entry.el);
    const at = nodes.indexOf(entry);
    if (at !== -1) nodes.splice(at, 1);
  }

  function clearNodes() {
    while (nodes.length > 0) removeNode(nodes[nodes.length - 1]);
  }

  /**
   * @param {string} glyph
   * @param {string} placeClasses
   * @param {HTMLElement} parent
   */
  function addNode(glyph, placeClasses, parent) {
    while (nodes.length >= MAX_EMOJI) removeNode(nodes[0]);
    const el = doc.createElement('div');
    el.className = `smash-emoji ${placeClasses} smash-tilt-${roll(TILT_COUNT)} smash-size-${roll(SIZE_COUNT)}`;
    el.textContent = glyph;
    el.setAttribute('aria-hidden', 'true');
    /** @type {{ el: HTMLElement, timer: ReturnType<typeof setTimeout> | null }} */
    const entry = { el, timer: null };
    entry.timer = setTimeout(() => removeNode(entry), EMOJI_LIFETIME_MS);
    parent.appendChild(el);
    nodes.push(entry);
  }

  /** @param {string} glyph */
  function showCenter(glyph) {
    if (!centerSlot) return;
    for (let at = nodes.length - 1; at >= 0; at -= 1) {
      if (nodes[at].el.parentNode === centerSlot) removeNode(nodes[at]);
    }
    addNode(glyph, 'is-center', centerSlot);
  }

  /** @param {string} glyph */
  function scatter(glyph) {
    if (!emojiLayer) return;
    addNode(glyph, `smash-spot-${roll(SPOT_COUNT)}`, emojiLayer);
  }

  /* ---------- speech ---------- */

  function speech() {
    const synth = /** @type {any} */ (globalThis).speechSynthesis;
    return synth && typeof synth.speak === 'function' ? synth : null;
  }

  function refreshVoices() {
    try {
      const synth = speech();
      voices = synth && typeof synth.getVoices === 'function' ? Array.from(synth.getVoices() ?? []) : [];
    } catch {
      voices = [];
    }
  }

  /** The closest voice: the exact tag first, then the same language in another region. @param {string} tag */
  function bestVoice(tag) {
    if (voices === null) refreshVoices();
    const want = tag.toLowerCase();
    const language = want.split('-')[0];
    let near = null;
    for (const voice of voices ?? []) {
      const lang = String(voice?.lang ?? '').toLowerCase().replace('_', '-');
      if (lang.length === 0) continue;
      if (lang === want) return voice;
      if (near === null && lang.split('-')[0] === language) near = voice;
    }
    return near;
  }

  /**
   * @param {string} name
   * @param {string} tag
   */
  function speak(name, tag) {
    const synth = speech();
    const Utterance = /** @type {any} */ (globalThis).SpeechSynthesisUtterance;
    if (!synth || typeof Utterance !== 'function') return;
    try {
      synth.cancel();
      const utterance = new Utterance(spokenName(name, tag));
      utterance.lang = tag;
      utterance.pitch = 1.3;
      utterance.rate = 0.9;
      utterance.volume = 1;
      const voice = bestVoice(tag);
      if (voice) utterance.voice = voice;
      synth.speak(utterance);
    } catch {
      // Speech failed this once; the emoji still shows.
    }
  }

  function cancelSpeech() {
    try {
      speech()?.cancel();
    } catch {
      // Nothing was being said.
    }
  }

  /** Wakes the voice on the Start press, silently, and starts the voice list loading. */
  function primeSpeech() {
    const synth = speech();
    const Utterance = /** @type {any} */ (globalThis).SpeechSynthesisUtterance;
    if (!synth) return;
    try {
      if (typeof Utterance === 'function') {
        const warm = new Utterance('');
        warm.volume = 0;
        synth.speak(warm);
      }
      refreshVoices();
    } catch {
      // No voice on this computer; the toy plays without it.
    }
  }

  const onVoicesChanged = () => refreshVoices();
  try {
    const synth = speech();
    if (synth && typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', onVoicesChanged);
  } catch {
    // No voice list to follow.
  }

  /* ---------- sound ---------- */

  function unlockAudio() {
    try {
      if (audio === null) {
        const Context = /** @type {any} */ (globalThis).AudioContext ?? /** @type {any} */ (globalThis).webkitAudioContext;
        if (typeof Context === 'function') audio = new Context();
      }
      if (audio && audio.state === 'suspended' && typeof audio.resume === 'function') quietly(audio.resume());
    } catch {
      audio = null;
    }
  }

  /** A soft spring: up quickly, then bending back down. @param {number} at */
  function boing(at) {
    const tone = audio.createOscillator();
    const level = audio.createGain();
    tone.type = 'triangle';
    const start = 300 + random() * 120;
    tone.frequency.setValueAtTime(start, at);
    tone.frequency.exponentialRampToValueAtTime(start * 1.9, at + 0.07);
    tone.frequency.exponentialRampToValueAtTime(start * 0.8, at + 0.26);
    level.gain.setValueAtTime(0.0001, at);
    level.gain.exponentialRampToValueAtTime(0.2, at + 0.012);
    level.gain.exponentialRampToValueAtTime(0.0001, at + 0.26);
    tone.connect(level);
    level.connect(audio.destination);
    tone.start(at);
    tone.stop(at + 0.27);
  }

  /** A short round pop that drops in pitch. @param {number} at */
  function pop(at) {
    const tone = audio.createOscillator();
    const level = audio.createGain();
    tone.type = 'sine';
    const start = 360 + random() * 220;
    tone.frequency.setValueAtTime(start, at);
    tone.frequency.exponentialRampToValueAtTime(start * 0.42, at + 0.1);
    level.gain.setValueAtTime(0.24, at);
    level.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
    tone.connect(level);
    level.connect(audio.destination);
    tone.start(at);
    tone.stop(at + 0.13);
  }

  /** A comical slide down, softened so it buzzes gently. @param {number} at */
  function slide(at) {
    const tone = audio.createOscillator();
    const soften = audio.createBiquadFilter();
    const level = audio.createGain();
    tone.type = 'sawtooth';
    const start = 620 + random() * 160;
    tone.frequency.setValueAtTime(start, at);
    tone.frequency.exponentialRampToValueAtTime(start * 0.28, at + 0.18);
    soften.type = 'lowpass';
    soften.frequency.setValueAtTime(2200, at);
    soften.frequency.exponentialRampToValueAtTime(700, at + 0.18);
    level.gain.setValueAtTime(0.0001, at);
    level.gain.exponentialRampToValueAtTime(0.17, at + 0.01);
    level.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    tone.connect(soften);
    soften.connect(level);
    level.connect(audio.destination);
    tone.start(at);
    tone.stop(at + 0.19);
  }

  function playSound() {
    if (audio === null || audio.state === 'closed') return;
    try {
      if (audio.state === 'suspended' && typeof audio.resume === 'function') quietly(audio.resume());
      const at = audio.currentTime;
      const which = roll(3);
      if (which === 0) boing(at);
      else if (which === 1) pop(at);
      else slide(at);
    } catch {
      // One sound failed; the next key tries again.
    }
  }

  /* ---------- full screen, when the window allows it ---------- */

  function askFullScreen() {
    try {
      if (typeof root?.requestFullscreen === 'function') quietly(root.requestFullscreen());
    } catch {
      // Full screen was refused; the toy plays in the window.
    }
  }

  function leaveFullScreen() {
    try {
      if (doc?.fullscreenElement && typeof doc.exitFullscreen === 'function') quietly(doc.exitFullscreen());
    } catch {
      // Not in full screen.
    }
  }

  /* ---------- the key trap ---------- */

  /**
   * The corner control a key landed on, or `null`.
   *
   * @param {unknown} target
   * @returns {any}
   */
  function controlOf(target) {
    const element = /** @type {any} */ (target);
    if (!element || typeof element.closest !== 'function') return null;
    return element.closest('[data-smash-control]') ?? null;
  }

  /** @param {KeyboardEvent} event */
  function onKeyDown(event) {
    if (!playing) return;
    // Esc always stops play, wherever the focus is.
    if (event.key === 'Escape') {
      event.preventDefault();
      stop();
      onStop?.();
      return;
    }
    const control = controlOf(event.target);
    if (control) {
      // A picker left focused (opened, then closed without a change) would take
      // the child's keys: its letters change the language and Space opens it.
      // Give its focus back and play the key instead. The buttons let a key
      // through, so a parent can still use them from the keyboard.
      if (control.getAttribute?.('data-smash-control') !== 'language') return;
      try {
        control.blur?.();
      } catch {
        // The key still plays.
      }
    }
    event.preventDefault();
    if (event.repeat) return;
    const pick = pickForKey(event.key, random);
    const now = settings();
    if (now.voiceOn) {
      showCenter(pick.e);
      speak(pick.name, now.voiceTag);
    } else {
      scatter(pick.e);
      if (now.soundOn) playSound();
    }
    runCount += 1;
    writeCount();
    try {
      onKey?.(runCount);
    } catch {
      // Saving is React's; a problem there never stops the toy.
    }
  }

  /* ---------- the three controls ---------- */

  /** Starts play. Called inside the Start press, which is what lets sound and speech begin. */
  function start() {
    if (playing) return;
    playing = true;
    runCount = 0;
    writeCount();
    unlockAudio();
    primeSpeech();
    askFullScreen();
    doc.addEventListener('keydown', onKeyDown, true);
  }

  /** Stops play and removes every listener, emoji and timer that play added. */
  function stop() {
    const was = playing;
    playing = false;
    doc.removeEventListener('keydown', onKeyDown, true);
    clearNodes();
    cancelSpeech();
    if (was) leaveFullScreen();
  }

  /** Stops play and lets go of the voice list and the sound maker. */
  function destroy() {
    stop();
    try {
      const synth = speech();
      if (synth && typeof synth.removeEventListener === 'function') synth.removeEventListener('voiceschanged', onVoicesChanged);
    } catch {
      // No voice list was followed.
    }
    try {
      if (audio && audio.state !== 'closed' && typeof audio.close === 'function') quietly(audio.close());
    } catch {
      // Already closed.
    }
    audio = null;
  }

  return { start, stop, destroy, isPlaying: () => playing };
}
