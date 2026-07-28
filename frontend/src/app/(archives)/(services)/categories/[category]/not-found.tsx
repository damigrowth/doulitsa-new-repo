import { NotFoundPage, createNotFoundMetadata } from '@/components/shared/not-found-page';

export const metadata = createNotFoundMetadata(
  '404 - Κατηγορία δεν βρέθηκε',
  'Η κατηγορία που αναζητάτε δεν βρέθηκε.'
);

export default function CategoryNotFound() {
  return (
    <NotFoundPage
      title="Ουπς! Η κατηγορία δεν βρέθηκε"
      description="Η κατηγορία που αναζητάτε δεν υπάρχει ή έχει αφαιρεθεί."
      primaryButtonText="Δες όλες τις κατηγορίες"
      primaryButtonHref="/categories"
      backButtonText="Πίσω στην Αρχική"
      backButtonHref="/"
    />
  );
}