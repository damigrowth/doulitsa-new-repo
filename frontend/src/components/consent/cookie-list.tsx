/**
 * Cookie declaration — the "Cookies" tab of the settings dialog and the list
 * on /cookies. Same wording and field layout as the previous CookieFirst
 * banner: intro sentence, ΕΠΙΚΑΙΡΟΠΟΙΗΜΕΝΟ date, then per category each cookie
 * with Ονομα τομέα / Λήξη / Τύπος / Προμηθευτής and its description.
 */

import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  COOKIE_LIST_UPDATED_AT,
  cookiesInCategory,
} from '@/constants/datasets/cookies';

interface CookieListProps {
  /** Compact (dialog) or page typography. */
  variant?: 'dialog' | 'page';
}

export default function CookieList({ variant = 'dialog' }: CookieListProps) {
  const text = variant === 'dialog' ? 'text-[12px] leading-[1.4]' : 'text-base';
  return (
    <div className={text}>
      <p className='mb-3'>
        Αυτή η λίστα cookie δείχνει γενικά όλα τα cookies που βρίσκονται σε αυτόν τον
        ιστότοπο. Δεν αντικατοπτρίζει τις ατομικές επιλογές εξαίρεσης του χρήστη.
      </p>
      <p className='mb-4 text-[11px] uppercase tracking-wide text-gray-500'>
        Επικαιροποιημένο: {COOKIE_LIST_UPDATED_AT}
      </p>
      {CATEGORY_ORDER.map((category) => {
        const rows = cookiesInCategory(category);
        return (
          <div key={category} className='mb-4'>
            <p className='font-bold mb-2'>{CATEGORY_LABELS[category]}</p>
            {rows.length === 0 ? (
              <p className='text-gray-500 mb-2'>Δεν υπάρχουν cookies σε αυτή την κατηγορία.</p>
            ) : (
              rows.map((c) => (
                <div key={`${c.name}-${c.type}`} className='mb-3'>
                  <p className='font-bold'>{c.name}</p>
                  <p>Ονομα τομέα: {c.domain}</p>
                  <p>Λήξη: {c.expiry}</p>
                  <p>Τύπος: {c.type}</p>
                  <p>Προμηθευτής: {c.vendor}</p>
                  <p className='text-gray-600'>{c.description}</p>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
