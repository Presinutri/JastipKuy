import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

export interface BarangMaster {
  id: string;
  userId: string;
  namaBarang: string;
  kategori: string | null;
  beratDefault: number | null;
  hargaAsli: number | null;
  mataUang: string | null;
  hargaJual: number | null;
  hargaUpdatedAt: string | null;
  fotoUrl: string | null;
  remark: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

interface BarangMasterState {
  items: BarangMaster[];
  loading: boolean;
  loaded: boolean;

  loadFromSupabase: () => Promise<void>;
  addBarang: (data: Omit<BarangMaster, 'id' | 'userId' | 'isActive' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; error?: string }>;
  updateBarang: (id: string, updates: Partial<BarangMaster>) => Promise<{ success: boolean; error?: string }>;
  toggleActive: (id: string) => Promise<void>;
  searchBarang: (query: string) => BarangMaster[];
  getDistinctKategori: () => string[];
  updateHargaFromPesanan: (namaBarang: string, hargaAsli: number | null, mataUang: string | null, hargaJual: number | null) => Promise<void>;
}

/** Log Supabase error with readable message */
const syncWarn = (e: unknown) => {
  const msg = (e as { message?: string })?.message ?? JSON.stringify(e);
  console.warn('[Supabase barang_master sync]', msg);
};

/** Map Supabase row to BarangMaster interface */
const mapRow = (row: any): BarangMaster => ({
  id: row.id,
  userId: row.user_id,
  namaBarang: row.nama_barang,
  kategori: row.kategori,
  beratDefault: row.berat_default,
  hargaAsli: row.harga_asli,
  mataUang: row.mata_uang,
  hargaJual: row.harga_jual,
  hargaUpdatedAt: row.harga_updated_at,
  fotoUrl: row.foto_url,
  remark: row.remark,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Map BarangMaster to Supabase row */
const toRow = (item: BarangMaster) => ({
  id: item.id,
  user_id: item.userId,
  nama_barang: item.namaBarang,
  kategori: item.kategori,
  berat_default: item.beratDefault,
  harga_asli: item.hargaAsli,
  mata_uang: item.mataUang,
  harga_jual: item.hargaJual,
  harga_updated_at: item.hargaUpdatedAt,
  foto_url: item.fotoUrl,
  remark: item.remark,
  is_active: item.isActive,
  updated_at: new Date().toISOString(),
});

/** Fire-and-forget upsert — awaits the thenable from Supabase properly */
const syncUpsert = (item: BarangMaster) => {
  if (!supabase) return;
  (async () => {
    try {
      const { error } = await supabase.from('barang_master').upsert(toRow(item));
      if (error) syncWarn(error);
    } catch (e) {
      syncWarn(e);
    }
  })();
};

export const useBarangMasterStore = create<BarangMasterState>()(
  persist(
    (set, get) => ({
      items: [],
      loading: false,
      loaded: false,

      loadFromSupabase: async () => {
        if (!supabase) return;
        set({ loading: true });
        try {
          const { data, error } = await supabase
            .from('barang_master')
            .select('*')
            .eq('user_id', DEFAULT_USER_ID)
            .order('nama_barang', { ascending: true });

          if (error) {
            console.warn('[Supabase] Gagal fetch barang_master:', error.message);
            set({ loading: false, loaded: true });
            return;
          }

          if (data && data.length > 0) {
            const mapped = data.map(mapRow);
            set({ items: mapped, loading: false, loaded: true });
          } else {
            // Supabase empty — try sync local items up
            const localItems = get().items;
            if (localItems.length > 0) {
              for (const item of localItems) {
                const { error } = await supabase.from('barang_master').upsert(toRow(item));
                if (error) syncWarn(error);
              }
            }
            set({ loading: false, loaded: true });
          }
        } catch (err) {
          syncWarn(err);
          set({ loading: false, loaded: true });
        }
      },

      addBarang: async (data) => {
        const { items } = get();

        // Validate duplicate name (case-insensitive)
        const duplicate = items.find(
          (i) => i.namaBarang.toLowerCase() === data.namaBarang.toLowerCase() && i.isActive
        );
        if (duplicate) {
          return { success: false, error: `Barang "${data.namaBarang}" sudah ada di Master Barang.` };
        }

        // Also check inactive items
        const inactiveDuplicate = items.find(
          (i) => i.namaBarang.toLowerCase() === data.namaBarang.toLowerCase() && !i.isActive
        );
        if (inactiveDuplicate) {
          return {
            success: false,
            error: `Barang "${data.namaBarang}" sudah ada (nonaktif). Aktifkan kembali dari daftar barang nonaktif.`,
          };
        }

        const now = new Date().toISOString();
        const newItem: BarangMaster = {
          ...data,
          id: crypto.randomUUID(),
          userId: DEFAULT_USER_ID,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };

        set({ items: [...items, newItem] });

        // Sync to Supabase
        syncUpsert(newItem);

        return { success: true };
      },

      updateBarang: async (id, updates) => {
        const { items } = get();

        // If name is being changed, check for duplicates
        if (updates.namaBarang) {
          const duplicate = items.find(
            (i) =>
              i.id !== id &&
              i.namaBarang.toLowerCase() === updates.namaBarang!.toLowerCase()
          );
          if (duplicate) {
            return { success: false, error: `Barang "${updates.namaBarang}" sudah ada.` };
          }
        }

        const updatedItems = items.map((item) => {
          if (item.id !== id) return item;
          return { ...item, ...updates, updatedAt: new Date().toISOString() };
        });

        set({ items: updatedItems });

        // Sync to Supabase
        const updated = updatedItems.find((i) => i.id === id);
        if (updated) syncUpsert(updated);

        return { success: true };
      },

      toggleActive: async (id) => {
        const { items } = get();
        const updatedItems = items.map((item) => {
          if (item.id !== id) return item;
          return { ...item, isActive: !item.isActive, updatedAt: new Date().toISOString() };
        });

        set({ items: updatedItems });

        const updated = updatedItems.find((i) => i.id === id);
        if (updated) syncUpsert(updated);
      },

      searchBarang: (query: string) => {
        const { items } = get();
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return items
          .filter((i) => i.isActive && i.namaBarang.toLowerCase().includes(q))
          .slice(0, 10); // Limit results for performance
      },

      getDistinctKategori: () => {
        const { items } = get();
        const kategoris = items
          .map((i) => i.kategori)
          .filter((k): k is string => !!k);
        return [...new Set(kategoris)].sort();
      },

      updateHargaFromPesanan: async (namaBarang, hargaAsli, mataUang, hargaJual) => {
        const { items } = get();
        const item = items.find(
          (i) => i.namaBarang.toLowerCase() === namaBarang.toLowerCase() && i.isActive
        );
        if (!item) return;

        const now = new Date().toISOString();
        const updates: Partial<BarangMaster> = {
          hargaUpdatedAt: now,
          updatedAt: now,
        };
        if (hargaAsli !== null) updates.hargaAsli = hargaAsli;
        if (mataUang !== null) updates.mataUang = mataUang;
        if (hargaJual !== null) updates.hargaJual = hargaJual;

        const updatedItems = items.map((i) => {
          if (i.id !== item.id) return i;
          return { ...i, ...updates };
        });

        set({ items: updatedItems });

        if (supabase) {
          const updated = updatedItems.find((i) => i.id === item.id)!;
          syncUpsert(updated);
        }
      },
    }),
    {
      name: 'jastipkuy-barang-master-v1',
    }
  )
);
