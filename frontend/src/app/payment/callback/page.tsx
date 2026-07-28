import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { CallbackRedirect } from './callback-redirect';

/**
 * Public intermediate page for payment provider callbacks.
 *
 * Cardlink redirects here after payment via a POST-initiated 302.
 * Due to SameSite cookie policy, session cookies aren't sent on
 * cross-origin POST redirects. This page performs a client-side
 * navigation to the actual dashboard page, which sends cookies
 * because it's a same-origin navigation.
 */
export default async function PaymentCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string; canceled?: string }>;
}) {
  const { status, error, canceled } = await searchParams;

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='text-center space-y-4'>
        <Loader2 className='size-8 animate-spin mx-auto text-muted-foreground' />
        <p className='text-muted-foreground'>Ολοκλήρωση πληρωμής...</p>
      </div>
      <Suspense fallback={null}>
        <CallbackRedirect status={status} error={error} canceled={canceled} />
      </Suspense>
    </div>
  );
}
