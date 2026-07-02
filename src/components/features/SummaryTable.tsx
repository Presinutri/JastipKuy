import React from 'react';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Pencil, Loader2 } from 'lucide-react';
import { EditItemModal } from './EditItemModal';
import { useJastipStore, JastipItem, useActiveCustomer } from '@/store/useJastipStore';
import { generateMasterRowsFromSessions, exportToWhatsapp } from '@/utils/exportWhatsapp';
import { MessageCircle, CloudUpload, CheckCircle } from 'lucide-react';
import { useActiveSession } from '@/store/useJastipStore';

export function SummaryTable() {
  const { removeItem, setCustomerPaidStatus } = useJastipStore();
  const { items, name: customerName, shipping, id: customerId, isPaid } = useActiveCustomer();
  const activeSession = useActiveSession();
  
  const [editingItem, setEditingItem] = React.useState<JastipItem | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const handleExportWA = () => {
    if (items.length === 0) return;
    const totalWeight = items.reduce((acc, item) => acc + item.weight, 0);
    exportToWhatsapp({
      items,
      shippingCost: shipping.totalShippingCost,
      totalWeight,
      destinationName: shipping.destinationName,
      courier: shipping.courier,
      customerName,
      sessionName: activeSession.name,
    });
  };

  const handleSaveToSheets = async () => {
    const state = useJastipStore.getState();
    const rows = generateMasterRowsFromSessions(state.sessions);
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
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Gagal menyimpan: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Hapus item ini?')) return;
    
    setIsDeleting(id);
    removeItem(id);
    
    // Auto sync delete to sheet (by updating rows)
    const state = useJastipStore.getState();
    const rows = generateMasterRowsFromSessions(state.sessions);
    try {
      await fetch('/api/export-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, deletedIds: [id] }),
      });
    } catch (err) {
      console.error('Delete sync failed:', err);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEdit = (item: JastipItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  if (items.length === 0) {
    return (
      <div className="text-center p-8 bg-muted/20 border border-dashed rounded-xl">
        <p className="text-muted-foreground">Belum ada barang untuk <span className="font-semibold">{customerName}</span>.</p>
      </div>
    );
  }

  // ── Kalkulasi footer ──────────────────────────────────────────────────────
  const totalModal = items.reduce((acc, item) => acc + Math.round(item.idrPrice), 0);
  const totalFee   = items.reduce((acc, item) => acc + Math.round(item.feeAmount), 0);
  const subtotalItems = totalModal + totalFee;
  const ongkir     = Math.round(shipping.totalShippingCost);
  const grandTotal  = subtotalItems + ongkir;
  const courierLabel = shipping.courier ? shipping.courier.toUpperCase() : '';

  return (
    <div className="border rounded-xl bg-card overflow-x-auto shadow-sm">
      <Table>
        <TableHeader className="bg-primary/5">
          <TableRow>
            <TableHead>Nama Barang</TableHead>
            <TableHead className="text-center w-[60px]">Qty</TableHead>
            <TableHead className="text-right w-[90px]">Berat</TableHead>
            <TableHead className="text-right">Modal</TableHead>
            <TableHead className="text-right">Fee</TableHead>
            <TableHead className="text-right font-bold">Subtotal</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium">
                <div>{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {item.currency} {(item.originalPrice / (item.qty || 1)).toLocaleString('id-ID')} / item &middot; {Math.round(item.weight / (item.qty || 1))}gr/item
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center justify-center w-8 h-6 rounded-md bg-primary/10 text-primary text-xs font-bold">
                  {item.qty ?? 1}
                </span>
              </TableCell>
              {/* Berat total sudah termasuk qty (item.weight = qty × berat/item) */}
              <TableCell className="text-right text-muted-foreground text-sm tracking-tight">
                {item.weight.toLocaleString('id-ID')} gr
              </TableCell>
              <TableCell className="text-right tracking-tight">
                Rp {Math.round(item.idrPrice).toLocaleString('id-ID')}
              </TableCell>
              <TableCell className="text-right text-green-600 tracking-tight">
                + Rp {Math.round(item.feeAmount).toLocaleString('id-ID')}
              </TableCell>
              {/* Subtotal per item = modal + fee (ongkir ditampilkan di footer) */}
              <TableCell className="text-right font-bold text-primary tracking-tight">
                Rp {(Math.round(item.idrPrice) + Math.round(item.feeAmount)).toLocaleString('id-ID')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
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
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemove(item.id)}
                    disabled={isDeleting === item.id}
                  >
                    {isDeleting === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>

        {/* ── Footer: Ongkir + Grand Total ─────────────────────────────── */}
        <TableFooter>
          {ongkir > 0 && (
            <TableRow className="border-t border-dashed bg-orange-50/50 dark:bg-orange-900/10">
              <TableCell colSpan={5} className="text-right text-sm text-orange-600 font-medium py-2 leading-relaxed">
                🚚 <span className="font-semibold">{courierLabel || 'Ongkir'}</span>
                {shipping.originName && shipping.destinationName && (
                  <span className="text-orange-500/80">
                    {' '}· dari <span className="font-semibold">{shipping.originName}</span>
                    {' '}→ <span className="font-semibold">{shipping.destinationName}</span>
                  </span>
                )}
                {shipping.totalWeight > 0 && (
                  <span className="text-orange-500/80">
                    {' '}· {(shipping.totalWeight / 1000).toFixed(2)} Kg
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right text-sm text-orange-600 font-semibold tracking-tight py-2">
                + Rp {ongkir.toLocaleString('id-ID')}
              </TableCell>
              <TableCell />
            </TableRow>
          )}
          <TableRow className="border-t-2 bg-primary/5">
            <TableCell colSpan={5} className="text-right font-bold text-base py-3">
              💳 Grand Total
            </TableCell>
            <TableCell className="text-right font-black text-base text-primary tracking-tight py-3">
              Rp {grandTotal.toLocaleString('id-ID')}
            </TableCell>
            <TableCell />
          </TableRow>
          <TableRow className="bg-muted/10 border-t">
            <TableCell colSpan={7} className="py-4">
              <div className="flex flex-col items-end gap-3">
                
                <div className="flex items-center gap-2 mb-1 px-1">
                  <input
                    type="checkbox"
                    id={`paid-status-${customerId}`}
                    checked={isPaid || false}
                    onChange={(e) => setCustomerPaidStatus(customerId, e.target.checked)}
                    className="w-5 h-5 accent-green-600 cursor-pointer"
                  />
                  <label 
                    htmlFor={`paid-status-${customerId}`} 
                    className={`text-sm font-bold cursor-pointer select-none ${isPaid ? 'text-green-600' : 'text-muted-foreground'}`}
                  >
                    {isPaid ? '✅ LUNAS (Paid)' : 'BELUM LUNAS (Unpaid)'}
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row justify-end items-center gap-3 w-full sm:w-auto">
                <Button
                  onClick={handleSaveToSheets}
                  variant="outline"
                  className={`w-full sm:w-auto font-semibold transition-all border-primary/30 ${
                    saveSuccess ? 'bg-green-500/10 text-green-700 border-green-500/50' : 'hover:bg-primary/5 hover:border-primary'
                  }`}
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
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold"
                  disabled={items.length === 0}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WA {customerName}
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
        </TableFooter>
      </Table>
      
      <EditItemModal 
        item={editingItem} 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </div>
  );
}
