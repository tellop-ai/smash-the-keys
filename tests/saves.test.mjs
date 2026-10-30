/**
 * What the toy sends to be saved, and when (`lib/smash/saves.js`), for each
 * role: the owner and a Helper send play and settings; a Member and a Viewer
 * play and switch settings with nothing sent. Also the timing of play saves at
 * its edges, the stop after the host refuses this person, and the words for a
 * save that did not land.
 *
 * Pure: a hand-moved clock, no page, no request.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MAX_ADDED } from '../lib/smash/limits.js';
import { canChange } from '../lib/smash/roles.js';
import { SAVE_EVERY_MS, createPlaySaves, runProblemFor, settingsProblemFor } from '../lib/smash/saves.js';

/** A clock the check moves by hand. */
function clock(start = 1_000_000) {
  let at = start;
  return { now: () => at, move: (ms) => { at += ms; } };
}

/**
 * Plays `keys` keys, one every `gap` ms, then stops; answers every save sent.
 *
 * @param {ReturnType<typeof createPlaySaves>} saves
 * @param {ReturnType<typeof clock>} time
 */
function play(saves, time, keys, gap) {
  const sent = [];
  saves.begin();
  for (let runCount = 1; runCount <= keys; runCount += 1) {
    time.move(gap);
    const save = saves.key(runCount);
    if (save !== null) sent.push(save);
  }
  sent.push(...saves.finish());
  return sent;
}

/** The keys a list of saves adds up to. */
const total = (sent) => sent.reduce((sum, save) => sum + save.added, 0);

for (const [role, sends] of [['owner', true], ['helper', true], ['member', false], ['viewer', false]]) {
  test(`${role}: ${sends ? 'play and settings are sent' : 'play and settings work, and nothing is sent'}`, () => {
    const time = clock();
    const saves = createPlaySaves({ canSave: canChange(role), now: time.now });
    assert.equal(saves.sending, sends);
    const sent = play(saves, time, 100, 100);
    if (sends) {
      assert.ok(sent.length >= 2, 'saved during play and at the stop');
      assert.equal(total(sent), 100, 'every key counted once');
      assert.equal(sent.at(-1).run, 100);
    } else {
      assert.deepEqual(sent, []);
    }
    assert.equal(saves.setting(), sends);
  });
}

test('a role the toy does not know sends nothing', () => {
  for (const role of [undefined, null, '', 'Owner', 'admin']) {
    const time = clock();
    const saves = createPlaySaves({ canSave: canChange(role), now: time.now });
    assert.deepEqual(play(saves, time, 50, 200), [], String(role));
    assert.equal(saves.setting(), false, String(role));
  }
});

test('only `true` sends: a value that merely looks yes sends nothing', () => {
  for (const canSave of [1, 'true', 'yes', {}, undefined]) {
    const time = clock();
    assert.deepEqual(play(createPlaySaves({ canSave, now: time.now }), time, 20, 500), [], String(canSave));
  }
});

test('play is sent once its few seconds have passed: at the edge, not one millisecond before', () => {
  for (const [wait, sentNow] of [[SAVE_EVERY_MS - 1, false], [SAVE_EVERY_MS, true], [SAVE_EVERY_MS + 1, true]]) {
    const time = clock();
    const saves = createPlaySaves({ canSave: true, now: time.now });
    saves.begin();
    time.move(wait);
    const save = saves.key(1);
    assert.equal(save !== null, sentNow, `${wait} ms after Start`);
    if (sentNow) assert.deepEqual(save, { added: 1, run: 1 });
  }
});

test('a long burst is sent at the stop in pieces of at most the largest save, in order', () => {
  const time = clock();
  const saves = createPlaySaves({ canSave: true, now: time.now });
  saves.begin();
  const keys = MAX_ADDED * 2 + 1;
  for (let runCount = 1; runCount <= keys; runCount += 1) assert.equal(saves.key(runCount), null);
  const sent = saves.finish();
  assert.deepEqual(sent.map((save) => save.added), [MAX_ADDED, MAX_ADDED, 1]);
  for (const save of sent) assert.ok(save.run >= save.added && save.run === keys);
  assert.deepEqual(saves.finish(), [], 'nothing is sent twice');
});

test('after the host refuses this person, nothing more is sent this visit', () => {
  const time = clock();
  const saves = createPlaySaves({ canSave: true, now: time.now });
  saves.begin();
  for (let runCount = 1; runCount <= 10; runCount += 1) saves.key(runCount);
  saves.stop();
  assert.equal(saves.sending, false);
  assert.deepEqual(saves.finish(), [], 'keys waiting at the refusal are dropped');
  assert.deepEqual(play(saves, time, 100, 100), [], 'a later run sends nothing');
  assert.equal(saves.setting(), false);
});

test('a setting that was not saved keeps the toy\'s exact words, except "You cannot change this."', () => {
  assert.equal(settingsProblemFor('error.cannotChange'), 'error.cannotChange');
  for (const problem of ['error.saveRefused', 'error.saveFailed', 'error.saveUnconfirmed', 'smash.problem.refused', '']) {
    assert.equal(settingsProblemFor(problem), 'smash.problem.settingsNotSaved', problem || 'no problem key');
  }
});

test('play that was not saved shows the host\'s own refusals, and the toy\'s line for anything else', () => {
  assert.equal(runProblemFor('error.cannotChange'), 'error.cannotChange');
  assert.equal(runProblemFor('error.saveRefused'), 'error.saveRefused');
  for (const problem of ['error.saveFailed', 'error.saveUnconfirmed', 'smash.problem.refused', '']) {
    assert.equal(runProblemFor(problem), 'smash.problem.runNotSaved', problem || 'no problem key');
  }
});
