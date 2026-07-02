import React, { useState, useEffect } from 'react';
import { useJastipStore, useActiveCustomer } from '@/store/useJastipStore';
import { useShipping } from '@/hooks/useShipping';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, X } from 'lucide-react';
import { LocationSelect } from '@/components/features/LocationSelect';

export function ShippingSection() {
  const { updateShipping, updateItem } = useJastipStore();
  const activeCustomer = useActiveCustomer();
  const { items, shipping } = activeCustomer;
  const { calculateRates, loading } = useShipping();

  // Derive read-only values from store (react to customer change automatically)
  const originId = shipping.originId || '';
  const destinationId = shipping.destinationId || '';
  const destinationName = shipping.destinationName || '';

  // courier is editable locally but synced when customer changes
  const [courier, setCourier] = useState(shipping.courier || 'jne');
  useEffect(() => {
    setCourier(shipping.courier || 'jne');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCustomer.id]);

  const totalWeightStr = items.reduce((acc, item) => acc + item.weight, 0);

  const handleCalculate = async () => {
    if (!originId || !destinationId || totalWeightStr === 0) return;

    const costResponse = await calculateRates(originId, destinationId, totalWeightStr, courier);

    interface CourierItem { courier_code: string; courier_name: string; price: number; }
    let cost = 0;
    if (costResponse?.is_success && costResponse.data?.couriers?.length > 0) {
      const match = costResponse.data.couriers.find((item: CourierItem) => {
        const code = (item.courier_code || '').toLowerCase();
        const name = (item.courier_name || '').toLowerCase();
        const c = courier.toLowerCase();
        return code.includes(c) || name.includes(c);
      }) as CourierItem | undefined;

      if (match) {
        cost = match.price;
      } else {
        const first = costResponse.data.couriers[0] as CourierItem;
        cost = first.price;
        console.warn(`Courier ${courier} not found, choosing ${first.courier_name} as fallback.`);
      }
    } else {
      alert('Gagal menghitung ongkir. Rute mungkin tidak didukung atau berat melebihi batas.');
      return;
    }

    if (cost > 0) {
      updateShipping({
        originId,
        destinationId,
        destinationName,
        courier,
        totalWeight: totalWeightStr,
        totalShippingCost: cost,
      });

      if (items.length > 0) {
        items.forEach((item) => {
          const ratio = item.weight / totalWeightStr;
          updateItem(item.id, { shippingPerItem: cost * ratio });
        });
      }
    }
  };

  const handleClearShipping = () => {
    if (!confirm('Hapus ongkir untuk customer ini?')) return;
    
    updateShipping({
      totalShippingCost: 0,
      originId: '',
      destinationId: '',
      originName: '',
      destinationName: ''
    });

    if (items.length > 0) {
      items.forEach((item) => {
        updateItem(item.id, { shippingPerItem: 0 });
      });
    }
  };

  return (
    <Card className="border-primary/20 shadow-sm relative overflow-visible">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-xl" />
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <Truck className="w-5 h-5 mr-2 text-primary" />
          Kalkulasi Ongkir
        </CardTitle>
        <CardDescription>
          <span className="font-semibold text-primary">{activeCustomer.name}</span>
          {' · '}
          <span className="font-semibold text-foreground">{totalWeightStr} gr</span>
          <span className="text-xs text-muted-foreground ml-1">({(totalWeightStr / 1000).toFixed(2)} Kg)</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-5">
          <div className="bg-muted/30 p-3 rounded-lg border">
            <LocationSelect
              key={`origin-${activeCustomer.id}`}
              label="Asal Pengiriman"
              initialValue={shipping.originName}
              onLocationChange={(id, name) => {
                updateShipping({ originId: id, originName: name });
              }}
            />
          </div>
          <div className="bg-muted/30 p-3 rounded-lg border">
            <LocationSelect
              key={`dest-${activeCustomer.id}`}
              label="Tujuan Pengiriman"
              initialValue={shipping.destinationName}
              onLocationChange={(id, name) => {
                updateShipping({ destinationId: id, destinationName: name });
              }}
            />
          </div>

          <div className="space-y-2 pt-1">
            <label className="text-sm font-semibold">Ekspedisi (Kurir)</label>
            <div className="w-full">
              <Select value={courier} onValueChange={(val) => val && setCourier(val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Kurir" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="jne">JNE (Jalur Nugraha Ekakurir)</SelectItem>
                  <SelectItem value="sicepat">SiCepat Express</SelectItem>
                  <SelectItem value="jnt">J&T Express</SelectItem>
                  <SelectItem value="pos">POS Indonesia</SelectItem>
                  <SelectItem value="anteraja">AnterAja</SelectItem>
                  <SelectItem value="tiki">TIKI</SelectItem>
                  <SelectItem value="ninja">Ninja Express</SelectItem>
                  <SelectItem value="lion">Lion Parcel</SelectItem>
                  <SelectItem value="ide">ID Express</SelectItem>
                  <SelectItem value="spx">Shopee Express</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Est. Biaya Ongkir</p>
            <p className="text-xl font-bold text-primary">
              Rp {shipping.totalShippingCost.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {shipping.totalShippingCost > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/20 hover:bg-destructive/10 h-10 px-3"
                onClick={handleClearShipping}
                title="Hapus Ongkir"
              >
                <X className="w-4 h-4 mr-1" />
                Hapus
              </Button>
            )}
            <Button
              onClick={handleCalculate}
              disabled={loading || items.length === 0 || !originId || !destinationId}
              variant="default"
              className="h-10"
            >
              {loading ? 'Menghitung...' : 'Cek Ongkir'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
