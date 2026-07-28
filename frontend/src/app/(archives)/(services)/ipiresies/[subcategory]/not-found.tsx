import { NotFoundPage, createNotFoundMetadata } from '@/components/shared/not-found-page';

export const metadata = createNotFoundMetadata(
  '404 - Κατηγορία δεν βρέθηκε',
  'Η κατηγορία υπηρεσιών που αναζητάτε δεν βρέθηκε.'
);

export default function ServicesSubcategoryNotFound() {
  return (
    <NotFoundPage
      title="Ουπς! Η κατηγορία δεν βρέθηκε"
      description="Η κατηγορία υπηρεσιών που αναζητάτε δεν υπάρχει ή έχει αφαιρεθεί."
      primaryButtonText="Δες όλες τις υπηρεσίες"
      primaryButtonHref="/ipiresies"
      backButtonText="Πίσω στην Αρχική"
      backButtonHref="/"
    />
  );
}