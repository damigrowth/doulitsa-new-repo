'use client';

import type { ReactNode } from 'react';
import { Check, X, Star, Crown, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import NextLink from '@/components/shared/next-link';
import { SUBSCRIPTION_PLANS, type PlanKey } from '@/lib/payment/pricing';
import { useSubscriptionSheetStore } from '@/lib/stores/use-subscription-sheet-store';

/** Where guests are sent to create a professional account. */
const PRO_REGISTER_HREF = '/register#pro';

interface PlanComparisonProps {
  triggerReason?: string | null;
  /** The plan the user is currently on — gets the "Τρέχον" indicator. Defaults to free. */
  currentPlan?: PlanKey;
  /**
   * 'account' (default): logged-in dashboard view with "Τρέχον"/"Αναβάθμιση" CTAs.
   * 'public': guest-facing view (e.g. /for-pros) that prompts registration instead.
   */
  variant?: 'account' | 'public';
  /**
   * Custom content for the promoted card footer when it is the current plan,
   * replacing the default disabled "Τρέχον" button (e.g. the cancel button).
   */
  promotedCurrentCta?: ReactNode;
}

const freePlan = SUBSCRIPTION_PLANS.free;
const promotedPlan = SUBSCRIPTION_PLANS.promoted;

export default function PlanComparison({
  triggerReason,
  currentPlan = 'free',
  variant = 'account',
  promotedCurrentCta,
}: PlanComparisonProps) {
  const { open: openSheet } = useSubscriptionSheetStore();
  const isPublic = variant === 'public';

  return (
    <TooltipProvider>
      <div className='space-y-6'>
        {triggerReason && (
          <div className='bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800'>
            {triggerReason}
          </div>
        )}

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {/* Basic Plan */}
          <Card className='border-2 border-muted'>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-lg'>Βασικό</CardTitle>
              </div>
              <p className='text-2xl font-bold'>Δωρεάν</p>
            </CardHeader>
            <CardContent className='space-y-3'>
              <FeatureRow
                label={`Έως ${freePlan.maxServices} υπηρεσίες`}
                included
              />
              <FeatureRow
                label={`Έως ${freePlan.maxDailyRefreshes} ανανεώσεις/ημέρα`}
                included
              />
              <FeatureRow label='Περιορισμένη ορατότητα' included />
              <FeatureRow label='Προβολή προφίλ στην κορυφή' included={false} />
              <FeatureRow label='Προώθηση υπηρεσιών' included={false} />
              <FeatureRow label='Αυτόματη ανανέωση υπηρεσιών' included={false} />

              {isPublic ? (
                <div className='flex justify-center pt-2'>
                  <Button asChild variant='outline' className='w-full sm:w-auto'>
                    <NextLink href={PRO_REGISTER_HREF}>Ξεκίνα δωρεάν</NextLink>
                  </Button>
                </div>
              ) : (
                currentPlan === 'free' && (
                  <div className='flex justify-center pt-2'>
                    <Button
                      variant='outline'
                      disabled
                      className='w-full sm:w-auto'
                    >
                      Τρέχον
                    </Button>
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Promoted Plan */}
          <Card className='border-2 border-primary shadow-lg'>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-lg'>Προωθημένο</CardTitle>
                <Badge className='gap-1 bg-primary-dark hover:bg-primary-dark'>
                  <Star className='size-3 fill-yellow-400 text-yellow-400' />
                  Δημοφιλές
                </Badge>
              </div>
              <p className='text-2xl font-bold'>
                <span className='text-sm font-normal text-muted-foreground'>
                  Από{' '}
                </span>
                15€
                <span className='text-sm'>
                  /μήνα
                </span>
              </p>
            </CardHeader>
            <CardContent className='space-y-3'>
              <FeatureRow
                label={`Έως ${promotedPlan.maxServices} υπηρεσίες`}
                included
                tooltip={`Δημοσίευσε έως ${promotedPlan.maxServices} υπηρεσίες στο προφίλ σου, αντί για ${freePlan.maxServices} του δωρεάν πακέτου.`}
              />
              <FeatureRow
                label='Αυτόματη ανανέωση υπηρεσιών καθημερινά'
                included
                tooltip='Οι υπηρεσίες σου ανανεώνονται αυτόματα κάθε μέρα και ανεβαίνουν στην κορυφή των αποτελεσμάτων, χωρίς να χρειάζεται να το κάνεις χειροκίνητα.'
              />
              <FeatureRow
                label={`Έως ${promotedPlan.maxFeaturedServices} προωθημένες υπηρεσίες`}
                included
                tooltip={`Ξεχώρισε έως ${promotedPlan.maxFeaturedServices} υπηρεσίες πατώντας το αστέρι (⭐) για να προωθηθούν ως promoted στα αποτελέσματα!`}
              />
              <FeatureRow
                label='Προφίλ στην κορυφή του επαγγελματικού καταλόγου'
                included
                tooltip='Το προφίλ σου εμφανίζεται στις πρώτες θέσεις του επαγγελματικού καταλόγου.'
              />
              <FeatureRow
                label='Προτεραιότητα στις "Σχετικές υπηρεσίες"'
                included
                tooltip='Οι υπηρεσίες σου εμφανίζονται με προτεραιότητα στην ενότητα «Σχετικές υπηρεσίες» των σελίδων άλλων αντίστοιχων υπηρεσιών.'
              />
              <FeatureRow
                label='Ενότητα "Επιπλέον υπηρεσίες"'
                included
                tooltip='Στις σελίδες των υπηρεσιών σου προστίθεται ειδική ενότητα «Επιπλέον υπηρεσίες» που προβάλλει όλες τις υπηρεσίες σου.'
              />

              <div className='flex justify-center pt-2'>
                {isPublic ? (
                  <Button asChild className='w-full sm:w-auto'>
                    <NextLink href={PRO_REGISTER_HREF}>
                      <Crown className='size-4' />
                      Εγγραφή Επαγγελματικού Λογαριασμού
                    </NextLink>
                  </Button>
                ) : currentPlan === 'promoted' ? (
                  promotedCurrentCta ?? (
                    <Button
                      variant='outline'
                      disabled
                      className='w-full sm:w-auto'
                    >
                      Τρέχον
                    </Button>
                  )
                ) : (
                  <Button
                    className='w-full sm:w-auto'
                    onClick={() => openSheet()}
                  >
                    <Crown className='size-4' />
                    Αναβάθμιση σε Προωθημένο
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}

function FeatureRow({
  label,
  included,
  tooltip,
}: {
  label: string;
  included: boolean;
  tooltip?: string;
}) {
  return (
    <div className='flex items-center gap-2 text-sm'>
      {included ? (
        <Check className='size-4 text-green-600 shrink-0' />
      ) : (
        <X className='size-4 text-muted-foreground/40 shrink-0' />
      )}
      <span className={included ? 'text-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className='size-4 shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-help' />
          </TooltipTrigger>
          <TooltipContent className='max-w-xs'>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
