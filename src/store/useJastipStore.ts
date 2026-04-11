import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FeeType = 'percentage' | 'fixed';

export interface JastipItem {
  id: string;
  name: string;
  qty: number;
  originalPrice: number;
  currency: string;
  idrPrice: number;
  weight: number;
  feeType: FeeType;
  feePercentage: number;
  feeFixed: number;
  feeAmount: number;
  shippingPerItem: number;
  totalItemCost: number;
}

export interface CustomerShipping {
  originId: string;
  originName: string;
  destinationId: string;
  destinationName: string;
  courier: string;
  service: string;
  totalWeight: number;
  totalShippingCost: number;
}

export interface Customer {
  id: string;
  name: string;
  items: JastipItem[];
  shipping: CustomerShipping;
}

const defaultShipping = (): CustomerShipping => ({
  originId: '',
  originName: '',
  destinationId: '',
  destinationName: '',
  courier: 'jne',
  service: '',
  totalWeight: 0,
  totalShippingCost: 0,
});

const createCustomer = (name: string): Customer => ({
  id: Math.random().toString(36).substring(2, 9),
  name,
  items: [],
  shipping: defaultShipping(),
});

interface JastipState {
  customers: Customer[];
  activeCustomerId: string;

  // Customer actions
  addCustomer: (name: string) => void;
  removeCustomer: (id: string) => void;
  renameCustomer: (id: string, name: string) => void;
  setActiveCustomer: (id: string) => void;

  // Item actions (on active customer)
  addItem: (item: Omit<JastipItem, 'id' | 'feeAmount' | 'shippingPerItem' | 'totalItemCost'>) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<JastipItem>) => void;

  // Shipping actions (on active customer)
  updateShipping: (shipping: Partial<CustomerShipping>) => void;

  reset: () => void;
}

const defaultCustomer: Customer = {
  id: 'default-customer',
  name: 'Customer 1',
  items: [],
  shipping: defaultShipping(),
};

const initialState = {
  customers: [defaultCustomer],
  activeCustomerId: defaultCustomer.id,
};

export const useJastipStore = create<JastipState>()(
  persist(
    (set) => ({
      ...initialState,

      addCustomer: (name) => {
        const newCustomer = createCustomer(name);
        set((state) => ({
          customers: [...state.customers, newCustomer],
          activeCustomerId: newCustomer.id,
        }));
      },

      removeCustomer: (id) => {
        set((state) => {
          const remaining = state.customers.filter((c) => c.id !== id);
          // Always keep at least 1 customer
          if (remaining.length === 0) {
            const fresh = createCustomer('Customer 1');
            return { customers: [fresh], activeCustomerId: fresh.id };
          }
          // If we removed the active one, switch to the first remaining
          const nextActive = state.activeCustomerId === id
            ? remaining[0].id
            : state.activeCustomerId;
          return { customers: remaining, activeCustomerId: nextActive };
        });
      },

      renameCustomer: (id, name) => {
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id ? { ...c, name } : c
          ),
        }));
      },

      setActiveCustomer: (id) => {
        set({ activeCustomerId: id });
      },

      addItem: (itemData) => {
        set((state) => {
          const id = Math.random().toString(36).substring(2, 9);
          const feeAmount =
            itemData.feeType === 'percentage'
              ? (itemData.idrPrice * itemData.feePercentage) / 100
              : itemData.feeFixed;

          const newItem: JastipItem = {
            ...itemData,
            id,
            feeAmount,
            shippingPerItem: 0,
            totalItemCost: itemData.idrPrice + feeAmount,
          };

          return {
            customers: state.customers.map((c) =>
              c.id === state.activeCustomerId
                ? { ...c, items: [...c.items, newItem] }
                : c
            ),
          };
        });
      },

      removeItem: (id) => {
        set((state) => {
          return {
            customers: state.customers.map((c) => {
              if (c.id !== state.activeCustomerId) return c;
              const newItems = c.items.filter((i) => i.id !== id);
              const shippingCost = newItems.length === 0 ? 0 : c.shipping.totalShippingCost;
              return {
                ...c,
                items: newItems,
                shipping: { ...c.shipping, totalShippingCost: shippingCost, totalWeight: newItems.length === 0 ? 0 : c.shipping.totalWeight },
              };
            }),
          };
        });
      },

      updateItem: (id, updates) => {
        set((state) => ({
          customers: state.customers.map((c) => {
            if (c.id !== state.activeCustomerId) return c;
            return {
              ...c,
              items: c.items.map((item) => {
                if (item.id !== id) return item;
                const updated = { ...item, ...updates };
                const feeAmount =
                  updated.feeType === 'percentage'
                    ? (updated.idrPrice * updated.feePercentage) / 100
                    : updated.feeFixed;
                updated.feeAmount = feeAmount;
                updated.totalItemCost =
                  updated.idrPrice + feeAmount + updated.shippingPerItem;
                return updated;
              }),
            };
          }),
        }));
      },

      updateShipping: (shippingUpdate) => {
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === state.activeCustomerId
              ? { ...c, shipping: { ...c.shipping, ...shippingUpdate } }
              : c
          ),
        }));
      },

      reset: () => {
        const fresh = createCustomer('Customer 1');
        set({ customers: [fresh], activeCustomerId: fresh.id });
      },
    }),
    {
      name: 'jastipkuy-storage-v2', // new key to avoid conflict with old data
    }
  )
);

// Selector helpers
export const useActiveCustomer = () => {
  const { customers, activeCustomerId } = useJastipStore();
  return customers.find((c) => c.id === activeCustomerId) ?? customers[0];
};
