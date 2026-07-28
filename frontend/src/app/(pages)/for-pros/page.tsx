import CtaBanner from '@/components/shared/cta-banner';
import FaqSection from '@/components/shared/faq-section';
import FeaturesGrid from '@/components/shared/features-grid';
import FeaturesRow from '@/components/shared/features-row';
import HeroBanner from '@/components/shared/hero-banner';
import StatisticsCounter from '@/components/shared/statistics-counter';
import TabbedCta from '@/components/shared/tabbed-cta';
import { PlanComparison } from '@/components/subscription';
import { getForProsMetadata } from '@/lib/seo/pages';
import { data } from '@/constants/datasets/for-pros';

export async function generateMetadata() {
  return getForProsMetadata();
}

export default function ForProsPage() {
  return (
    <>
      <HeroBanner
        data={{
          title: data.banner.title,
          description: data.banner.description,
        }}
        titleClassName={data.banner.titleClassName}
        descriptionClassName={data.banner.descriptionClassName}
        backgroundColor={data.banner.backgroundColor}
        decorativeImages={data.banner.decorativeImages}
        buttonConfig={{
          text: data.hero.button.text,
          href: data.hero.button.link,
          icon: 'ArrowRight',
        }}
      />
      <TabbedCta data={data.tabs} footnote={data.tabsFootnote} />
      <FeaturesRow data={data.featuresRow} />
      <FeaturesGrid data={data.featuresGrid} />
      <StatisticsCounter data={data.counter} />
      <section className='py-16'>
        <div className='container mx-auto px-4'>
          <div className='max-w-5xl mx-auto'>
            <div className='text-center mb-8'>
              <h2 className='text-2xl md:text-3xl font-bold'>
                Πακέτα προβολής
              </h2>
              <p className='text-muted-foreground mt-2'>
                Ξεκίνα δωρεάν και αναβάθμισε όποτε θέλεις για μεγαλύτερη προβολή.
              </p>
            </div>
            <PlanComparison variant='public' />
          </div>
        </div>
      </section>
      <FaqSection data={data.faq} />
      <CtaBanner data={data.cta} />
    </>
  );
}
