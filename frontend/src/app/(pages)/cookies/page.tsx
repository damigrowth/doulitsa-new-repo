import React from 'react';

import CookieSettingsButton from '@/components/consent/cookie-settings-button';
import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CATEGORY_LABELS,
  COOKIE_INVENTORY,
  type CookieCategory,
} from '@/constants/datasets/cookies';
import { getCookiesMetadata } from '@/lib/seo/pages';

export async function generateMetadata() {
  return getCookiesMetadata();
}

const CATEGORY_ORDER: CookieCategory[] = ['necessary', 'analytics', 'marketing'];

/**
 * Πολιτική Cookies — public information page required alongside the consent
 * banner (Greek DPA guidance: per-cookie name / provider / purpose / expiry,
 * plus an always-available way to change or withdraw consent).
 *
 * The table is generated from constants/datasets/cookies.ts, the same source
 * the banner uses, so the two can never disagree.
 *
 * NOTE: legal wording drafted by engineering — have it reviewed by whoever
 * owns the site's legal texts before/after publishing.
 */
export default function CookiePolicyPage() {
  return (
    <div className='mt-16 lg:mt-20 flex flex-col w-full overflow-hidden'>
      <section className='container mx-auto max-w-3xl py-12 px-5'>
        <h1 className='text-2xl font-bold'>Πολιτική Cookies</h1>
        <div className='pb-10 space-y-4'>
          <p className='pt-8 text-dark text-lg font-semibold'>Ι. Τι είναι τα cookies</p>
          <p>
            Τα cookies είναι μικρά αρχεία κειμένου που αποθηκεύονται στη συσκευή σας
            (υπολογιστή, κινητό, tablet) όταν επισκέπτεστε έναν ιστότοπο. Χρησιμοποιούνται
            για να λειτουργεί σωστά ο ιστότοπος, να θυμάται τις επιλογές σας και, εφόσον το
            επιτρέψετε, για τη συλλογή ανώνυμων στατιστικών ή για σκοπούς εμπορικής
            προώθησης.
          </p>

          <p className='pt-4 text-dark text-lg font-semibold'>ΙΙ. Ποια cookies χρησιμοποιούμε</p>
          <p>
            Το doulitsa.gr χρησιμοποιεί τις παρακάτω κατηγορίες cookies. Τα{' '}
            <strong>απολύτως απαραίτητα</strong> cookies είναι αναγκαία για τη λειτουργία της
            πλατφόρμας (π.χ. σύνδεση στον λογαριασμό σας) και δεν απαιτούν συγκατάθεση. Τα
            cookies <strong>στατιστικών</strong> και <strong>εμπορικής προώθησης</strong>{' '}
            ενεργοποιούνται <strong>μόνο</strong> εφόσον τα αποδεχθείτε από το σχετικό
            παράθυρο κατά την πρώτη σας επίσκεψη ή από τις «Ρυθμίσεις cookies».
          </p>

          {CATEGORY_ORDER.map((category) => {
            const rows = COOKIE_INVENTORY.filter((c) => c.category === category);
            return (
              <div key={category} className='space-y-2'>
                <p className='pt-4 text-dark font-semibold'>{CATEGORY_LABELS[category]}</p>
                <div className='overflow-x-auto rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='text-xs'>Cookie</TableHead>
                        <TableHead className='text-xs'>Πάροχος</TableHead>
                        <TableHead className='text-xs'>Σκοπός</TableHead>
                        <TableHead className='text-xs whitespace-nowrap'>Διάρκεια</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((c) => (
                        <TableRow key={c.name}>
                          <TableCell className='text-xs font-mono whitespace-nowrap'>{c.name}</TableCell>
                          <TableCell className='text-xs'>{c.provider}</TableCell>
                          <TableCell className='text-xs'>{c.purpose}</TableCell>
                          <TableCell className='text-xs whitespace-nowrap'>{c.expiry}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}

          <p className='pt-4 text-dark text-lg font-semibold'>
            ΙΙΙ. Πώς αλλάζω ή ανακαλώ τις επιλογές μου
          </p>
          <p>
            Μπορείτε οποιαδήποτε στιγμή να αλλάξετε τις προτιμήσεις σας ή να ανακαλέσετε τη
            συγκατάθεσή σας πατώντας το κουμπί «Ρυθμίσεις cookies» παρακάτω ή τον αντίστοιχο
            σύνδεσμο στο υποσέλιδο κάθε σελίδας. Η ανάκληση ισχύει από τη στιγμή που θα την
            αποθηκεύσετε· τα cookies της κατηγορίας που απενεργοποιήσατε διαγράφονται από τη
            συσκευή σας. Οι επιλογές σας διατηρούνται για 6 μήνες, μετά τους οποίους θα σας
            ζητηθεί ξανά η συγκατάθεσή σας. Επιπλέον, μπορείτε να διαγράψετε ή να αποκλείσετε
            cookies μέσω των ρυθμίσεων του προγράμματος περιήγησής σας.
          </p>
          <div className='pt-2'>
            <CookieSettingsButton className={buttonVariants({ variant: 'default' })}>
              Ρυθμίσεις cookies
            </CookieSettingsButton>
          </div>

          <p className='pt-4 text-dark text-lg font-semibold'>ΙV. Νομικό πλαίσιο</p>
          <p>
            Η χρήση cookies διέπεται από το άρθρο 4 παρ. 5 του ν. 3471/2006 (όπως ισχύει) και
            τον Γενικό Κανονισμό Προστασίας Δεδομένων (ΕΕ) 2016/679 (GDPR), σύμφωνα με τις
            κατευθυντήριες οδηγίες της Αρχής Προστασίας Δεδομένων Προσωπικού Χαρακτήρα.
            Για τα μη απαραίτητα cookies απαιτείται η προηγούμενη ρητή συγκατάθεσή σας, την
            οποία μπορείτε να ανακαλέσετε ελεύθερα. Περισσότερες πληροφορίες για την
            επεξεργασία των προσωπικών σας δεδομένων θα βρείτε στην{' '}
            <a href='/privacy' className='text-primary underline'>
              Πολιτική Απορρήτου
            </a>
            .
          </p>

          <p className='pt-4 text-dark text-lg font-semibold'>V. Επικοινωνία</p>
          <p>
            Για οποιαδήποτε απορία σχετικά με τα cookies και τις επιλογές σας μπορείτε να{' '}
            <a href='/contact' className='text-primary underline'>
              επικοινωνήσετε μαζί μας
            </a>
            .
          </p>

          <p className='pt-6 text-sm text-muted-foreground'>Τελευταία ενημέρωση: Αύγουστος 2026</p>
        </div>
      </section>
    </div>
  );
}
