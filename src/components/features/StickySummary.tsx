import React, { useState } from 'react';
import { useJastipStore, useActiveCustomer, useActiveSession } from '@/store/useJastipStore';
import { exportToWhatsapp, generateMasterRowsFromSessions } from '@/utils/exportWhatsapp';
import { Button } from '@/components/ui/button';
import { MessageCircle, ShoppingBag, TrendingUp, CloudUpload, CheckCircle, Loader2 } from 'lucide-react';

export function StickySummary() {
  const { sessions } = useJastipStore();
  const activeSession = useActiveSession();
  const activeCustomer = useActiveCustomer();
  const { items, shipping, name: customerName } = activeCustomer;
  const sessionName = activeSession.name;

  const totalModal = items.reduce((acc, item) => acc + item.idrPrice, 0);
  const totalFee = items.reduce((acc, item) => acc + item.feeAmount, 0);
  const grandTotal = items.reduce((acc, item) => acc + item.totalItemCost, 0);
  const totalWeight = items.reduce((acc, item) => acc + item.weight, 0);

  const exportData = {
    items,
    shippingCost: shipping.totalShippingCost,
    totalWeight,
    destinationName: shipping.destinationName,
    courier: shipping.courier,
    customerName,
    sessionName,
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleExportWA = () => {
    if (items.length === 0) return;
    exportToWhatsapp(exportData);
  };

  const handleSaveToSheets = async () => {
    const rows = generateMasterRowsFromSessions(sessions);
    if (rows.length === 0) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/export-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000); // revert icon
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Gagal menyimpan: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Only show if there's any item across all sessions
  const totalAllItems = sessions.reduce(
    (acc, s) => acc + s.customers.reduce((a, c) => a + c.items.length, 0),
    0
  );
  if (totalAllItems === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-lg border-t shadow-[0_-10px_40px_rgba(0,0,0,0.12)] z-50">
      <div className="container max-w-5xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">

        <div className="flex flex-wrap gap-4 md:gap-6 w-full md:w-auto">
          {/* Session + Customer label */}
          <div className="flex flex-col self-center">
            <span className="text-[10px] font-bold text-primary/70 uppercase tracking-widest leading-none mb-0.5">
              {sessionName}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide truncate max-w-[100px]">
                {customerName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <ShoppingBag className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Total Modal</p>
              <p className="text-base font-bold">Rp {Math.round(totalModal).toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-500/10 rounded-full">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Total Profit</p>
              <p className="text-base font-bold text-green-600">Rp {Math.round(totalFee).toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-2 bg-secondary/20 rounded-full">
              <span className="text-base">💰</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Grand Total</p>
              <p className="text-lg font-black text-primary">Rp {Math.round(grandTotal).toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Button
            onClick={handleSaveToSheets}
            variant="outline"
            className={`flex-1 md:flex-none border-primary/30 font-semibold transition-all ${
              saveSuccess ? 'bg-green-500/10 text-green-700 border-green-500/50' : 'hover:bg-primary/5 hover:border-primary'
            }`}
            size="default"
            disabled={items.length === 0 || isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 text-primary animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
            ) : (
              <CloudUpload className="w-4 h-4 mr-2 text-primary" />
            )}
            {isSaving ? 'Menyimpan...' : saveSuccess ? 'Tersimpan!' : 'Simpan ke Sheet'}
          </Button>

          <Button
            onClick={handleExportWA}
            className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white font-semibold"
            size="default"
            disabled={items.length === 0}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            WA {customerName}
          </Button>
        </div>
      </div>
    </div>
  );
}
