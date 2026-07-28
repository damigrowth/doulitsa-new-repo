import { create } from 'zustand';

interface Package {
  id: string | number;
  name: string;
  price: number;
}

interface ServiceOrder {
  buyer: number;
  seller: number;
  service: number;
  packages: Package[];
  addons: AppJson.ServiceAddon[];
  fixed: boolean | null;
  fixedPrice: number;
  total: number;
}

interface ServiceOrderStore {
  order: ServiceOrder;
  setOrder: (order: Partial<ServiceOrder>) => void;
  calculateTotal: () => void;
}

const useServiceOrderStore = create<ServiceOrderStore>((set) => ({
  order: {
    buyer: 0,
    seller: 0,
    service: 0,
    packages: [],
    addons: [],
    fixed: null,
    fixedPrice: 0,
    total: 0,
  },
  setOrder: (order) =>
    set((state) => ({ order: { ...state.order, ...order } })),
  calculateTotal: () =>
    set((state) => {
      const { fixed, fixedPrice, packages, addons } = state.order;

      let total = 0;

      const addonsPrice = addons.reduce((acc, addon) => acc + addon.price, 0);

      if (fixed) {
        total = fixedPrice + addonsPrice;
      } else {
        let packagePrice = 0;

        if (packages.length > 0) {
          packagePrice = packages[0]?.price || 0;
        } else {
          packagePrice = 0;
        }
        total = packagePrice + addonsPrice;
      }

      return { order: { ...state.order, total } };
    }),
}));

export default useServiceOrderStore;