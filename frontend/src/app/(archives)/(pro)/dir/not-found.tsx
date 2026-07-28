import { NotFoundPage, createNotFoundMetadata } from '@/components/shared/not-found-page';

export const metadata = createNotFoundMetadata(
  '404 - Σελίδα δεν βρέθηκε',
  'Η σελίδα που αναζητάτε δεν βρέθηκε.'
);

export default function DirectoryNotFound() {
  return (
    <NotFoundPage
      title="Ουπς! Η σελίδα δεν βρέθηκε"
      description="Η σελίδα που αναζητάτε δεν υπάρχει ή έχει αφαιρεθεί."
      primaryButtonText="Επαγγελματικός Κατάλογος"
      primaryButtonHref="/dir"
      backButtonText="Πίσω στην Αρχική"
      backButtonHref="/"
    />
  );
}
