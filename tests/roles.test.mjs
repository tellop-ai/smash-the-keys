/**
 * Who may save the toy's settings and counts, and the words for a save the
 * host refuses this person.
 *
 * - `canChange` (`lib/smash/roles.js`): the owner and a Helper save; a Member
 *   and a Viewer play without saving; anything else saves nothing.
 * - The page's question: the role comes from `currentPerson()`, whose answer is
 *   the host's, set here through a stand-in person door as Tellop sets it.
 * - The two addresses: a save the host refuses this person (`records-forbidden`)
 *   answers 403 with `error.cannotChange`, "You cannot change this.", never
 *   "could not save".
 *
 * Nothing here reaches the network or opens a store: every call goes to a
 * stand-in door.
 */

import assert from 'node:assert/strict';
import path from 'node:path';
import process from 'node:process';
import { afterEach, test } from 'node:test';

process.chdir(path.join(import.meta.dirname, '..'));

const { canChange } = await import('../lib/smash/roles.js');
const { currentPerson } = await import('../lib/data/person.js');
const settingsRoute = await import('../app/api/playroom/settings/route.js');
const runRoute = await import('../app/api/playroom/run/route.js');
const { t } = await import('../lib/i18n/index.js');

const PERSON = Symbol.for('tellop.person');
const ACTION = Symbol.for('tellop.internalRecordsAction');
const WRITE = Symbol.for('tellop.internalRecordsWrite');
const READ = Symbol.for('tellop.internalRecordsRead');
const priorFlag = process.env.TELLOP_INTERNAL_RECORDS;

afterEach(() => {
  for (const door of [PERSON, ACTION, WRITE, READ]) delete globalThis[door];
  if (priorFlag === undefined) delete process.env.TELLOP_INTERNAL_RECORDS;
  else process.env.TELLOP_INTERNAL_RECORDS = priorFlag;
});

test('the owner saves', () => {
  assert.equal(canChange('owner'), true);
});

test('a Helper saves', () => {
  assert.equal(canChange('helper'), true);
});

test('a Member plays without saving: the toy\'s one record is not one the Member added', () => {
  assert.equal(canChange('member'), false);
});

test('a Viewer plays without saving', () => {
  assert.equal(canChange('viewer'), false);
});

test('a role the toy does not know saves nothing', () => {
  for (const role of [undefined, null, '', 'Owner', 'HELPER', ' owner', 'admin', 1, true, {}, ['owner']]) {
    assert.equal(canChange(role), false, String(role));
  }
});

test('the role is the host\'s answer: outside Tellop the one person is the owner and saves', async () => {
  assert.equal(canChange((await currentPerson()).role), true);
});

test('online each role the host names saves only as the rule says', async () => {
  process.env.TELLOP_INTERNAL_RECORDS = '1';
  const people = [
    [{ id: 'owner', name: null, role: 'owner' }, true],
    [{ id: 'p_AAAAAAAAAAAAAAAAAAAAAA', name: 'Helper', role: 'helper' }, true],
    [{ id: 'p_BBBBBBBBBBBBBBBBBBBBBB', name: 'Member', role: 'member' }, false],
    [{ id: 'p_CCCCCCCCCCCCCCCCCCCCCC', name: null, role: 'viewer' }, false],
    // The owner looking as a Member or a Viewer saves nothing either.
    [{ id: 'owner', name: null, role: 'member', preview: true }, false],
    [{ id: 'owner', name: null, role: 'viewer', preview: true }, false],
  ];
  for (const [answer, saves] of people) {
    globalThis[PERSON] = async () => answer;
    assert.equal(canChange((await currentPerson()).role), saves, `${answer.role}${answer.preview ? ' (preview)' : ''}`);
  }
});

/**
 * @param {string} address
 * @param {unknown} body
 */
function request(address, body) {
  return new Request(`http://localhost${address}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('a save the host refuses this person answers 403 with "You cannot change this."', async () => {
  process.env.TELLOP_INTERNAL_RECORDS = '1';
  const forbidden = async () => { throw new Error('records-forbidden'); };
  globalThis[ACTION] = forbidden;
  globalThis[WRITE] = forbidden;
  globalThis[READ] = forbidden;
  const settings = await settingsRoute.POST(request('/api/playroom/settings', { soundOn: true, voiceOn: false, voiceLanguage: '' }));
  assert.equal(settings.status, 403);
  assert.deepEqual(await settings.json(), { problem: 'error.cannotChange' });
  const run = await runRoute.POST(request('/api/playroom/run', { added: 3, run: 3 }));
  assert.equal(run.status, 403);
  assert.deepEqual(await run.json(), { problem: 'error.cannotChange' });
  assert.equal(t('error.cannotChange', 'en'), 'You cannot change this.');
  assert.equal(t('error.cannotChange', 'tr'), 'Bunu değiştiremezsiniz.');
});

test('any other refusal the host names keeps its own words and status', async () => {
  process.env.TELLOP_INTERNAL_RECORDS = '1';
  globalThis[ACTION] = async () => { throw new Error('records-refused:nested-write'); };
  globalThis[WRITE] = globalThis[ACTION];
  const run = await runRoute.POST(request('/api/playroom/run', { added: 3, run: 3 }));
  assert.equal(run.status, 400);
  assert.deepEqual(await run.json(), { problem: 'error.saveRefused' });
});

test('the words for a person who plays without saving and for the way back are in both languages', () => {
  for (const key of ['smash.notSavedHere', 'smash.backToOwnView']) {
    for (const locale of ['en', 'tr']) {
      const words = t(key, locale);
      assert.equal(typeof words, 'string');
      assert.notEqual(words, key, `${key} (${locale})`);
      assert.ok(words.length > 0);
    }
  }
});
