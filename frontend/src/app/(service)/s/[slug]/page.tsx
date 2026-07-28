import type { JSX } from 'react';
import { getSession } from '@/actions/auth/server';
import { notFound } from 'next/navigation';
import { getServicePageData } from '@/actions/services';
import { getServiceMetadata } from '@/lib/seo/pages';
import { Card, CardContent } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ServiceMeta,
  ServiceInfo,
  ServiceAbout,
  ServiceMedia,
  ServiceContact,
  ServiceOrderFixed,
  ServiceFAQ,
  ServiceRelated,
  ServiceAdditional,
  ReportServiceDialog,
} from '@/components/service';
import TaxonomyTabs from '@/components/shared/taxonomy-tabs';
import DynamicBreadcrumb from '@/components/shared/dynamic-breadcrumb';
import { ProfileTerms } from '@/components/profile';
import { ServiceSchema } from '@/lib/seo/schema';
import { ReviewsContainer } from '@/components/review';
import { HashScroll } from '@/components/shared/hash-scroll';
import { getServiceDisplayMedia } from '@/lib/utils/media';

// ISR configuration with shorter interval + tag-based revalidation
export const dynamic = 'force-dynamic'; // no-store API client & ISR conflict at runtime (next start) -> render on demand
export const dynamicParams = true; // Allow new services to be generated on-demand

interface ServicePageProps {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * Generates Next.js metadata for SEO optimization
 * Creates dynamic title, description, and OpenGraph data based on service
 */
export async function generateMetadata({ params }: ServicePageProps) {
  const { slug } = await params;

  // Extract service ID from slug (last segment after last dash)
  const parts = slug.split('-');
  const serviceId = parseInt(parts[parts.length - 1]);

  if (!serviceId || isNaN(serviceId)) {
    return {};
  }

  return getServiceMetadata(serviceId);
}

/**
 * Returning [] disables build-time pre-rendering — service pages render on
 * demand (ISR) and are cached after first hit. Django REST is the data
 * source; bulk-slug enumeration would require a dedicated sitemap endpoint.
 */
export async function generateStaticParams() {
  return [];
}

export default async function ServicePage({
  params,
}: ServicePageProps): Promise<JSX.Element> {
  const { slug } = await params;

  // Get current user for isOwner check
  const session = (await (async () => { const r = await getSession(); return r.success && r.data?.user ? { user: r.data.user, session: r.data.session } : null; })());
  const currentUserId = session?.user?.id;

  // Extract service ID from slug (last segment after last dash)
  // This allows old URLs to work even when the title/slug changes
  const parts = slug.split('-');
  const serviceId = parseInt(parts[parts.length - 1]);

  if (!serviceId || isNaN(serviceId)) {
    notFound();
  }

  // Fetch complete service page data using ID
  const result = await getServicePageData(serviceId);

  if (!result.success || !result.data) {
    notFound();
  }

  const {
    service,
    category,
    subcategory,
    subdivision,
    profileSubcategory,
    coverage,
    featuredCategories,
    breadcrumbSegments,
    breadcrumbButtons,
    budgetData,
    sizeData,
    contactMethodsData,
    paymentMethodsData,
    settlementMethodsData,
    tagsData,
    relatedServices,
    additionalServices,
    serviceReviews,
    profileOtherReviews,
    reviewStats,
  } = result.data;

  // Merge service media with profile portfolio (service media first, portfolio as fallback)
  const displayMedia = getServiceDisplayMedia(
    service.media,
    service.profile.portfolio,
  );

  // Get first media image for schema
  const firstMediaImage =
    displayMedia.length > 0 ? displayMedia[0].url : undefined;

  // Get metadata to reuse the formatted and truncated description
  // This ensures schema description matches meta description exactly
  const metadata = await getServiceMetadata(serviceId);
  const schemaDescription = metadata.description || '';

  return (
    <div className='py-20 bg-silver'>
      <HashScroll />
      <ServiceSchema
        slug={service.slug || ''}
        title={service.title}
        description={schemaDescription}
        displayName={service.profile.displayName || ''}
        price={service.price || 0}
        rating={service.rating}
        reviewCount={service.reviewCount}
        faq={service.faq || []}
        image={firstMediaImage}
      />
      {/* Category Navigation Tabs */}
      <TaxonomyTabs activeItemSlug={category?.slug} />

      {/* Breadcrumb Navigation */}
      <DynamicBreadcrumb
        segments={breadcrumbSegments}
        buttons={{ ...breadcrumbButtons, isOwner: currentUserId === service.profile.uid }}
        className='bg-silver'
      />

      {/* Service Content */}
      <section className='pt-4'>
        <div className='container mx-auto px-4 lg:px-10'>
          <div className='relative grid grid-cols-1 lg:grid-cols-3 gap-28'>
            {/* Main Content */}
            <div className='lg:col-span-2 space-y-6'>
              {/* Service Header Card */}
              <Card className='rounded-2xl border-gray-100 shadow-sm'>
                <CardContent className='p-6'>
                  <ServiceMeta
                    title={service.title}
                    firstName={service.profile.firstName}
                    lastName={service.profile.lastName}
                    displayName={service.profile.displayName || ''}
                    username={service.profile.username || ''}
                    image={service.profile.image}
                    rating={service.profile.rating}
                    totalReviews={service.profile.reviewCount}
                    verified={service.profile.verified}
                    topLevel={service.profile.top}
                  />
                  <ServiceInfo
                    coverage={coverage}
                    category={category}
                    subcategory={subcategory}
                    subdivision={subdivision}
                    duration={service.duration}
                    type={service.type}
                    subscriptionType={service.subscriptionType}
                  />
                </CardContent>
              </Card>

              {/* Service About */}
              <ServiceAbout
                description={service.description}
                tags={(tagsData ?? []).map((tag) => tag.label)}
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

              {/* Service Media Gallery */}
              <ServiceMedia media={displayMedia} />

              {/* Service Order/Price Widget */}
              <ServiceOrderFixed
                price={service.price || 0}
                addons={service.addons || []}
                compact={false}
                isOwner={currentUserId === service.profile.uid}
                profileUserId={service.profile.uid}
                profileDisplayName={service.profile.displayName || ''}
                serviceTitle={service.title}
              />

              {/* Mobile Sidebar - Contact card shown on mobile */}
              <div className='lg:hidden'>
                <ServiceContact
                  profile={service.profile}
                  subcategory={profileSubcategory?.label}
                />
              </div>

              {/* Service FAQ */}
              <ServiceFAQ faqs={service.faq || []} />

              {/* Profile Terms */}
              <ProfileTerms terms={service.profile.terms} />

              {/* Service Reviews Section */}
              <ReviewsContainer
                reviews={serviceReviews?.reviews ?? []}
                stats={reviewStats}
                profileId={service.profile.id}
                profileDisplayName={service.profile.displayName || ''}
                serviceId={service.id}
                otherServicesReviews={profileOtherReviews?.reviews ?? []}
                showReviewsModel={true}
                type='service'
                isOwner={currentUserId === service.profile.uid}
                isServicePage={true}
              />

              {/* Report Service Button */}
              <ReportServiceDialog
                serviceId={service.id}
                serviceTitle={service.title}
                serviceSlug={service.slug || ''}
              />
            </div>

            {/* Sidebar */}
            <div className='hidden lg:block space-y-6 sticky top-2 self-start'>
              {/* Order/Price Widget */}
              <ServiceOrderFixed
                price={service.price || 0}
                addons={service.addons || []}
                compact={true}
                isOwner={currentUserId === service.profile.uid}
                profileUserId={service.profile.uid}
                profileDisplayName={service.profile.displayName || ''}
                serviceTitle={service.title}
              />

              {/* Contact Card */}
              <ServiceContact
                profile={service.profile}
                subcategory={profileSubcategory?.label}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Additional Services from same profile (promoted subscribers) */}
      <ServiceAdditional services={additionalServices} />

      {/* Related Services Section */}
      <ServiceRelated
        services={relatedServices}
        categoryLabel={category?.label}
      />
    </div>
  );
}
