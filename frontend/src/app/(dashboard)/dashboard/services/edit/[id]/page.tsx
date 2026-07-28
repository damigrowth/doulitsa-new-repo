import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/actions/auth/server';
import { getServiceForEdit } from '@/actions/services/get-service';
import { FormServiceEdit } from '@/components/forms/service';
import FormServiceEditMedia from '@/components/forms/service/form-service-edit-media';
import { FormServiceDelete } from '@/components/forms/service/form-service-delete';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusLabels, StatusColors } from '@/lib/types/common';
import { getDashboardMetadata } from '@/lib/seo/pages';
import { NextLink } from '@/components';
import { getServiceTaxonomies, getTags, batchFindTagsByIds } from '@/lib/taxonomies';
import { getAllSubdivisions } from '@/lib/utils/datasets';
import { getUserTaxonomySubmissions } from '@/actions/taxonomy-submission';

export const metadata = getDashboardMetadata('Επεξεργασία Υπηρεσίας');

interface EditServicePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditServicePage({
  params,
}: EditServicePageProps) {
  const { id } = await params;

  // Check authentication
  const userResult = await getCurrentUser();

  if (!userResult.success || !userResult.data.user) {
    redirect('/login');
  }

  const { user, profile } = userResult.data;

  // Check if user can edit services (only professionals)
  if (user.role !== 'freelancer' && user.role !== 'company') {
    redirect('/dashboard');
  }

  // Get the service
  const serviceResult = await getServiceForEdit(Number(id));

  if (!serviceResult.success || !serviceResult.data) {
    notFound();
  }

  // The GET /services/:id/edit endpoint wraps its payload as `{ service: {...} }`.
  // Unwrap it (falling back to the raw payload in case an unwrapped object is
  // ever returned) so `service.status`, `service.title`, etc. resolve correctly.
  // Without this, `service.status` is undefined and StatusColors[...] crashes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = (serviceResult.data as any).service ?? serviceResult.data;

  if (!service) {
    notFound();
  }

  // Defensive: never let an unexpected/missing status value crash the badge.
  const statusStyle =
    StatusColors[service.status as keyof typeof StatusColors] ?? {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-300',
      dot: 'bg-gray-500',
    };

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

  // Fetch user's pending tags
  const pendingResult = await getUserTaxonomySubmissions('tag');
  const pendingTags = pendingResult.success ? pendingResult.data ?? [] : [];

  return (
    <div className='max-w-5xl w-full mx-auto space-y-6 p-2 pr-0'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <div className='flex items-center gap-3'>
            <h1 className='text-2xl font-bold text-gray-900'>
              Επεξεργασία Υπηρεσίας
            </h1>
            <Badge
              className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
              variant='outline'
            >
              {StatusLabels[service.status as keyof typeof StatusLabels] ?? service.status}
            </Badge>
          </div>
          <p className='text-muted-foreground'>
            Επεξεργασία της υπηρεσίας {service.title}
          </p>
        </div>
        <Button variant='default' asChild>
          <NextLink href='/dashboard/services'>Διαχείριση Υπηρεσιών</NextLink>
        </Button>
      </div>

      <div className='space-y-6'>
        {/* Service Info Form */}
        <FormServiceEdit
          service={service}
          initialUser={user}
          initialProfile={profile}
          serviceTaxonomies={serviceTaxonomies}
          allSubdivisions={allSubdivisions}
          availableTags={availableTags}
          pendingTags={pendingTags}
        />

        {/* Service Media Form */}
        <FormServiceEditMedia
          service={service}
          initialUser={user}
          initialProfile={profile}
          showHeading={false}
        />

        {/* Delete Service Section */}
        <FormServiceDelete service={service} />
      </div>
    </div>
  );
}
