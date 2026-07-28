'use client';

import { ReactNode } from 'react';
import { ArchiveFilters } from './archive-filters';
import { ArchiveSidebar } from './archive-sidebar';
import { ArchivePagination } from './archive-pagination';
import { ArchiveBanner } from './archive-banner';
import { SubdivisionsCarousel } from './subdivisions-carousel';

import type { DatasetItem } from '@/lib/types/datasets';
import { FilterState } from '@/hooks/archives/use-archive-filters';
import { useArchiveFilters } from '@/hooks/archives/use-archive-filters';
import { useArchivePagination } from '@/hooks/archives/use-archive-pagination';
import clsx from 'clsx';
import TaxonomyTabs from '../shared/taxonomy-tabs';
import DynamicBreadcrumb from '../shared/dynamic-breadcrumb';

interface ArchiveLayoutProps {
  children: ReactNode;
  archiveType: 'pros' | 'companies' | 'directory' | 'services' | 'categories';
  category?: string;
  subcategory?: string;
  subdivision?: string; // For services
  initialFilters?: FilterState;
  taxonomyData: {
    categories: DatasetItem[];
    currentCategory?: DatasetItem;
    currentSubcategory?: DatasetItem;
    currentSubdivision?: DatasetItem; // For services
    subcategories?: DatasetItem[]; // Filtered subcategories that have services
    subdivisions?: DatasetItem[]; // Filtered subdivisions that have services
  };
  breadcrumbData?: {
    segments: Array<{
      label: string;
      href?: string;
    }>;
    buttons?: Array<{
      label: string;
      href: string;
    }>;
  };
  counties: DatasetItem[];
  className?: string;
  basePath: string;
  total?: number;
  limit?: number;
  hasMore?: boolean;
  onFiltersChange?: (filters: any) => void;
  onLimitChange?: (limit: number) => void;
  showResultsPerPage?: boolean;
  isLoading?: boolean;
  availableSubdivisions?: Array<{
    id: string;
    label: string;
    slug: string;
    categorySlug: string;
    subcategorySlug: string;
    count: number;
    href: string;
    type?: 'freelancer' | 'company'; // Optional for profile subcategories
  }>;
  gradientColor?: 'white' | 'silver';
}

export function ArchiveLayout({
  children,
  archiveType,
  category,
  subcategory,
  subdivision,
  initialFilters = {},
  taxonomyData,
  breadcrumbData,
  counties,
  className,
  basePath,
  total = 0,
  limit = 20,
  hasMore = false,
  onFiltersChange,
  onLimitChange,
  showResultsPerPage = true,
  isLoading = false,
  availableSubdivisions,
  gradientColor = 'white',
}: ArchiveLayoutProps) {
  // Initialize filters with route params
  const routeFilters: FilterState = {
    ...initialFilters,
    ...(category && { category }),
    ...(subcategory && { subcategory }),
    ...(subdivision && { subdivision }),
  };

  const {
    filters,
    handleFiltersChange,
    handlePageChange,
    handleLimitChange,
    clearFilters,
    getActiveFilterCount,
    buildAPIFilters,
  } = useArchiveFilters({
    initialFilters: routeFilters,
    basePath,
  });

  const pagination = useArchivePagination({
    initialPage: filters.page || 1,
    limit,
    total,
    hasMore,
    onPageChange: handlePageChange,
  });

  // Handle filter changes and notify parent
  const handleFiltersUpdate = (newFilters: FilterState) => {
    handleFiltersChange(newFilters);
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  // Handle limit changes and notify parent
  const handleLimitUpdate = (newLimit: number) => {
    handleLimitChange(newLimit);
    if (onLimitChange) {
      onLimitChange(newLimit);
    }
  };

  // Archive configuration constants and functions
  const getArchiveConfig = () => {
    switch (archiveType) {
      case 'directory':
        return {
          basePath: 'categories',
          allItemsLabel: 'Όλες οι Κατηγορίες',
          usePluralLabels: true,
          sidebarType: 'profiles' as const,
        };
      case 'pros':
        return {
          basePath: 'pros',
          allItemsLabel: 'Όλοι οι Επαγγελματίες',
          usePluralLabels: true,
          sidebarType: 'profiles' as const,
        };
      case 'companies':
        return {
          basePath: 'companies',
          allItemsLabel: 'Όλες οι Εταιρείες',
          usePluralLabels: true,
          sidebarType: 'profiles' as const,
        };
      case 'services':
        return {
          basePath: 'categories',
          allItemsLabel: 'Όλες οι Υπηρεσίες',
          usePluralLabels: false,
          sidebarType: 'services' as const,
        };
      default:
        return {
          basePath: 'categories',
          allItemsLabel: 'Όλα τα Στοιχεία',
          usePluralLabels: false,
          sidebarType: 'services' as const,
        };
    }
  };

  const archiveConfig = getArchiveConfig();

  // Generate banner title based on current taxonomy hierarchy
  const getBannerTitle = (): string => {
    const { currentSubdivision, currentSubcategory, currentCategory } =
      taxonomyData;

    if (currentSubdivision) {
      // Services subdivision page: title is the subdivision, parent shown via badge
      return currentSubdivision.plural || currentSubdivision.label;
    }

    if (currentSubcategory) {
      // Subcategory page: just use subcategory name (no category since we removed it from URLs)
      const subcategoryLabel =
        currentSubcategory.plural || currentSubcategory.label;
      return subcategoryLabel;
    }

    if (currentCategory) {
      // Category page: use plural for profiles, regular label for services
      return archiveConfig.usePluralLabels
        ? currentCategory.plural || currentCategory.label
        : currentCategory.label;
    }

    // Main archive page: use the configured all items label
    return archiveConfig.allItemsLabel;
  };

  // Parent category label shown as an eyebrow badge above the banner title.
  // Only for services subdivision pages, where the parent is the subcategory.
  const getBannerParentLabel = (): string | undefined => {
    const { currentSubdivision, currentSubcategory } = taxonomyData;

    if (currentSubdivision) {
      return currentSubcategory?.plural || currentSubcategory?.label;
    }

    return undefined;
  };

  // Link for the parent badge: the subcategory archive page.
  const getBannerParentHref = (): string | undefined => {
    const { currentSubdivision, currentSubcategory } = taxonomyData;

    if (currentSubdivision && currentSubcategory?.slug) {
      return `/ipiresies/${currentSubcategory.slug}`;
    }

    return undefined;
  };

  // Generate banner subtitle based on taxonomy or default messages
  const getBannerSubtitle = (): string => {
    const { currentSubdivision, currentSubcategory, currentCategory } =
      taxonomyData;

    // Use taxonomy description if available (subdivision > subcategory > category)
    const taxonomyDescription =
      currentSubdivision?.description ||
      currentSubcategory?.description ||
      currentCategory?.description;

    if (taxonomyDescription) {
      return taxonomyDescription;
    }

    // Fallback to default archive descriptions
    switch (archiveType) {
      case 'directory':
        return 'Βρες τους Καλύτερους Επαγγελματίες και Επιχειρήσεις, δες αξιολογήσεις και τιμές.';
      case 'pros':
        return 'Βρες τους Καλύτερους Επαγγελματίες, δες αξιολογήσεις και τιμές.';
      case 'companies':
        return 'Βρες τις Καλύτερες Επιχειρήσεις, δες αξιολογήσεις και τιμές.';
      case 'services':
        return 'Ανακάλυψε τις καλύτερες υπηρεσίες για οποιαδήποτε ανάγκη, από τους καλύτερους επαγγελματίες.';
      default:
        return 'Ανακάλυψε τις καλύτερες υπηρεσίες και επαγγελματίες.';
    }
  };

  // Generate banner image based on current taxonomy hierarchy
  const getBannerImage = () => {
    const { currentSubdivision, currentSubcategory, currentCategory } =
      taxonomyData;

    // Priority: subdivision > subcategory > category
    // Use the most specific image available
    if (currentSubdivision?.image) {
      return currentSubdivision.image;
    }

    if (currentSubcategory?.image) {
      return currentSubcategory.image;
    }

    if (currentCategory?.image) {
      return currentCategory.image;
    }

    // No taxonomy image available, use default
    return undefined;
  };

  return (
    <div className={clsx(className, 'py-20 bg-silver')}>
      {/* Category Navigation Tabs */}
      <TaxonomyTabs activeItemSlug={taxonomyData.currentCategory?.slug} />

      {/* Breadcrumb Navigation */}
      {breadcrumbData && (
        <DynamicBreadcrumb
          segments={breadcrumbData.segments}
          // buttons={breadcrumbData.buttons}
        />
      )}

      {/* Archive Banner */}
      <ArchiveBanner
        title={getBannerTitle()}
        parentLabel={getBannerParentLabel()}
        parentHref={getBannerParentHref()}
        subtitle={getBannerSubtitle()}
        image={getBannerImage()}
        showImage={archiveType !== 'directory'}
      />

      {/* Archive Content */}
      <section>
        <div className='container mx-auto px-4 sm:px-6 py-2'>
          <div className='max-w-5xl mx-auto'>
            {/* Filters with integrated sidebar */}
            <ArchiveSidebar
              filters={filters}
              onFiltersChange={handleFiltersUpdate}
              archiveType={archiveConfig.sidebarType}
              categories={taxonomyData.categories}
              counties={counties}
              subcategories={taxonomyData.subcategories}
              subdivisions={taxonomyData.subdivisions}
            >
              <ArchiveFilters
                filters={filters}
                onFiltersChange={handleFiltersUpdate}
                counties={counties}
                activeFilterCount={getActiveFilterCount}
                archiveType={archiveConfig.sidebarType}
                basePath={basePath}
              />
            </ArchiveSidebar>

            {/* Results Summary */}
            <div className='border-b border-gray-200'>
              <div className='py-4'>
                <div className='flex items-center justify-between'>
                  <div className='text-sm text-gray-600'>
                    {total > 0 ? (
                      <>
                        Εμφανίζονται {pagination.startItem}-{pagination.endItem}{' '}
                        από {total} αποτελέσματα
                      </>
                    ) : (
                      'Δεν βρέθηκαν αποτελέσματα'
                    )}
                  </div>

                  {/* Clear filters button */}
                  <button
                    onClick={clearFilters}
                    disabled={getActiveFilterCount === 0}
                    className={`text-sm transition-colors ${
                      getActiveFilterCount > 0
                        ? 'text-red-600 hover:text-red-700 cursor-pointer'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Καθαρισμός φίλτρων ({getActiveFilterCount})
                  </button>
                </div>
              </div>
            </div>

            {/* Subdivisions Carousel - only for services archive */}
            {availableSubdivisions && availableSubdivisions.length > 0 && (
              <div className='pt-6'>
                <SubdivisionsCarousel
                  subdivisions={availableSubdivisions}
                  hideTitle={true}
                  gradientColor={gradientColor}
                />
              </div>
            )}

            {/* Main Content */}
            <div className='py-6'>
              {children}

              {/* Pagination */}
              {pagination.isPaginationNeeded && (
                <ArchivePagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  startItem={pagination.startItem}
                  endItem={pagination.endItem}
                  limit={limit}
                  isLoading={isLoading}
                  onPageChange={pagination.handlePageChange}
                  onLimitChange={handleLimitUpdate}
                  showResultsPerPage={showResultsPerPage}
                  className='mt-8'
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
