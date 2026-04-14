import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useJastipStore, useActiveCustomer, FeeType } from '@/store/useJastipStore';
import { useCurrency } from '@/hooks/useCurrency';
import { generateMasterRows } from '@/utils/exportWhatsapp';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Percent, Search, X, ChevronDown } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

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
  
  const price = parseFloat(originalPrice.replace(/,/g, '.'));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !originalPrice || !weight) return;
    
    // Multiply by qty to get total price per row
    const totalOriginalPrice = parseFloat(originalPrice) * quantity;
    const idrPrice = convertToIDR(totalOriginalPrice, currency);
    
    addItem({
      name,
      qty: quantity,
      originalPrice: totalOriginalPrice,
      currency,
      idrPrice,
      weight: parseFloat(weight) * quantity,
      feeType,
      feePercentage: feeType === 'percentage' ? parseFloat(feeValue) : 0,
      feeFixed: feeType === 'fixed' ? parseFloat(feeValue) : 0,
    });
    
    // Auto sync to sheet
    (async () => {
      try {
        const rows = generateMasterRows(useJastipStore.getState().customers);
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
        <div className="space-y-2">
          <Label htmlFor="name">Nama Barang</Label>
          <Input 
            id="name" 
            placeholder="Contoh: Popmart Labubu" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required
          />
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
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground text-sm">
              {currency === 'IDR' ? 'Rp' : currency}
            </div>
            <Input 
              id="price" 
              type="number"
              min="0"
              className="pl-14"
              placeholder="0" 
              value={originalPrice} 
              onChange={(e) => setOriginalPrice(e.target.value)} 
              required
            />
          </div>
          {currency !== 'IDR' && projectedIDR > 0 && (
             <p className="text-xs text-muted-foreground mt-1">
               {quantity > 1 ? `${quantity} item × ${currency} ${price.toLocaleString('id-ID')} = ` : ''}~ Rp {Math.round(projectedIDR).toLocaleString('id-ID')}
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
                setFeeValue('50000');
              }}
              className="px-3"
            >
              Rp Fixed
            </Button>
          </div>
        </div>
        
        <div className="flex-1 w-full">
          <Label htmlFor="feeValue" className="mb-2 block">
            {feeType === 'percentage' ? 'Persentase Fee (%)' : 'Manual Fee (Rp)'}
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
