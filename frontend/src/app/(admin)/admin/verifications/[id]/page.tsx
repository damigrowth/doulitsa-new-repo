import { requirePermission } from '@/actions/auth/server';
import { getVerification } from '@/actions/admin/verifications';
import { redirect, notFound } from 'next/navigation';
import { ADMIN_RESOURCES } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SiteHeader } from '@/components/admin/site-header';
import { AdminVerificationActions } from '@/components/admin/admin-verification-actions';
import { formatDate, formatTime } from '@/lib/utils/date';
import { NextLink } from '@/components';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Helper function for status badge
function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'default' as const;
    case 'REJECTED':
      return 'destructive' as const;
    case 'PENDING':
      return 'outline' as const;
    default:
      return 'outline' as const;
  }
}

function getStatusBadgeClassName(status: string) {
  if (status === 'PENDING') {
    return 'border-yellow-500 text-yellow-600 bg-yellow-50';
  }
  return '';
}

export default async function AdminVerificationDetailPage({
  params,
}: PageProps) {
  // Verify permission to view verifications
  await requirePermission(ADMIN_RESOURCES.VERIFICATIONS, '/admin/verifications');

  // Get verification ID from params
  const { id: verificationId } = await params;

  // Fetch the verification
  const verificationResult = await getVerification(verificationId);

  if (!verificationResult.success || !verificationResult.data) {
    notFound();
  }

  const verification = verificationResult.data as any;

  return (
    <>
      <SiteHeader
        title='Verification Details'
        actions={
          <>
            <Button variant='ghost' size='sm' asChild>
              <NextLink href='/admin/verifications'>
                <ArrowLeft className='h-4 w-4' />
                Verifications
              </NextLink>
            </Button>
            <Button variant='outline' size='sm' asChild>
              <NextLink
                href={`/admin/profiles/${verification.pid}`}
                target='_blank'
              >
                <ExternalLink className='h-4 w-4' />
                View Profile
              </NextLink>
            </Button>
            <Button variant='outline' size='sm' asChild>
              <NextLink
                href={`/admin/users/${verification.uid}`}
                target='_blank'
              >
                <ExternalLink className='h-4 w-4' />
                View User
              </NextLink>
            </Button>
          </>
        }
      />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='mx-auto w-full max-w-5xl px-4 lg:px-6'>
          <div className='space-y-6'>
            {/* Verification Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Verification Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-2 gap-6'>
                  {/* Left Column */}
                  <div className='space-y-4'>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Status
                      </span>
                      <div className='mt-1'>
                        <Badge
                          variant={getStatusBadgeVariant(verification.status)}
                          className={getStatusBadgeClassName(
                            verification.status,
                          )}
                        >
                          {verification.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className='text-sm text-muted-foreground'>AFM</span>
                      <p className='text-sm font-medium mt-1'>
                        {verification.afm || '—'}
                      </p>
                    </div>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Business Name
                      </span>
                      <p className='text-sm font-medium mt-1'>
                        {verification.name || '—'}
                      </p>
                    </div>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Phone
                      </span>
                      <p className='text-sm font-medium mt-1'>
                        {verification.phone || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className='space-y-4'>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Address
                      </span>
                      <p className='text-sm font-medium mt-1'>
                        {verification.address || '—'}
                      </p>
                    </div>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Created
                      </span>
                      <p className='text-sm font-medium mt-1'>
                        {formatDate(verification.createdAt)} at{' '}
                        {formatTime(verification.createdAt)}
                      </p>
                    </div>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Updated
                      </span>
                      <p className='text-sm font-medium mt-1'>
                        {formatDate(verification.updatedAt)} at{' '}
                        {formatTime(verification.updatedAt)}
                      </p>
                    </div>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Profile
                      </span>
                      <p className='text-sm font-medium mt-1'>
                        {verification.profile.displayName || 'Unnamed Profile'}{' '}
                        <span className='text-muted-foreground'>
                          ({verification.profile.user.email})
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <AdminVerificationActions
              verificationId={verification.id}
              profileName={
                verification.profile.displayName || 'Unnamed Profile'
              }
              currentStatus={verification.status}
            />
          </div>
        </div>
      </div>
    </>
  );
}
