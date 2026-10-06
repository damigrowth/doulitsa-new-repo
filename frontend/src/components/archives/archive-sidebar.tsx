'use client';

import { ReactNode, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ArchiveSidebarFilters } from './archive-sidebar-filters';
import {
  cancelArchiveFiltersSheetClose,
  scheduleArchiveFiltersSheetClose,
  useArchiveFiltersSheetStore,
} from '@/lib/stores/use-archive-filters-sheet-store';
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
  // Open state lives in a global store so the sheet survives the remount
  // caused by taxonomy navigation (e.g. /dir -> /dir/[category]) and stays
  // open while the user keeps refining filters.
  const isOpen = useArchiveFiltersSheetStore((state) => state.isOpen);
  const setOpen = useArchiveFiltersSheetStore((state) => state.setOpen);

  // Close the sheet only when the archive section is left entirely: on an
  // archive -> archive navigation the next sidebar mounts in the same commit
  // and cancels the scheduled close.
  useEffect(() => {
    cancelArchiveFiltersSheetClose();
    return () => {
      scheduleArchiveFiltersSheetClose();
    };
  }, []);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
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