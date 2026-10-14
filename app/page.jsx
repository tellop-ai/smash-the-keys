import { PLAYROOM_DEFAULTS, readPlayroomFor } from '../lib/data/playroom.js';
import { getLocale } from '../lib/i18n/index.js';
import { currentOwner } from '../lib/smash/owner.js';

import { SmashToy } from './smash-toy.jsx';

/**
 * The toy's one page.
 *
 * `data-tellop-app-marker` is what Tellop's health probe looks for: a page that
 * renders it has really mounted. It stays on the outermost element of the page.
 *
 * The page only reads: the owner's settings and counts, or the defaults when
 * nothing is saved yet. Nothing is saved while it opens. If the saved values
 * cannot be read, the toy still opens with the defaults and says so quietly.
 */
export const dynamic = 'force-dynamic';

export default async function Page() {
  const locale = getLocale();
  let saved;
  let noticeKey = '';
  try {
    saved = await readPlayroomFor(currentOwner());
  } catch {
    saved = { ...PLAYROOM_DEFAULTS };
    noticeKey = 'smash.problem.notReadable';
  }

  return (
    <main className="smash-page" data-tellop-app-marker="ok">
      <SmashToy locale={locale} saved={saved} noticeKey={noticeKey} />
    </main>
  );
}
