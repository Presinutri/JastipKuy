import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows: (string | number)[][] = body.rows || [];
    const deletedIds: string[] = body.deletedIds || [];

    if (rows.length === 0 && deletedIds.length === 0) {
      return NextResponse.json({ message: 'Tidak ada data untuk diproses.' });
    }

    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!privateKey || !clientEmail || !spreadsheetId) {
      return NextResponse.json(
        { error: 'Konfigurasi Google Sheets (Service Account / ID) belum terpasang di .env.local.' },
        { status: 500 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Ambil data yang sudah ada (untuk mengecek ID)
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A:O', // Mengambil Kolom A sampai O (15 Kolom)
    });

    const currentRows = getRes.data.values || [];
    const idToRowNumber = new Map();
    
    currentRows.forEach((row, index) => {
      // row[0] adalah Kolom A (Item ID)
      if (row[0]) idToRowNumber.set(String(row[0]).trim(), index + 1);
    });

    const rowsToAppend: (string | number)[][] = [];
    const updateData: { range: string; values: (string | number)[][]}[] = [];

    // 2. Pisahkan mana data baru (Append) dan mana data lama yang direvisi (Update)
    rows.forEach((row) => {
      const id = String(row[0]).trim();
      if (id && idToRowNumber.has(id)) {
        const rowNumber = idToRowNumber.get(id);
        updateData.push({
          range: `Sheet1!A${rowNumber}:O${rowNumber}`,
          values: [row],
        });
      } else if (id) {
        rowsToAppend.push(row);
      }
    });

    // 3. Tambahkan penanda DELETED jika ada ID yang dihapus
    deletedIds.forEach((id) => {
      const cleanId = String(id).trim();
      if (idToRowNumber.has(cleanId)) {
        const rowNumber = idToRowNumber.get(cleanId);
        updateData.push({
          range: `Sheet1!O${rowNumber}`, // Update cuma kolom O
          values: [['DELETED']],
        });
      }
    });

    // 4A. Lakukan Update Massal (Termasuk yang barusan di-mark DELETED)
    if (updateData.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: updateData,
        },
      });
    }

    // 4B. Lakukan Insert (Tambah ke bawah) jika ada barang yang benar-benar baru
    if (rowsToAppend.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A:O',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: rowsToAppend,
        },
      });
    }

    const summary = `Diterima: ${rows.length} row. Action: Update(${updateData.length}), Baru(${rowsToAppend.length}), Hapus(${deletedIds.length}).`;
    
    return NextResponse.json({ 
      success: true, 
      message: summary
    });
  } catch (err: unknown) {
    console.error('Google Sheets API Error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || 'Gagal menyimpan ke Google Sheets' }, { status: 500 });
  }
}
