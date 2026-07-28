import { getDirectoryPageData } from '@/actions/profiles/get-directory';
import TaxonomyTabs from '@/components/shared/taxonomy-tabs';
import DynamicBreadcrumb from '@/components/shared/dynamic-breadcrumb';
import { ArchiveBanner } from '@/components/archives/archive-banner';
import { SubdivisionsCarousel } from '@/components/archives/subdivisions-carousel';
import { CategoriesGrid } from '@/components/archives/categories-grid';
import { getDirectoryMetadata } from '@/lib/seo/pages';
import { DirectorySchema } from '@/lib/seo/schema';

// Rendered on demand: this landing page aggregates the full live directory from
// the Django API, so it's rendered per-request rather than statically exported.
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateMetadata() {
  return getDirectoryMetadata();
}

export async function generateStaticParams() {
  return [];
}

export default async function DirectoryPage() {
  try {
    const directoryDataResult = await getDirectoryPageData();

    if (!directoryDataResult.success) {
      throw new Error(
        directoryDataResult.error || 'Failed to fetch directory data',
      );
    }

    const { popularSubcategories, categories } = directoryDataResult.data;

    return (
      <div className='py-20 bg-silver'>
        <DirectorySchema categories={categories} />
        {/* Category Navigation Tabs */}
        <TaxonomyTabs />

        {/* Breadcrumb Navigation */}
        <DynamicBreadcrumb
          segments={[
            { label: 'Αρχική', href: '/' },
            { label: 'Επαγγελματικός Κατάλογος' },
          ]}
        />

        {/* Archive Banner */}
        <ArchiveBanner
          title='Επαγγελματικός Κατάλογος'
          subtitle='Ανακάλυψε όλες τις κατηγορίες με επαγγελματίες και επιχειρήσεις για κάθε ανάγκη.'
        />

        {/* Page Content */}
        <section>
          <div className='container mx-auto px-4'>
            <div className='mt-6 mb-16 space-y-10'>
              {/* Popular Pro Subcategories Carousel */}
              <SubdivisionsCarousel
                subdivisions={popularSubcategories}
                gradientColor='silver'
                title='Πιο δημοφιλείς επαγγελματικές κατηγορίες'
              />

              {/* Categories Grid */}
              <CategoriesGrid categories={categories} />
            </div>
          </div>
        </section>
      </div>
    );
  } catch (error) {
    console.error('Directory page error:', error);
    throw error;
  }
}
