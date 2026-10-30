import { DataError } from '../../../../lib/data/index.js';
import { addRunFor } from '../../../../lib/data/playroom.js';
import { REFUSED } from '../../../../lib/smash/limits.js';
import { currentOwner } from '../../../../lib/smash/owner.js';
import { readSmallJson } from '../../../../lib/smash/request.js';

/**
 * A few seconds of play, added to the saved total and the best run.
 *
 * **Sharing with other websites is off, and it is off by omission.** No response
 * here carries `Access-Control-Allow-Origin`, so a browser refuses to hand this
 * app's answers to a page on another site. Only `POST` is answered: there is no
 * read here, because the page reads the counts on the server as it opens.
 *
 * The owner is chosen on the server, never taken from the request. Refusals
 * travel as message keys, never as sentences: the words are chosen in the
 * reader's language where they are displayed.
 */
export const dynamic = 'force-dynamic';

/**
 * @param {unknown} body
 * @param {number} status
 */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

/** The status of a refusal, by its message key; any other is 400. */
const STATUS = Object.freeze({ 'error.saveUnconfirmed': 503, 'error.cannotChange': 403 });

/**
 * A refusal as its message key. The host's refusal of this person
 * (`error.cannotChange`: a Viewer, or a Member changing the toy's one record,
 * which the Member did not add) keeps its own words, never "could not save".
 *
 * @param {unknown} error
 */
function refusal(error) {
  if (error instanceof DataError) return json({ problem: error.messageKey }, STATUS[error.messageKey] ?? 400);
  return json({ problem: 'error.saveFailed' }, 500);
}

/** @param {Request} request */
export async function POST(request) {
  const payload = await readSmallJson(request);
  if (payload === undefined) return json({ problem: REFUSED }, 400);
  try {
    return json({ playroom: await addRunFor(currentOwner(), payload) });
  } catch (error) {
    return refusal(error);
  }
}

/** No cross-origin preflight is answered: another site's request gets no sharing header. */
export function OPTIONS() {
  return new Response(null, { status: 405, headers: { allow: 'POST' } });
}
