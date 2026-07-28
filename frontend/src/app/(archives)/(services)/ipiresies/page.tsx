import { ArchiveLayout, ArchiveServiceCard } from '@/components/archives';
import { getServiceArchivePageData } from '@/actions/services/get-services';
import { getServicesMetadata } from '@/lib/seo/pages';
import { ServicesSchema } from '@/lib/seo/schema';

// ISR Configuration
export const dynamic = 'force-dynamic'; // no-store API client & ISR conflict at runtime (next start) -> render on demand
export const dynamicParams = true;

export async function generateMetadata() {
  return getServicesMetadata();
}

interface ServicesPageProps {
  searchParams: Promise<{
    county?: string;
    περιοχή?: string; // Greek parameter for county
    online?: string;
    sortBy?: string;
    page?: string;
    limit?: string;
    search?: string; // Search query parameter
  }>;
}

export async function generateStaticParams() {
  // Return empty array for the base /services route (no dynamic params needed)
  return [];
}

export default async function ServicesPage({
  searchParams,
}: ServicesPageProps) {
  const searchParams_ = await searchParams;
  const limit = parseInt(searchParams_.limit || '20');

  // Use the comprehensive server action
  const result = await getServiceArchivePageData({
    searchParams: searchParams_,
    limit,
  });

  if (!result.success) {
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
      initialFilters={filters}
      taxonomyData={taxonomyData}
      breadcrumbData={breadcrumbData}
      counties={counties}
      basePath='/ipiresies'
      total={total}
      limit={limit}
      availableSubdivisions={availableSubdivisions}
    >
      <div className='space-y-6'>
        {services.length === 0 ? (
          <div className='text-center py-12'>
            <h3 className='text-lg font-medium text-gray-900 mb-2'>
              Δεν βρέθηκαν υπηρεσίες
            </h3>
            <p className='text-gray-600'>
              Δοκιμάστε να αλλάξετε τα φίλτρα αναζήτησης
            </p>
          </div>
        ) : (
          services.map((service) => {
            return <ArchiveServiceCard key={service.id} service={service} />;
          })
        )}
      </div>
    </ArchiveLayout>
    </>
  );
}
