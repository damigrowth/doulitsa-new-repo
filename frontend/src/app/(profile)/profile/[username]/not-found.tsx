import {
  createNotFoundMetadata,
  NotFoundPage,
} from '@/components/shared/not-found-page';

export const metadata = createNotFoundMetadata(
  '404 - Προφίλ δεν βρέθηκε',
  'Το προφίλ που αναζητάτε δεν βρέθηκε.',
);

export default function ProfileNotFound() {
  return (
    <NotFoundPage
      title='Ουπς! Το προφίλ δεν βρέθηκε'
      description='Το προφίλ που αναζητάτε δεν υπάρχει, έχει αφαιρεθεί ή δεν είναι διαθέσιμο για προβολή.'
      backButtonText='Πίσω στην Αρχική'
      backButtonHref='/'
    />
  );
}
