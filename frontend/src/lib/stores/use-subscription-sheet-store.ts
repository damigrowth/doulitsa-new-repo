import { create } from 'zustand';

interface SubscriptionSheetState {
  isOpen: boolean;
  /** Optional context message shown in the sheet (e.g., "Για να προβάλεις υπηρεσίες...") */
  triggerReason: string | null;
  open: (reason?: string) => void;
  close: () => void;
}

export const useSubscriptionSheetStore = create<SubscriptionSheetState>(
  (set) => ({
    isOpen: false,
    triggerReason: null,
    open: (reason) =>
      set({ isOpen: true, triggerReason: reason || null }),
    close: () =>
      set({ isOpen: false, triggerReason: null }),
  }),
);
