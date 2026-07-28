import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArchiveLayout, ArchiveProfileCard } from '@/components/archives';
import { getProfileArchivePageData } from '@/actions/profiles/get-profiles';
import { getDirectoryCategoryMetadata } from '@/lib/seo/pages';
import { ProfilesSchema } from '@/lib/seo/schema';

// ISR Configuration
export const dynamic = 'force-dynamic'; // no-store API client & ISR conflict at runtime (next start) -> render on demand
export const dynamicParams = true;

interface DirectoryCategoryPageProps {
  params: Promise<{
    category: string;
  }>;
  searchParams: Promise<{
    county?: string;
    περιοχή?: string;
    online?: string;
    sortBy?: string;
    page?: string;
    limit?: string;
    type?: 'pros' | 'companies'; // Type filter
  }>;
}

export async function generateMetadata({
  params,
}: DirectoryCategoryPageProps): Promise<Metadata> {
  const params_ = await params;
  return getDirectoryCategoryMetadata(params_.category);
}

export async function generateStaticParams() {
  try {
    const { getProTaxonomyPaths } = await import(
      '@/actions/profiles/get-profiles'
    );
    const result = await getProTaxonomyPaths();

    if (!result.success || !result.data) {
      return [];
    }

    const uniqueCategories = [
      ...new Set(
        result.data
          .filter((path) => path.category)
          .map((path) => path.category),
      ),
    ];

    return uniqueCategories.map((category) => ({
      category: category,
    }));
  } catch (error) {
    console.error(
      'Error generating static params for directory category:',
      error,
    );
    return [];
  }
}

export default async function DirectoryCategoryPage({
  params,
  searchParams,
}: DirectoryCategoryPageProps) {
  const params_ = await params;
  const searchParams_ = await searchParams;
  const limit = parseInt(searchParams_.limit || '20');

  const result = await getProfileArchivePageData({
    archiveType: 'directory',
    categorySlug: params_.category,
    searchParams: searchParams_,
    limit,
  });

  if (!result.success) {
    notFound();
  }

  const { profiles, total, taxonomyData, breadcrumbData, counties, filters, availableSubcategories } =
    result.data;

  // Determine type based on filters or default to 'freelancer'
  const profileType: 'company' | 'freelancer' =
    filters.type === 'companies' ? 'company' : 'freelancer';

  return (
    <>
      <ProfilesSchema
        type={profileType}
        profiles={profiles}
        taxonomies={{
          category: taxonomyData.currentCategory,
          subcategory: taxonomyData.currentSubcategory,
        }}
      />
      <ArchiveLayout
      archiveType='directory'
      category={params_.category}
      initialFilters={filters}
      taxonomyData={taxonomyData}
      breadcrumbData={breadcrumbData}
      counties={counties}
      basePath={`/dir/${params_.category}`}
      total={total}
      limit={limit}
      availableSubdivisions={availableSubcategories}
    >
      <div className='space-y-6'>
        {profiles.length === 0 ? (
          <div className='text-center py-12'>
            <h3 className='text-lg font-medium text-gray-900 mb-2'>
              Δεν βρέθηκαν επαγγελματίες στην κατηγορία "
              {taxonomyData.currentCategory?.label}"
            </h3>
            <p className='text-gray-600'>
              Δοκιμάστε να αλλάξετε τα φίλτρα αναζήτησης ή επιλέξτε μια άλλη
              κατηγορία
            </p>
          </div>
        ) : (
          profiles.map((profile) => (
            <ArchiveProfileCard key={profile.id} profile={profile} />
          ))
        )}
      </div>
    </ArchiveLayout>
    </>
  );
}
