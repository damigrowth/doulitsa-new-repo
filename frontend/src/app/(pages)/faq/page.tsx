import FaqSection from '@/components/shared/faq-section';
import { data } from '@/constants/datasets/faq';
import { getFaqMetadata } from '@/lib/seo/pages';

export async function generateMetadata() {
  return getFaqMetadata();
}

export default function FaqPage() {
  return (
    <section className='pb-12 mt-40'>
      <div className='container mx-auto px-4'>
        {/* Header */}
        <div className='mx-auto max-w-2xl text-center mb-12'>
          <span className='inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 text-3sm font-semibold text-secondary mb-4'>
            FAQ
          </span>
          <div className='space-y-2'>
            <h1 className='title text-2xl lg:text-3xl font-bold tracking-tight'>
              {data.title}
            </h1>
            <p className='paragraph text-base text-body mt-2 leading-relaxed'>
              {data.description}
            </p>
          </div>
        </div>

        {/* FAQ Sections */}
        <div className='mx-auto w-full'>
          {data.faq.map((section, sectionIndex) => {
            // Transform section data to match FaqSection component structure
            const sectionData = {
              title: section.title,
              subtitle: '',
              list: section.faq.map((item, itemIndex) => ({
                id: `${sectionIndex}-${itemIndex}`,
                question: item.question,
                answer: item.answer,
                isOpen: itemIndex === 0, // First item in each section open by default
              })),
            };

            return (
              <div key={sectionIndex} className='pb-7'>
                <FaqSection data={sectionData} variant='compact' />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
