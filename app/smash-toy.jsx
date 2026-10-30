'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Languages, Speech, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Toggle } from '@/components/ui/toggle';

import { formatDecimal } from '../lib/format.js';
import { t } from '../lib/i18n/index.js';
import { VOICE_LANGUAGES, VOICE_TAGS, voiceTagFor } from '../lib/smash/emoji.js';
import { createSmashEngine } from '../lib/smash/engine.js';
import { createPlaySaves, runProblemFor, settingsProblemFor } from '../lib/smash/saves.js';

/**
 * Whether an answer from the toy's addresses is a saved view.
 *
 * @param {any} value
 */
function isView(value) {
  const whole = (number) => Number.isSafeInteger(number) && number >= 0;
  return Boolean(value)
    && typeof value.soundOn === 'boolean'
    && typeof value.voiceOn === 'boolean'
    && typeof value.voiceLanguage === 'string'
    && whole(value.keysSmashed)
    && whole(value.bestRun);
}

/**
 * Sends one save and answers `{ playroom }`, the saved view, or `{ problem }`:
 * the refusal's message key, or `''` when there is none or the save could not
 * be confirmed. `runProblemFor` and `settingsProblemFor` choose the words.
 * Never retried here.
 *
 * @param {string} address
 * @param {unknown} body
 * @returns {Promise<{ playroom: any } | { problem: string }>}
 */
async function post(address, body) {
  try {
    const response = await fetch(address, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok && isView(payload?.playroom)) return { playroom: payload.playroom };
    return { problem: typeof payload?.problem === 'string' ? payload.problem : '' };
  } catch {
    return { problem: '' };
  }
}

/** Takes keyboard focus off a corner control, so the next keys pop emoji again. */
function blurControl() {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.closest('[data-smash-control]')) active.blur();
}

/**
 * The toy: the start screen, the play screen and the corner controls.
 *
 * React owns what the screens show (whether play has started, the settings, the
 * saved counts, a short problem line). The engine in `lib/smash/engine.js` owns
 * everything that changes on each key: the key trap, the emoji, the sounds and the
 * spoken words. The emoji layers and the counter number are left empty here so
 * React never touches what the engine writes into them.
 *
 * Saving happens only when a person does something: a setting saves when it is
 * changed, and play saves at most every few seconds while keys arrive and once
 * when play stops. A refused save shows a short line and is not tried again.
 * Saves go out one after another, so their answers arrive in order.
 *
 * `canSave` comes from the page, which asks the host who is playing
 * (`lib/smash/roles.js`). What is sent, and when, is `lib/smash/saves.js`:
 * without `canSave` the toy plays exactly the same, the settings switch for
 * this visit only, and nothing is sent: no key is counted and no setting is
 * saved, and the start screen says so. A host that refuses a save with
 * `error.cannotChange` stops the saves for the rest of the visit.
 *
 * @param {{
 *   locale: 'en' | 'tr',
 *   saved: { soundOn: boolean, voiceOn: boolean, voiceLanguage: string, keysSmashed: number, bestRun: number },
 *   noticeKey: string,
 *   canSave: boolean,
 * }} props
 */
export function SmashToy({ locale, saved, noticeKey, canSave }) {
  const [started, setStarted] = useState(false);
  const [soundOn, setSoundOn] = useState(saved.soundOn);
  const [voiceOn, setVoiceOn] = useState(saved.voiceOn);
  const [voiceChoice, setVoiceChoice] = useState(saved.voiceLanguage);
  const [counts, setCounts] = useState({ keysSmashed: saved.keysSmashed, bestRun: saved.bestRun });
  const [settingsProblem, setSettingsProblem] = useState('');
  const [runProblem, setRunProblem] = useState('');
  const [savesStopped, setSavesStopped] = useState(false);

  const voiceTag = voiceTagFor(voiceChoice, locale);

  const stageRef = useRef(null);
  const layerRef = useRef(null);
  const centerRef = useRef(null);
  const counterRef = useRef(null);
  const engineRef = useRef(null);
  const settingsRef = useRef({ soundOn, voiceOn, voiceTag });
  const queueRef = useRef(Promise.resolve());
  const savesRef = useRef(null);
  if (savesRef.current === null) savesRef.current = createPlaySaves({ canSave });

  /** The host refused this person a change: nothing more is sent this visit. */
  const stopSaves = useCallback(() => {
    savesRef.current.stop();
    setSavesStopped(true);
  }, []);

  useEffect(() => {
    settingsRef.current = { soundOn, voiceOn, voiceTag };
  }, [soundOn, voiceOn, voiceTag]);

  /** Queues one save of play. */
  const sendPlay = useCallback((save) => {
    queueRef.current = queueRef.current.then(async () => {
      // A refusal answered while this save waited stops it too.
      if (!savesRef.current.sending) return;
      const answer = await post('/api/playroom/run', save);
      if ('problem' in answer) {
        if (answer.problem === 'error.cannotChange') stopSaves();
        setRunProblem(runProblemFor(answer.problem));
        return;
      }
      setCounts({ keysSmashed: answer.playroom.keysSmashed, bestRun: answer.playroom.bestRun });
    });
  }, [stopSaves]);

  /** Back to the start screen, saving whatever play has not saved yet. */
  const finish = useCallback(() => {
    setStarted(false);
    for (const save of savesRef.current.finish()) sendPlay(save);
  }, [sendPlay]);

  const onKey = useCallback((runCount) => {
    const save = savesRef.current.key(runCount);
    if (save !== null) sendPlay(save);
  }, [sendPlay]);

  const handlersRef = useRef({ onKey, finish });
  useEffect(() => {
    handlersRef.current = { onKey, finish };
  }, [onKey, finish]);

  useEffect(() => {
    const engine = createSmashEngine({
      root: stageRef.current,
      emojiLayer: layerRef.current,
      centerSlot: centerRef.current,
      counter: counterRef.current,
      getSettings: () => settingsRef.current,
      onKey: (runCount) => handlersRef.current.onKey(runCount),
      onStop: () => handlersRef.current.finish(),
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  /** @param {{ soundOn: boolean, voiceOn: boolean, voiceLanguage: string }} next */
  function saveSettings(next) {
    if (!savesRef.current.setting()) return;
    setSettingsProblem('');
    queueRef.current = queueRef.current.then(async () => {
      if (!savesRef.current.sending) return;
      const answer = await post('/api/playroom/settings', next);
      if ('problem' in answer) {
        if (answer.problem === 'error.cannotChange') stopSaves();
        setSettingsProblem(settingsProblemFor(answer.problem));
        return;
      }
      const view = answer.playroom;
      if (view.soundOn !== next.soundOn || view.voiceOn !== next.voiceOn || view.voiceLanguage !== next.voiceLanguage) {
        setSettingsProblem('smash.problem.settingsNotSaved');
        return;
      }
      setCounts({ keysSmashed: view.keysSmashed, bestRun: view.bestRun });
    });
  }

  /** @param {{ currentTarget?: { blur?: () => void } }} event */
  function begin(event) {
    const engine = engineRef.current;
    if (engine === null) return;
    savesRef.current.begin();
    setRunProblem('');
    engine.start();
    setStarted(true);
    event?.currentTarget?.blur?.();
  }

  function stopPressed() {
    engineRef.current?.stop();
    finish();
  }

  /** @param {boolean} pressed */
  function changeSound(pressed) {
    setSoundOn(pressed);
    saveSettings({ soundOn: pressed, voiceOn, voiceLanguage: voiceChoice });
    blurControl();
  }

  /** @param {boolean} pressed */
  function changeVoice(pressed) {
    setVoiceOn(pressed);
    saveSettings({ soundOn, voiceOn: pressed, voiceLanguage: voiceChoice });
    blurControl();
  }

  /** @param {{ target: HTMLSelectElement }} event */
  function changeLanguage(event) {
    const tag = event.target.value;
    event.target.blur();
    if (!VOICE_TAGS.includes(tag)) return;
    setVoiceChoice(tag);
    saveSettings({ soundOn, voiceOn, voiceLanguage: tag });
  }

  const savedLine = t('smash.saved', locale, {
    keys: formatDecimal(String(counts.keysSmashed), locale),
    best: formatDecimal(String(counts.bestRun), locale),
  });
  const savesHere = canSave === true && !savesStopped;
  // Two refusals with the same words show them once.
  const startLines = [...new Set([noticeKey, runProblem, settingsProblem])].filter((key) => typeof key === 'string' && key.length > 0);

  return (
    <div ref={stageRef} className="smash-stage" data-started={started ? 'yes' : undefined}>
      <div ref={layerRef} className="smash-emoji-layer" aria-hidden="true" />
      <div ref={centerRef} className="smash-center" aria-hidden="true" />

      <div className="smash-topbar">
        <div className="smash-corner smash-corner-start">
          <Button data-smash-control="stop" size="lg" className="smash-control h-11 gap-2 px-4 text-base shadow-md" onClick={stopPressed}>
            <ArrowLeft aria-hidden="true" />
            {t('smash.stop', locale)}
          </Button>
        </div>

        <div className="smash-count" aria-hidden="true">
          <span ref={counterRef} className="smash-count-number" />
          <span className="smash-count-label">{t('smash.counterLabel', locale)}</span>
        </div>

        <div className="smash-corner smash-corner-end">
          <div className="smash-controls">
            <Toggle
              data-smash-control="sound"
              size="lg"
              className="smash-control h-11 gap-2 px-3 text-base aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              pressed={soundOn}
              onPressedChange={changeSound}
            >
              <Volume2 aria-hidden="true" />
              {t('smash.sound', locale)}
            </Toggle>
            <Toggle
              data-smash-control="voice"
              size="lg"
              className="smash-control h-11 gap-2 px-3 text-base aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              pressed={voiceOn}
              onPressedChange={changeVoice}
            >
              <Speech aria-hidden="true" />
              {t('smash.voice', locale)}
            </Toggle>
            <span className="smash-language">
              <Languages aria-hidden="true" className="smash-language-icon" />
              <NativeSelect
                data-smash-control="language"
                aria-label={t('smash.languageLabel', locale)}
                value={voiceTag}
                onChange={changeLanguage}
              >
                {VOICE_LANGUAGES.map((language) => (
                  <NativeSelectOption key={language.tag} value={language.tag}>
                    {t(language.wordsKey, locale)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </span>
          </div>
          {settingsProblem === '' ? null : (
            <p className="smash-play-problem" role="status">{t(settingsProblem, locale)}</p>
          )}
        </div>
      </div>

      {started ? null : (
        <Card className="smash-card">
          <CardHeader className="smash-card-header">
            <h1 className="smash-title">{t('app.title', locale)}</h1>
            <p className="smash-lead">{t('smash.lead', locale)}</p>
          </CardHeader>
          <CardContent className="smash-card-content">
            <Button size="lg" className="smash-start h-auto min-h-14 whitespace-normal rounded-3xl px-10 py-3 text-2xl shadow-md" onClick={begin}>
              {t('smash.start', locale)}
            </Button>
            <p className="smash-saved">{savedLine}</p>
            <p className="smash-note">{t('smash.stopNote', locale)}</p>
            {savesHere ? null : <p className="smash-note">{t('smash.notSavedHere', locale)}</p>}
            {startLines.map((key) => (
              <p key={key} className="smash-problem" role="status">{t(key, locale)}</p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
