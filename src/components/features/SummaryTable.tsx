import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Pencil, Loader2 } from 'lucide-react';
import { EditItemModal } from './EditItemModal';
import { useJastipStore, JastipItem, useActiveCustomer } from '@/store/useJastipStore';
import { generateMasterRows } from '@/utils/exportWhatsapp';

export function SummaryTable() {
  const { removeItem } = useJastipStore();
  const { items, name: customerName } = useActiveCustomer();
  
  const [editingItem, setEditingItem] = React.useState<JastipItem | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

  const handleRemove = async (id: string) => {
    if (!confirm('Hapus item ini?')) return;
    
    setIsDeleting(id);
    removeItem(id);
    
    // Auto sync delete to sheet (by updating rows)
    const rows = generateMasterRows(useJastipStore.getState().customers);
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

  return (
    <div className="border rounded-xl bg-card overflow-x-auto shadow-sm">
      <Table>
        <TableHeader className="bg-primary/5">
          <TableRow>
            <TableHead>Nama Barang</TableHead>
            <TableHead className="text-center w-[60px]">Qty</TableHead>
            <TableHead className="text-right">Modal</TableHead>
            <TableHead className="text-right">Fee</TableHead>
            <TableHead className="text-right">Ongkir</TableHead>
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
                  {item.currency} {(item.originalPrice / (item.qty || 1)).toLocaleString('id-ID')} / item &middot; {item.weight}gr
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center justify-center w-8 h-6 rounded-md bg-primary/10 text-primary text-xs font-bold">
                  {item.qty ?? 1}
                </span>
              </TableCell>
              <TableCell className="text-right tracking-tight">
                Rp {Math.round(item.idrPrice).toLocaleString('id-ID')}
              </TableCell>
              <TableCell className="text-right text-green-600 tracking-tight">
                + Rp {Math.round(item.feeAmount).toLocaleString('id-ID')}
              </TableCell>
              <TableCell className="text-right text-orange-500 tracking-tight">
                {item.shippingPerItem > 0
                  ? `+ Rp ${Math.round(item.shippingPerItem).toLocaleString('id-ID')}`
                  : '-'}
              </TableCell>
              <TableCell className="text-right font-bold text-primary tracking-tight">
                Rp {Math.round(item.totalItemCost).toLocaleString('id-ID')}
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
      </Table>
      
      <EditItemModal 
        item={editingItem} 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </div>
  );
}
