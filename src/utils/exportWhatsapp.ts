import { JastipItem, Customer, JastipSession } from '@/store/useJastipStore';

const formatRp = (amount: number) => `Rp ${Math.round(amount).toLocaleString('id-ID')}`;

interface ExportData {
  items: JastipItem[];
  shippingCost: number;
  totalWeight: number;
  destinationName?: string;
  courier?: string;
  customerName?: string;
  sessionName?: string; // nama sesi jastip, contoh: "JASTIP PENANG"
}

/**
 * Export for CUSTOMER via WhatsApp.
 * Shows: Item name, original price, subtotal in IDR.
 * Also shows total weight, total shipping, and session name.
 */
export function exportToWhatsapp({ items, shippingCost, totalWeight, destinationName, courier, customerName, sessionName }: ExportData) {
  const date = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Jumlahkan nilai yang sudah di-round per item agar konsisten dengan tabel rekapitulasi
  const grandTotal = items.reduce((acc, item) => acc + Math.round(item.totalItemCost), 0);

  let text = `✈️ *${sessionName || 'REKAP BELANJA JASTIP'}*\n`;
  text += `🛍️ *REKAP BELANJA*\n`;
  if (customerName) text += `👤 ${customerName}\n`;
  text += `📅 ${date}\n`;
  text += `──────────────────────\n\n`;

  items.forEach((item, index) => {
    const qty = item.qty ?? 1;
    text += `*${index + 1}. ${item.name}*${qty > 1 ? ` (${qty}x)` : ''}\n`;
    text += `   Harga: ${formatRp(Math.round(item.totalItemCost))}${qty > 1 ? ` _(${formatRp(Math.round(item.totalItemCost / qty))}/item)_` : ''}\n\n`;
  });

  text += `──────────────────────\n`;
  text += `📊 *RINGKASAN BELANJA*\n`;
  text += `──────────────────────\n`;
  text += `📦 Total Item: ${items.length} barang\n`;
  text += `⚖️ Total Berat: ${totalWeight} gram (${(totalWeight / 1000).toFixed(2)} Kg)\n`;
  if (shippingCost > 0) {
    const courierInfo = courier ? ` (${courier.toUpperCase()})` : '';
    const destInfo = destinationName ? ` → ${destinationName}` : '';
    // Gunakan Math.round agar ongkir yang tampil di WA sama dengan di tabel
    text += `🚚 Ongkir${courierInfo}${destInfo}: ${formatRp(Math.round(shippingCost))}\n`;
  }
  // grandTotal sudah hasil penjumlahan nilai yang di-round, cukup toLocaleString tanpa Math.round ulang
  text += `\n💳 *TOTAL BELANJA: Rp ${grandTotal.toLocaleString('id-ID')}*\n\n`;
  text += `🏧 *Payment ke BCA 0840969711 (a.n. Karenina Priyanka)*\n\n`;
  text += `_Terima kasih telah belanja melalui JastipKuy! 🙏_`;

  const encodedText = encodeURIComponent(text);
  window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
}

/**
 * Generate Master Rows for Google Sheets API.
 * Shows all orders across all customers in a flat table layout.
 * Column A: Item ID
 * Column B: Tanggal
 * Column C: Sesi Jastip (NEW)
 * Column D: Customer
 * Column E: Tujuan
 * Column F: Kurir
 * Column G: Nama Barang
 * Column H: Qty
 * Column I: Harga Asli
 * Column J: Mata Uang
 * Column K: Harga IDR
 * Column L: Berat
 * Column M: Fee
 * Column N: Ongkir
 * Column O: Subtotal
 * Column P: Status
 */
export function generateMasterRows(customers: Customer[], sessionName?: string): (string | number)[][] {
  const date = new Date().toLocaleDateString('id-ID');
  
  const rows: (string | number)[][] = [];

  customers.forEach(customer => {
    if (customer.items.length === 0) return;

    customer.items.forEach(item => {
      rows.push([
        item.id,                                       // A: Item ID
        date,                                          // B: Tanggal
        sessionName || '',                             // C: Sesi Jastip (BARU)
        customer.name,                                 // D: Customer
        customer.shipping.destinationName || '',        // E: Tujuan
        (customer.shipping.courier || '').toUpperCase(), // F: Kurir
        item.name,                                     // G: Nama Barang
        item.qty || 1,                                 // H: Qty
        item.originalPrice,                            // I: Harga Asli
        item.currency,                                 // J: Mata Uang
        Math.round(item.idrPrice),                     // K: Harga IDR
        item.weight,                                   // L: Berat
        Math.round(item.feeAmount),                    // M: Fee
        Math.round(item.shippingPerItem),              // N: Ongkir
        Math.round(item.totalItemCost),                // O: Subtotal
        'ACTIVE',                                      // P: Status
      ]);
    });
  });

  return rows;
}

/**
 * Generate rows from ALL sessions, including session name in each row.
 */
export function generateMasterRowsFromSessions(sessions: JastipSession[]): (string | number)[][] {
  const rows: (string | number)[][] = [];
  sessions.forEach(session => {
    const sessionRows = generateMasterRows(session.customers, session.name);
    rows.push(...sessionRows);
  });
  return rows;
}
