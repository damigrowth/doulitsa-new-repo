import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArchiveLayout, ArchiveServiceCard } from '@/components/archives';
import { getServiceArchivePageData } from '@/actions/services/get-services';
import { getServiceSubcategoryMetadata } from '@/lib/seo/pages';
import { ServicesSchema } from '@/lib/seo/schema';

// ISR Configuration
export const dynamic = 'force-dynamic'; // no-store API client & ISR conflict at runtime (next start) -> render on demand
export const dynamicParams = true;

interface SubcategoryPageProps {
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
  }>;
}

export async function generateMetadata({
  params,
}: SubcategoryPageProps): Promise<Metadata> {
  const { subcategory: subcategorySlug } = await params;
  return getServiceSubcategoryMetadata(subcategorySlug);
}

export async function generateStaticParams() {
  try {
    const { getServiceTaxonomyPaths } = await import(
      '@/actions/services/get-services'
    );
    const result = await getServiceTaxonomyPaths();

    if (!result.success || !result.data) {
      return [];
    }

    // Generate static params for all category/subcategory combinations that have services
    return result.data
      .filter((path) => path.category && path.subcategory)
      .map((path) => ({
        category: path.category!,
        subcategory: path.subcategory!,
      }));
  } catch (error) {
    console.error('Error generating static params for subcategory:', error);
    return [];
  }
}

export default async function ServicesSubcategoryPage({
  params,
  searchParams,
}: SubcategoryPageProps) {
  const { category: categorySlug, subcategory: subcategorySlug } = await params;
  const searchParams_ = await searchParams;
  const limit = parseInt(searchParams_.limit || '20');

  // Use the comprehensive server action
  const result = await getServiceArchivePageData({
    categorySlug,
    subcategorySlug,
    searchParams: searchParams_,
    limit,
  });

  if (!result.success) {
    if (result.error?.includes('not found')) {
      notFound();
    }
    throw new Error(result.error || 'Failed to fetch services');
  }

  const { services, total, taxonomyData, breadcrumbData, counties, filters, availableSubdivisions } =
    result.data;

  return (
    <>
      <ServicesSchema
        services={services}
        taxonomies={{
          category: taxonomyData.currentCategory,
          subcategory: taxonomyData.currentSubcategory,
          subdivision: taxonomyData.currentSubdivision,
        }}
      />
      <ArchiveLayout
      archiveType='services'
      category={categorySlug}
      subcategory={subcategorySlug}
      initialFilters={filters}
      taxonomyData={taxonomyData}
      breadcrumbData={breadcrumbData}
      counties={counties}
      basePath={`/ipiresies/${subcategorySlug}`}
      total={total}
      limit={limit}
      availableSubdivisions={availableSubdivisions}
    >
      <div className='space-y-6'>
        {services.length === 0 ? (
          <div className='text-center py-12'>
            <h3 className='text-lg font-medium text-gray-900 mb-2'>
              Δεν βρέθηκαν υπηρεσίες στην υποκατηγορία "
              {taxonomyData.currentSubcategory?.label}"
            </h3>
            <p className='text-gray-600'>
              Δοκιμάστε να αλλάξετε τα φίλτρα αναζήτησης ή επιλέξτε μια άλλη
              κατηγορία
            </p>
          </div>
        ) : (
          services.map((service) => (
            <ArchiveServiceCard key={service.id} service={service} />
          ))
        )}
      </div>
    </ArchiveLayout>
    </>
  );
}
