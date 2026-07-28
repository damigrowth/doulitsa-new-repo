import { create } from 'zustand';

interface HomeFeaturedServicesState {
  activeCategory: string;
  setActiveCategory: (category: string) => void;
}

export const useHomeFeaturedServicesStore = create<HomeFeaturedServicesState>((set) => ({
  activeCategory: 'all',
  setActiveCategory: (category) => set({ activeCategory: category }),
}));