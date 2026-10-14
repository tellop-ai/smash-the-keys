/**
 * The toy's rules, checked by calling the real code.
 *
 * - The emoji picker, the spoken words and the language choice.
 * - The bounds on what a save may carry, at every edge and one step past it.
 * - The saved record, against a throwaway store: `APP_DATA_FILE` points at a
 *   fresh temporary folder, removed afterwards, exactly as `tests/data.test.mjs`
 *   does, so no check ever touches the store a person is using.
 * - The two addresses, called with real requests.
 *
 * Nothing here reaches the network.
 */

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { after, test } from 'node:test';

const projectRoot = path.join(import.meta.dirname, '..');
const scratch = mkdtempSync(path.join(os.tmpdir(), 'smash-checks-'));
const startedIn = process.cwd();
process.chdir(projectRoot);
process.env.APP_DATA_FILE = path.join(scratch, 'app.db');

const { ALL, BY_LETTER, NAME_I18N, VOICE_LANGUAGES, VOICE_TAGS, pickForKey, spokenName, voiceTagFor } = await import('../lib/smash/emoji.js');
const { KEYS_CAP, MAX_ADDED, MAX_RUN, REFUSED, checkRun, checkSettings } = await import('../lib/smash/limits.js');
const { currentOwner } = await import('../lib/smash/owner.js');
const { MAX_BODY_BYTES } = await import('../lib/smash/request.js');
const { DataError, closeStorage, modelAction } = await import('../lib/data/index.js');
const { PLAYROOM_DEFAULTS, addRunFor, readPlayroomFor, saveSettingsFor } = await import('../lib/data/playroom.js');
const settingsRoute = await import('../app/api/playroom/settings/route.js');
const runRoute = await import('../app/api/playroom/run/route.js');
const { MESSAGES } = await import('../lib/i18n/index.js');

after(async () => {
  await closeStorage();
  process.chdir(startedIn);
  rmSync(scratch, { recursive: true, force: true });
});

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const JUST_BELOW_ONE = 1 - Number.EPSILON;

/** @param {string} key */
function refusedWith(key) {
  return (error) => error instanceof DataError && error.messageKey === key;
}

/* ---------- the picker ---------- */

test('each letter picks from its own group, at both ends of the roll and in either case', () => {
  assert.deepEqual(Object.keys(BY_LETTER), LETTERS);
  for (const letter of LETTERS) {
    const group = BY_LETTER[letter];
    assert.ok(group.length >= 3, `${letter} has too few emoji`);
    assert.equal(pickForKey(letter, () => 0), group[0], letter);
    assert.equal(pickForKey(letter, () => JUST_BELOW_ONE), group[group.length - 1], letter);
    assert.equal(pickForKey(letter.toUpperCase(), () => 0), group[0], letter.toUpperCase());
    assert.equal(pickForKey(letter.toUpperCase(), () => JUST_BELOW_ONE), group[group.length - 1], letter.toUpperCase());
  }
});

test('every other key picks from the general group', () => {
  for (const key of ['Enter', ' ', '1', '', 'ArrowUp', '?', 'é', 'ab', undefined, 7]) {
    assert.equal(pickForKey(key, () => 0), ALL[0], String(key));
    assert.equal(pickForKey(key, () => JUST_BELOW_ONE), ALL[ALL.length - 1], String(key));
  }
});

test('a roll outside zero to one still lands inside the group', () => {
  assert.equal(pickForKey('a', () => 1), BY_LETTER.a[BY_LETTER.a.length - 1]);
  assert.equal(pickForKey('a', () => -0.5), BY_LETTER.a[0]);
  assert.equal(pickForKey('a', () => Number.NaN), BY_LETTER.a[0]);
});

/* ---------- the spoken words ---------- */

test('a name is said in the chosen language, and in English where no word exists', () => {
  assert.equal(spokenName('cat', 'tr-TR'), 'kedi');
  assert.equal(spokenName('cat', 'tr'), 'kedi');
  assert.equal(spokenName('cat', 'de-DE'), 'katze');
  assert.equal(spokenName('cat', 'en-US'), 'cat');
  assert.equal(spokenName('cat', 'ja-JP'), 'cat', 'a language the toy does not translate');
  assert.equal(spokenName('zzz', 'tr-TR'), 'zzz', 'a word left out on purpose');
  assert.equal(spokenName('spaceship', 'fr-FR'), 'spaceship', 'a word with no row');
  assert.equal(spokenName('constructor', 'tr-TR'), 'constructor', 'an inherited name is not a row');
  assert.equal(spokenName('', 'tr-TR'), '');
});

test('the spoken language follows the saved choice, then the app language', () => {
  assert.equal(voiceTagFor('fr-FR', 'en'), 'fr-FR');
  assert.equal(voiceTagFor('it-IT', 'tr'), 'it-IT');
  assert.equal(voiceTagFor('', 'tr'), 'tr-TR');
  assert.equal(voiceTagFor('', 'en'), 'en-US');
  assert.equal(voiceTagFor('xx-YY', 'tr'), 'tr-TR');
  assert.equal(voiceTagFor('tr', 'en'), 'en-US', 'only a full tag from the list counts');
  assert.equal(voiceTagFor(undefined, 'de'), 'en-US');
});

test('the six languages are fixed, and each has its own name in both locale files', () => {
  assert.equal(Object.isFrozen(VOICE_LANGUAGES), true);
  assert.deepEqual(VOICE_TAGS, ['en-US', 'tr-TR', 'es-ES', 'fr-FR', 'de-DE', 'it-IT']);
  for (const language of VOICE_LANGUAGES) {
    assert.equal(Object.isFrozen(language), true);
    assert.ok(MESSAGES.en[language.wordsKey], language.wordsKey);
    assert.equal(MESSAGES.tr[language.wordsKey], MESSAGES.en[language.wordsKey], 'a language keeps its own name in both files');
  }
});

/* ---------- the emoji lists ---------- */

test('no picture appears twice inside one group, and the lists cannot be changed', () => {
  for (const [letter, group] of Object.entries(BY_LETTER)) {
    const glyphs = group.map((entry) => entry.e);
    assert.equal(new Set(glyphs).size, glyphs.length, `group ${letter} repeats a picture`);
    assert.equal(Object.isFrozen(group), true);
    for (const entry of group) assert.equal(Object.isFrozen(entry), true);
  }
  const general = ALL.map((entry) => entry.e);
  assert.equal(new Set(general).size, general.length, 'the general group repeats a picture');
  assert.equal(Object.isFrozen(ALL), true);
  assert.equal(Object.isFrozen(BY_LETTER), true);
  assert.throws(() => { BY_LETTER.a.push({ e: '🍎', name: 'apple' }); }, TypeError);
});

test('every picture is from the toddler-safe set', () => {
  const unsafe = ['🐊', '🐍', '🐺', '🦖', '🍄', '⚡', '🦈', '🕷️', '🦂', '🔪', '🗡️', '💣', '🔫', '💉', '💊', '🩸', '💀', '☠️', '👻', '🧟', '🍺', '🍷', '🍸', '🚬', '🔥', '🩻', '🚑'];
  const every = [...Object.values(BY_LETTER).flat(), ...ALL];
  for (const entry of every) {
    assert.equal(unsafe.includes(entry.e), false, `${entry.name} is not toddler-safe`);
    assert.match(entry.name, /^[a-z][a-z -]*$/u, entry.name);
  }
});

test('every name is said in all six languages, except the one left out on purpose', () => {
  const names = new Set([...Object.values(BY_LETTER).flat(), ...ALL].map((entry) => entry.name));
  for (const name of names) {
    if (name === 'zzz') continue;
    const row = NAME_I18N[name];
    assert.ok(row, `${name} has no words`);
    for (const code of ['tr', 'es', 'fr', 'de', 'it']) assert.ok(row[code], `${name} has no ${code} word`);
  }
});

test('no spoken name and no screen word uses a word from the banned list', () => {
  const banned = ['table', 'column', 'migration', 'sql', 'schema', 'constraint', 'index', 'transaction', 'rollback', 'branch', 'commit', 'merge',
    'tablo', 'sütun', 'dal', 'şema', 'dizin', 'işlem', 'birleştir', 'birleştirme'];
  const said = [...Object.keys(NAME_I18N), ...Object.values(NAME_I18N).flatMap((row) => Object.values(row))];
  const screen = Object.entries(MESSAGES.en).concat(Object.entries(MESSAGES.tr))
    .filter(([key]) => key.startsWith('smash.') || key === 'app.title')
    .map(([, words]) => words);
  for (const text of [...said, ...screen]) {
    const words = text.toLocaleLowerCase('tr-TR').split(/[^\p{L}]+/u);
    for (const word of words) assert.equal(banned.includes(word), false, `"${word}" in "${text}"`);
  }
});

/* ---------- the bounds ---------- */

test('settings take two yes-or-no values and one of the six languages, or none', () => {
  assert.deepEqual(checkSettings({ soundOn: true, voiceOn: false, voiceLanguage: '' }), { soundOn: true, voiceOn: false, voiceLanguage: '' });
  for (const tag of VOICE_TAGS) assert.equal(checkSettings({ soundOn: false, voiceOn: true, voiceLanguage: tag }).voiceLanguage, tag);
  const refused = [
    undefined, null, [], 'soundOn', 1,
    { soundOn: true, voiceOn: false },
    { soundOn: true, voiceLanguage: '' },
    { soundOn: true, voiceOn: false, voiceLanguage: '', owner: 'someone' },
    { soundOn: 'true', voiceOn: false, voiceLanguage: '' },
    { soundOn: 1, voiceOn: false, voiceLanguage: '' },
    { soundOn: true, voiceOn: null, voiceLanguage: '' },
    { soundOn: { on: true }, voiceOn: false, voiceLanguage: '' },
    { soundOn: true, voiceOn: false, voiceLanguage: 'tr' },
    { soundOn: true, voiceOn: false, voiceLanguage: 'tr-tr' },
    { soundOn: true, voiceOn: false, voiceLanguage: 'ja-JP' },
    { soundOn: true, voiceOn: false, voiceLanguage: 5 },
    { soundOn: true, voiceOn: false, voiceLanguage: ['en-US'] },
  ];
  for (const input of refused) assert.throws(() => checkSettings(input), refusedWith(REFUSED), JSON.stringify(input));
});

test('a save of play is bounded at every edge', () => {
  assert.equal(MAX_ADDED, 5000);
  assert.equal(MAX_RUN, 10_000_000);
  assert.deepEqual(checkRun({ added: 1, run: 1 }), { added: 1, run: 1 });
  assert.deepEqual(checkRun({ added: 5000, run: 5000 }), { added: 5000, run: 5000 });
  assert.deepEqual(checkRun({ added: 7, run: 7 }), { added: 7, run: 7 }, 'a run equal to what it adds');
  assert.deepEqual(checkRun({ added: 1, run: 10_000_000 }), { added: 1, run: 10_000_000 });
  const refused = [
    { added: 0, run: 1 },
    { added: 5001, run: 6000 },
    { added: -1, run: 1 },
    { added: 5, run: 4 },
    { added: 1, run: 10_000_001 },
    { added: 1, run: 0 },
    { added: 1.5, run: 2 },
    { added: 1, run: 2.5 },
    { added: '5', run: 5 },
    { added: 5, run: '5' },
    { added: Number.NaN, run: 5 },
    { added: 1, run: Number.POSITIVE_INFINITY },
    { added: 5 },
    { run: 5 },
    { added: 1, run: 1, extra: true },
    { added: { value: 1 }, run: 1 },
    [1, 1], null, undefined, 'run',
  ];
  for (const input of refused) assert.throws(() => checkRun(input), refusedWith(REFUSED), JSON.stringify(input));
});

/* ---------- the saved record ---------- */

test('with nothing saved, a read answers the defaults and creates nothing', async () => {
  const owner = 'reader-owner';
  assert.deepEqual(await readPlayroomFor(owner), { ...PLAYROOM_DEFAULTS });
  assert.equal(await modelAction('Playroom', 'findUnique', { where: { ownerId: owner } }), null);
  await assert.rejects(() => readPlayroomFor('   '), refusedWith('error.ownerMissing'));
});

test('two runs add up, the higher best stays, and a longer run raises it', async () => {
  const owner = 'runs-owner';
  const first = await addRunFor(owner, { added: 30, run: 30 });
  assert.equal(first.keysSmashed, 30);
  assert.equal(first.bestRun, 30);
  const smaller = await addRunFor(owner, { added: 12, run: 12 });
  assert.equal(smaller.keysSmashed, 42);
  assert.equal(smaller.bestRun, 30, 'a smaller later run keeps the best');
  const longer = await addRunFor(owner, { added: 5, run: 31 });
  assert.equal(longer.keysSmashed, 47);
  assert.equal(longer.bestRun, 31);
  assert.deepEqual(await readPlayroomFor(owner), { ...PLAYROOM_DEFAULTS, keysSmashed: 47, bestRun: 31 });
  assert.equal(Object.getPrototypeOf(longer), Object.prototype, 'the answer is a plain object');
});

test('a refused save of play saves nothing', async () => {
  const owner = 'refused-owner';
  await assert.rejects(() => addRunFor(owner, { added: 0, run: 1 }), refusedWith(REFUSED));
  await assert.rejects(() => addRunFor(owner, { added: 6, run: 5 }), refusedWith(REFUSED));
  await assert.rejects(() => addRunFor('', { added: 1, run: 1 }), refusedWith('error.ownerMissing'));
  assert.equal(await modelAction('Playroom', 'findUnique', { where: { ownerId: owner } }), null);
});

test('settings round-trip and leave the counts alone', async () => {
  const owner = 'settings-owner';
  const fresh = await saveSettingsFor(owner, { soundOn: true, voiceOn: true, voiceLanguage: 'de-DE' });
  assert.deepEqual(fresh, { soundOn: true, voiceOn: true, voiceLanguage: 'de-DE', keysSmashed: 0, bestRun: 0 });
  await addRunFor(owner, { added: 9, run: 9 });
  const changed = await saveSettingsFor(owner, { soundOn: false, voiceOn: true, voiceLanguage: '' });
  assert.deepEqual(changed, { soundOn: false, voiceOn: true, voiceLanguage: '', keysSmashed: 9, bestRun: 9 });
  assert.deepEqual(await readPlayroomFor(owner), changed);
  await assert.rejects(() => saveSettingsFor(owner, { soundOn: 'yes', voiceOn: true, voiceLanguage: '' }), refusedWith(REFUSED));
  assert.deepEqual(await readPlayroomFor(owner), changed, 'a refused setting changes nothing');
});

test('the saved total never grows past the largest whole number the store keeps', async () => {
  assert.equal(KEYS_CAP, 2147483647);
  const owner = 'cap-owner';
  await modelAction('Playroom', 'upsert', {
    where: { ownerId: owner },
    create: { ownerId: owner, keysSmashed: KEYS_CAP - 3, bestRun: 4 },
    update: { keysSmashed: KEYS_CAP - 3, bestRun: 4 },
  });
  await assert.rejects(() => addRunFor(owner, { added: 4, run: 4 }), refusedWith(REFUSED), 'one past the cap');
  assert.equal((await readPlayroomFor(owner)).keysSmashed, KEYS_CAP - 3);
  // A refused save changes nothing, a longer best run included.
  await assert.rejects(() => addRunFor(owner, { added: 4, run: 900 }), refusedWith(REFUSED), 'one past the cap, longer run');
  assert.deepEqual(
    { keysSmashed: (await readPlayroomFor(owner)).keysSmashed, bestRun: (await readPlayroomFor(owner)).bestRun },
    { keysSmashed: KEYS_CAP - 3, bestRun: 4 },
  );
  const full = await addRunFor(owner, { added: 3, run: 5 });
  assert.equal(full.keysSmashed, KEYS_CAP, 'exactly on the cap');
  assert.equal(full.bestRun, 5, 'a save on the cap still raises the best run');
  await assert.rejects(() => addRunFor(owner, { added: 1, run: 800 }), refusedWith(REFUSED), 'at the cap');
  assert.deepEqual(
    { keysSmashed: (await readPlayroomFor(owner)).keysSmashed, bestRun: (await readPlayroomFor(owner)).bestRun },
    { keysSmashed: KEYS_CAP, bestRun: 5 },
  );
});

/* ---------- the two addresses ---------- */

/**
 * @param {string} address
 * @param {BodyInit} body
 * @param {Record<string, string>} [headers]
 */
function request(address, body, headers = {}) {
  return new Request(`http://localhost${address}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
    ...(body instanceof ReadableStream ? { duplex: 'half' } : {}),
  });
}

/** @param {Response} response */
function assertPrivate(response) {
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
}

test('the addresses answer POST only and choose the owner themselves', () => {
  assert.equal(currentOwner(), 'local-owner');
  for (const route of [settingsRoute, runRoute]) {
    assert.equal(typeof route.POST, 'function');
    assert.equal(route.GET, undefined);
    assert.equal(route.PUT, undefined);
    assert.equal(route.DELETE, undefined);
    const preflight = route.OPTIONS();
    assert.equal(preflight.status, 405);
    assert.equal(preflight.headers.get('access-control-allow-origin'), null);
  }
});

test('only a JSON request is read: a plain-text one from another page is refused', async () => {
  const body = JSON.stringify({ added: 1, run: 1 });
  for (const type of ['text/plain', 'text/plain;charset=UTF-8', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x', '']) {
    const response = await runRoute.POST(request('/api/playroom/run', body, { 'content-type': type }));
    assert.equal(response.status, 400, type || 'no type');
    assert.deepEqual(await response.json(), { problem: REFUSED });
  }
  const before = (await readPlayroomFor('local-owner')).keysSmashed;
  const typed = await runRoute.POST(request('/api/playroom/run', body, { 'content-type': 'application/json; charset=utf-8' }));
  assert.equal(typed.status, 200, 'JSON with a character set is read');
  assert.equal((await typed.json()).playroom.keysSmashed, before + 1);
});

test('the settings address saves a good request and refuses a bad one', async () => {
  const good = await settingsRoute.POST(request('/api/playroom/settings', JSON.stringify({ soundOn: true, voiceOn: false, voiceLanguage: 'es-ES' })));
  assert.equal(good.status, 200);
  assertPrivate(good);
  const saved = (await good.json()).playroom;
  assert.equal(saved.soundOn, true);
  assert.equal(saved.voiceLanguage, 'es-ES');
  assert.deepEqual(await readPlayroomFor('local-owner'), saved);

  const bad = [
    'not json',
    '',
    'null',
    JSON.stringify({ soundOn: true, voiceOn: false, voiceLanguage: '', owner: 'someone-else' }),
    JSON.stringify({ soundOn: 'on', voiceOn: false, voiceLanguage: '' }),
  ];
  for (const body of bad) {
    const response = await settingsRoute.POST(request('/api/playroom/settings', body));
    assert.equal(response.status, 400, body);
    assertPrivate(response);
    assert.deepEqual(await response.json(), { problem: REFUSED }, body);
  }
  assert.deepEqual(await readPlayroomFor('local-owner'), saved, 'nothing refused was saved');
});

test('an oversized request is refused before it is read whole', async () => {
  const padded = `{"soundOn":false,"voiceOn":false,"voiceLanguage":""${' '.repeat(MAX_BODY_BYTES)}}`;
  assert.doesNotThrow(() => JSON.parse(padded), 'the padded request is otherwise good');
  const justFits = `{"soundOn":false,"voiceOn":true,"voiceLanguage":""}`.padEnd(MAX_BODY_BYTES - 1, ' ') + ' ';
  assert.equal(new TextEncoder().encode(justFits).byteLength, MAX_BODY_BYTES);

  const big = await settingsRoute.POST(request('/api/playroom/settings', padded));
  assert.equal(big.status, 400);
  assertPrivate(big);
  assert.deepEqual(await big.json(), { problem: REFUSED });

  const declared = await settingsRoute.POST(request('/api/playroom/settings', '{}', { 'content-length': String(MAX_BODY_BYTES + 1) }));
  assert.equal(declared.status, 400, 'a declared size over the limit');

  let pulled = 0;
  const endless = new ReadableStream({
    pull(controller) {
      pulled += 1;
      controller.enqueue(new TextEncoder().encode(' '.repeat(512)));
    },
  });
  const streamed = await runRoute.POST(request('/api/playroom/run', endless));
  assert.equal(streamed.status, 400, 'a request with no declared size that never ends');
  assert.ok(pulled < 20, `reading stopped early (${pulled} pieces)`);

  const exact = await settingsRoute.POST(request('/api/playroom/settings', justFits));
  assert.equal(exact.status, 200, 'a request exactly at the limit is read');
});

test('the run address adds a good request and refuses a bad one', async () => {
  const before = await readPlayroomFor('local-owner');
  const good = await runRoute.POST(request('/api/playroom/run', JSON.stringify({ added: 20, run: 20 })));
  assert.equal(good.status, 200);
  assertPrivate(good);
  const view = (await good.json()).playroom;
  assert.equal(view.keysSmashed, before.keysSmashed + 20);
  assert.equal(view.bestRun, Math.max(before.bestRun, 20));

  for (const body of ['{"added":0,"run":1}', '{"added":5001,"run":5001}', '{"added":3,"run":2}', '{"added":1.5,"run":2}', '[]', 'oops']) {
    const response = await runRoute.POST(request('/api/playroom/run', body));
    assert.equal(response.status, 400, body);
    assertPrivate(response);
    assert.deepEqual(await response.json(), { problem: REFUSED }, body);
  }
  assert.equal((await readPlayroomFor('local-owner')).keysSmashed, view.keysSmashed, 'nothing refused was counted');
});
