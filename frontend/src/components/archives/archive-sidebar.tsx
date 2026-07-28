import { ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ArchiveSidebarFilters } from './archive-sidebar-filters';
import type { DatasetItem } from '@/lib/types/datasets';

interface FilterState {
  category?: string;
  subcategory?: string;
  subdivision?: string; // For services 3-level hierarchy
  county?: string; // Single county selection
  online?: boolean;
  sortBy?: string; // Sort option selection
}

interface ArchiveSidebarProps {
  children: ReactNode;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  archiveType: 'profiles' | 'services';
  categories: DatasetItem[];
  counties: DatasetItem[];
  subcategories?: DatasetItem[]; // Filtered subcategories that have services
  subdivisions?: DatasetItem[]; // Filtered subdivisions that have services
  className?: string;
}

export function ArchiveSidebar({
  children,
  filters,
  onFiltersChange,
  archiveType,
  categories,
  counties,
  subcategories,
  subdivisions,
}: ArchiveSidebarProps) {
  return (
    <Sheet>
      {children}
      <SheetContent side="left" className="w-80 sm:w-96">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg font-semibold">Φίλτρα</SheetTitle>
          <SheetDescription>
            Επιλέξτε φίλτρα για καλύτερα αποτελέσματα αναζήτησης
          </SheetDescription>
        </SheetHeader>

        <ArchiveSidebarFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          archiveType={archiveType}
          categories={categories}
          counties={counties}
          subcategories={subcategories}
          subdivisions={subdivisions}
        />
      </SheetContent>
    </Sheet>
  );
}