import ContentHero from '@/components/shared/content-hero';
import FaqSection from '@/components/shared/faq-section';
import FeaturesGrid from '@/components/shared/features-grid';
import HeroBanner from '@/components/shared/hero-banner';
import ProcessSteps from '@/components/shared/process-steps';
import StatisticsCounter from '@/components/shared/statistics-counter';
import StatsGrid from '@/components/shared/stats-grid';
import TestimonialsSection from '@/components/shared/testimonials-section';
import { getAboutMetadata } from '@/lib/seo/pages';
import { data } from '@/constants/datasets/about';

export async function generateMetadata() {
  return getAboutMetadata();
}

export default function AboutPage() {
  return (
    <>
      <HeroBanner data={data.banner} />
      <ContentHero data={data.about} />
      <StatisticsCounter data={data.counter} />
      <FeaturesGrid data={data.features} />
      <StatsGrid data={data.featuresStats} />
      <TestimonialsSection data={data.testimonials} />
      <ProcessSteps data={data.featuresImage} />
      <FaqSection data={data.faq} />
    </>
  );
}
