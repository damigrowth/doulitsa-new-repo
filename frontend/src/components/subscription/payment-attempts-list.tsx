import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, formatTime } from '@/lib/utils/date';

// Mirrors the Django payment-attempt status/source values
// (OLD prisma enums PaymentAttemptStatus / PaymentAttemptSource).
export type PaymentAttemptStatus =
  | 'CAPTURED'
  | 'AUTHORIZED'
  | 'REFUSED'
  | 'REFUSEDRISK'
  | 'CANCELED'
  | 'ERROR';

export type PaymentAttemptSource =
  | 'initial'
  | 'recurring_child'
  | 'cron_renewal'
  | 'cron_retry'
  | 'manual';

export interface PaymentAttemptRow {
  id: string;
  status: PaymentAttemptStatus;
  source: PaymentAttemptSource;
  amount: number;
  currency: string;
  sequence: number | null;
  txId: string | null;
  orderId: string | null;
  /** Gateway payment reference (Cardlink paymentRef). */
  paymentRef?: string | null;
  /** Gateway result text for the attempt (e.g. "OK, 00 - Approved"). */
  message?: string | null;
  /** Failure detail for ERROR/REFUSED rows (why it failed). */
  errorMessage?: string | null;
  createdAt: Date;
}

function statusVariant(status: PaymentAttemptStatus) {
  switch (status) {
    case 'CAPTURED':
    case 'AUTHORIZED':
      return 'default' as const;
    case 'REFUSED':
    case 'REFUSEDRISK':
    case 'ERROR':
      return 'destructive' as const;
    case 'CANCELED':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
}

function statusLabel(status: PaymentAttemptStatus): string {
  switch (status) {
    case 'CAPTURED':
      return 'Επιτυχής';
    case 'AUTHORIZED':
      return 'Εγκρίθηκε';
    case 'REFUSED':
      return 'Απορρίφθηκε';
    case 'REFUSEDRISK':
      return 'Απορρ. (risk)';
    case 'CANCELED':
      return 'Ακυρώθηκε';
    case 'ERROR':
      return 'Σφάλμα';
    default:
      return status;
  }
}

function sourceLabel(source: PaymentAttemptSource): string {
  switch (source) {
    case 'initial':
      return 'Αρχική';
    case 'recurring_child':
      return 'Αυτόματη';
    case 'cron_renewal':
      return 'Cron (renew)';
    case 'cron_retry':
      return 'Cron (retry)';
    case 'manual':
      return 'Χειροκίνητη';
    default:
      return source;
  }
}

function formatAmount(amount: number, currency: string): string {
  const value = amount / 100;
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(2);
  const symbol = currency.toLowerCase() === 'eur' ? '€' : currency.toUpperCase();
  return `${formatted}${symbol}`;
}

interface Props {
  attempts: PaymentAttemptRow[];
  /** Compact = user dashboard (date, status, amount only). Full = admin. */
  variant?: 'compact' | 'full';
}

export function PaymentAttemptsList({ attempts, variant = 'full' }: Props) {
  if (attempts.length === 0) {
    return (
      <p className='text-xs text-muted-foreground py-4 text-center'>
        Δεν υπάρχουν καταγεγραμμένες χρεώσεις ακόμα.
      </p>
    );
  }

  if (variant === 'compact') {
    return (
      <div className='divide-y'>
        {attempts.map((a) => (
          <div
            key={a.id}
            className='flex items-center justify-between py-2.5'
          >
            <div className='flex flex-col gap-0.5'>
              <span className='text-sm font-medium'>
                {formatDate(a.createdAt)}
              </span>
              <span className='text-xs text-muted-foreground'>
                {formatTime(a.createdAt)}
              </span>
            </div>
            <div className='flex items-center gap-3'>
              <span className='text-sm font-medium'>
                {formatAmount(a.amount, a.currency)}
              </span>
              <Badge
                variant={statusVariant(a.status)}
                className='text-xs h-5'
              >
                {statusLabel(a.status)}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Full variant (admin)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='text-xs'>Ημερομηνία</TableHead>
          <TableHead className='text-xs'>Κατάσταση</TableHead>
          <TableHead className='text-xs'>Πηγή</TableHead>
          <TableHead className='text-xs text-right'>Ποσό</TableHead>
          <TableHead className='text-xs text-center'>Seq.</TableHead>
          <TableHead className='text-xs'>TX ID</TableHead>
          <TableHead className='text-xs'>Order ID</TableHead>
          <TableHead className='text-xs'>Λεπτομέρειες</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {attempts.map((a) => (
          <TableRow key={a.id}>
            <TableCell className='text-xs'>
              <div>{formatDate(a.createdAt)}</div>
              <div className='text-muted-foreground'>
                {formatTime(a.createdAt)}
              </div>
            </TableCell>
            <TableCell>
              <Badge
                variant={statusVariant(a.status)}
                className='text-xs h-5'
              >
                {statusLabel(a.status)}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant='outline' className='text-xs h-5'>
                {sourceLabel(a.source)}
              </Badge>
            </TableCell>
            <TableCell className='text-xs text-right font-medium'>
              {formatAmount(a.amount, a.currency)}
            </TableCell>
            <TableCell className='text-xs text-center text-muted-foreground'>
              {a.sequence ?? '—'}
            </TableCell>
            <TableCell className='text-xs font-mono text-muted-foreground'>
              {a.txId || '—'}
            </TableCell>
            <TableCell className='text-xs font-mono text-muted-foreground truncate max-w-[200px]' title={a.orderId || undefined}>
              {a.orderId || '—'}
            </TableCell>
            <TableCell className='text-xs max-w-[260px]'>
              {a.errorMessage ? (
                <span className='text-destructive break-words' title={a.errorMessage}>
                  {a.errorMessage}
                </span>
              ) : a.message ? (
                <span className='text-muted-foreground break-words' title={a.message}>
                  {a.message}
                </span>
              ) : (
                <span className='text-muted-foreground'>—</span>
              )}
              {a.paymentRef ? (
                <div className='font-mono text-muted-foreground/70 truncate' title={a.paymentRef}>
                  ref: {a.paymentRef}
                </div>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
