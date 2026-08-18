'use client';

/**
 * Settings dialog — replica of the previous CookieFirst panel:
 *   header  «Ρυθμίσεις απορρήτου»  ………………  «Πολιτική απορρήτου» (link)   ×
 *   tabs    Ρυθμίσεις | Cookies | Πολιτική cookies
 *   Ρυθμίσεις: intro sentence, «Κατηγορίες», one card per category with its
 *              description, an expand chevron (shows the category's cookies)
 *              and a toggle (Απαραίτητα always on).
 *   Cookies:   the cookie declaration (CookieList).
 *   Πολιτική cookies: the policy text (CookiePolicyContent).
 *   footer  «Αποδοχή Όλων» (full width) / «Αποθήκευση ρυθμίσεων» + «Άρνηση»
 */

import { useEffect, useMemo, useState } from 'react';

import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  cookiesInCategory,
  type CookieCategory,
} from '@/constants/datasets/cookies';
import {
  acceptAllCookies,
  closeCookiePreferences,
  currentlyAcceptedCategories,
  declineAllCookies,
  saveCookieChoices,
} from '@/lib/analytics/consent';

import CookieList from './cookie-list';
import CookiePolicyContent from './cookie-policy-content';

type Tab = 'settings' | 'cookies' | 'policy';

const TABS: { id: Tab; label: string }[] = [
  { id: 'settings', label: 'Ρυθμίσεις' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'policy', label: 'Πολιτική cookies' },
];

const GREEN = '#109e79';

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className='relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed'
      style={{ backgroundColor: checked ? (disabled ? '#a7dccd' : GREEN) : '#c9c9c9' }}
    >
      <span
        className='inline-block h-4 w-4 rounded-full bg-white shadow transition-transform'
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
      />
    </button>
  );
}

export default function CookiePanel() {
  const [tab, setTab] = useState<Tab>('settings');
  const [enabled, setEnabled] = useState<Set<CookieCategory>>(() => new Set(currentlyAcceptedCategories()));
  const [expanded, setExpanded] = useState<Set<CookieCategory>>(new Set());

  // Close on Escape (same as the old dialog).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeCookiePreferences();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggle = (c: CookieCategory, on: boolean) =>
    setEnabled((prev) => {
      const next = new Set(prev);
      if (on) next.add(c);
      else next.delete(c);
      next.add('necessary');
      return next;
    });

  const toggleExpanded = (c: CookieCategory) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const enabledList = useMemo(() => Array.from(enabled), [enabled]);

  const acceptAll = () => {
    acceptAllCookies();
    closeCookiePreferences();
  };
  const save = () => {
    saveCookieChoices(enabledList);
    closeCookiePreferences();
  };
  const deny = () => {
    declineAllCookies();
    closeCookiePreferences();
  };

  return (
    <div className='fixed inset-0 z-[2147483001] flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-6 sm:py-16 font-sans text-black'>
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='dl-cookie-panel-title'
        className='relative w-full max-w-[500px] rounded-lg bg-white shadow-[0_2px_24px_rgba(0,0,0,0.25)] flex flex-col max-h-[calc(100vh-3rem)] sm:max-h-[calc(100vh-8rem)]'
      >
        {/* close */}
        <button
          type='button'
          onClick={closeCookiePreferences}
          aria-label='Κλείσιμο'
          className='absolute right-3 top-2 text-[18px] leading-none text-black hover:text-gray-600'
        >
          ×
        </button>

        {/* header */}
        <div className='flex items-center justify-between px-5 pt-9 pb-2 text-[12px]'>
          <span id='dl-cookie-panel-title' className='font-bold'>
            Ρυθμίσεις απορρήτου
          </span>
          <a href='/privacy' className='font-bold' style={{ color: GREEN }}>
            Πολιτική απορρήτου
          </a>
        </div>

        {/* tabs */}
        <div className='mx-5 flex border-b border-[#e9e9e9]'>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type='button'
                role='tab'
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className='flex-1 py-[7px] text-[12px] font-bold text-center border-b-2 -mb-px transition-colors'
                style={{ color: active ? GREEN : '#000', borderBottomColor: active ? GREEN : 'transparent' }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* body */}
        <div className='flex-1 overflow-y-auto px-5 pt-4 pb-2'>
          {tab === 'settings' && (
            <div className='text-[12px] leading-[1.4]'>
              <p className='mb-4'>
                Θα θέλαμε την άδειά σας να χρησιμοποιήσει τα δεδομένα σας για τους ακόλουθους
                σκοπούς:
              </p>
              <p className='text-center font-bold pb-1 mb-3 border-b-2' style={{ color: GREEN, borderBottomColor: GREEN }}>
                Κατηγορίες
              </p>
              {CATEGORY_ORDER.map((c) => {
                const readOnly = c === 'necessary';
                const isOpen = expanded.has(c);
                const rows = cookiesInCategory(c);
                return (
                  <div key={c} className='mb-[10px] rounded-[4px] border border-[#e9e9e9] p-4'>
                    <div className='flex items-start gap-3'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center justify-between'>
                          <span className='font-bold text-[13px]'>{CATEGORY_LABELS[c]}</span>
                          <button
                            type='button'
                            onClick={() => toggleExpanded(c)}
                            aria-expanded={isOpen}
                            aria-label={`${isOpen ? 'Απόκρυψη' : 'Εμφάνιση'} cookies: ${CATEGORY_LABELS[c]}`}
                            className='px-2 text-gray-600'
                          >
                            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                              <path d='M6 9l6 6 6-6' />
                            </svg>
                          </button>
                        </div>
                        {CATEGORY_DESCRIPTIONS[c].map((d, i) => (
                          <p
                            key={i}
                            className='text-[#4a4a4a] mt-1 [&_a]:underline'
                            style={{ ['--tw-prose-links' as string]: GREEN }}
                            // Category texts are our own static strings (one contains a link).
                            dangerouslySetInnerHTML={{ __html: d }}
                          />
                        ))}
                        {isOpen && (
                          <div className='mt-3 border-t border-[#eee] pt-3'>
                            {rows.length === 0 ? (
                              <p className='text-gray-500'>Δεν υπάρχουν cookies σε αυτή την κατηγορία.</p>
                            ) : (
                              rows.map((k) => (
                                <div key={`${k.name}-${k.type}`} className='mb-3'>
                                  <p className='font-bold'>{k.name}</p>
                                  <p>Ονομα τομέα: {k.domain}</p>
                                  <p>Λήξη: {k.expiry}</p>
                                  <p>Τύπος: {k.type}</p>
                                  <p>Προμηθευτής: {k.vendor}</p>
                                  <p className='text-gray-600'>{k.description}</p>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <div className='pt-4'>
                        <Toggle
                          checked={readOnly ? true : enabled.has(c)}
                          disabled={readOnly}
                          onChange={(on) => toggle(c, on)}
                          label={CATEGORY_LABELS[c]}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {tab === 'cookies' && <CookieList variant='dialog' />}
          {tab === 'policy' && <CookiePolicyContent variant='dialog' />}
        </div>

        {/* footer buttons */}
        <div className='px-5 pb-5 pt-3 space-y-[8px]'>
          <button
            type='button'
            onClick={acceptAll}
            className='w-full h-[31px] rounded-[3px] text-white text-[12px] hover:opacity-90 transition-opacity'
            style={{ backgroundColor: GREEN }}
          >
            Αποδοχή Όλων
          </button>
          <div className='flex gap-[10px]'>
            <button
              type='button'
              onClick={save}
              className='flex-1 h-[31px] rounded-[3px] text-white text-[12px] hover:opacity-90 transition-opacity'
              style={{ backgroundColor: GREEN }}
            >
              Αποθήκευση ρυθμίσεων
            </button>
            <button
              type='button'
              onClick={deny}
              className='flex-1 h-[31px] rounded-[3px] border border-[#cfcfcf] bg-white text-[#6b6b6b] text-[12px] hover:bg-gray-50 transition-colors'
            >
              Άρνηση
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
