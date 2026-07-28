import { NotFoundPage, createNotFoundMetadata } from '@/components/shared/not-found-page';

export const metadata = createNotFoundMetadata(
  '404 - Υποκατηγορία δεν βρέθηκε',
  'Η υποκατηγορία που αναζητάτε δεν βρέθηκε.'
);

export default function DirectorySubcategoryNotFound() {
  return (
    <NotFoundPage
      title="Ουπς! Η υποκατηγορία δεν βρέθηκε"
      description="Η υποκατηγορία που αναζητάτε δεν υπάρχει ή έχει αφαιρεθεί."
      primaryButtonText="Επαγγελματικός Κατάλογος"
      primaryButtonHref="/dir"
      backButtonText="Πίσω στην Αρχική"
      backButtonHref="/"
    />
  );
}
