import { requirePermission } from '@/actions/auth/server';
import { getSubscription, getSubscriptionPayments } from '@/actions/admin/subscriptions';
import { notFound } from 'next/navigation';
import { ADMIN_RESOURCES } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SiteHeader } from '@/components/admin/site-header';
import { NextLink } from '@/components';
import { formatDate, formatTime } from '@/lib/utils/date';
import { CopyableId } from '@/components/admin/subscriptions/copyable-id';
import { PaymentAttemptsList, type PaymentAttemptRow } from '@/components/subscription/payment-attempts-list';
import { HistoryPagination } from '@/components/subscription/history-pagination';
import {
  SubscriptionStatus,
  SubscriptionPlan,
  BillingInterval,
} from '@/lib/prisma-types';
import type {
  Subscription,
  SubscriptionProvider,
  Profile,
  User as UserModel,
} from '@/lib/prisma-types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ historyPage?: string }>;
}

/**
 * Subscription detail payload from the Django admin endpoint
 * (`billing.services.subscription_ops._row`). Extends the base `Subscription`
 * with the provider/worldline ids, billing snapshot, payment + discount
 * aggregates, and the embedded profile/user the detail page renders.
 */
type SubscriptionDetail = Subscription & {
  profileId: string;
  provider: SubscriptionProvider;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  worldlineToken: string | null;
  worldlineTokenExp: string | null;
  worldlineMasterOrderId: string | null;
  billing: AppJson.BillingInfo | null;
  currentPeriodStart: string | null;
  paymentMethodType: string | null;
  paymentMethodLast4: string | null;
  paymentMethodBrand: string | null;
  totalPaidLifetime: number | null;
  paymentCount: number | null;
  firstPaymentAt: string | null;
  lastPaymentAt: string | null;
  discountCode: string | null;
  discountPercentOff: number | null;
  discountAmountOff: number | null;
  profile:
    | (Pick<Profile, 'id' | 'username' | 'displayName' | 'image' | 'email'> & {
        user: Pick<UserModel, 'id' | 'email' | 'name' | 'role'> | null;
      })
    | null;
};

// Helper functions
function getStatusBadgeVariant(status: SubscriptionStatus) {
  switch (status) {
    case SubscriptionStatus.active:
      return 'default' as const;
    case SubscriptionStatus.canceled:
      return 'destructive' as const;
    case SubscriptionStatus.past_due:
      return 'outline' as const;
    default:
      return 'secondary' as const;
  }
}

function getStatusLabel(status: SubscriptionStatus) {
  switch (status) {
    case SubscriptionStatus.active:
      return 'Ενεργή';
    case SubscriptionStatus.canceled:
      return 'Ακυρωμένη';
    case SubscriptionStatus.past_due:
      return 'Ληξιπρόθεσμη';
    case SubscriptionStatus.incomplete:
      return 'Ημιτελής';
    case SubscriptionStatus.trialing:
      return 'Δοκιμαστική';
    case SubscriptionStatus.unpaid:
      return 'Απλήρωτη';
    default:
      return status;
  }
}

function getPlanLabel(plan: SubscriptionPlan) {
  switch (plan) {
    case SubscriptionPlan.promoted:
      return 'Promoted';
    case SubscriptionPlan.free:
      return 'Free';
    default:
      return plan;
  }
}

function getBillingLabel(interval: BillingInterval | null) {
  switch (interval) {
    case BillingInterval.month:
      return 'Μηνιαία';
    case BillingInterval.year:
      return 'Ετήσια';
    default:
      return '—';
  }
}

function formatAmount(amount: number | null, currency: string | null = 'eur') {
  if (!amount) return '—';
  const euros = amount / 100;
  const formatted = Number.isInteger(euros) ? euros.toString() : euros.toFixed(2);
  return `${formatted}€`;
}


export default async function AdminSubscriptionDetailPage({
  params,
  searchParams,
}: PageProps) {
  await requirePermission(ADMIN_RESOURCES.SUBSCRIPTIONS, '/admin/subscriptions');

  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const historyPage = Math.max(1, parseInt(sp.historyPage || '1', 10) || 1);
  const result = await getSubscription(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const subscription = result.data as SubscriptionDetail;
  const profile = subscription.profile;

  // Payment-attempt history (paginated via ?historyPage). Best-effort.
  const paymentsRaw = (await getSubscriptionPayments(subscription.id, historyPage).catch(
    () => null,
  )) as {
    attempts?: Array<Record<string, unknown>>;
    total?: number;
    page?: number;
    totalPages?: number;
  } | null;
  const paymentAttempts: PaymentAttemptRow[] = (paymentsRaw?.attempts ?? []).map((a) => ({
    id: String(a.id),
    status: a.status as PaymentAttemptRow['status'],
    source: a.source as PaymentAttemptRow['source'],
    amount: Number(a.amount ?? 0),
    currency: String(a.currency ?? 'eur'),
    sequence: (a.sequence as number | null) ?? null,
    txId: (a.txId as string | null) ?? null,
    orderId: (a.orderId as string | null) ?? null,
    paymentRef: (a.paymentRef as string | null) ?? null,
    message: (a.message as string | null) ?? null,
    errorMessage: (a.errorMessage as string | null) ?? null,
    createdAt: new Date(String(a.createdAt)),
  }));
  const attemptsTotal = paymentsRaw?.total ?? 0;
  const totalHistoryPages = paymentsRaw?.totalPages ?? 1;
  const currentHistoryPage = paymentsRaw?.page ?? 1;
  const billing = subscription.billing as {
    receipt?: boolean;
    invoice?: boolean;
    name?: string;
    afm?: string;
    doy?: string;
    address?: string;
    profession?: string;
  } | null;

  return (
    <>
      <SiteHeader
        title={`Συνδρομή: ${profile?.displayName || subscription.id.slice(0, 8)}`}
        actions={
          <>
            <Button variant='ghost' size='sm' asChild>
              <NextLink href='/admin/subscriptions'>
                <ArrowLeft className='h-4 w-4' />
                Συνδρομές
              </NextLink>
            </Button>
            {profile && (
              <Button variant='outline' size='sm' asChild>
                <NextLink href={`/admin/profiles/${profile.id}`}>
                  <User className='h-4 w-4' />
                  Προφίλ
                </NextLink>
              </Button>
            )}
            {profile?.username && (
              <Button variant='outline' size='sm' asChild>
                <NextLink
                  href={`/profile/${profile.username}`}
                  target='_blank'
                >
                  <ExternalLink className='h-4 w-4' />
                  Δημόσιο Προφίλ
                </NextLink>
              </Button>
            )}
          </>
        }
      />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='w-full px-4 lg:px-6'>
          <div className='space-y-6'>
            {/* Subscription Overview - 4 Cards */}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
              {/* Card 1: Subscription Information */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>
                    Πληροφορίες Συνδρομής
                  </CardTitle>
                </CardHeader>
                <CardContent className='px-0'>
                  <div className='divide-y'>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>ID</span>
                      <CopyableId id={subscription.id} label='ID' />
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Profile ID
                      </span>
                      <CopyableId id={subscription.pid} label='Profile ID' />
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Provider
                      </span>
                      <Badge variant='outline' className='text-xs h-5'>
                        {subscription.provider || 'worldline'}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Customer ID
                      </span>
                      <CopyableId
                        id={subscription.providerCustomerId}
                        label='Customer ID'
                      />
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Subscription ID
                      </span>
                      <CopyableId
                        id={subscription.providerSubscriptionId}
                        label='Sub ID'
                      />
                    </div>
                    {profile && (
                      <>
                        <div className='flex items-center justify-between px-6 py-2'>
                          <span className='text-xs text-muted-foreground'>
                            Όνομα
                          </span>
                          <span className='text-xs font-medium'>
                            {profile.displayName || '—'}
                          </span>
                        </div>
                        <div className='flex items-center justify-between px-6 py-2'>
                          <span className='text-xs text-muted-foreground'>
                            Email
                          </span>
                          <span className='text-xs font-medium truncate max-w-[150px]' title={profile.user?.email}>
                            {profile.user?.email || '—'}
                          </span>
                        </div>
                        <div className='flex items-center justify-between px-6 py-2'>
                          <span className='text-xs text-muted-foreground'>
                            Username
                          </span>
                          <span className='text-xs font-medium'>
                            @{profile.username || '—'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Status & Plan */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>Κατάσταση & Πλάνο</CardTitle>
                </CardHeader>
                <CardContent className='px-0'>
                  <div className='divide-y'>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Status
                      </span>
                      <Badge
                        variant={getStatusBadgeVariant(subscription.status)}
                        className='text-xs h-5'
                      >
                        {getStatusLabel(subscription.status)}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Plan
                      </span>
                      <Badge
                        variant={subscription.plan === SubscriptionPlan.promoted ? 'default' : 'outline'}
                        className='text-xs h-5'
                      >
                        {getPlanLabel(subscription.plan)}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Billing
                      </span>
                      <span className='text-xs font-medium'>
                        {getBillingLabel(subscription.billingInterval)}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Cancel at End
                      </span>
                      <Badge
                        variant={subscription.cancelAtPeriodEnd ? 'destructive' : 'outline'}
                        className='text-xs h-5'
                      >
                        {subscription.cancelAtPeriodEnd ? 'Ναι' : 'Όχι'}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Period Start
                      </span>
                      <span className='text-xs'>
                        {subscription.currentPeriodStart
                          ? formatDate(subscription.currentPeriodStart)
                          : '—'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Period End
                      </span>
                      <span className='text-xs'>
                        {subscription.currentPeriodEnd
                          ? formatDate(subscription.currentPeriodEnd)
                          : '—'}
                      </span>
                    </div>
                    {subscription.canceledAt && (
                      <div className='flex items-center justify-between px-6 py-2'>
                        <span className='text-xs text-muted-foreground'>
                          Canceled At
                        </span>
                        <span className='text-xs'>
                          {formatDate(subscription.canceledAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Payment Analytics */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>Analytics Πληρωμών</CardTitle>
                </CardHeader>
                <CardContent className='px-0'>
                  <div className='divide-y'>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Τρέχον Ποσό
                      </span>
                      <span className='text-xs font-medium'>
                        {formatAmount(subscription.amount, subscription.currency)}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Νόμισμα
                      </span>
                      <span className='text-xs font-medium uppercase'>
                        {subscription.currency || 'EUR'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Σύνολο Lifetime
                      </span>
                      <span className='text-xs font-bold text-green-600'>
                        {formatAmount(subscription.totalPaidLifetime, subscription.currency)}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Πλήθος Πληρωμών
                      </span>
                      <span className='text-xs font-medium'>
                        {subscription.paymentCount || 0}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Πρώτη Πληρωμή
                      </span>
                      <span className='text-xs'>
                        {subscription.firstPaymentAt
                          ? formatDate(subscription.firstPaymentAt)
                          : '—'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Τελευταία Πληρωμή
                      </span>
                      <span className='text-xs'>
                        {subscription.lastPaymentAt
                          ? formatDate(subscription.lastPaymentAt)
                          : '—'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Μέθοδος
                      </span>
                      <span className='text-xs'>
                        {subscription.paymentMethodBrand
                          ? `${subscription.paymentMethodBrand.toUpperCase()} ****${subscription.paymentMethodLast4 || ''}`
                          : subscription.paymentMethodType || '—'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Billing & Discounts */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>
                    Στοιχεία Τιμολόγησης
                  </CardTitle>
                </CardHeader>
                <CardContent className='px-0'>
                  <div className='divide-y'>
                    {billing ? (
                      <>
                        <div className='flex items-center justify-between px-6 py-2'>
                          <span className='text-xs text-muted-foreground'>
                            Τύπος
                          </span>
                          <Badge variant='outline' className='text-xs h-5'>
                            {billing.invoice ? 'Τιμολόγιο' : 'Απόδειξη'}
                          </Badge>
                        </div>
                        {billing.invoice && (
                          <>
                            {billing.name && (
                              <div className='flex items-center justify-between px-6 py-2'>
                                <span className='text-xs text-muted-foreground'>
                                  Όνομα
                                </span>
                                <span className='text-xs font-medium'>
                                  {billing.name}
                                </span>
                              </div>
                            )}
                            {billing.afm && (
                              <div className='flex items-center justify-between px-6 py-2'>
                                <span className='text-xs text-muted-foreground'>
                                  ΑΦΜ
                                </span>
                                <span className='text-xs font-mono'>
                                  {billing.afm}
                                </span>
                              </div>
                            )}
                            {billing.doy && (
                              <div className='flex items-center justify-between px-6 py-2'>
                                <span className='text-xs text-muted-foreground'>
                                  ΔΟΥ
                                </span>
                                <span className='text-xs'>{billing.doy}</span>
                              </div>
                            )}
                            {billing.address && (
                              <div className='flex items-center justify-between px-6 py-2'>
                                <span className='text-xs text-muted-foreground'>
                                  Διεύθυνση
                                </span>
                                <span className='text-xs truncate max-w-[120px]' title={billing.address}>
                                  {billing.address}
                                </span>
                              </div>
                            )}
                            {billing.profession && (
                              <div className='flex items-center justify-between px-6 py-2'>
                                <span className='text-xs text-muted-foreground'>
                                  Επάγγελμα
                                </span>
                                <span className='text-xs'>{billing.profession}</span>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <div className='px-6 py-4 text-center'>
                        <span className='text-xs text-muted-foreground'>
                          Δεν υπάρχουν στοιχεία τιμολόγησης
                        </span>
                      </div>
                    )}
                    {subscription.discountCode && (
                      <div className='flex items-center justify-between px-6 py-2'>
                        <span className='text-xs text-muted-foreground'>
                          Κωδικός Έκπτωσης
                        </span>
                        <Badge variant='secondary' className='text-xs h-5'>
                          {subscription.discountCode}
                        </Badge>
                      </div>
                    )}
                    {subscription.discountPercentOff && (
                      <div className='flex items-center justify-between px-6 py-2'>
                        <span className='text-xs text-muted-foreground'>
                          Έκπτωση %
                        </span>
                        <span className='text-xs font-medium text-green-600'>
                          -{subscription.discountPercentOff}%
                        </span>
                      </div>
                    )}
                    {subscription.discountAmountOff && (
                      <div className='flex items-center justify-between px-6 py-2'>
                        <span className='text-xs text-muted-foreground'>
                          Έκπτωση €
                        </span>
                        <span className='text-xs font-medium text-green-600'>
                          -{formatAmount(subscription.discountAmountOff, subscription.currency)}
                        </span>
                      </div>
                    )}
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Δημιουργία
                      </span>
                      <div className='text-right'>
                        <div className='text-xs'>
                          {formatDate(subscription.createdAt)}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          {formatTime(subscription.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Ενημέρωση
                      </span>
                      <div className='text-right'>
                        <div className='text-xs'>
                          {formatDate(subscription.updatedAt)}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          {formatTime(subscription.updatedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Attempts History */}
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm'>
                  Ιστορικό Χρεώσεων
                  <span className='ml-2 text-xs font-normal text-muted-foreground'>
                    ({attemptsTotal})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentAttemptsList attempts={paymentAttempts} variant='full' />
                <HistoryPagination
                  currentPage={currentHistoryPage}
                  totalPages={totalHistoryPages}
                  basePath={`/admin/subscriptions/${subscription.id}`}
                />
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </>
  );
}
