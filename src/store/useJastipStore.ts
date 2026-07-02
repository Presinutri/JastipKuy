import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as supabaseSync from '@/lib/supabaseSync';
import { supabase } from '@/lib/supabase';

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

export interface JastipSession {
  id: string;
  name: string;
  customers: Customer[];
  activeCustomerId: string;
}

export const defaultShipping = (): CustomerShipping => ({
  originId: '',
  originName: '',
  destinationId: '',
  destinationName: '',
  courier: 'jne',
  service: '',
  totalWeight: 0,
  totalShippingCost: 0,
});

export const createCustomer = (name: string): Customer => ({
  id: Math.random().toString(36).substring(2, 9),
  name,
  items: [],
  shipping: defaultShipping(),
});

export const createSession = (name: string): JastipSession => {
  const firstCustomer = createCustomer('Customer 1');
  return {
    id: Math.random().toString(36).substring(2, 9),
    name,
    customers: [firstCustomer],
    activeCustomerId: firstCustomer.id,
  };
};

interface JastipState {
  sessions: JastipSession[];
  activeSessionId: string;

  // Session actions
  addSession: (name: string) => void;
  removeSession: (id: string) => void;
  renameSession: (id: string, name: string) => void;
  setActiveSession: (id: string) => void;

  // Customer actions (on active session)
  addCustomer: (name: string) => void;
  removeCustomer: (id: string) => void;
  renameCustomer: (id: string, name: string) => void;
  setActiveCustomer: (id: string) => void;

  // Item actions (on active customer of active session)
  addItem: (item: Omit<JastipItem, 'id' | 'feeAmount' | 'shippingPerItem' | 'totalItemCost'>) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<JastipItem>) => void;

  // Shipping actions (on active customer of active session)
  updateShipping: (shipping: Partial<CustomerShipping>) => void;

  reset: () => void;
}

const defaultSession = createSession('JASTIP 1');

const initialState = {
  sessions: [defaultSession],
  activeSessionId: defaultSession.id,
};

// Helper to update the active session immutably
const updateActiveSession = (
  sessions: JastipSession[],
  activeSessionId: string,
  updater: (session: JastipSession) => JastipSession
): JastipSession[] =>
  sessions.map((s) => (s.id === activeSessionId ? updater(s) : s));

// Helper to update the active customer inside the active session immutably
const updateActiveCustomer = (
  sessions: JastipSession[],
  activeSessionId: string,
  updater: (customer: Customer) => Customer
): JastipSession[] =>
  updateActiveSession(sessions, activeSessionId, (session) => ({
    ...session,
    customers: session.customers.map((c) =>
      c.id === session.activeCustomerId ? updater(c) : c
    ),
  }));

/** Helper: log Supabase error dengan pesan yang readable (bukan `{}`) */
const syncWarn = (e: unknown) => {
  const msg = (e as { message?: string })?.message ?? JSON.stringify(e);
  console.warn('[Supabase sync]', msg);
};

export const useJastipStore = create<JastipState>()(
  persist(
    (set) => ({
      ...initialState,

      // ── Session actions ──────────────────────────────────────────────────

      addSession: (name) => {
        const newSession = createSession(name);
        // Sync ke Supabase (fire-and-forget)
        supabaseSync.upsertSession(newSession).catch(syncWarn);
        supabaseSync.upsertCustomer(newSession.customers[0], newSession.id).catch(syncWarn);
        supabaseSync.saveActiveSessionId(newSession.id).catch(syncWarn);

        set((state) => ({
          sessions: [...state.sessions, newSession],
          activeSessionId: newSession.id,
        }));
      },

      removeSession: (id) => {
        // Hapus dari Supabase (cascade menghapus customers + items)
        supabaseSync.deleteSession(id).catch(syncWarn);

        set((state) => {
          const remaining = state.sessions.filter((s) => s.id !== id);
          if (remaining.length === 0) {
            const fresh = createSession('JASTIP 1');
            supabaseSync.upsertSession(fresh).catch(syncWarn);
            supabaseSync.upsertCustomer(fresh.customers[0], fresh.id).catch(syncWarn);
            supabaseSync.saveActiveSessionId(fresh.id).catch(syncWarn);
            return { sessions: [fresh], activeSessionId: fresh.id };
          }
          const nextActive =
            state.activeSessionId === id ? remaining[0].id : state.activeSessionId;
          supabaseSync.saveActiveSessionId(nextActive).catch(syncWarn);
          return { sessions: remaining, activeSessionId: nextActive };
        });
      },

      renameSession: (id, name) => {
        set((state) => {
          const updated = state.sessions.map((s) => (s.id === id ? { ...s, name } : s));
          const session = updated.find((s) => s.id === id);
          if (session) supabaseSync.upsertSession(session).catch(syncWarn);
          return { sessions: updated };
        });
      },

      setActiveSession: (id) => {
        supabaseSync.saveActiveSessionId(id).catch(syncWarn);
        set({ activeSessionId: id });
      },

      // ── Customer actions (within active session) ──────────────────────────

      addCustomer: (name) => {
        set((state) => {
          const newCustomer = createCustomer(name);
          // Update session's activeCustomerId
          const updatedSession = state.sessions.find((s) => s.id === state.activeSessionId);
          if (updatedSession) {
            supabaseSync.upsertCustomer(newCustomer, state.activeSessionId).catch(syncWarn);
            // Sync updated session active_customer_id
            supabaseSync.upsertSession({
              ...updatedSession,
              activeCustomerId: newCustomer.id,
              customers: [...updatedSession.customers, newCustomer],
            }).catch(syncWarn);
          }
          return {
            sessions: updateActiveSession(state.sessions, state.activeSessionId, (session) => ({
              ...session,
              customers: [...session.customers, newCustomer],
              activeCustomerId: newCustomer.id,
            })),
          };
        });
      },

      removeCustomer: (id) => {
        // Hapus dari Supabase (cascade menghapus items)
        supabaseSync.deleteCustomer(id).catch(syncWarn);

        set((state) => {
          return {
            sessions: updateActiveSession(state.sessions, state.activeSessionId, (session) => {
              const remaining = session.customers.filter((c) => c.id !== id);
              if (remaining.length === 0) {
                const fresh = createCustomer('Customer 1');
                supabaseSync.upsertCustomer(fresh, state.activeSessionId).catch(syncWarn);
                supabaseSync.upsertSession({ ...session, customers: [fresh], activeCustomerId: fresh.id }).catch(syncWarn);
                return { ...session, customers: [fresh], activeCustomerId: fresh.id };
              }
              const nextActive =
                session.activeCustomerId === id ? remaining[0].id : session.activeCustomerId;
              supabaseSync.upsertSession({ ...session, customers: remaining, activeCustomerId: nextActive }).catch(syncWarn);
              return { ...session, customers: remaining, activeCustomerId: nextActive };
            }),
          };
        });
      },

      renameCustomer: (id, name) => {
        set((state) => {
          const activeSession = state.sessions.find((s) => s.id === state.activeSessionId);
          const customer = activeSession?.customers.find((c) => c.id === id);
          if (customer) {
            supabaseSync.upsertCustomer({ ...customer, name }, state.activeSessionId).catch(syncWarn);
          }
          return {
            sessions: updateActiveSession(state.sessions, state.activeSessionId, (session) => ({
              ...session,
              customers: session.customers.map((c) => (c.id === id ? { ...c, name } : c)),
            })),
          };
        });
      },

      setActiveCustomer: (id) => {
        set((state) => {
          const activeSession = state.sessions.find((s) => s.id === state.activeSessionId);
          if (activeSession) {
            supabaseSync.upsertSession({ ...activeSession, activeCustomerId: id }).catch(syncWarn);
          }
          return {
            sessions: updateActiveSession(state.sessions, state.activeSessionId, (session) => ({
              ...session,
              activeCustomerId: id,
            })),
          };
        });
      },

      // ── Item actions (within active customer of active session) ───────────

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

          // Sync ke Supabase
          const activeSession = state.sessions.find((s) => s.id === state.activeSessionId);
          const customerId = activeSession?.activeCustomerId;
          if (customerId) {
            supabaseSync.upsertItem(newItem, customerId).catch(syncWarn);
          }

          return {
            sessions: updateActiveCustomer(state.sessions, state.activeSessionId, (customer) => ({
              ...customer,
              items: [...customer.items, newItem],
            })),
          };
        });
      },

      removeItem: (id) => {
        // Hapus dari Supabase
        supabaseSync.deleteItem(id).catch(syncWarn);

        set((state) => ({
          sessions: updateActiveCustomer(state.sessions, state.activeSessionId, (customer) => {
            const newItems = customer.items.filter((i) => i.id !== id);
            return {
              ...customer,
              items: newItems,
              shipping: {
                ...customer.shipping,
                totalShippingCost: newItems.length === 0 ? 0 : customer.shipping.totalShippingCost,
                totalWeight: newItems.length === 0 ? 0 : customer.shipping.totalWeight,
              },
            };
          }),
        }));
      },

      updateItem: (id, updates) => {
        set((state) => {
          const activeSession = state.sessions.find((s) => s.id === state.activeSessionId);
          const customerId = activeSession?.activeCustomerId;

          return {
            sessions: updateActiveCustomer(state.sessions, state.activeSessionId, (customer) => ({
              ...customer,
              items: customer.items.map((item) => {
                if (item.id !== id) return item;
                const updated = { ...item, ...updates };
                const feeAmount =
                  updated.feeType === 'percentage'
                    ? (updated.idrPrice * updated.feePercentage) / 100
                    : updated.feeFixed;
                updated.feeAmount = feeAmount;
                updated.totalItemCost = updated.idrPrice + feeAmount + updated.shippingPerItem;

                // Sync ke Supabase
                if (customerId) {
                  supabaseSync.upsertItem(updated, customerId).catch(syncWarn);
                }

                return updated;
              }),
            })),
          };
        });
      },

      updateShipping: (shippingUpdate) => {
        set((state) => {
          const activeSession = state.sessions.find((s) => s.id === state.activeSessionId);
          const activeCustomer = activeSession?.customers.find(
            (c) => c.id === activeSession.activeCustomerId
          );

          if (activeCustomer) {
            const mergedCustomer: Customer = {
              ...activeCustomer,
              shipping: { ...activeCustomer.shipping, ...shippingUpdate },
            };
            supabaseSync.upsertCustomer(mergedCustomer, state.activeSessionId).catch(syncWarn);
          }

          return {
            sessions: updateActiveCustomer(state.sessions, state.activeSessionId, (customer) => ({
              ...customer,
              shipping: { ...customer.shipping, ...shippingUpdate },
            })),
          };
        });
      },

      reset: () => {
        const fresh = createSession('JASTIP 1');
        // Hapus semua sessions dari Supabase, buat ulang
        (async () => {
          try {
            await supabase.from('sessions').delete().neq('id', '___impossible___');
            await supabaseSync.upsertSession(fresh);
            await supabaseSync.upsertCustomer(fresh.customers[0], fresh.id);
            await supabaseSync.saveActiveSessionId(fresh.id);
          } catch (err) {
            console.error('[Supabase] Reset failed:', err);
          }
        })();
        set({ sessions: [fresh], activeSessionId: fresh.id });
      },
    }),
    {
      name: 'jastipkuy-storage-v3', // bumped to avoid conflict with old data
    }
  )
);

// ── Selector helpers ──────────────────────────────────────────────────────────

export const useActiveSession = () => {
  const { sessions, activeSessionId } = useJastipStore();
  return sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? createSession('JASTIP Fallback');
};

export const useActiveCustomer = () => {
  const session = useActiveSession();
  return (
    session?.customers?.find((c) => c.id === session.activeCustomerId) ??
    session?.customers?.[0] ??
    createCustomer('Customer 1')
  );
};

/**
 * Returns all customers from ALL sessions (used for export/WA/sheets).
 * Flattened with session name prefix for clarity.
 */
export const useAllCustomers = () => {
  const { sessions } = useJastipStore();
  return sessions.flatMap((s) => s.customers);
};
