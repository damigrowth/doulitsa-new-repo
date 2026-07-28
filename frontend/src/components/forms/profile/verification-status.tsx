import type { ReactNode } from 'react';
import { PulsatingDot } from '@/components/ui/pulsating-dot';
import { VerifiedBadge } from '@/components/shared/profile-badges';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

type VerificationStatus = {
  status: string;
  afm?: string;
  name?: string;
  address?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
} | null;

type VerificationStatusProps = {
  verificationData: VerificationStatus;
};

export default function VerificationStatus({
  verificationData,
}: VerificationStatusProps) {
  const getStatusConfig = (
    status?: string,
  ): {
    title: string;
    description: ReactNode;
    icon: ReactNode;
  } => {
    switch (status) {
      case 'APPROVED':
        return {
          title: 'Εγκεκριμένη Πιστοποίηση',
          description:
            'Το προφίλ σας έχει πιστοποιηθεί επιτυχώς και είναι πλέον εγκεκριμένο.',
          icon: <ShieldCheck className='h-5 w-5 text-green-600' />,
        };
      case 'REJECTED':
        return {
          title: 'Πιστοποίηση Απορρίφθηκε',
          description:
            'Η αίτηση πιστοποίησης απορρίφθηκε. Παρακαλώ ελέγξτε τα στοιχεία σας και δοκιμάστε ξανά.',
          icon: <AlertTriangle className='h-5 w-5 text-red-600' />,
        };
      case 'PENDING':
        return {
          title: 'Πιστοποίηση σε Εξέλιξη',
          description:
            'Η αίτηση πιστοποίησης έχει υποβληθεί και είναι σε κατάσταση αξιολόγησης.',
          icon: <PulsatingDot color='rgb(255, 152, 0)' size={10} />,
        };
      default:
        return {
          title: 'Πιστοποίηση Επαγγελματικού Προφίλ',
          description: (
            <>
              Επιβεβαίωση των επαγγελματικών στοιχείων σας για να εμφανιστεί το σήμα Πιστοποιημένου
              Επαγγελματικού Λογαριασμού.{' '}
              <span className='inline-flex align-middle ml-0.5'>
                <VerifiedBadge verified />
              </span>
            </>
          ),
          icon: null,
        };
    }
  };

  const { title, description, icon } = getStatusConfig(
    verificationData?.status,
  );

  return (
    <div>
      <div className='flex items-center mb-2'>
        {icon && <div className='mr-3'>{icon}</div>}
        <h1 className='text-2xl font-bold'>{title}</h1>
      </div>
      <p className='text-muted-foreground'>{description}</p>
    </div>
  );
}
