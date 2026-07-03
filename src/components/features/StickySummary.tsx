import React, { useState } from 'react';
import { useJastipStore, useActiveCustomer, useActiveSession } from '@/store/useJastipStore';
import { exportToWhatsapp, generateMasterRowsFromSessions } from '@/utils/exportWhatsapp';
import { Button } from '@/components/ui/button';
import { MessageCircle, ShoppingBag, TrendingUp, CloudUpload, CheckCircle, Loader2 } from 'lucide-react';

export function StickySummary() {
  const { sessions } = useJastipStore();
  const activeSession = useActiveSession();
  const sessionCustomers = activeSession.customers || [];
  const sessionName = activeSession.name;

  const totalModal = sessionCustomers.reduce((acc, c) => 
    acc + c.items.reduce((sum, item) => sum + Math.round(item.idrPrice), 0)
  , 0);
  
  const totalFee = sessionCustomers.reduce((acc, c) => 
    acc + c.items.reduce((sum, item) => sum + Math.round(item.feeAmount), 0)
  , 0);
  
  const grandTotal = sessionCustomers.reduce((acc, c) => {
    const itemsTotal = c.items.reduce((sum, item) => sum + Math.round(item.idrPrice) + Math.round(item.feeAmount), 0);
    const shippingTotal = Math.round(c.shipping.totalShippingCost || 0);
    return acc + itemsTotal + shippingTotal;
  }, 0);

  // Only show if there's any item across all sessions
  const totalAllItems = sessions.reduce(
    (acc, s) => acc + s.customers.reduce((a, c) => a + c.items.length, 0),
    0
  );
  if (totalAllItems === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-lg border-t shadow-[0_-10px_40px_rgba(0,0,0,0.12)] z-50">
      <div className="container max-w-5xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">

        <div className="flex flex-wrap gap-4 md:gap-8 w-full">
          {/* Session label */}
          <div className="flex flex-col self-center">
            <span className="text-[10px] font-bold text-primary/70 uppercase tracking-widest leading-none mb-1">
              Sesi Aktif
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm font-black text-muted-foreground uppercase tracking-wide truncate max-w-[150px]">
                {sessionName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto md:ml-0">
            <div className="p-2.5 bg-primary/10 rounded-full">
              <ShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">Total Modal Sesi</p>
              <p className="text-base font-bold">Rp {totalModal.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-500/10 rounded-full">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider flex items-center">
                Total Profit Sesi
                {totalModal > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-black bg-green-100 text-green-700">
                    {((totalFee / totalModal) * 100).toFixed(1)}%
                  </span>
                )}
              </p>
              <p className="text-base font-bold text-green-600">Rp {totalFee.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:ml-auto">
            <div className="p-2.5 bg-secondary/20 rounded-full">
              <span className="text-xl">💰</span>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">Grand Total Sesi</p>
              <p className="text-xl font-black text-primary">Rp {grandTotal.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
