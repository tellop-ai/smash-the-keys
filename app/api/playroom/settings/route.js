import { DataError } from '../../../../lib/data/index.js';
import { saveSettingsFor } from '../../../../lib/data/playroom.js';
import { REFUSED } from '../../../../lib/smash/limits.js';
import { currentOwner } from '../../../../lib/smash/owner.js';
import { readSmallJson } from '../../../../lib/smash/request.js';

/**
 * The toy's three settings, saved when a parent changes one.
 *
 * **Sharing with other websites is off, and it is off by omission.** No response
 * here carries `Access-Control-Allow-Origin`, so a browser refuses to hand this
 * app's answers to a page on another site. Only `POST` is answered: there is no
 * read here, because the page reads the settings on the server as it opens.
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

/** @param {unknown} error */
function refusal(error) {
  if (error instanceof DataError) return json({ problem: error.messageKey }, error.messageKey === 'error.saveUnconfirmed' ? 503 : 400);
  return json({ problem: 'error.saveFailed' }, 500);
}

/** @param {Request} request */
export async function POST(request) {
  const payload = await readSmallJson(request);
  if (payload === undefined) return json({ problem: REFUSED }, 400);
  try {
    return json({ playroom: await saveSettingsFor(currentOwner(), payload) });
  } catch (error) {
    return refusal(error);
  }
}

/** No cross-origin preflight is answered: another site's request gets no sharing header. */
export function OPTIONS() {
  return new Response(null, { status: 405, headers: { allow: 'POST' } });
}
