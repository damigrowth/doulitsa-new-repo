import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArchiveLayout, ArchiveProfileCard } from '@/components/archives';
import { getProfileArchivePageData } from '@/actions/profiles/get-profiles';
import { getDirectorySubcategoryMetadata } from '@/lib/seo/pages';
import { ProfilesSchema } from '@/lib/seo/schema';

// ISR Configuration
export const dynamic = 'force-dynamic'; // no-store API client & ISR conflict at runtime (next start) -> render on demand
export const dynamicParams = true;

interface DirectorySubcategoryPageProps {
  params: Promise<{
    category: string;
    subcategory: string;
  }>;
  searchParams: Promise<{
    county?: string;
    περιοχή?: string; // Greek parameter for county
    online?: string;
    sortBy?: string;
    page?: string;
    limit?: string;
    type?: 'pros' | 'companies'; // Type filter
  }>;
}

export async function generateMetadata({
  params,
}: DirectorySubcategoryPageProps): Promise<Metadata> {
  const { category: categorySlug, subcategory: subcategorySlug } = await params;
  return getDirectorySubcategoryMetadata(categorySlug, subcategorySlug);
}

export async function generateStaticParams() {
  try {
    // Use the new taxonomy paths function
    const { getProTaxonomyPaths } = await import(
      '@/actions/profiles/get-profiles'
    );
    const result = await getProTaxonomyPaths();

    if (!result.success || !result.data) {
      return [];
    }

    // Generate static params for all category/subcategory combinations
    return result.data
      .filter((path) => path.category && path.subcategory)
      .map((path) => ({
        category: path.category,
        subcategory: path.subcategory,
      }));
  } catch (error) {
    console.error(
      'Error generating static params for directory subcategory:',
      error,
    );
    return [];
  }
}

export default async function DirectorySubcategoryPage({
  params,
  searchParams,
}: DirectorySubcategoryPageProps) {
  const { category: categorySlug, subcategory: subcategorySlug } = await params;
  const searchParams_ = await searchParams;
  const limit = parseInt(searchParams_.limit || '20');

  // Use the comprehensive archive function
  const result = await getProfileArchivePageData({
    archiveType: 'directory',
    categorySlug: categorySlug,
    subcategorySlug: subcategorySlug,
    searchParams: searchParams_,
    limit,
  });

  if (!result.success) {
    if (
      result.error === 'Category not found' ||
      result.error === 'Subcategory not found'
    ) {
      notFound();
    }
    throw new Error(result.error || 'Failed to fetch profiles');
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
      category={categorySlug}
      subcategory={subcategorySlug}
      initialFilters={filters}
      taxonomyData={taxonomyData}
      breadcrumbData={breadcrumbData}
      counties={counties}
      basePath={`/dir/${categorySlug}/${subcategorySlug}`}
      total={total}
      limit={limit}
      availableSubdivisions={availableSubcategories}
    >
      <div className='space-y-6'>
        {profiles.length === 0 ? (
          <div className='text-center py-12'>
            <h3 className='text-lg font-medium text-gray-900 mb-2'>
              Δεν βρέθηκαν επαγγελματίες στην υποκατηγορία "
              {taxonomyData.currentSubcategory?.label}"
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
