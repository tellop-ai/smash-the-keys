/**
 * The bounds on what the toy saves, checked before anything is saved.
 *
 * Each check refuses with a `DataError` whose `messageKey` names words in
 * `lib/i18n/locales/`, so an address answers a key and the page shows the words in
 * the reader's language. Anything that is not exactly the expected shape refuses:
 * a string where a number belongs, a fraction, a value below the floor, a missing
 * field, an extra field or a nested value.
 *
 * Pure: nothing here touches stored information.
 */

import { DataError } from '../data/refusal.js';

import { VOICE_TAGS } from './emoji.js';

/** The fewest keys one save adds. */
export const MIN_ADDED = 1;
/** The most keys one save adds (a few seconds of play is far below this). */
export const MAX_ADDED = 5000;
/** The shortest run a save reports. */
export const MIN_RUN = 1;
/** The longest run a save reports. */
export const MAX_RUN = 10_000_000;
/** The saved total never grows past this (the largest whole number the store keeps). */
export const KEYS_CAP = 2147483647;

/** The words for a request the toy does not accept. */
export const REFUSED = 'smash.problem.refused';

/**
 * @param {unknown} value
 * @param {readonly string[]} keys
 * @returns {value is Record<string, unknown>}
 */
function exactObject(value, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const own = Object.keys(value);
  return own.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

/**
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @returns {value is number}
 */
function wholeNumberIn(value, min, max) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}

/**
 * The three settings: Sound, Say it, and the spoken language (`''` follows the
 * app's language, or one of the six tags).
 *
 * @param {unknown} input
 * @returns {{ soundOn: boolean, voiceOn: boolean, voiceLanguage: string }}
 */
export function checkSettings(input) {
  if (!exactObject(input, ['soundOn', 'voiceOn', 'voiceLanguage'])) throw new DataError(REFUSED);
  const { soundOn, voiceOn, voiceLanguage } = input;
  if (typeof soundOn !== 'boolean' || typeof voiceOn !== 'boolean') throw new DataError(REFUSED);
  if (typeof voiceLanguage !== 'string' || (voiceLanguage !== '' && !VOICE_TAGS.includes(voiceLanguage))) {
    throw new DataError(REFUSED);
  }
  return { soundOn, voiceOn, voiceLanguage };
}

/**
 * One save of play: `added` keys since the last save, and `run`, the length of
 * the run so far, which is never shorter than what it adds.
 *
 * @param {unknown} input
 * @returns {{ added: number, run: number }}
 */
export function checkRun(input) {
  if (!exactObject(input, ['added', 'run'])) throw new DataError(REFUSED);
  const { added, run } = input;
  if (!wholeNumberIn(added, MIN_ADDED, MAX_ADDED)) throw new DataError(REFUSED);
  if (!wholeNumberIn(run, MIN_RUN, MAX_RUN) || run < added) throw new DataError(REFUSED);
  return { added, run };
}
