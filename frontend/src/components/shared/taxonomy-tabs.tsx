'use client';

import React, { useState } from 'react';
import NextLink from './next-link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import FlaticonCategory from '@/components/icon/flaticon/flaticon-category';
import { CategoryIcon } from '@/components/shared/category-icon';
import { ChevronDown } from 'lucide-react';

const SERVICE_CATEGORIES = [
  { id: '1', label: 'Δημιουργία Περιεχομένου', slug: 'dimiourgia-periexomenou' },
  { id: '2', label: 'Εκδηλώσεις', slug: 'ekdiloseis' },
  { id: '3', label: 'Ευεξία & Φροντίδα', slug: 'eveksia-frontida' },
  { id: '4', label: 'Μαθήματα', slug: 'mathimata' },
  { id: '5', label: 'Μάρκετινγκ', slug: 'marketing' },
  { id: '6', label: 'Πληροφορική', slug: 'pliroforiki' },
  { id: '7', label: 'Τεχνικά', slug: 'texnika' },
  { id: '8', label: 'Υποστήριξη', slug: 'ypostiriksi' },
];

interface TaxonomyTabItem {
  label: string;
  slug: string;
}

interface TaxonomyTabsProps {
  /** Category items to display. Defaults to SERVICE_CATEGORIES. */
  items?: TaxonomyTabItem[];
  /** Base path for category links. Defaults to '/categories'. */
  basePath?: string;
  /** Label for the "all" tab. Defaults to 'Όλες οι Κατηγορίες'. */
  allItemsLabel?: string;
  /** Href for the "all" tab. Defaults to basePath. */
  allItemsHref?: string;
  /** Currently active category slug. */
  activeItemSlug?: string;
  className?: string;
}

export default function TaxonomyTabs({
  items,
  basePath = '/categories',
  allItemsLabel = 'Όλες οι Κατηγορίες',
  allItemsHref,
  activeItemSlug,
  className = '',
}: TaxonomyTabsProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const categories = items || SERVICE_CATEGORIES;
  const allHref = allItemsHref || basePath;

  return (
    <section className={`overflow-hidden bg-muted border-b border-gray-200 lg:hidden ${className}`}>
      <div className='container mx-auto p-2'>
        {/* Visible only when the mobile menu is active (< 1024px) */}
        <div className='flex justify-center'>
          <Popover open={mobileOpen} onOpenChange={setMobileOpen}>
            <PopoverTrigger asChild>
              <button className='flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-body bg-background border border-border rounded-lg shadow-sm hover:border-primary/30 hover:text-primary transition-colors'>
                <FlaticonCategory size={15} />
                <span>Κατηγορίες Υπηρεσιών</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${mobileOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align='center'
              sideOffset={6}
              className='w-[calc(100vw-2rem)] max-w-sm p-1.5'
            >
              <nav className='flex flex-col'>
                <NextLink
                  href={allHref}
                  className={`flex items-center px-3 py-2.5 text-sm rounded-md transition-colors ${
                    !activeItemSlug
                      ? 'text-primary font-medium bg-primary/5'
                      : 'text-body hover:bg-accent'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {allItemsLabel}
                </NextLink>
                {categories.map((category) => (
                  <NextLink
                    key={category.slug}
                    href={`${basePath}/${category.slug}`}
                    className={`flex items-center px-3 py-2.5 text-sm rounded-md transition-colors ${
                      activeItemSlug === category.slug
                        ? 'text-primary font-medium bg-primary/5'
                        : 'text-body hover:bg-accent'
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <CategoryIcon
                      slug={category.slug}
                      size={18}
                      className='mr-2'
                    />
                    {category.label}
                  </NextLink>
                ))}
              </nav>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </section>
  );
}
