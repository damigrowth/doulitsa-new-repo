import { create } from 'zustand';

type SkeletonType = 'service' | 'profile' | null;

interface NavigationSkeletonState {
  isVisible: boolean;
  targetType: SkeletonType;
  showSkeleton: (type: SkeletonType) => void;
  hideSkeleton: () => void;
}

/**
 * Global store for managing navigation skeleton overlay
 * Shows instant skeleton loading when navigating to service or profile pages
 * Positioned below header with scroll-to-top on navigation
 */
export const useNavigationSkeletonStore = create<NavigationSkeletonState>(
  (set) => ({
    isVisible: false,
    targetType: null,

    showSkeleton: (type: SkeletonType) => {
      set({ isVisible: true, targetType: type });
    },

    hideSkeleton: () => {
      set({ isVisible: false, targetType: null });
    },
  })
);
