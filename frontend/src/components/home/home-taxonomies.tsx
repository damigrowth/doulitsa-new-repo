import type { DatasetItem } from '@/lib/types/datasets';
import HomeTaxonomiesTabs from './home-taxonomies-tabs';

interface HomeTaxonomiesProps {
  proSubcategories: DatasetItem[];
  serviceSubcategories: DatasetItem[];
}

export default function HomeTaxonomies({
  proSubcategories,
  serviceSubcategories,
}: HomeTaxonomiesProps) {
  return (
    <section className='pt-8 pb-8 sm:py-12 md:py-16 lg:pb-28 bg-silver'>
      <div className='container mx-auto px-6'>
        {/* Client component with shadcn Tabs - handles state internally */}
        <HomeTaxonomiesTabs
          proSubcategories={proSubcategories}
          serviceSubcategories={serviceSubcategories}
        />
      </div>
    </section>
  );
}
