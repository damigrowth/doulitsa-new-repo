import type { JSX } from 'react';
import { getSession } from '@/actions/auth/server';
import { notFound } from 'next/navigation';
import { getProfilePageData } from '@/actions/profiles/get-profile';
import { getProfileMetadata } from '@/lib/seo/pages';
import TaxonomyTabs from '@/components/shared/taxonomy-tabs';
import DynamicBreadcrumb from '@/components/shared/dynamic-breadcrumb';
import {
  ProfileBio,
  ProfileFeatures,
  ProfileInfo,
  ProfileMeta,
  ProfileMetrics,
  ProfilePortfolio,
  ProfileServices,
  ProfileTerms,
  ReportProfileDialog,
} from '@/components/profile';
import { ProfileSchema } from '@/lib/seo/schema';
import { ReviewsContainer } from '@/components/review';
import { HashScroll } from '@/components/shared/hash-scroll';

// ISR configuration with shorter interval + tag-based revalidation
export const dynamic = 'force-dynamic'; // no-store API client & ISR conflict at runtime (next start) -> render on demand
export const dynamicParams = true; // Allow new profiles to be generated on-demand

interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

/**
 * Generates Next.js metadata for SEO optimization
 * Creates dynamic title, description, and OpenGraph data based on profile
 */
export async function generateMetadata({ params }: ProfilePageProps) {
  const username = decodeURIComponent((await params).username);
  return getProfileMetadata(username);
}

/**
 * Returning [] disables build-time pre-rendering — pages render on demand
 * (ISR) on first hit and stay cached. The Django backend doesn't expose a
 * bulk-username endpoint and we don't need full SSG since dynamic = 'force-static'
 * isn't set on this route.
 */
export async function generateStaticParams() {
  return [];
}

// JSON fields are typed via the global `AppJson` namespace (see
// src/lib/prisma/json-types.ts) — use those types directly.

/**
 * Main profile page component
 * Renders a complete profile view with meta information, metrics, and skills
 * @param params - Next.js route parameters containing username
 * @returns Promise resolving to the profile page JSX element
 */
export default async function ProfilePage({
  params,
}: ProfilePageProps): Promise<JSX.Element> {
  // Get current user for isOwner check
  const session = (await (async () => { const r = await getSession(); return r.success && r.data?.user ? { user: r.data.user, session: r.data.session } : null; })());
  const currentUserId = session?.user?.id;

  const username = decodeURIComponent((await params).username);
  const result = await getProfilePageData(username);

  // Type-safe data validation
  if (!result.success || !result.data) {
    notFound();
  }

  const {
    profile,
    category,
    subcategory,
    featuredCategories,
    skillsData,
    specialityData,
    contactMethodsData,
    paymentMethodsData,
    settlementMethodsData,
    budgetData,
    sizeData,
    coverage,
    visibility,
    socials,
    calculatedExperience,
    breadcrumbSegments,
    breadcrumbButtons,
    reviews,
    reviewStats,
  } = result.data;

  const image = profile.image;

  // Get first county for location schema. Coverage may be null when the
  // pro hasn't filled in coverage details yet (common for seeded demo accounts).
  const firstCounty =
    coverage?.counties && coverage.counties.length > 0
      ? coverage.counties[0]
      : undefined;

  return (
    <div className='my-20'>
      <HashScroll />
      <ProfileSchema
        username={profile.username || ''}
        displayName={profile.displayName || ''}
        location={firstCounty}
        rating={profile.rating}
        reviewCount={profile.reviewCount}
        image={image}
      />
      {/* Category Navigation Tabs */}
      <TaxonomyTabs activeItemSlug={category?.slug} />

      {/* Breadcrumb Navigation */}
      <DynamicBreadcrumb
        segments={breadcrumbSegments}
        buttons={{ ...breadcrumbButtons, isOwner: currentUserId === profile.uid }}
      />
      {/* Profile Content */}
      <section className='pt-4 pb-20 bg-white'>
        <div className='container mx-auto px-4 lg:px-10'>
          <div className='relative grid grid-cols-1 lg:grid-cols-3 gap-28'>
            {/* Main Content */}
            <div className='lg:col-span-2 space-y-12'>
              {/* Profile Header */}
              <ProfileMeta
                displayName={profile.displayName || ''}
                firstName={profile.firstName}
                lastName={profile.lastName}
                tagline={profile.tagline}
                image={image}
                rating={profile.rating}
                reviewCount={profile.reviewCount}
                verified={profile.verified}
                top={profile.top}
                coverage={coverage}
                visibility={visibility}
                socials={socials}
                subcategory={subcategory}
              />

              {/* Profile Metrics */}
              <ProfileMetrics
                serviceSubdivisions={result.data.serviceSubdivisionsData}
                coverage={coverage}
              />
              <ProfileBio
                bio={profile.bio}
                skills={[
                  ...(specialityData?.label ? [specialityData.label] : []),
                  ...skillsData
                    .filter((skill) => skill.label !== specialityData?.label)
                    .map((skill) => skill.label),
                ]}
              />
              <ProfileFeatures
                budget={budgetData?.label}
                size={sizeData?.label}
                contactMethods={(contactMethodsData ?? []).map(
                  (method) => method.label,
                )}
                paymentMethods={(paymentMethodsData ?? []).map(
                  (method) => method.label,
                )}
                settlementMethods={(settlementMethodsData ?? []).map(
                  (method) => method.label,
                )}
              />
              {/* Mobile Sidebar - shown after icon features on mobile */}
              <div className='lg:hidden'>
                <div className='space-y-6'>
                  <ProfileInfo
                    rate={profile.rate}
                    coverage={coverage}
                    commencement={profile.commencement}
                    experience={calculatedExperience}
                    website={profile.website}
                    phone={profile.phone}
                    viber={profile.viber}
                    whatsapp={profile.whatsapp}
                    email={profile.email || profile.user?.email}
                    visibility={visibility}
                    profileUserId={profile.uid}
                    profileDisplayName={profile.displayName || ''}
                  />
                </div>
              </div>

              <ProfilePortfolio portfolio={profile.portfolio} />

              {/* Profile Services */}
              {result.data.services && result.data.services.length > 0 && (
                <ProfileServices
                  services={result.data.services}
                  profileUsername={profile.username}
                />
              )}

              <ProfileTerms terms={profile.terms} />

              {/* Profile Reviews Section */}
              <ReviewsContainer
                reviews={reviews.reviews}
                stats={reviewStats}
                profileId={profile.id}
                profileDisplayName={profile.displayName || ''}
                showReviewsModel={true}
                type='profile'
                isOwner={currentUserId === profile.uid}
                profileServices={result.data.services.map((s) => ({
                  id: s.id,
                  title: s.title,
                }))}
              />

              {/* Report Profile Button */}
              <ReportProfileDialog
                profileId={profile.id}
                profileName={profile.displayName || profile.username || ''}
                profileUsername={profile.username || ''}
              />

              {/* TODO: Add other profile sections here */}
              {/* - Featured Services */}
              {/* - Reviews */}
            </div>

            {/* Desktop Sidebar - Hidden on mobile */}
            <div className='hidden lg:block space-y-6 sticky top-2 self-start'>
              <ProfileInfo
                rate={profile.rate}
                coverage={coverage}
                commencement={profile.commencement}
                experience={calculatedExperience}
                website={profile.website}
                phone={profile.phone}
                viber={profile.viber}
                whatsapp={profile.whatsapp}
                email={profile.email || profile.user?.email}
                visibility={visibility}
                profileUserId={profile.uid}
                profileDisplayName={profile.displayName || ''}
              />

              {/* TODO: Add other sidebar widgets */}
              {/* - Contact form */}
              {/* - Saved profiles */}
              {/* - Similar profiles */}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
