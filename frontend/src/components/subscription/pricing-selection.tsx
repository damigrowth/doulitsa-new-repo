'use client';

import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BillingInterval } from '@/lib/prisma-types';

interface PricingSelectionProps {
  onBack: () => void;
  selectedInterval: BillingInterval;
  onIntervalChange: (interval: BillingInterval) => void;
}

export default function PricingSelection({
  onBack,
  selectedInterval,
  onIntervalChange,
}: PricingSelectionProps) {
  return (
    <div className='space-y-6'>
      <button
        onClick={onBack}
        className='flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors'
      >
        <ArrowLeft className='size-4' />
        Κλείσιμο
      </button>

      <div>
        <h3 className='text-lg font-semibold'>Επιλογή χρέωσης</h3>
        <p className='text-sm text-muted-foreground'>
          Επίλεξε τον τρόπο πληρωμής που σε εξυπηρετεί καλύτερα.
        </p>
      </div>

      <div className='space-y-4'>
        {/* Annual */}
        <Card
          className={cn(
            'cursor-pointer transition-all border-2 relative',
            selectedInterval === BillingInterval.year
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:border-muted-foreground/30',
          )}
          onClick={() => onIntervalChange(BillingInterval.year)}
        >
          <Badge
            variant='secondary'
            className='absolute -top-2.5 right-4 hover:bg-secondary'
          >
            3 μήνες δώρο
          </Badge>
          <CardContent className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4'>
            <div>
              <p className='font-semibold'>Ετήσια χρέωση</p>
              <p className='text-sm text-muted-foreground'>
                180€/έτος (60€ έκπτωση)
              </p>
            </div>
            <p className='text-xl font-bold'>
              15€<span className='text-sm font-normal'>/μήνα</span>
            </p>
          </CardContent>
        </Card>

        {/* Monthly */}
        <Card
          className={cn(
            'cursor-pointer transition-all border-2',
            selectedInterval === BillingInterval.month
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:border-muted-foreground/30',
          )}
          onClick={() => onIntervalChange(BillingInterval.month)}
        >
          <CardContent className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4'>
            <div>
              <p className='font-semibold'>Μηνιαία χρέωση</p>
              <p className='text-sm text-muted-foreground'>
                Ακύρωση οποιαδήποτε στιγμή
              </p>
            </div>
            <p className='text-xl font-bold'>
              20€<span className='text-sm font-normal'>/μήνα</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <p className='text-xs text-muted-foreground'>
        *Οι παραπάνω τιμές δε συμπεριλαμβάνουν Φ.Π.Α.
      </p>
    </div>
  );
}
