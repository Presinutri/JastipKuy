'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBarangMasterStore, BarangMaster } from '@/store/useBarangMasterStore';
import { BarangMasterFormModal } from './BarangMasterFormModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PlusCircle,
  Search,
  Package,
  Pencil,
  ToggleLeft,
  ToggleRight,
  RotateCcw,
  Weight,
  X,
  Clock,
  Filter,
} from 'lucide-react';

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Belum ada histori harga';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Diupdate hari ini';
  if (diffDays === 1) return 'Diupdate kemarin';
  return `Diupdate ${diffDays} hari lalu`;
}

function formatRp(amount: number | null): string {
  if (amount === null || amount === undefined) return '-';
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

export function MasterBarangTab() {
  const { items, loading, loaded, loadFromSupabase, toggleActive } = useBarangMasterStore();
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BarangMaster | null>(null);

  // Load from Supabase on mount
  useEffect(() => {
    if (!loaded) {
      loadFromSupabase();
    }
  }, [loaded, loadFromSupabase]);

  const handleAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item: BarangMaster) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleToggleActive = async (item: BarangMaster) => {
    const action = item.isActive ? 'nonaktifkan' : 'aktifkan kembali';
    if (!confirm(`Yakin ingin ${action} "${item.namaBarang}"?`)) return;
    await toggleActive(item.id);
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (!showInactive && !item.isActive) return false;
    if (showInactive && item.isActive) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.namaBarang.toLowerCase().includes(q) ||
        (item.kategori && item.kategori.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const activeCount = items.filter((i) => i.isActive).length;
  const inactiveCount = items.filter((i) => !i.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            📦 Master Barang
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Simpan daftar barang yang sering dijastipkan. Cari dan auto-fill saat input pesanan.
          </p>
        </div>
        <Button onClick={handleAdd} className="shrink-0">
          <PlusCircle className="w-4 h-4 mr-2" />
          Tambah Barang
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-full"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showInactive ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
            className="text-xs"
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            {showInactive ? `Nonaktif (${inactiveCount})` : `Aktif (${activeCount})`}
          </Button>
        </div>
      </div>

      {/* Items List */}
      {loading && !loaded ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-8 h-8 mx-auto mb-2 animate-pulse" />
          <p>Memuat data Master Barang...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 bg-muted/20 border border-dashed rounded-xl"
        >
          <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground font-medium">
            {search
              ? 'Tidak ada barang yang cocok dengan pencarian.'
              : showInactive
              ? 'Tidak ada barang yang dinonaktifkan.'
              : 'Belum ada barang di Master. Mulai tambahkan barang pertama!'}
          </p>
          {!search && !showInactive && (
            <Button onClick={handleAdd} variant="outline" className="mt-4">
              <PlusCircle className="w-4 h-4 mr-2" />
              Tambah Barang Pertama
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-all ${
                  !item.isActive ? 'opacity-60 bg-muted/30' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Name + Category */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm truncate">{item.namaBarang}</h3>
                      {item.kategori && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {item.kategori}
                        </Badge>
                      )}
                      {!item.isActive && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Nonaktif
                        </Badge>
                      )}
                    </div>

                    {/* Details Row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      {item.beratDefault !== null && (
                        <span className="inline-flex items-center gap-1">
                          <Weight className="w-3 h-3" />
                          {item.beratDefault}gr
                        </span>
                      )}
                      {item.hargaAsli !== null && item.mataUang && (
                        <span>
                          {item.mataUang} {item.hargaAsli.toLocaleString('id-ID')}
                        </span>
                      )}
                      {item.hargaJual !== null && (
                        <span className="text-green-600 font-medium">
                          {formatRp(item.hargaJual)}
                        </span>
                      )}
                    </div>

                    {/* Harga age indicator */}
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground/70">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(item.hargaUpdatedAt)}
                    </div>

                    {/* Remark */}
                    {item.remark && (
                      <p className="mt-1.5 text-xs text-muted-foreground italic truncate">
                        {item.remark}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:bg-primary/10"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${
                        item.isActive
                          ? 'text-orange-500 hover:bg-orange-500/10'
                          : 'text-green-600 hover:bg-green-600/10'
                      }`}
                      onClick={() => handleToggleActive(item)}
                      title={item.isActive ? 'Nonaktifkan' : 'Aktifkan Kembali'}
                    >
                      {item.isActive ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Form Modal */}
      <BarangMasterFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editItem={editingItem}
      />
    </div>
  );
}
