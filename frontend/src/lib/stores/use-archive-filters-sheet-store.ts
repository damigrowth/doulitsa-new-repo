import { create } from 'zustand';

interface ArchiveFiltersSheetState {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

/**
 * Global store for the archive "Φίλτρα" sheet (drawer) open state.
 *
 * Picking a taxonomy filter inside the sheet navigates to a new route
 * (e.g. /dir -> /dir/[category]), which remounts the whole archive page
 * tree. Keeping the open state outside that tree lets the sheet stay open
 * across the navigation so users can keep refining their filters.
 */
export const useArchiveFiltersSheetStore = create<ArchiveFiltersSheetState>(
  (set) => ({
    isOpen: false,
    setOpen: (open: boolean) => set({ isOpen: open }),
  }),
);

// Close the sheet when the archive section is left entirely. On an
// archive -> archive navigation the old sidebar unmounts and the new one
// mounts in the same commit, so the scheduled close is cancelled before it
// runs. When the user leaves the archives with the sheet open (e.g. browser
// back), nothing cancels it and the sheet won't pop open on their next
// archive visit.
let pendingClose: ReturnType<typeof setTimeout> | null = null;

export function scheduleArchiveFiltersSheetClose() {
  if (pendingClose) clearTimeout(pendingClose);
  pendingClose = setTimeout(() => {
    pendingClose = null;
    useArchiveFiltersSheetStore.setState({ isOpen: false });
  }, 0);
}

export function cancelArchiveFiltersSheetClose() {
  if (pendingClose) {
    clearTimeout(pendingClose);
    pendingClose = null;
  }
}
