import {
  createNotFoundMetadata,
  NotFoundPage,
} from '@/components/shared/not-found-page';

export const metadata = createNotFoundMetadata(
  '404 - Υπηρεσία δεν βρέθηκε',
  'Η υπηρεσία προς επεξεργασία δεν βρέθηκε.',
);

export default function ServiceEditNotFound() {
  return (
    <NotFoundPage
      title='Ουπς! Η υπηρεσία δεν βρέθηκε'
      description='Η υπηρεσία που προσπαθείς να επεξεργαστείς δεν υπάρχει, έχει διαγραφεί ή δεν έχεις πρόσβαση σε αυτήν.'
      primaryButtonText='Δες τις υπηρεσίες μου'
      primaryButtonHref='/dashboard/services'
      backButtonText='Πίσω στο Dashboard'
      backButtonHref='/dashboard'
    />
  );
}
