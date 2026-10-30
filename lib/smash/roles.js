/**
 * Who may save the toy's settings and counts (`AGENTS.md` rule 1).
 *
 * The toy keeps one record for everyone who plays: the three settings (Sound,
 * Say it, the spoken language) and the two counts (keys in total, the best
 * run). Every save the toy makes changes that one record, so a save is a
 * change to a record the person did not add. Online the host refuses a
 * Viewer's every save and a Member's change to a record the Member did not
 * add, so only the owner and a Helper save.
 *
 * Everyone plays. For a role that cannot save, the toy still pops every emoji,
 * makes every sound and says every word, and the settings still switch for
 * that visit; nothing is sent to be saved, and the start screen says so.
 *
 * Pure: the page asks `currentPerson()` on the server and hands the answer of
 * `canChange` to the toy. A role this file does not know saves nothing.
 */

/** The roles whose presses the toy saves. */
const SAVING_ROLES = Object.freeze(['owner', 'helper']);

/**
 * Whether a person in this role may save the toy's settings and counts.
 *
 * @param {unknown} role
 * @returns {boolean}
 */
export function canChange(role) {
  return typeof role === 'string' && SAVING_ROLES.includes(role);
}
