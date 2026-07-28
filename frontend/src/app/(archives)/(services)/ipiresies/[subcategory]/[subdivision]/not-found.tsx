import { NotFoundPage, createNotFoundMetadata } from '@/components/shared/not-found-page';

export const metadata = createNotFoundMetadata(
  '404 - Υποκατηγορία δεν βρέθηκε',
  'Η υποκατηγορία υπηρεσιών που αναζητάτε δεν βρέθηκε.'
);

export default function ServicesSubdivisionNotFound() {
  return (
    <NotFoundPage
      title="Ουπς! Η υποκατηγορία δεν βρέθηκε"
      description="Η υποκατηγορία υπηρεσιών που αναζητάτε δεν υπάρχει ή έχει αφαιρεθεί."
      primaryButtonText="Δες όλες τις υπηρεσίες"
      primaryButtonHref="/ipiresies"
      backButtonText="Πίσω στις κατηγορίες"
      backButtonHref="/ipiresies"
    />
  );
}