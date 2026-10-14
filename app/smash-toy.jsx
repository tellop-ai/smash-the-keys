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
import { MAX_ADDED, MAX_RUN } from '../lib/smash/limits.js';

/** Play is saved at most this often while keys arrive, and once more when play stops. */
const SAVE_EVERY_MS = 4000;

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
 * Sends one save and answers the saved view, or `null` when it was refused or
 * could not be confirmed. Never retried here.
 *
 * @param {string} address
 * @param {unknown} body
 */
async function post(address, body) {
  try {
    const response = await fetch(address, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !isView(payload?.playroom)) return null;
    return payload.playroom;
  } catch {
    return null;
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
 * @param {{
 *   locale: 'en' | 'tr',
 *   saved: { soundOn: boolean, voiceOn: boolean, voiceLanguage: string, keysSmashed: number, bestRun: number },
 *   noticeKey: string,
 * }} props
 */
export function SmashToy({ locale, saved, noticeKey }) {
  const [started, setStarted] = useState(false);
  const [soundOn, setSoundOn] = useState(saved.soundOn);
  const [voiceOn, setVoiceOn] = useState(saved.voiceOn);
  const [voiceChoice, setVoiceChoice] = useState(saved.voiceLanguage);
  const [counts, setCounts] = useState({ keysSmashed: saved.keysSmashed, bestRun: saved.bestRun });
  const [settingsProblem, setSettingsProblem] = useState('');
  const [runProblem, setRunProblem] = useState('');

  const voiceTag = voiceTagFor(voiceChoice, locale);

  const stageRef = useRef(null);
  const layerRef = useRef(null);
  const centerRef = useRef(null);
  const counterRef = useRef(null);
  const engineRef = useRef(null);
  const settingsRef = useRef({ soundOn, voiceOn, voiceTag });
  const playRef = useRef({ run: 0, pending: 0, lastSentAt: 0 });
  const queueRef = useRef(Promise.resolve());

  useEffect(() => {
    settingsRef.current = { soundOn, voiceOn, voiceTag };
  }, [soundOn, voiceOn, voiceTag]);

  /** Queues one save of the keys not yet sent. */
  const sendRun = useCallback(() => {
    const play = playRef.current;
    if (play.pending < 1) return;
    const added = Math.min(play.pending, MAX_ADDED);
    const run = Math.min(Math.max(play.run, added), MAX_RUN);
    play.pending -= added;
    play.lastSentAt = Date.now();
    queueRef.current = queueRef.current.then(async () => {
      const answer = await post('/api/playroom/run', { added, run });
      if (answer === null) {
        setRunProblem('smash.problem.runNotSaved');
        return;
      }
      setCounts({ keysSmashed: answer.keysSmashed, bestRun: answer.bestRun });
    });
  }, []);

  /** Back to the start screen, saving whatever play has not saved yet. */
  const finish = useCallback(() => {
    setStarted(false);
    const play = playRef.current;
    while (play.pending > 0) sendRun();
  }, [sendRun]);

  const onKey = useCallback((runCount) => {
    const play = playRef.current;
    play.run = runCount;
    play.pending += 1;
    if (Date.now() - play.lastSentAt >= SAVE_EVERY_MS) sendRun();
  }, [sendRun]);

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
    setSettingsProblem('');
    queueRef.current = queueRef.current.then(async () => {
      const answer = await post('/api/playroom/settings', next);
      if (answer === null || answer.soundOn !== next.soundOn || answer.voiceOn !== next.voiceOn || answer.voiceLanguage !== next.voiceLanguage) {
        setSettingsProblem('smash.problem.settingsNotSaved');
        return;
      }
      setCounts({ keysSmashed: answer.keysSmashed, bestRun: answer.bestRun });
    });
  }

  /** @param {{ currentTarget?: { blur?: () => void } }} event */
  function begin(event) {
    const engine = engineRef.current;
    if (engine === null) return;
    playRef.current = { run: 0, pending: 0, lastSentAt: Date.now() };
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
  const startLines = [noticeKey, runProblem, settingsProblem].filter((key) => typeof key === 'string' && key.length > 0);

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
            {startLines.map((key) => (
              <p key={key} className="smash-problem" role="status">{t(key, locale)}</p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
