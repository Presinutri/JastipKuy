'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useBarangMasterStore, BarangMaster } from '@/store/useBarangMasterStore';
import { Save, AlertCircle, X } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: BarangMaster | null; // null = mode Tambah
}

export function BarangMasterFormModal({ open, onOpenChange, editItem }: Props) {
  const { addBarang, updateBarang, getDistinctKategori } = useBarangMasterStore();

  const [namaBarang, setNamaBarang] = useState('');
  const [kategori, setKategori] = useState('');
  const [beratDefault, setBeratDefault] = useState('');
  const [hargaAsli, setHargaAsli] = useState('');
  const [mataUang, setMataUang] = useState('');
  const [hargaJual, setHargaJual] = useState('');
  const [remark, setRemark] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Kategori autocomplete
  const [showKategoriSuggestions, setShowKategoriSuggestions] = useState(false);
  const kategoriRef = useRef<HTMLDivElement>(null);

  const isEdit = !!editItem;

  // Populate form when editing
  useEffect(() => {
    if (editItem) {
      setNamaBarang(editItem.namaBarang);
      setKategori(editItem.kategori || '');
      setBeratDefault(editItem.beratDefault?.toString() || '');
      setHargaAsli(editItem.hargaAsli?.toString() || '');
      setMataUang(editItem.mataUang || '');
      setHargaJual(editItem.hargaJual?.toString() || '');
      setRemark(editItem.remark || '');
    } else {
      setNamaBarang('');
      setKategori('');
      setBeratDefault('');
      setHargaAsli('');
      setMataUang('');
      setHargaJual('');
      setRemark('');
    }
    setError(null);
  }, [editItem, open]);

  // Get existing categories for autocomplete
  const allKategori = getDistinctKategori();
  const filteredKategori = kategori
    ? allKategori.filter((k) => k.toLowerCase().includes(kategori.toLowerCase()))
    : allKategori;

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (kategoriRef.current && !kategoriRef.current.contains(e.target as Node)) {
        setShowKategoriSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaBarang.trim()) {
      setError('Nama barang wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);

    const data = {
      namaBarang: namaBarang.trim(),
      kategori: kategori.trim() || null,
      beratDefault: beratDefault ? parseFloat(beratDefault) : null,
      hargaAsli: hargaAsli ? parseFloat(hargaAsli) : null,
      mataUang: mataUang.trim().toUpperCase() || null,
      hargaJual: hargaJual ? parseFloat(hargaJual) : null,
      hargaUpdatedAt: hargaAsli || hargaJual ? new Date().toISOString() : null,
      fotoUrl: null,
      remark: remark.trim() || null,
    };

    let result;
    if (isEdit && editItem) {
      result = await updateBarang(editItem.id, data);
    } else {
      result = await addBarang(data);
    }

    setSaving(false);

    if (result.success) {
      onOpenChange(false);
    } else {
      setError(result.error || 'Terjadi kesalahan.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isEdit ? '✏️ Edit Barang' : '➕ Tambah Barang Baru'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nama Barang (wajib) */}
          <div className="space-y-2">
            <Label htmlFor="bm-nama">
              Nama Barang <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bm-nama"
              placeholder="Contoh: Maggi Mee Tom Yam"
              value={namaBarang}
              onChange={(e) => setNamaBarang(e.target.value)}
              required
            />
          </div>

          {/* Kategori (autocomplete) */}
          <div className="space-y-2" ref={kategoriRef}>
            <Label htmlFor="bm-kategori">Kategori</Label>
            <div className="relative">
              <Input
                id="bm-kategori"
                placeholder="Contoh: Makanan, Skincare, Snack"
                value={kategori}
                onChange={(e) => {
                  setKategori(e.target.value);
                  setShowKategoriSuggestions(true);
                }}
                onFocus={() => setShowKategoriSuggestions(true)}
                autoComplete="off"
              />
              {showKategoriSuggestions && filteredKategori.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-32 overflow-y-auto">
                  {filteredKategori.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setKategori(k);
                        setShowKategoriSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      {k}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Ketik kategori baru atau pilih dari yang sudah pernah dipakai.
            </p>
          </div>

          {/* Berat Default */}
          <div className="space-y-2">
            <Label htmlFor="bm-berat">Berat Default (gram)</Label>
            <Input
              id="bm-berat"
              type="number"
              min="0"
              placeholder="Contoh: 415"
              value={beratDefault}
              onChange={(e) => setBeratDefault(e.target.value)}
            />
          </div>

          {/* Harga Asli + Mata Uang (paired) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="bm-harga-asli">Harga Asli (referensi)</Label>
              <Input
                id="bm-harga-asli"
                type="text"
                inputMode="decimal"
                placeholder="Contoh: 5.8"
                value={hargaAsli}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, '');
                  setHargaAsli(val);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bm-mata-uang">Mata Uang</Label>
              <Input
                id="bm-mata-uang"
                placeholder="MYR"
                value={mataUang}
                onChange={(e) => setMataUang(e.target.value)}
              />
            </div>
          </div>

          {/* Harga Jual */}
          <div className="space-y-2">
            <Label htmlFor="bm-harga-jual">Harga Jual (Rp, referensi)</Label>
            <Input
              id="bm-harga-jual"
              type="number"
              min="0"
              placeholder="Contoh: 80000"
              value={hargaJual}
              onChange={(e) => setHargaJual(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Harga referensi terakhir — bukan harga final. Akan ter-update otomatis saat dipakai di Kalkulator.
            </p>
          </div>

          {/* Catatan */}
          <div className="space-y-2">
            <Label htmlFor="bm-remark">Catatan</Label>
            <Input
              id="bm-remark"
              placeholder="Catatan bebas (opsional)"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Barang'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
