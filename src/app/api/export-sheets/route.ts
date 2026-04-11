import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows: (string | number)[][] = body.rows;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada baris data yang dikirim.' }, { status: 400 });
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
      range: 'Sheet1!A:N', // Mengambil Kolom A sampai N (14 Kolom)
    });

    const currentRows = getRes.data.values || [];
    const idToRowNumber = new Map();
    
    // Baris di Excel dimulai dari 1. array Index 0 = Baris 1.
    // Tapi karena ada header (idealnya di baris 1), kita asumsikan baris sesuai index+1
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
          range: `Sheet1!A${rowNumber}:N${rowNumber}`,
          values: [row],
        });
      } else {
        rowsToAppend.push(row);
      }
    });

    // 3A. Lakukan Update Massal jika ada barang lama yang diedit nilainya
    if (updateData.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: updateData,
        },
      });
    }

    // 3B. Lakukan Insert (Tambah ke bawah) jika ada barang yang benar-benar baru
    if (rowsToAppend.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A:N',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: rowsToAppend,
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Tersimpan! Update: ${updateData.length} baris, Baru: ${rowsToAppend.length} baris.` 
    });
  } catch (err: unknown) {
    console.error('Google Sheets API Error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || 'Gagal menyimpan ke Google Sheets' }, { status: 500 });
  }
}
