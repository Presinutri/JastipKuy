import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useJastipStore, useActiveCustomer, FeeType } from '@/store/useJastipStore';
import { useCurrency } from '@/hooks/useCurrency';
import { generateMasterRowsFromSessions } from '@/utils/exportWhatsapp';
import { useBarangMasterStore, BarangMaster } from '@/store/useBarangMasterStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Percent, Search, X, ChevronDown, Clock, Package } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// Popular currencies shown at the top of the dropdown
const POPULAR_CURRENCIES = ['SGD', 'MYR', 'THB', 'JPY', 'KRW', 'CNY', 'HKD', 'TWD', 'AUD', 'USD', 'EUR', 'GBP', 'IDR'];

export function AddProductForm() {
  const { addItem } = useJastipStore();
  const activeCustomer = useActiveCustomer();
  const { convertToIDR, loading, rates } = useCurrency();
  
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(''); // Default to empty
  const [originalPrice, setOriginalPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [qty, setQty] = useState('1');
  
  const [searchQuery, setSearchQuery] = useState(''); // For currency search
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [feeType, setFeeType] = useState<FeeType>('percentage');
  const [feeValue, setFeeValue] = useState('25');

  // ── Master Barang Search ──────────────────────────────────────────────────
  const { searchBarang, updateHargaFromPesanan, loaded: masterLoaded, loadFromSupabase: loadMaster } = useBarangMasterStore();
  const [masterResults, setMasterResults] = useState<BarangMaster[]>([]);
  const [showMasterDropdown, setShowMasterDropdown] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState<BarangMaster | null>(null);
  const [hargaAgeText, setHargaAgeText] = useState<string | null>(null);
  const masterDropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load master on mount
  useEffect(() => {
    if (!masterLoaded) loadMaster();
  }, [masterLoaded, loadMaster]);

  // Close master dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (masterDropdownRef.current && !masterDropdownRef.current.contains(e.target as Node)) {
        setShowMasterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Debounced search
  const handleNameChange = useCallback((value: string) => {
    setName(value);
    setSelectedMaster(null);
    setHargaAgeText(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        const results = searchBarang(value);
        setMasterResults(results);
        setShowMasterDropdown(results.length > 0);
      }, 300);
    } else {
      setMasterResults([]);
      setShowMasterDropdown(false);
    }
  }, [searchBarang]);

  // Auto-fill from selected master item
  const handleSelectMaster = useCallback((item: BarangMaster) => {
    setName(item.namaBarang);
    setSelectedMaster(item);
    setShowMasterDropdown(false);
    setMasterResults([]);

    // Auto-fill weight
    if (item.beratDefault) {
      setWeight(item.beratDefault.toString());
    }
    // Auto-fill currency
    if (item.mataUang) {
      setCurrency(item.mataUang.toUpperCase());
    }
    // Auto-fill harga asli
    if (item.hargaAsli !== null) {
      setOriginalPrice(item.hargaAsli.toString());
    }
    // Auto-fill harga jual if feeType is fixed
    if (item.hargaJual !== null) {
      setFeeType('fixed');
      setFeeValue(item.hargaJual.toString());
    }

    // Set harga age indicator
    if (item.hargaUpdatedAt) {
      const date = new Date(item.hargaUpdatedAt);
      const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) setHargaAgeText('Diupdate hari ini');
      else if (diffDays === 1) setHargaAgeText('Diupdate kemarin');
      else setHargaAgeText(`Diupdate ${diffDays} hari lalu`);
    } else {
      setHargaAgeText('Belum ada histori harga');
    }
  }, []);
  
  // Normalize comma → dot for decimal parsing (supports both 29,8 and 29.8)
  const normalizePrice = (val: string) => val.replace(/,/g, '.');
  const price = parseFloat(normalizePrice(originalPrice));
  const quantity = parseInt(qty) || 1;
  const projectedIDR = (!isNaN(price) && price > 0 && currency) ? convertToIDR(price * quantity, currency) : 0;

  // Filter currencies based on search
  const { filteredPopular, filteredOthers } = useMemo(() => {
    const allCurrencies = Object.keys(rates).filter(c => c !== 'IDR');
    const query = searchQuery.toUpperCase();
    
    const popular = POPULAR_CURRENCIES.filter(c => 
      c !== 'IDR' && 
      allCurrencies.includes(c) && 
      (query === '' || c.includes(query))
    );
    
    const others = allCurrencies
      .filter(c => 
        !POPULAR_CURRENCIES.includes(c) && 
        (query === '' || c.includes(query))
      )
      .sort();
      
    return { filteredPopular: popular, filteredOthers: others };
  }, [rates, searchQuery]);

  // Helper to suggest a nice rounded selling price
  const suggestHargaJual = (modal: number) => {
    if (modal <= 0) return 0;
    let step = 5000;
    if (modal >= 3000000) step = 100000;
    else if (modal >= 1000000) step = 50000;
    else if (modal >= 200000) step = 25000;
    else if (modal >= 50000) step = 10000;
    // Always round up to the next step to ensure a positive fee
    return Math.floor(modal / step + 1) * step;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !originalPrice || !weight) return;
    
    // Multiply by qty to get total price per row (normalize comma → dot)
    const totalOriginalPrice = parseFloat(normalizePrice(originalPrice)) * quantity;
    const idrPrice = convertToIDR(totalOriginalPrice, currency);
    
    // feeValue represents Harga Jual per item if feeType === 'fixed'
    let finalFeeFixed = 0;
    if (feeType === 'fixed') {
      const hargaJualPerItem = parseFloat(feeValue) || 0;
      const modalPerItem = convertToIDR(parseFloat(normalizePrice(originalPrice)), currency);
      const feePerItem = hargaJualPerItem - modalPerItem;
      finalFeeFixed = feePerItem * quantity;
    }

    addItem({
      name,
      qty: quantity,
      originalPrice: totalOriginalPrice,
      currency,
      idrPrice,
      weight: parseFloat(weight) * quantity,
      feeType,
      feePercentage: feeType === 'percentage' ? parseFloat(feeValue) : 0,
      feeFixed: finalFeeFixed,
    });

    // Write-through: update harga di master barang jika item berasal dari master
    if (selectedMaster) {
      const hargaJualVal = feeType === 'fixed' ? parseFloat(feeValue) || null : null;
      updateHargaFromPesanan(
        name,
        parseFloat(normalizePrice(originalPrice)) || null,
        currency || null,
        hargaJualVal
      );
    }
    
    // Auto sync to sheet
    (async () => {
      try {
        const state = useJastipStore.getState();
        const rows = generateMasterRowsFromSessions(state.sessions);
        await fetch('/api/export-sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows }),
        });
      } catch (err) {
        console.error('Add sync failed:', err);
      }
    })();
    
    // Reset form
    setName('');
    setOriginalPrice('');
    setWeight('');
    setQty('1');
    setSelectedMaster(null);
    setHargaAgeText(null);
    // Keep currency and fee pref
  };

  return (
    <motion.form 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card p-6 rounded-xl border shadow-sm space-y-5"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <span className="w-2 h-2 rounded-full bg-primary inline-block" />
        Menambah untuk: <span className="text-primary font-bold">{activeCustomer.name}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2" ref={masterDropdownRef}>
          <Label htmlFor="name">Nama Barang</Label>
          <div className="relative">
            <Input 
              id="name" 
              placeholder="Contoh: Popmart Labubu" 
              value={name} 
              onChange={(e) => handleNameChange(e.target.value)} 
              onFocus={() => {
                if (name.trim().length >= 2) {
                  const results = searchBarang(name);
                  setMasterResults(results);
                  setShowMasterDropdown(results.length > 0);
                }
              }}
              required
              autoComplete="off"
            />
            {/* Master Barang Search Results Dropdown */}
            <AnimatePresence>
              {showMasterDropdown && masterResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden"
                >
                  <div className="px-3 py-1.5 bg-muted/50 border-b">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Package className="w-3 h-3" /> Hasil dari Master Barang
                    </p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {masterResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectMaster(item)}
                        className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b border-border/30 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.namaBarang}</span>
                          {item.kategori && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {item.kategori}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                          {item.beratDefault && <span>{item.beratDefault}gr</span>}
                          {item.mataUang && item.hargaAsli !== null && (
                            <span>{item.mataUang} {item.hargaAsli}</span>
                          )}
                          {item.hargaJual !== null && (
                            <span className="text-green-600">Rp {Math.round(item.hargaJual).toLocaleString('id-ID')}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* No results message */}
            {name.trim().length >= 2 && !showMasterDropdown && masterResults.length === 0 && !selectedMaster && masterLoaded && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                Barang tidak ditemukan di master. Lanjut ketik manual, atau{' '}
                <Link href="/master-barang" className="text-primary hover:underline font-medium">
                  tambahkan lewat Master Barang
                </Link>.
              </p>
            )}
            {selectedMaster && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                ✓ Auto-fill dari Master Barang
              </p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-2 col-span-2">
            <Label htmlFor="weight">Berat (gram)</Label>
            <Input 
              id="weight" 
              type="number"
              min="0"
              placeholder="Contoh: 500" 
              value={weight} 
              onChange={(e) => setWeight(e.target.value)} 
              required
            />
            {weight && !isNaN(parseFloat(weight)) && (
              <p className="text-xs text-muted-foreground mt-1">
                ~ {(parseFloat(weight) * quantity / 1000).toFixed(2)} Kg total
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qty">Qty</Label>
            <Input 
              id="qty" 
              type="number"
              min="1"
              placeholder="1" 
              value={qty} 
              onChange={(e) => setQty(e.target.value)} 
            />
          </div>
        </div>
        
        <div className="space-y-2 relative">
          <Label htmlFor="currency">Mata Uang</Label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className={currency ? '' : 'text-muted-foreground'}>
                {currency || 'Pilih Mata Uang'}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </button>

            <AnimatePresence>
              {showDropdown && (
                <>
                  {/* Backdrop to close when clicking outside */}
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setShowDropdown(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute z-50 mt-2 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in outline-none"
                  >
                    <div className="flex items-center border-b px-3 py-2">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        className="flex h-7 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Cari kode (Cth: USD)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="ml-1 p-1 hover:bg-muted rounded-full">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto p-1 custom-scrollbar">
                      {filteredPopular.length > 0 && (
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Populer
                        </div>
                      )}
                      {filteredPopular.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setCurrency(c);
                            setShowDropdown(false);
                            setSearchQuery('');
                          }}
                          className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${currency === c ? 'bg-accent/50 text-accent-foreground font-medium' : ''}`}
                        >
                          {c}
                        </button>
                      ))}
                      
                      {filteredOthers.length > 0 && (
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2 border-t pt-2">
                          Lainnya
                        </div>
                      )}
                      {filteredOthers.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setCurrency(c);
                            setShowDropdown(false);
                            setSearchQuery('');
                          }}
                          className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${currency === c ? 'bg-accent/50 text-accent-foreground font-medium' : ''}`}
                        >
                          {c}
                        </button>
                      ))}
                      
                      {filteredPopular.length === 0 && filteredOthers.length === 0 && (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Tidak ada mata uang ditemukan.
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="price">Harga Asli (per item)</Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground text-sm font-medium">
              {currency === 'IDR' ? 'Rp' : (currency || '?')}
            </div>
            <Input
              id="price"
              type="text"
              inputMode="decimal"
              className="pl-14"
              placeholder="Cth: 29.8 atau 29,8"
              value={originalPrice}
              onChange={(e) => {
                // Allow digits, dot, and comma only
                const val = e.target.value.replace(/[^0-9.,]/g, '');
                setOriginalPrice(val);
              }}
              required
            />
          </div>
          {/* Conversion hint — shown whenever there's a valid price */}
          {projectedIDR > 0 && currency && currency !== 'IDR' ? (
            <p className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1 mt-1 inline-flex items-center gap-1">
              <span>≈</span>
              {quantity > 1
                ? <span>{quantity} item × {currency} {price.toLocaleString('id-ID')} = <strong>Rp {Math.round(projectedIDR).toLocaleString('id-ID')}</strong></span>
                : <span>Rp <strong>{Math.round(projectedIDR).toLocaleString('id-ID')}</strong></span>
              }
            </p>
          ) : originalPrice && isNaN(price) ? (
            <p className="text-xs text-destructive mt-1">Format tidak valid. Gunakan titik atau koma untuk desimal.</p>
          ) : null}
          {/* Harga age indicator from master */}
          {hargaAgeText && (
            <p className="text-[11px] text-muted-foreground/70 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {hargaAgeText}
            </p>
          )}
        </div>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg flex flex-col sm:flex-row gap-4 items-center border">
        <div className="flex-1">
          <Label className="mb-2 block">Set Fee Jastip</Label>
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant={feeType === 'percentage' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setFeeType('percentage');
                setFeeValue('25');
              }}
              className="px-3"
            >
              <Percent className="w-4 h-4 mr-1" /> %
            </Button>
            <Button
              type="button"
              variant={feeType === 'fixed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setFeeType('fixed');
                const modal = convertToIDR(parseFloat(normalizePrice(originalPrice || '0')), currency);
                setFeeValue(modal > 0 ? suggestHargaJual(modal).toString() : '100000');
              }}
              className="px-3"
            >
              Harga Jual
            </Button>
          </div>
        </div>
        
        <div className="flex-1 w-full">
          <Label htmlFor="feeValue" className="mb-2 block">
            {feeType === 'percentage' ? 'Persentase Fee (%)' : 'Harga Jual (Rp / item)'}
          </Label>
          <Input 
            id="feeValue" 
            type="number"
            value={feeValue} 
            onChange={(e) => setFeeValue(e.target.value)} 
            required
          />
        </div>
        
        <div className="flex-1 w-full text-right sm:mt-6">
          <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
            <PlusCircle className="w-5 h-5 mr-2" />
            Tambah Barang
          </Button>
        </div>
      </div>
    </motion.form>
  );
}
