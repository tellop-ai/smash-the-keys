/**
 * What the toy sends to be saved, and when, decided without a page.
 *
 * The toy saves two things: play (the keys since the last save and the run so
 * far, sent at most every few seconds while keys arrive and once more when play
 * stops) and the three settings (sent when one is switched). Both change the
 * toy's one shared record, so only a person whose role may change it sends
 * anything (`canSave`, from `canChange` in `./roles.js`, asked on the server).
 * Everyone else plays the same toy: their keys are not counted and their
 * switches last for the visit, and nothing is sent.
 *
 * After the host refuses this person a change (`error.cannotChange`), `stop()`
 * ends sending for the rest of the visit.
 *
 * Pure: no page, no request and no clock of its own (`now` is handed in).
 */

import { MAX_ADDED, MAX_RUN } from './limits.js';

/** Play is saved at most this often while keys arrive, and once more when play stops. */
export const SAVE_EVERY_MS = 4000;

/**
 * @param {{ canSave: boolean, now?: () => number }} options
 */
export function createPlaySaves({ canSave, now = Date.now }) {
  let sending = canSave === true;
  let run = 0;
  let pending = 0;
  let lastSentAt = 0;

  /** The next save of play: at most `MAX_ADDED` keys, and a run never shorter than what it adds. */
  function take() {
    const added = Math.min(pending, MAX_ADDED);
    pending -= added;
    lastSentAt = now();
    return { added, run: Math.min(Math.max(run, added), MAX_RUN) };
  }

  return {
    /** Whether anything may be sent now. */
    get sending() {
      return sending;
    },
    /** The host refused this person a change: nothing more is sent this visit. */
    stop() {
      sending = false;
      pending = 0;
    },
    /** Play starts: a new run, and the first save waits its few seconds. */
    begin() {
      run = 0;
      pending = 0;
      lastSentAt = now();
    },
    /**
     * One key of play. Answers the save to send now, or `null`.
     *
     * @param {number} runCount the run so far, this key included
     * @returns {{ added: number, run: number } | null}
     */
    key(runCount) {
      run = runCount;
      if (!sending) return null;
      pending += 1;
      return now() - lastSentAt >= SAVE_EVERY_MS ? take() : null;
    },
    /**
     * Play stopped. Answers every save still to send, in order.
     *
     * @returns {{ added: number, run: number }[]}
     */
    finish() {
      const saves = [];
      while (sending && pending > 0) saves.push(take());
      pending = 0;
      return saves;
    },
    /** Whether a switched setting is sent to be saved. */
    setting() {
      return sending;
    },
  };
}

/**
 * The words for a save of play that did not land: the host's own refusals keep
 * their words; anything else is the toy's "not confirmed" line.
 *
 * @param {string} problem the refusal's message key, or `''`
 */
export function runProblemFor(problem) {
  return problem === 'error.cannotChange' || problem === 'error.saveRefused' ? problem : 'smash.problem.runNotSaved';
}

/**
 * The words for a setting that was not saved. The switch did change for this
 * visit, so the toy's own line ("This change works for now, but it was not
 * saved for next time.") is the exact one; only "You cannot change this." (the
 * host refused this person) says more.
 *
 * @param {string} problem the refusal's message key, or `''`
 */
export function settingsProblemFor(problem) {
  return problem === 'error.cannotChange' ? problem : 'smash.problem.settingsNotSaved';
}
