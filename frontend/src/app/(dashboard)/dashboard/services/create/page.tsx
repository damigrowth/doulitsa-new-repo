import { FormCreateService } from '@/components';
import { getCurrentUser } from '@/actions/auth/server';
import { redirect } from 'next/navigation';
import React from 'react';
import { getDashboardMetadata } from '@/lib/seo/pages';
import { getServiceTaxonomies, getTags } from '@/lib/taxonomies';
import { getAllSubdivisions } from '@/lib/utils/datasets';
import { getUserTaxonomySubmissions } from '@/actions/taxonomy-submission';
import { canCreateService } from '@/lib/subscription/feature-gate';
import ServiceLimitSheet from '@/components/dashboard/services/service-limit-sheet';

export const metadata = getDashboardMetadata('Δημιουργία Υπηρεσίας');

export default async function CreateServicePage() {
  // Fetch current user server-side
  const userResult = await getCurrentUser();

  if (!userResult.success || !userResult.data.user) {
    redirect('/login');
  }

  const { user, profile } = userResult.data;

  // Check if user can create services (only professionals)
  if (user.role !== 'freelancer' && user.role !== 'company') {
    redirect('/dashboard');
  }

  // Check service limit — show upgrade sheet instead of form when at max
  const canCreate = profile?.id
    ? await canCreateService(profile.id)
    : true;

  if (!canCreate) {
    return <ServiceLimitSheet />;
  }

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
    <FormCreateService
      initialUser={user}
      initialProfile={profile}
      serviceTaxonomies={serviceTaxonomies}
      allSubdivisions={allSubdivisions}
      availableTags={availableTags}
      pendingTags={pendingTags}
    />
  );
}
