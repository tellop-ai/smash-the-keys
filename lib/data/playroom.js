/**
 * The toy's one saved record: three settings and two counts for one owner.
 *
 * Every read and write names its owner, and every write goes through
 * `modelAction` or `modelBatch` from `./index.js`, never the generated client.
 * A read never creates a row: no row means the defaults, and nothing is saved
 * until a person changes a setting or plays.
 *
 * Values are copied into plain objects before they leave this file, because the
 * records route used inside Tellop answers objects with no prototype.
 */

import { checkRun, checkSettings, KEYS_CAP, REFUSED } from '../smash/limits.js';
import { VOICE_TAGS } from '../smash/emoji.js';

import { DataError, modelAction, modelBatch } from './index.js';

/** What the toy shows when nothing is saved yet. */
export const PLAYROOM_DEFAULTS = Object.freeze({
  soundOn: false,
  voiceOn: false,
  voiceLanguage: '',
  keysSmashed: 0,
  bestRun: 0,
});

/**
 * @typedef {{ soundOn: boolean, voiceOn: boolean, voiceLanguage: string, keysSmashed: number, bestRun: number }} PlayroomView
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
function requireOwner(value) {
  if (typeof value !== 'string' || value.trim().length === 0) throw new DataError('error.ownerMissing');
  return value.trim();
}

/** @param {unknown} value */
function flag(value) {
  return value === true || value === 1;
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function count(value) {
  const number = typeof value === 'bigint' ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < 0 || number > KEYS_CAP) {
    throw new DataError('error.storageUnreadable');
  }
  return number;
}

/**
 * A saved row as a plain view. A spoken language the toy does not know reads as
 * "follow the app's language".
 *
 * @param {any} row
 * @returns {PlayroomView}
 */
function view(row) {
  if (row === null || row === undefined || typeof row !== 'object') throw new DataError('error.storageUnreadable');
  const language = typeof row.voiceLanguage === 'string' && VOICE_TAGS.includes(row.voiceLanguage) ? row.voiceLanguage : '';
  return {
    soundOn: flag(row.soundOn),
    voiceOn: flag(row.voiceOn),
    voiceLanguage: language,
    keysSmashed: count(row.keysSmashed),
    bestRun: count(row.bestRun),
  };
}

/**
 * Runs one records call and turns an unexpected failure into words a person can
 * read. A `DataError` passes through as it is.
 *
 * @template T
 * @param {() => Promise<T>} work
 * @param {string} failureKey
 * @returns {Promise<T>}
 */
async function guarded(work, failureKey) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof DataError) throw error;
    throw new DataError(failureKey);
  }
}

/**
 * The owner's settings and counts, or the defaults when nothing is saved.
 *
 * @param {unknown} ownerId
 * @returns {Promise<PlayroomView>}
 */
export async function readPlayroomFor(ownerId) {
  const owner = requireOwner(ownerId);
  const row = await guarded(
    () => modelAction('Playroom', 'findUnique', { where: { ownerId: owner } }),
    'error.storageUnreadable',
  );
  if (row === null || row === undefined) return { ...PLAYROOM_DEFAULTS };
  return view(row);
}

/**
 * Saves the three settings in one step and answers what was saved. A saved
 * value that differs from what was asked is an unconfirmed save.
 *
 * @param {unknown} ownerId
 * @param {unknown} settings
 * @returns {Promise<PlayroomView>}
 */
export async function saveSettingsFor(ownerId, settings) {
  const owner = requireOwner(ownerId);
  const wanted = checkSettings(settings);
  const row = await guarded(
    () => modelAction('Playroom', 'upsert', {
      where: { ownerId: owner },
      create: { ownerId: owner, ...wanted },
      update: { ...wanted },
    }),
    'error.saveFailed',
  );
  const saved = view(row);
  if (saved.soundOn !== wanted.soundOn || saved.voiceOn !== wanted.voiceOn || saved.voiceLanguage !== wanted.voiceLanguage) {
    throw new DataError('error.saveUnconfirmed');
  }
  return saved;
}

/**
 * Adds a few seconds of play to the saved total and raises the best run when
 * this run is longer, in one group of steps that is saved whole or not at all.
 *
 * The total never grows past the largest whole number the store keeps: when it
 * would, the total stays as it is and the save is refused.
 *
 * @param {unknown} ownerId
 * @param {unknown} run
 * @returns {Promise<PlayroomView>}
 */
export async function addRunFor(ownerId, run) {
  const owner = requireOwner(ownerId);
  const play = checkRun(run);
  const results = await guarded(
    () => modelBatch([
      { model: 'Playroom', action: 'upsert', args: { where: { ownerId: owner }, create: { ownerId: owner }, update: {} } },
      // The best run first, under the same limit as the total: a save the limit
      // refuses changes nothing, so the page's "not counted" line stays true.
      {
        model: 'Playroom',
        action: 'updateMany',
        args: {
          where: { ownerId: owner, bestRun: { lt: play.run }, keysSmashed: { lte: KEYS_CAP - play.added } },
          data: { bestRun: play.run },
        },
      },
      {
        model: 'Playroom',
        action: 'updateMany',
        args: { where: { ownerId: owner, keysSmashed: { lte: KEYS_CAP - play.added } }, data: { keysSmashed: { increment: play.added } } },
      },
      { model: 'Playroom', action: 'findUnique', args: { where: { ownerId: owner } } },
    ]),
    'error.saveFailed',
  );
  if (!Array.isArray(results) || results.length !== 4) throw new DataError('error.saveUnconfirmed');
  const saved = view(results[3]);
  const grew = Number(results[2]?.count);
  if (grew === 0) throw new DataError(REFUSED);
  if (grew !== 1 || saved.bestRun < play.run || saved.keysSmashed < play.added) throw new DataError('error.saveUnconfirmed');
  return saved;
}
