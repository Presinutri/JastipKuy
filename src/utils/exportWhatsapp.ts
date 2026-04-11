import { JastipItem, Customer } from '@/store/useJastipStore';

const formatRp = (amount: number) => `Rp ${Math.round(amount).toLocaleString('id-ID')}`;

interface ExportData {
  items: JastipItem[];
  shippingCost: number;
  totalWeight: number;
  destinationName?: string;
  courier?: string;
  customerName?: string;
}

/**
 * Export for CUSTOMER via WhatsApp.
 * Shows: Item name, original price, subtotal in IDR.
 * Also shows total weight and total shipping.
 */
export function exportToWhatsapp({ items, shippingCost, totalWeight, destinationName, courier, customerName }: ExportData) {
  const date = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const grandTotal = items.reduce((acc, item) => acc + item.totalItemCost, 0);

  let text = `🛍️ *REKAP BELANJA JASTIP*\n`;
  if (customerName) text += `👤 ${customerName}\n`;
  text += `📅 ${date}\n`;
  text += `──────────────────────\n\n`;

  items.forEach((item, index) => {
    text += `*${index + 1}. ${item.name}*\n`;
    text += `   Harga: ${item.currency} ${item.originalPrice.toLocaleString('id-ID')}\n`;
    text += `   *Subtotal: ${formatRp(item.totalItemCost)}*\n\n`;
  });

  text += `──────────────────────\n`;
  text += `📊 *RINGKASAN TAGIHAN*\n`;
  text += `──────────────────────\n`;
  text += `📦 Total Item: ${items.length} barang\n`;
  text += `⚖️ Total Berat: ${totalWeight} gram (${(totalWeight / 1000).toFixed(2)} Kg)\n`;
  if (shippingCost > 0) {
    const courierInfo = courier ? ` (${courier.toUpperCase()})` : '';
    const destInfo = destinationName ? ` → ${destinationName}` : '';
    text += `🚚 Ongkir${courierInfo}${destInfo}: ${formatRp(shippingCost)}\n`;
  }
  text += `\n💳 *TOTAL TAGIHAN: ${formatRp(grandTotal)}*\n\n`;
  text += `_Terima kasih telah belanja melalui JastipKuy! 🙏_`;

  const encodedText = encodeURIComponent(text);
  window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
}

/**
 * Generate Master Rows for Google Sheets API.
 * Shows all orders across all customers in a flat table layout.
 */
export function generateMasterRows(customers: Customer[]): (string | number)[][] {
  const date = new Date().toLocaleDateString('id-ID');
  
  const rows: (string | number)[][] = [];

  customers.forEach(customer => {
    if (customer.items.length === 0) return;

    customer.items.forEach(item => {
      rows.push([
        item.id, // Column A: Item ID
        date,
        customer.name,
        customer.shipping.destinationName || '',
        (customer.shipping.courier || '').toUpperCase(),
        item.name,
        item.qty || 1,
        item.originalPrice,
        item.currency,
        Math.round(item.idrPrice),
        item.weight,
        Math.round(item.feeAmount),
        Math.round(item.shippingPerItem),
        Math.round(item.totalItemCost),
      ]);
    });
  });

  return rows;
}

