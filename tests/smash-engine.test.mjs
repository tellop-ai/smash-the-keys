/**
 * The play loop, checked against a small stand-in for the page.
 *
 * The stand-in has only what the engine uses: elements that hold children,
 * classes, text and attributes; a document that keeps its key listeners; a voice
 * and a sound maker that record what they were asked to do. Timers are the test
 * runner's own mock, so five seconds pass at once.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';

import { BY_LETTER, ALL } from '../lib/smash/emoji.js';
import { createSmashEngine, EMOJI_LIFETIME_MS, MAX_EMOJI } from '../lib/smash/engine.js';

class FakeElement {
  /** @param {FakeDocument} doc */
  constructor(doc) {
    this.ownerDocument = doc;
    this.children = [];
    this.parentNode = null;
    this.className = '';
    this.textContent = '';
    this.attributes = new Map();
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const at = this.children.indexOf(child);
    if (at !== -1) this.children.splice(at, 1);
    child.parentNode = null;
    return child;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  blur() {
    this.blurred = (this.blurred ?? 0) + 1;
  }

  closest(selector) {
    assert.equal(selector, '[data-smash-control]');
    for (let node = this; node; node = node.parentNode) if (node.attributes?.has('data-smash-control')) return node;
    return null;
  }

  set innerHTML(_value) {
    throw new Error('the engine must never write markup');
  }
}

class FakeDocument {
  constructor() {
    this.listeners = [];
    this.body = new FakeElement(this);
  }

  createElement() {
    return new FakeElement(this);
  }

  addEventListener(type, listener, capture) {
    this.listeners.push({ type, listener, capture: capture === true });
  }

  removeEventListener(type, listener, capture) {
    this.listeners = this.listeners.filter((entry) => !(entry.type === type && entry.listener === listener && entry.capture === (capture === true)));
  }

  /** @param {{ key: string, repeat?: boolean, target?: FakeElement }} init */
  press(init) {
    const event = {
      key: init.key,
      repeat: init.repeat === true,
      target: init.target ?? this.body,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
    };
    for (const entry of [...this.listeners]) if (entry.type === 'keydown') entry.listener(event);
    return event;
  }
}

class FakeVoice {
  constructor() {
    this.spoken = [];
    this.cancels = 0;
    this.speaking = false;
    this.pending = false;
    this.listeners = new Set();
  }

  /** A word is said until it ends or is cancelled. */
  speak(utterance) { this.spoken.push(utterance); this.speaking = true; }
  cancel() { this.cancels += 1; this.speaking = false; }
  resume() {}
  /** The word being said comes to its end. */
  finish() { this.speaking = false; this.spoken.at(-1)?.onend?.(); }
  getVoices() { return [{ lang: 'en-US', name: 'Reader' }, { lang: 'tr-TR', name: 'Turkish reader' }, { lang: 'fr_CA', name: 'French reader' }]; }
  addEventListener(type, listener) { if (type === 'voiceschanged') this.listeners.add(listener); }
  removeEventListener(type, listener) { if (type === 'voiceschanged') this.listeners.delete(listener); }
}

class FakeAudio {
  static made = [];
  constructor() {
    this.state = 'suspended';
    this.currentTime = 0;
    this.destination = {};
    this.tones = 0;
    FakeAudio.made.push(this);
  }

  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
  #param() { return { setValueAtTime() {}, exponentialRampToValueAtTime() {} }; }
  createOscillator() {
    this.tones += 1;
    const tone = { frequency: this.#param(), connect() {}, disconnect() {}, start() {}, stop() {} };
    (this.playing ??= []).push(tone);
    return tone;
  }
  /** The oldest sound still playing comes to its end. */
  endOne() { this.playing.shift()?.onended?.(); }
  createGain() { return { gain: this.#param(), connect() {} }; }
  createBiquadFilter() { return { frequency: this.#param(), connect() {} }; }
}

class FakeUtterance {
  constructor(text) { this.text = text; }
}

/** How long a word waits, so that a burst of keys says only its last one. */
const WORD_WAIT_MS = 90;

let doc;
let voice;
let parts;
let settings;
let keys;
let stops;

beforeEach(() => {
  mock.timers.enable({ apis: ['setTimeout'] });
  doc = new FakeDocument();
  voice = new FakeVoice();
  FakeAudio.made = [];
  globalThis.speechSynthesis = voice;
  globalThis.SpeechSynthesisUtterance = FakeUtterance;
  globalThis.AudioContext = FakeAudio;
  settings = { soundOn: false, voiceOn: false, voiceTag: 'en-US' };
  keys = [];
  stops = 0;
  parts = {
    root: doc.createElement(),
    emojiLayer: doc.createElement(),
    centerSlot: doc.createElement(),
    counter: doc.createElement(),
  };
});

afterEach(() => {
  mock.timers.reset();
  delete globalThis.speechSynthesis;
  delete globalThis.SpeechSynthesisUtterance;
  delete globalThis.AudioContext;
});

function engine() {
  return createSmashEngine({
    ...parts,
    getSettings: () => settings,
    onKey: (count) => keys.push(count),
    onStop: () => { stops += 1; },
    random: () => 0,
  });
}

test('nothing listens before Start, and Start adds one capture listener', () => {
  const toy = engine();
  assert.equal(doc.listeners.length, 0);
  assert.equal(doc.press({ key: 'a' }).defaultPrevented, false);
  toy.start();
  toy.start();
  assert.deepEqual(doc.listeners.map((entry) => [entry.type, entry.capture]), [['keydown', true]]);
  assert.equal(parts.counter.textContent, '0');
  assert.equal(FakeAudio.made.length, 1, 'the Start press makes the sound maker');
  assert.equal(FakeAudio.made[0].state, 'running');
  toy.destroy();
});

test('a key pops one placed emoji, counts and is swallowed; a held key pops nothing more', () => {
  const toy = engine();
  toy.start();
  const event = doc.press({ key: 'a' });
  assert.equal(event.defaultPrevented, true);
  assert.equal(parts.emojiLayer.children.length, 1);
  const node = parts.emojiLayer.children[0];
  assert.equal(node.textContent, BY_LETTER.a[0].e);
  assert.deepEqual(node.className.split(' '), ['smash-emoji', 'smash-spot-0', 'smash-tilt-0', 'smash-size-0']);
  assert.equal(parts.counter.textContent, '1');
  assert.deepEqual(keys, [1]);

  const held = doc.press({ key: 'a', repeat: true });
  assert.equal(held.defaultPrevented, true, 'a held key still fires no shortcut');
  assert.equal(parts.emojiLayer.children.length, 1);
  assert.deepEqual(keys, [1]);

  doc.press({ key: 'Enter' });
  assert.equal(parts.emojiLayer.children[1].textContent, ALL[0].e);
  assert.equal(parts.counter.textContent, '2');
  toy.destroy();
});

test('a key on a corner button passes through untouched, and Esc there still stops play', () => {
  const toy = engine();
  toy.start();
  const control = doc.createElement();
  control.setAttribute('data-smash-control', 'sound');
  const inside = doc.createElement();
  control.appendChild(inside);
  for (const target of [control, inside]) {
    const event = doc.press({ key: ' ', target });
    assert.equal(event.defaultPrevented, false);
  }
  assert.equal(parts.emojiLayer.children.length, 0);
  assert.deepEqual(keys, []);
  const escape = doc.press({ key: 'Escape', target: inside });
  assert.equal(escape.defaultPrevented, true);
  assert.equal(toy.isPlaying(), false, 'Esc stops play even on a control');
  toy.destroy();
});

test('a key on the left-focused language picker gives its focus back and plays', () => {
  const toy = engine();
  toy.start();
  const picker = doc.createElement();
  picker.setAttribute('data-smash-control', 'language');
  const event = doc.press({ key: 'b', target: picker });
  assert.equal(event.defaultPrevented, true, 'the picker never gets the key');
  assert.equal(picker.blurred, 1);
  assert.equal(parts.emojiLayer.children.length, 1, 'the key popped an emoji');
  assert.deepEqual(keys, [1]);
  toy.destroy();
});

test('at most 24 emoji are on screen, the oldest goes first, and each goes after five seconds', () => {
  const toy = engine();
  toy.start();
  for (let at = 0; at < MAX_EMOJI + 6; at += 1) doc.press({ key: 'b' });
  assert.equal(parts.emojiLayer.children.length, MAX_EMOJI);
  assert.equal(parts.counter.textContent, String(MAX_EMOJI + 6));
  mock.timers.tick(EMOJI_LIFETIME_MS - 1);
  assert.equal(parts.emojiLayer.children.length, MAX_EMOJI);
  mock.timers.tick(1);
  assert.equal(parts.emojiLayer.children.length, 0);
  toy.destroy();
});

test('with Say it on, one big emoji sits in the middle and its name is said', () => {
  settings = { soundOn: true, voiceOn: true, voiceTag: 'tr-TR' };
  const toy = engine();
  toy.start();
  voice.finish(); // the silent warm-up word that Start says
  doc.press({ key: 'a' });
  mock.timers.tick(WORD_WAIT_MS);
  doc.press({ key: 'c' });
  mock.timers.tick(WORD_WAIT_MS);
  doc.press({ key: 'd' });
  mock.timers.tick(WORD_WAIT_MS);
  assert.equal(parts.centerSlot.children.length, 1);
  assert.equal(parts.emojiLayer.children.length, 0);
  const node = parts.centerSlot.children[0];
  assert.equal(node.textContent, BY_LETTER.d[0].e);
  assert.ok(node.className.split(' ').includes('is-center'));
  const said = voice.spoken.at(-1);
  assert.equal(said.text, 'köpek');
  assert.equal(said.lang, 'tr-TR');
  assert.equal(said.pitch, 1.3);
  assert.equal(said.rate, 0.9);
  assert.equal(said.voice.name, 'Turkish reader');
  assert.equal(voice.cancels, 2, 'each word interrupts the one still being said');
  assert.equal(FakeAudio.made[0].tones, 0, 'no made-up sound while words are said');

  settings = { soundOn: false, voiceOn: true, voiceTag: 'fr-FR' };
  doc.press({ key: 'a' });
  mock.timers.tick(WORD_WAIT_MS);
  assert.equal(voice.spoken.at(-1).text, 'pomme');
  assert.equal(voice.spoken.at(-1).voice.name, 'French reader', 'the same language from another region');
  toy.destroy();
});

test('with Sound on and Say it off, each key makes a sound; with both off, none', () => {
  const toy = engine();
  toy.start();
  doc.press({ key: 'x' });
  assert.equal(FakeAudio.made[0].tones, 0);
  settings = { soundOn: true, voiceOn: false, voiceTag: 'en-US' };
  doc.press({ key: 'x' });
  doc.press({ key: 'y' });
  assert.equal(FakeAudio.made[0].tones, 2);
  toy.destroy();
});

test('a burst of keys with Say it on says at most one word in each wait, ending on its last key, and every word after it is said', () => {
  settings = { soundOn: false, voiceOn: true, voiceTag: 'en-US' };
  const toy = engine();
  toy.start();
  voice.finish(); // the silent warm-up word that Start says
  const before = voice.spoken.length;
  // A child's burst: 200 keys, 15 ms apart, with no word ending on its own.
  let saidEarly;
  for (let i = 0; i < 200; i += 1) {
    doc.press({ key: 'abcdefgh'[i % 8] });
    mock.timers.tick(15);
    if (i === 9) saidEarly = voice.spoken.length - before;
  }
  assert.ok(saidEarly >= 1, 'words are said while the burst goes on, not only once it ends');
  mock.timers.tick(WORD_WAIT_MS);
  const duringBurst = voice.spoken.length - before;
  assert.ok(duringBurst >= 1 && duringBurst <= Math.ceil((200 * 15) / WORD_WAIT_MS) + 1,
    `at most one word in each wait, not one on every key (${duringBurst} words)`);
  assert.ok(voice.cancels < duringBurst, 'the voice is stopped only when a word is still being said');
  assert.equal(voice.spoken.at(-1).text, 'hamster', "the burst's last key (h) is the word said");
  assert.equal(parts.counter.textContent, '200', 'every key still counts and pops');
  // After the burst, slow keys each say their word.
  for (const key of ['a', 'b', 'c']) {
    voice.finish();
    const said = voice.spoken.length;
    doc.press({ key });
    mock.timers.tick(WORD_WAIT_MS);
    assert.equal(voice.spoken.length, said + 1, `the word for ${key} is said`);
  }
  toy.destroy();
});

test('keys 90 ms apart each say their word; keys closer than that share one', () => {
  settings = { soundOn: false, voiceOn: true, voiceTag: 'en-US' };
  const saidFor = (gapMs) => {
    const toy = engine();
    toy.start();
    voice.finish(); // the silent warm-up word that Start says
    const before = voice.spoken.length;
    for (let i = 0; i < 20; i += 1) {
      doc.press({ key: 'abcdefgh'[i % 8] });
      mock.timers.tick(gapMs);
    }
    mock.timers.tick(WORD_WAIT_MS);
    toy.destroy();
    return voice.spoken.length - before;
  };
  assert.equal(saidFor(WORD_WAIT_MS + 1), 20);
  assert.equal(saidFor(WORD_WAIT_MS), 20);
  assert.ok(saidFor(WORD_WAIT_MS - 1) < 20, 'a key inside the wait only changes the word to come');
});

test('a word still waiting when play stops is never said', () => {
  settings = { soundOn: false, voiceOn: true, voiceTag: 'en-US' };
  const toy = engine();
  toy.start();
  const before = voice.spoken.length;
  doc.press({ key: 'a' });
  doc.press({ key: 'Escape' });
  mock.timers.tick(WORD_WAIT_MS);
  assert.equal(voice.spoken.length, before);
  toy.destroy();
});

test('at most 12 made-up sounds play at once, and a finished sound makes room for the next', () => {
  settings = { soundOn: true, voiceOn: false, voiceTag: 'en-US' };
  const toy = engine();
  toy.start();
  for (let i = 0; i < 20; i += 1) doc.press({ key: 'x' });
  const sounds = FakeAudio.made[0];
  assert.equal(sounds.tones, 12, 'a burst never piles up more than 12 sounds');
  assert.equal(parts.counter.textContent, '20', 'every key still counts');
  sounds.endOne();
  sounds.endOne();
  doc.press({ key: 'y' });
  doc.press({ key: 'y' });
  doc.press({ key: 'y' });
  assert.equal(sounds.tones, 14, 'two sounds ended, so two more play');
  toy.stop();
  toy.start();
  doc.press({ key: 'z' });
  assert.equal(sounds.tones, 15, 'a new run starts with room for every sound');
  toy.destroy();
});

test('Esc stops play and clears every emoji, listener and word', () => {
  const toy = engine();
  toy.start();
  doc.press({ key: 'a' });
  doc.press({ key: 'b' });
  const cancelsBefore = voice.cancels;
  const escape = doc.press({ key: 'Escape' });
  assert.equal(escape.defaultPrevented, true);
  assert.equal(toy.isPlaying(), false);
  assert.equal(stops, 1);
  assert.equal(doc.listeners.length, 0);
  assert.equal(parts.emojiLayer.children.length, 0);
  assert.ok(voice.cancels > cancelsBefore);
  assert.equal(doc.press({ key: 'a' }).defaultPrevented, false, 'keys are free again');
  mock.timers.tick(EMOJI_LIFETIME_MS);
  toy.start();
  assert.equal(parts.counter.textContent, '0', 'a new run starts at zero');
  toy.destroy();
});

test('destroy lets go of the voice list and closes the sound maker', () => {
  const toy = engine();
  assert.equal(voice.listeners.size, 1);
  toy.start();
  toy.destroy();
  assert.equal(voice.listeners.size, 0);
  assert.equal(FakeAudio.made[0].state, 'closed');
  assert.equal(doc.listeners.length, 0);
});

test('without speech or sound on this computer, the toy still plays', () => {
  delete globalThis.speechSynthesis;
  delete globalThis.SpeechSynthesisUtterance;
  delete globalThis.AudioContext;
  settings = { soundOn: true, voiceOn: true, voiceTag: 'en-US' };
  const toy = engine();
  toy.start();
  doc.press({ key: 'a' });
  settings = { soundOn: true, voiceOn: false, voiceTag: 'en-US' };
  doc.press({ key: 'b' });
  assert.equal(parts.counter.textContent, '2');
  toy.destroy();
});
