// Specific imports to avoid loading admin bundle (4.5MB)
import CategoriesHome from '@/components/home/home-categories';
import FeaturesHome from '@/components/home/home-features';
import HeroHome from '@/components/home/home-hero';
import TaxonomiesHome from '@/components/home/home-taxonomies';
import TestimonialsHome from '@/components/home/home-testimonials';
import TaxonomyTabs from '@/components/shared/taxonomy-tabs';
import { getHomeMetadata } from '@/lib/seo/pages';
import { getHomePageData } from '@/actions/home/get-home-data';
import { ServicesHomeLazy } from '@/components/home/services-home-lazy';
import { ProfilesHomeLazy } from '@/components/home/profiles-home-lazy';
import { getServiceTaxonomies } from '@/lib/taxonomies';
import { HomeSchema } from '@/lib/seo/schema';

// ISR: serve the prerendered page and re-render at most every 5 minutes —
// same cadence as Django's own home-payload cache, and how the OLD app on
// Vercel serves this page (x-nextjs-stale-time: 300). Unlike the earlier
// force-static attempt, revalidation keeps picking up DB changes; unlike
// force-dynamic, the page is fully prefetchable so client navigation is
// instant. The data fetches underneath pass `revalidate` (anonymous, no
// cookie reads), which is what keeps this route statically renderable.
export const revalidate = 300;

export async function generateMetadata() {
  return await getHomeMetadata();
}

export async function generateStaticParams() {
  return [];
}

export default async function HomePage() {
  // Fetch both services and profiles data in a single API call
  const homeDataResult = await getHomePageData();

  // Extract the pre-processed data or provide fallback
  const homeData =
    homeDataResult.success && homeDataResult.data
      ? homeDataResult.data
      : {
          services: {
            mainCategories: [{ id: 'all', label: 'Όλες', slug: 'all' }],
            servicesByCategory: { all: [] },
            allServices: [],
          },
          profiles: [],
          popularSubcategories: [],
          categoriesWithSubcategories: [],
          proSubcategoriesWithProfiles: [],
          serviceSubcategoriesWithServices: [],
        };

  // Prepare taxonomy data server-side to prevent client-side bundle bloat (fallback)
  const serviceTaxonomies = getServiceTaxonomies();
  const featuredCategories = serviceTaxonomies
    .filter((cat) => cat.featured === true)
    .slice(0, 8)
    .map((cat) => ({
      id: cat.id,
      label: cat.label,
      slug: cat.slug,
      icon: cat.icon,
      featured: cat.featured,
      subcategories: (cat.children || []).slice(0, 5).map((sub) => ({
        id: sub.id,
        label: sub.label,
        slug: sub.slug,
        count: 0,
      })),
    }));

  return (
    <>
      <HomeSchema />
      {/* Service Categories Navigation Tabs */}
      <div>
        <TaxonomyTabs />
      </div>

      <HeroHome popularSubcategories={homeData.popularSubcategories} />
      <CategoriesHome
        categories={homeData.categoriesWithSubcategories}
        fallbackCategories={featuredCategories}
      />
      <FeaturesHome />
      <ServicesHomeLazy
        mainCategories={homeData.services.mainCategories}
        servicesByCategory={homeData.services.servicesByCategory}
      />
      <ProfilesHomeLazy profiles={homeData.profiles} />
      <TestimonialsHome />
      <TaxonomiesHome
        proSubcategories={homeData.proSubcategoriesWithProfiles}
        serviceSubcategories={homeData.serviceSubcategoriesWithServices}
      />
    </>
  );
}
