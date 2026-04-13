import React, { useState, useEffect, useMemo } from 'react';
import { useJastipStore, JastipItem, FeeType } from '@/store/useJastipStore';
import { useCurrency } from '@/hooks/useCurrency';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Percent, Loader2 } from 'lucide-react';
import { generateMasterRows } from '@/utils/exportWhatsapp';

interface EditItemModalProps {
  item: JastipItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const POPULAR_CURRENCIES = ['SGD', 'MYR', 'THB', 'JPY', 'KRW', 'CNY', 'HKD', 'TWD', 'AUD', 'USD', 'EUR', 'GBP', 'IDR'];

export function EditItemModal({ item, open, onOpenChange }: EditItemModalProps) {
  const { updateItem } = useJastipStore();
  const { convertToIDR, rates } = useCurrency();
  
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('SGD');
  const [originalPrice, setOriginalPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [qty, setQty] = useState('1');
  const [feeType, setFeeType] = useState<FeeType>('percentage');
  const [feeValue, setFeeValue] = useState('25');
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize form with item data
  useEffect(() => {
    if (item) {
      setName(item.name);
      setCurrency(item.currency);
      // originalPrice in store is total (price * qty), but form expects per item
      const perItemPrice = item.originalPrice / (item.qty || 1);
      setOriginalPrice(perItemPrice.toString());
      // weight in store is total, but form expects per item
      const perItemWeight = item.weight / (item.qty || 1);
      setWeight(perItemWeight.toString());
      setQty((item.qty || 1).toString());
      setFeeType(item.feeType);
      setFeeValue(item.feeType === 'percentage' ? item.feePercentage.toString() : item.feeFixed.toString());
    }
  }, [item, open]);

  const priceNum = parseFloat(originalPrice);
  const quantityNum = parseInt(qty) || 1;
  const projectedIDR = (!isNaN(priceNum) && priceNum > 0) ? convertToIDR(priceNum * quantityNum, currency) : 0;

  const { popularCurrencies, otherCurrencies } = useMemo(() => {
    const allCurrencies = Object.keys(rates).filter(c => c !== 'IDR');
    const popular = POPULAR_CURRENCIES.filter(c => c !== 'IDR' && allCurrencies.includes(c));
    const others = allCurrencies
      .filter(c => !POPULAR_CURRENCIES.includes(c))
      .sort();
    return { popularCurrencies: popular, otherCurrencies: others };
  }, [rates]);

  const handleSave = async () => {
    if (!item || !name || !originalPrice || !weight) return;

    const totalOriginalPrice = parseFloat(originalPrice) * quantityNum;
    const idrPrice = convertToIDR(totalOriginalPrice, currency);
    
    // Update local store
    updateItem(item.id, {
      name,
      qty: quantityNum,
      originalPrice: totalOriginalPrice,
      currency,
      idrPrice,
      weight: parseFloat(weight) * quantityNum,
      feeType,
      feePercentage: feeType === 'percentage' ? parseFloat(feeValue) : 0,
      feeFixed: feeType === 'fixed' ? parseFloat(feeValue) : 0,
    });

    onOpenChange(false);

    // Auto sync to sheet as requested "langsung update ke sheet nya"
    try {
      setIsSyncing(true);
      // We need the updated state. Since Zustand set is async or might not be reflected in 'customers' yet,
      // we might need to construct the rows carefully. 
      // Actually, standard way is to trigger the sync after a small delay or use the updated values.
      // For now, let's trigger it. The store will have updated by the time the fetch starts.
      
      const rows = generateMasterRows(useJastipStore.getState().customers);
      await fetch('/api/export-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
    } catch (err) {
      console.error('Auto-sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Barang Pesanan</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nama Barang</Label>
            <Input 
              id="edit-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-weight">Berat (gram per item)</Label>
              <Input 
                id="edit-weight" 
                type="number"
                value={weight} 
                onChange={(e) => setWeight(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-qty">Quantity</Label>
              <Input 
                id="edit-qty" 
                type="number"
                value={qty} 
                onChange={(e) => setQty(e.target.value)} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-currency">Mata Uang</Label>
              <Select value={currency} onValueChange={(val) => val && setCurrency(val)}>
                <SelectTrigger id="edit-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Populer</SelectLabel>
                    {popularCurrencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Lainnya</SelectLabel>
                    {otherCurrencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">Harga Asli (per item)</Label>
              <Input 
                id="edit-price" 
                type="number"
                value={originalPrice} 
                onChange={(e) => setOriginalPrice(e.target.value)} 
              />
            </div>
          </div>

          <div className="space-y-2 bg-muted/30 p-3 rounded-lg border">
            <Label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">Set Fee Jastip</Label>
            <div className="flex gap-2 mb-3">
              <Button
                type="button"
                variant={feeType === 'percentage' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setFeeType('percentage')}
              >
                <Percent className="w-3 h-3 mr-1" /> %
              </Button>
              <Button
                type="button"
                variant={feeType === 'fixed' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setFeeType('fixed')}
              >
                Rp Fixed
              </Button>
            </div>
            <Input 
              type="number"
              value={feeValue} 
              onChange={(e) => setFeeValue(e.target.value)} 
              placeholder={feeType === 'percentage' ? 'Persentase (%)' : 'Harga Tetap (Rp)'}
            />
          </div>

          <div className="text-right">
             <p className="text-xs text-muted-foreground">
               Estimasi Total: <span className="font-bold text-primary">Rp {Math.round(projectedIDR).toLocaleString('id-ID')}</span>
             </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
