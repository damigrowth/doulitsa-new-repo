import { getServiceArchivePageData } from '@/actions/services/get-services';
import { getCategoriesPageData } from '@/actions/services/get-categories';
import { ArchiveBanner } from '@/components/archives/archive-banner';
import { SubdivisionsCarousel } from '@/components/archives/subdivisions-carousel';
import { CategoriesGrid } from '@/components/archives/categories-grid';
import { getCategoriesMetadata } from '@/lib/seo/pages';
import TaxonomyTabs from '@/components/shared/taxonomy-tabs';
import DynamicBreadcrumb from '@/components/shared/dynamic-breadcrumb';
import { CategoriesSchema } from '@/lib/seo/schema';

// Rendered on demand: aggregates the full live service catalog from the Django
// API, so it's rendered per-request rather than statically exported.
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateMetadata() {
  return getCategoriesMetadata();
}

export async function generateStaticParams() {
  // Return empty array for the base /categories route (no dynamic params needed)
  return [];
}

export default async function CategoriesPage() {
  try {
    // Get data for taxonomy tabs and categories page content
    const [archiveDataResult, categoriesDataResult] = await Promise.all([
      getServiceArchivePageData({
        searchParams: {},
      }),
      getCategoriesPageData(),
    ]);

    if (!archiveDataResult.success) {
      throw new Error(
        archiveDataResult.error || 'Failed to fetch archive data',
      );
    }

    if (!categoriesDataResult.success) {
      throw new Error(
        categoriesDataResult.error || 'Failed to fetch categories data',
      );
    }

    const { taxonomyData } = archiveDataResult.data;
    const { subdivisions, categories } = categoriesDataResult.data;

    // Custom breadcrumb for categories page
    const categoriesBreadcrumb = {
      segments: [{ label: 'Αρχική', href: '/' }, { label: 'Κατηγορίες' }],
    };

    return (
      <div className='py-20 bg-silver'>
        <CategoriesSchema categories={categories} />
        {/* Category Navigation Tabs */}
        <TaxonomyTabs />

        {/* Breadcrumb Navigation */}
        <DynamicBreadcrumb segments={categoriesBreadcrumb.segments} />

        {/* Archive Banner */}
        <ArchiveBanner
          title='Όλες οι Κατηγορίες'
          subtitle='Ανακάλυψε όλες τις υπηρεσίες για κάθε ανάγκη από τους καλύτερους επαγγελματίες.'
        />

        {/* Page Content */}
        <section>
          <div className='container mx-auto px-4'>
            <div className='mt-6 mb-16 space-y-10'>
              {/* Subdivisions Carousel */}
              <SubdivisionsCarousel
                subdivisions={subdivisions}
                gradientColor='silver'
              />

              {/* Categories Grid */}
              <CategoriesGrid categories={categories} />
            </div>
          </div>
        </section>
      </div>
    );
  } catch (error) {
    console.error('Categories page error:', error);
    throw error;
  }
}
