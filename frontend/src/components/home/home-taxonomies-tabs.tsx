'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import NextLink from '@/components/shared/next-link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { DatasetItem } from '@/lib/types/datasets';

const TaxonomiesGrid = ({
  data,
  type,
}: {
  data: DatasetItem[];
  type: 'pros' | 'ipiresies';
}) => {
  const [expanded, setExpanded] = useState(false);

  // Data is already flattened and filtered server-side
  const limitedSubcategories = data.slice(0, 100);

  // Calculate items per column for 5 columns
  const itemsPerColumn = Math.ceil(limitedSubcategories.length / 5);
  const columns = Array.from({ length: 5 }, (_, i) =>
    limitedSubcategories.slice(i * itemsPerColumn, (i + 1) * itemsPerColumn),
  );

  const gridId = `taxonomies-grid-${type}`;

  const handleToggle = () => {
    // Collapsing after a long scroll (esp. mobile) would leave the user mid-page
    if (expanded) {
      document
        .getElementById(gridId)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setExpanded((prev) => !prev);
  };

  return (
    <div>
      <div className='relative'>
        {/* All links stay in the DOM when collapsed (SEO) - only visually clipped */}
        <div
          id={gridId}
          className={cn(
            'flex flex-col sm:flex-row gap-x-5 overflow-hidden scroll-mt-24 transition-[max-height] duration-500 ease-in-out',
            expanded ? 'max-h-[4500px]' : 'max-h-60 sm:max-h-80',
          )}
        >
          {columns.map((column, columnIndex) => (
            <div key={columnIndex} className='flex flex-col flex-1'>
              {column.map((item) => (
                <NextLink
                  key={item.id}
                  href={item.href || `/${type}/${item.slug}`}
                  className='text-sm text-dark hover:text-fourth hover:underline transition-colors leading-10'
                >
                  {type === 'pros' ? item.plural || item.label : item.label}
                </NextLink>
              ))}
            </div>
          ))}
        </div>

        {!expanded && (
          <div className='pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-silver to-transparent' />
        )}
      </div>

      <div className='mt-6 flex justify-center sm:justify-start'>
        <button
          type='button'
          aria-expanded={expanded}
          aria-controls={gridId}
          onClick={handleToggle}
          className='group inline-flex items-center gap-2 rounded-full border border-dark/15 bg-white px-6 py-2.5 text-sm font-semibold text-dark shadow-sm transition-colors hover:border-fourth hover:text-fourth'
        >
          {expanded
            ? 'Προβολή Λιγότερων'
            : `Προβολή Όλων (${limitedSubcategories.length})`}
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform duration-300',
              expanded && 'rotate-180',
            )}
          />
        </button>
      </div>
    </div>
  );
};

interface HomeTaxonomiesTabsProps {
  proSubcategories: DatasetItem[];
  serviceSubcategories: DatasetItem[];
}

export default function HomeTaxonomiesTabs({
  proSubcategories,
  serviceSubcategories,
}: HomeTaxonomiesTabsProps) {
  return (
    <Tabs defaultValue='services' className='w-full'>
      <div className='mb-8 sm:mb-10 md:mb-12'>
        <TabsList className='bg-transparent border-none p-0 h-auto flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-8 md:space-x-12  justify-start'>
          <TabsTrigger
            value='services'
            className='bg-transparent data-[state=active]:bg-transparent border-none p-0 text-xl font-bold data-[state=active]:text-dark text-dark/30 hover:text-dark data-[state=active]:shadow-none transition-colors w-full sm:w-auto text-left justify-start'
          >
            Κατηγορίες Υπηρεσιών
          </TabsTrigger>
          <TabsTrigger
            value='pros'
            className='bg-transparent data-[state=active]:bg-transparent border-none p-0 text-xl font-bold data-[state=active]:text-dark text-dark/30 hover:text-dark data-[state=active]:shadow-none transition-colors w-full sm:w-auto text-left justify-start'
          >
            Κατηγορίες Επαγγελμάτων
          </TabsTrigger>
        </TabsList>
      </div>

      {/* forceMount keeps both link sets in the server-rendered HTML for crawlers;
          the inactive tab is only hidden visually */}
      <TabsContent
        value='services'
        forceMount
        className='mt-0 data-[state=inactive]:hidden'
      >
        <TaxonomiesGrid data={serviceSubcategories} type='ipiresies' />
      </TabsContent>

      <TabsContent
        value='pros'
        forceMount
        className='mt-0 data-[state=inactive]:hidden'
      >
        <TaxonomiesGrid data={proSubcategories} type='pros' />
      </TabsContent>
    </Tabs>
  );
}
