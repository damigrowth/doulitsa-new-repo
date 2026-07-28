import { requirePermission } from '@/actions/auth/server';
import { getReview } from '@/actions/admin/reviews';
import { notFound } from 'next/navigation';
import { ADMIN_RESOURCES } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SiteHeader } from '@/components/admin/site-header';
import { AdminReviewActions } from '@/components/admin/admin-review-actions';
import { formatDate, formatTime } from '@/lib/utils/date';
import { NextLink } from '@/components';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Helper function for status badge
function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'approved':
      return 'default' as const;
    case 'rejected':
      return 'destructive' as const;
    case 'pending':
      return 'outline' as const;
    default:
      return 'outline' as const;
  }
}

function getStatusBadgeClassName(status: string) {
  if (status === 'pending') {
    return 'border-yellow-500 text-yellow-600 bg-yellow-50';
  }
  return '';
}

// Helper function for type badge
function getTypeBadgeVariant(type: string) {
  return type === 'SERVICE' ? 'secondary' : 'outline';
}

export default async function AdminReviewDetailPage({ params }: PageProps) {
  // Verify permission to view reviews
  await requirePermission(ADMIN_RESOURCES.REVIEWS, '/admin/reviews');

  // Get review ID from params
  const { id: reviewId } = await params;

  // Fetch the review
  const reviewResult = await getReview(reviewId);

  if (!reviewResult.success || !reviewResult.data) {
    notFound();
  }

  const review = reviewResult.data as any;

  return (
    <>
      <SiteHeader
        title='Review Details'
        actions={
          <>
            <Button variant='ghost' size='sm' asChild>
              <NextLink href='/admin/reviews'>
                <ArrowLeft className='h-4 w-4' />
                Reviews
              </NextLink>
            </Button>
            <Button variant='outline' size='sm' asChild>
              <NextLink
                href={`/profile/${review.profile.username}`}
                target='_blank'
              >
                <ExternalLink className='h-4 w-4' />
                View Profile
              </NextLink>
            </Button>
            <Button variant='outline' size='sm' asChild>
              <NextLink
                href={`/admin/users/${review.authorId}`}
                target='_blank'
              >
                <ExternalLink className='h-4 w-4' />
                View User
              </NextLink>
            </Button>
            {review.type === 'SERVICE' && review.service && (
              <Button variant='outline' size='sm' asChild>
                <NextLink
                  href={`/s/${review.service.slug}`}
                  target='_blank'
                >
                  <ExternalLink className='h-4 w-4' />
                  View Service
                </NextLink>
              </Button>
            )}
          </>
        }
      />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='mx-auto w-full max-w-5xl px-4 lg:px-6'>
          <div className='space-y-6'>
            {/* Review Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Review Information</CardTitle>
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
                          variant={getStatusBadgeVariant(review.status)}
                          className={getStatusBadgeClassName(review.status)}
                        >
                          {review.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Rating
                      </span>
                      <div className='mt-1 flex items-center gap-1'>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className='ml-2 text-sm font-medium'>
                          ({review.rating}/5)
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Type
                      </span>
                      <div className='mt-1'>
                        <Badge variant={getTypeBadgeVariant(review.type)}>
                          {review.type}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Published
                      </span>
                      <div className='mt-1'>
                        <Badge
                          variant={review.published ? 'default' : 'outline'}
                          className={
                            review.published
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : ''
                          }
                        >
                          {review.published ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Visibility
                      </span>
                      <div className='mt-1'>
                        <Badge
                          variant={review.visibility ? 'default' : 'outline'}
                          className={
                            review.visibility
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : ''
                          }
                        >
                          {review.visibility ? 'Visible' : 'Hidden'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Author
                      </span>
                      <p className='text-sm font-medium mt-1'>
                        {review.author.displayName || review.author.name}{' '}
                        <span className='text-muted-foreground'>
                          ({review.author.email})
                        </span>
                      </p>
                      <p className='text-xs text-muted-foreground mt-1'>
                        Role: {review.author.role}
                      </p>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className='space-y-4'>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Reviewed Profile
                      </span>
                      <p className='text-sm font-medium mt-1'>
                        {review.profile.displayName}{' '}
                        <span className='text-muted-foreground'>
                          (@{review.profile.username})
                        </span>
                      </p>
                      <p className='text-xs text-muted-foreground mt-1'>
                        Type: {review.profile.type}
                      </p>
                    </div>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Service
                      </span>
                      <p className='text-sm font-medium mt-1'>
                        {review.service ? (
                          <NextLink
                            href={`/s/${review.service.slug}`}
                            className='text-primary hover:underline'
                            target='_blank'
                          >
                            {review.service.title}
                          </NextLink>
                        ) : (
                          '—'
                        )}
                      </p>
                    </div>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Comment
                      </span>
                      <p className='text-sm mt-1 leading-relaxed'>
                        {review.comment || (
                          <span className='text-muted-foreground'>
                            No comment
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Created
                      </span>
                      <p className='text-sm font-medium mt-1'>
                        {formatDate(review.createdAt)} at{' '}
                        {formatTime(review.createdAt)}
                      </p>
                    </div>
                    <div>
                      <span className='text-sm text-muted-foreground'>
                        Updated
                      </span>
                      <p className='text-sm font-medium mt-1'>
                        {formatDate(review.updatedAt)} at{' '}
                        {formatTime(review.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <AdminReviewActions
              reviewId={review.id}
              authorName={
                review.author.displayName ||
                review.author.name ||
                'Unknown User'
              }
              currentStatus={review.status}
              currentPublished={review.published}
              currentVisibility={review.visibility}
            />
          </div>
        </div>
      </div>
    </>
  );
}
