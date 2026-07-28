import { NotFoundPage, createNotFoundMetadata } from '@/components/shared/not-found-page';

export const metadata = createNotFoundMetadata(
  '404 - Κατηγορία δεν βρέθηκε',
  'Η κατηγορία που αναζητάτε δεν βρέθηκε.'
);

export default function DirectoryCategoryNotFound() {
  return (
    <NotFoundPage
      title="Ουπς! Η κατηγορία δεν βρέθηκε"
      description="Η κατηγορία που αναζητάτε δεν υπάρχει ή έχει αφαιρεθεί."
      primaryButtonText="Επαγγελματικός Κατάλογος"
      primaryButtonHref="/dir"
      backButtonText="Πίσω στην Αρχική"
      backButtonHref="/"
    />
  );
}
