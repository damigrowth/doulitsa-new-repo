import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServiceArchivePageData } from '@/actions/services/get-services';
import { getCategoriesPageData } from '@/actions/services/get-categories';
import { ArchiveBanner } from '@/components/archives/archive-banner';
import { SubdivisionsCarousel } from '@/components/archives/subdivisions-carousel';
import { CategoriesGrid } from '@/components/archives/categories-grid';
import { getCategoryMetadata } from '@/lib/seo/pages';
import TaxonomyTabs from '@/components/shared/taxonomy-tabs';
import DynamicBreadcrumb from '@/components/shared/dynamic-breadcrumb';
import { CategoriesSchema } from '@/lib/seo/schema';

// ISR Configuration
export const dynamic = 'force-dynamic'; // no-store API client & ISR conflict at runtime (next start) -> render on demand
export const dynamicParams = true;

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
  searchParams: Promise<{
    county?: string;
    περιοχή?: string; // Greek parameter for county
    online?: string;
    sortBy?: string;
    page?: string;
  }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category: categorySlug } = await params;
  return getCategoryMetadata(categorySlug);
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

    // Generate static params for all categories that have services
    const uniqueCategories = Array.from(
      new Set(
        result.data
          .filter((path) => path.category)
          .map((path) => path.category!),
      ),
    );

    return uniqueCategories.map((category) => ({
      category,
    }));
  } catch (error) {
    console.error('Error generating static params for category:', error);
    return [];
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { category: categorySlug } = await params;
  const searchParams_ = await searchParams;

  try {
    // Get data for taxonomy tabs and filtered categories page content
    const [archiveDataResult, categoriesDataResult] = await Promise.all([
      getServiceArchivePageData({
        categorySlug,
        searchParams: searchParams_,
      }),
      getCategoriesPageData({
        categorySlug, // Filter by category
      }),
    ]);

    if (!archiveDataResult.success) {
      if (archiveDataResult.error?.includes('not found')) {
        notFound();
      }
      throw new Error(
        archiveDataResult.error || 'Failed to fetch archive data',
      );
    }

    if (!categoriesDataResult.success) {
      throw new Error(
        categoriesDataResult.error || 'Failed to fetch categories data',
      );
    }

    const { taxonomyData: archiveTaxonomyData } = archiveDataResult.data;
    const { subdivisions, categories } = categoriesDataResult.data;

    // Ensure we have a valid category
    if (!archiveTaxonomyData.currentCategory) {
      notFound();
    }

    // Custom breadcrumb for specific category page
    const categoryBreadcrumb = {
      segments: [
        { label: 'Αρχική', href: '/' },
        { label: 'Κατηγορίες', href: '/categories' },
        { label: archiveTaxonomyData.currentCategory.label },
      ],
    };

    return (
      <div className='py-20 bg-silver'>
        <CategoriesSchema categories={categories} />
        {/* Category Navigation Tabs */}
        <TaxonomyTabs activeItemSlug={categorySlug} />

        {/* Breadcrumb Navigation */}
        <DynamicBreadcrumb segments={categoryBreadcrumb.segments} />

        {/* Archive Banner */}
        <ArchiveBanner
          title={archiveTaxonomyData.currentCategory.label}
          subtitle={
            archiveTaxonomyData.currentCategory.description ||
            `Ανακάλυψε όλες τις υπηρεσίες στην κατηγορία ${archiveTaxonomyData.currentCategory.label.toLowerCase()} από τους καλύτερους επαγγελματίες.`
          }
          image={archiveTaxonomyData.currentCategory.image}
        />

        {/* Page Content */}
        <section>
          <div className='container mx-auto px-4'>
            <div className='mt-6 mb-16 space-y-10'>
              {/* Subdivisions Carousel - filtered by category */}
              {subdivisions && subdivisions.length > 0 && (
                <SubdivisionsCarousel
                  subdivisions={subdivisions}
                  gradientColor='silver'
                />
              )}

              {/* Categories Grid - shows subcategories of current category */}
              <CategoriesGrid categories={categories} />
            </div>
          </div>
        </section>
      </div>
    );
  } catch (error) {
    console.error('Category page error:', error);
    throw error;
  }
}
