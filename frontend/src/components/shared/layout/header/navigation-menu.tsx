'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/shared/category-icon';
import { ChevronRight, ChevronDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavigationMenuCategory } from '@/lib/types/components';
import NextLink from '../../next-link';
import { FlaticonCategory } from '@/components/icon';

const regularMenuItems = [
  { href: '/directory', label: 'Επαγγελματικός Κατάλογος' },
];

interface NavMenuProps {
  navigationData: NavigationMenuCategory[];
  isMobile?: boolean;
  onClose?: () => void;
}

export default function NavMenu({
  navigationData,
  isMobile = false,
  onClose,
}: NavMenuProps) {
  const pathname = usePathname();
  const [hoveredCategory, setHoveredCategory] = React.useState<string | null>(
    null,
  );
  const [timeoutId, setTimeoutId] = React.useState<NodeJS.Timeout | null>(null);
  const [categoriesOpen, setCategoriesOpen] = React.useState(false);

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Mobile version - simple vertical list
  if (isMobile) {
    return (
      <nav className='space-y-2'>
        {/* Categories with collapsible submenu */}
        <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant='ghost'
              className='w-full justify-between px-0 h-auto py-3'
            >
              <span className='text-base font-medium'>Κατηγορίες Υπηρεσιών</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${categoriesOpen ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className='space-y-2 mt-2'>
            {navigationData.map((category) => (
              <NextLink
                key={category.id}
                href={`/categories/${category.slug}`}
                onClick={handleLinkClick}
                className='flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors'
              >
                <CategoryIcon iconKey={category.icon} size={18} />
                {category.label}
              </NextLink>
            ))}
            {/* View all categories */}
            <NextLink
              href='/categories'
              onClick={handleLinkClick}
              className='mt-1 flex items-center justify-between gap-2 rounded-lg bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/15'
            >
              Όλες οι Κατηγορίες
              <ArrowRight className='h-4 w-4' />
            </NextLink>
          </CollapsibleContent>
        </Collapsible>

        {/* Regular menu items */}
        {regularMenuItems.map((item) => (
          <NextLink
            key={item.href}
            href={item.href}
            onClick={handleLinkClick}
            className='block px-0 py-3 text-base font-medium text-gray-900 hover:text-primary transition-colors'
          >
            {item.label}
          </NextLink>
        ))}

        <NextLink
          href='/for-pros'
          onClick={handleLinkClick}
          className='block px-0 py-3 text-base font-medium text-gray-900 hover:text-primary transition-colors'
        >
          Για Επαγγελματίες
        </NextLink>
      </nav>
    );
  }

  // Desktop version - full NavigationMenu with mega menu
  return (
    <NavigationMenu>
      <NavigationMenuList className='gap-2'>
        {/* Mega Menu Dropdown for Categories */}
        <NavigationMenuItem>
          <NavigationMenuTrigger
            variant='pale'
            className='flex items-center border border-current'
            onPointerMove={(e) => e.preventDefault()}
            onPointerLeave={(e) => e.preventDefault()}
          >
            <FlaticonCategory size={16} className='mr-2' />
            <span className='mr-1.5'>Κατηγορίες Υπηρεσιών</span>
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div
              className='relative flex overflow-hidden rounded-xl'
              onMouseLeave={() => {
                const id = setTimeout(() => {
                  setHoveredCategory(null);
                }, 150);
                setTimeoutId(id);
              }}
              onMouseEnter={() => {
                if (timeoutId) {
                  clearTimeout(timeoutId);
                  setTimeoutId(null);
                }
              }}
            >
              {/* Left Panel - Categories List */}
              <div className='flex w-72 shrink-0 flex-col border-r border-border/60 bg-muted/40 p-3'>
                <p className='px-2.5 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  Κατάλογος Υπηρεσιών
                </p>
                <div className='space-y-0.5'>
                  {navigationData.map((category) => {
                    const isActive = hoveredCategory === category.id;
                    return (
                      <div
                        key={category.id}
                        className='relative'
                        onMouseEnter={() => {
                          setHoveredCategory(category.id);
                        }}
                      >
                        <NextLink
                          href={`/categories/${category.slug}`}
                          className={cn(
                            'group flex items-center justify-between rounded-xl p-2.5 text-sm transition-all duration-200',
                            isActive
                              ? 'bg-background shadow-sm ring-1 ring-black/[0.04]'
                              : 'hover:bg-background/60',
                          )}
                        >
                          <div className='flex items-center gap-3'>
                            <span
                              className={cn(
                                'flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-200',
                                isActive ? 'bg-primary' : 'bg-primary/10',
                              )}
                            >
                              <CategoryIcon
                                iconKey={category.icon}
                                size={18}
                                className={
                                  isActive ? 'bg-background' : 'bg-primary'
                                }
                              />
                            </span>
                            <span
                              className={cn(
                                'font-medium transition-colors duration-200',
                                isActive
                                  ? 'text-primary'
                                  : 'text-foreground/80',
                              )}
                            >
                              {category.label}
                            </span>
                          </div>
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 transition-all duration-200',
                              isActive
                                ? 'translate-x-0.5 text-primary'
                                : 'text-muted-foreground/50',
                            )}
                          />
                        </NextLink>
                      </div>
                    );
                  })}
                </div>

                {/* View all categories CTA */}
                <NextLink
                  href='/categories'
                  onMouseEnter={() => setHoveredCategory(null)}
                  className='group mt-3 flex items-center justify-between gap-2 rounded-xl bg-primary/10 px-3.5 py-3 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-primary/15'
                >
                  Όλες οι Κατηγορίες
                  <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
                </NextLink>
              </div>

              {/* Right Panel - Subcategories */}
              {hoveredCategory ? (
                <div className='flex w-[640px] flex-col bg-background'>
                  {navigationData
                    .filter((cat) => cat.id === hoveredCategory)
                    .map((category) => (
                      <div
                        key={category.id}
                        className='flex min-h-full flex-1 animate-fade-in flex-col'
                      >
                        {/* Header */}
                        <div className='flex items-center gap-3 border-b border-border/60 px-6 py-5'>
                          <span className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 ring-1 ring-primary/5'>
                            <CategoryIcon iconKey={category.icon} size={26} />
                          </span>
                          <NextLink
                            href={`/categories/${category.slug}`}
                            className='text-xl font-bold text-primary transition-colors hover:text-primary/80'
                          >
                            {category.label}
                          </NextLink>
                        </div>

                        {/* Subcategory columns */}
                        <div className='grid flex-1 grid-cols-3 gap-x-6 gap-y-6 px-6 py-5'>
                          {category.subcategories.map((subcategory) => (
                            <div key={subcategory.id} className='space-y-2.5'>
                              <NavigationMenuLink asChild>
                                <NextLink
                                  href={subcategory.href}
                                  className='group flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary'
                                >
                                  <span className='h-3.5 w-1 rounded-full bg-secondary/70 transition-all group-hover:h-4 group-hover:bg-secondary' />
                                  {subcategory.label}
                                </NextLink>
                              </NavigationMenuLink>
                              <div className='space-y-1.5 pl-3'>
                                {subcategory.topSubdivisions.map(
                                  (subdivision) => (
                                    <NavigationMenuLink
                                      key={subdivision.id}
                                      asChild
                                    >
                                      <NextLink
                                        href={subdivision.href}
                                        className='block text-3sm text-muted-foreground transition-all hover:translate-x-0.5 hover:text-foreground'
                                      >
                                        {subdivision.label}
                                      </NextLink>
                                    </NavigationMenuLink>
                                  ),
                                )}
                                {subcategory.hasMoreSubdivisions && (
                                  <NextLink
                                    href={subcategory.href}
                                    className='inline-flex items-center gap-1 pt-1 text-3sm font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-primary hover:underline'
                                  >
                                    Προβολή όλων (
                                    {subcategory.totalSubdivisions})
                                  </NextLink>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Footer CTA */}
                        {category.hasMoreSubcategories && (
                          <div className='mt-auto border-t border-border/60 bg-bluey/60 px-6 py-3.5'>
                            <NextLink
                              href={category.href}
                              className='group inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-secondary'
                            >
                              Προβολή όλων των Υποκατηγοριών
                              <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
                            </NextLink>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className='flex w-[640px] flex-col items-center justify-center gap-5 bg-bluey/40 px-10 py-12 text-center'>
                  <span className='flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-sm'>
                    <FlaticonCategory size={30} />
                  </span>
                  <div className='space-y-1.5'>
                    <p className='text-xl font-bold text-foreground'>
                      Κατάλογος Υπηρεσιών
                    </p>
                    <p className='mx-auto max-w-sm text-sm text-muted-foreground'>
                      Ανακάλυψε υπηρεσίες από εξειδικευμένους επαγγελματίες άμεσα
                      και εύκολα. Από ψηφιακές υπηρεσίες έως τεχνικές εργασίες, θα
                      βρεις ό,τι υπηρεσία χρειάζεσαι.
                    </p>
                  </div>
                  <NavigationMenuLink asChild>
                    <NextLink
                      href='/categories'
                      className='group inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md'
                    >
                      Δες όλες τις κατηγορίες
                      <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
                    </NextLink>
                  </NavigationMenuLink>
                </div>
              )}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Regular Menu Items */}
        {regularMenuItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <NavigationMenuItem key={item.href}>
              <NavigationMenuLink
                asChild
                className={cn(
                  navigationMenuTriggerStyle({ variant: 'pale' }),
                  isActive && 'bg-pale text-pale-foreground',
                )}
              >
                <NextLink href={item.href}>{item.label}</NextLink>
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
