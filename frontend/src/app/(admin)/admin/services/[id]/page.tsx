import { requirePermission, hasPermission } from '@/actions/auth/server';
import { getService } from '@/actions/admin/services';
import { redirect, notFound } from 'next/navigation';
import { ADMIN_RESOURCES } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, ExternalLink, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  EditServiceBasicForm,
  EditServiceTaxonomyForm,
  EditServicePricingForm,
  EditServiceSettingsForm,
  EditServiceAddonsForm,
  EditServiceFaqForm,
  EditServiceMediaForm,
} from '@/components/admin/forms';
import { FormServiceDelete } from '@/components/forms/service/form-service-delete';
import { SiteHeader } from '@/components/admin/site-header';
import { getServiceTaxonomies, getTags } from '@/lib/taxonomies';
import { getAllSubdivisions } from '@/lib/utils/datasets';
import { NextLink } from '@/components';
import { formatServiceType } from '@/lib/utils/service';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminServiceDetailPage({ params }: PageProps) {
  // Verify permission to view services
  await requirePermission(ADMIN_RESOURCES.SERVICES, '/admin/services');

  // Check if user can view profiles (for conditional rendering)
  const canViewProfiles = await hasPermission(ADMIN_RESOURCES.PROFILES);

  // Get service ID from params
  const { id } = await params;
  const serviceId = parseInt(id);

  if (isNaN(serviceId)) {
    redirect('/admin/services');
  }

  // Fetch the service
  const serviceResult = await getService(serviceId);

  if (!serviceResult.success || !serviceResult.data) {
    notFound();
  }

  const service = serviceResult.data as any;

  // Prepare taxonomy data server-side to prevent client-side bundle bloat
  const serviceTaxonomies = getServiceTaxonomies();
  const subdivisions = getAllSubdivisions(serviceTaxonomies);
  const allSubdivisions = subdivisions.map((subdivision) => ({
    id: subdivision.id,
    label: `${subdivision.label}`,
    subdivision: subdivision,
    subcategory: subdivision.subcategory,
    category: subdivision.category,
  }));
  const tags = getTags();
  const availableTags = tags.map((tag) => ({
    value: tag.id,
    label: tag.label,
  }));

  // Resolve taxonomy labels
  const categoryData = serviceTaxonomies.find(
    (cat) => cat.id === service.category,
  );
  const subcategoryData = categoryData?.children?.find(
    (sub) => sub.id === service.subcategory,
  );
  const subdivisionData = subcategoryData?.children?.find(
    (div) => div.id === service.subdivision,
  );

  const categoryLabel = categoryData?.label || service.category;
  const subcategoryLabel = subcategoryData?.label || service.subcategory;
  const subdivisionLabel = subdivisionData?.label || service.subdivision;

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
      draft: 'outline',
      pending: 'secondary',
      published: 'default',
      approved: 'default',
      rejected: 'destructive',
      inactive: 'outline',
    };
    return variants[status] || 'outline';
  };

  return (
    <>
      <SiteHeader
        title={service.title || 'Service Details'}
        actions={
          <>
            <Button variant='ghost' size='sm' asChild>
              <NextLink href='/admin/services'>
                <ArrowLeft className='h-4 w-4' />
                Services
              </NextLink>
            </Button>
            {canViewProfiles && (
              <Button variant='outline' size='sm' asChild>
                <NextLink href={`/admin/profiles/${service.profile.id}`}>
                  <User className='h-4 w-4' />
                  Edit Profile
                </NextLink>
              </Button>
            )}
            <Button variant='outline' size='sm' asChild>
              <NextLink href={`/profile/${service.profile.username}`}>
                <ExternalLink className='h-4 w-4' />
                View Profile
              </NextLink>
            </Button>
            <Button variant='outline' size='sm' asChild>
              <NextLink href={`/s/${service.slug}`} target='_blank'>
                <Eye className='h-4 w-4' />
                Public View
              </NextLink>
            </Button>
          </>
        }
      />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='px-4 lg:px-6'>
          <div className='space-y-6 pb-16'>
            {/* Service Overview - 4 Tables */}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
              {/* Service Information */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>
                    Πληροφορίες Υπηρεσίας
                  </CardTitle>
                </CardHeader>
                <CardContent className='px-0'>
                  <div className='divide-y'>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Service ID
                      </span>
                      <span className='text-xs font-mono'>{service.id}</span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Profile
                      </span>
                      <NextLink
                        href={`/profile/${service.profile.username}`}
                        className='flex items-center gap-1.5 text-xs font-medium hover:underline'
                      >
                        <ExternalLink className='h-3 w-3' />
                        {service.profile.displayName}
                      </NextLink>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Category
                      </span>
                      <span className='text-xs font-medium'>
                        {categoryLabel}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Subcategory
                      </span>
                      <span className='text-xs font-medium'>
                        {subcategoryLabel}
                      </span>
                    </div>
                    {service.subdivision && (
                      <div className='flex items-center justify-between px-6 py-2'>
                        <span className='text-xs text-muted-foreground'>
                          Subdivision
                        </span>
                        <span className='text-xs font-medium'>
                          {subdivisionLabel}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Status & Flags */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>Status & Flags</CardTitle>
                </CardHeader>
                <CardContent className='px-0'>
                  <div className='divide-y'>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Status
                      </span>
                      <Badge
                        variant={getStatusBadge(service.status)}
                        className='text-xs h-5'
                      >
                        {service.status}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Featured
                      </span>
                      <Badge
                        variant={service.featured ? 'default' : 'outline'}
                        className='text-xs h-5'
                      >
                        {service.featured ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Fixed Price
                      </span>
                      <Badge
                        variant={service.fixed ? 'default' : 'outline'}
                        className='text-xs h-5'
                      >
                        {service.fixed ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Has Media
                      </span>
                      <Badge
                        variant={
                          service.media && service.media.length > 0
                            ? 'default'
                            : 'outline'
                        }
                        className='text-xs h-5'
                      >
                        {service.media && service.media.length > 0
                          ? 'Yes'
                          : 'No'}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Type
                      </span>
                      <span className='text-xs font-medium'>
                        {formatServiceType(service.type).join(', ')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing & Duration */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>Pricing & Duration</CardTitle>
                </CardHeader>
                <CardContent className='px-0'>
                  <div className='divide-y'>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Price
                      </span>
                      <span className='text-xs font-medium'>
                        {service.fixed ? `${service.price}€` : 'Hidden'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Duration
                      </span>
                      <span className='text-xs font-medium'>
                        {service.duration ? `${service.duration} days` : 'N/A'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Subscription
                      </span>
                      <span className='text-xs font-medium'>
                        {service.subscriptionType || 'None'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Tags
                      </span>
                      <span className='text-xs font-medium'>
                        {service.tags?.length || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity & Stats */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>Activity & Stats</CardTitle>
                </CardHeader>
                <CardContent className='px-0'>
                  <div className='divide-y'>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Reviews
                      </span>
                      <span className='text-xs font-medium'>
                        {service._count?.reviews || 0}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Rating
                      </span>
                      <span className='text-xs font-medium'>
                        {service.rating?.toFixed(1) || 'N/A'} ⭐
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        FAQ Items
                      </span>
                      <span className='text-xs font-medium'>
                        {service.faq?.length || 0}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Addons
                      </span>
                      <span className='text-xs font-medium'>
                        {service.addons?.length || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Service Management Forms - LAST SECTION */}
            <div className='mx-auto w-full max-w-5xl px-4 lg:px-6 space-y-6'>
              <div>
                <h2>Διαχείριση Υπηρεσίας</h2>
              </div>

              <div className='space-y-6'>
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EditServiceSettingsForm service={service} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Πληροφορίες</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EditServiceBasicForm service={service} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Κατηγορία & Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EditServiceTaxonomyForm
                      service={service}
                      allSubdivisions={allSubdivisions}
                      availableTags={availableTags}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>
                      Pricing & Duration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EditServicePricingForm service={service} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Addons</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EditServiceAddonsForm service={service} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Συχνές Ερωτήσεις</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EditServiceFaqForm service={service} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Media</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EditServiceMediaForm service={service} />
                  </CardContent>
                </Card>

                {/* Delete Service Section */}
                <FormServiceDelete service={service} isAdmin />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
