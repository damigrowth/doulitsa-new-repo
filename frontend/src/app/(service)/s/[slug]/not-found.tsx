import { NotFoundPage, createNotFoundMetadata } from '@/components/shared/not-found-page';

export const metadata = createNotFoundMetadata(
  '404 - Υπηρεσία δεν βρέθηκε',
  'Η υπηρεσία που αναζητάτε δεν βρέθηκε.'
);

export default function ServiceNotFound() {
  return (
    <NotFoundPage
      title="Ουπς! Η υπηρεσία δεν βρέθηκε"
      description="Η υπηρεσία που αναζητάτε δεν υπάρχει ή έχει αφαιρεθεί. Προσπάθησε να κάνεις διαφορετική αναζήτηση."
      primaryButtonText="Δες όλες τις υπηρεσίες"
      primaryButtonHref="/ipiresies"
      backButtonText="Πίσω στην Αρχική"
      backButtonHref="/"
    />
  );
}
