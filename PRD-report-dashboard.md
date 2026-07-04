# PRD: Report & Dashboard — JastipKuy

**Versi:** 1.1
**Status:** Final — semua blocker sudah resolved (definisi profit/margin/markup, verifikasi shipping, status Google Sheets sync, metrik barang terlaris). Siap masuk fase implementasi.
**Terkait:** PRD-master-barang.md, diskusi definisi profit/margin/markup di percakapan sebelumnya

---

## 1. Tujuan

Jastiper bisa lihat rekap transaksi (Report) dan tren performa (Dashboard) langsung dari app, tanpa buka spreadsheet manual lagi.

## 2. Definisi yang Sudah Dikunci (jangan didebat ulang tanpa alasan baru)

- **Profit per item** = `feeAmount` (sudah tersimpan langsung, sudah termasuk qty, tidak perlu dihitung ulang dari kurs).
- **Modal per item** = `idrPrice` (sudah membekukan kurs di waktu transaksi — jangan pernah dihitung ulang pakai kurs live).
- **Ongkir (`shippingCost`)** = ditanggung customer, tidak masuk perhitungan profit sama sekali, tapi tetap masuk ke total tagihan (grand total).
- **Sesi "selesai"** = semua customer dalam sesi tersebut punya `is_paid = true`. Sesi dengan minimal 1 customer belum bayar dianggap belum selesai, dan **dikecualikan dari filter default Dashboard**.
- **Markup** = `feeAmount / idrPrice` — dipakai di summary bar real-time per sesi (StickySummary), audiensnya jastiper yang lagi susun harga.
- **Margin** = `feeAmount / totalItemCost` (`totalItemCost = idrPrice + feeAmount`, di luar ongkir) — dipakai sebagai metrik utama di Dashboard untuk tren, karena basisnya konsisten dipakai lintas waktu.

## 3. Halaman Report (`/report`, nama route sesuaikan konvensi existing)

### 3.1 Fungsi

Tabel detail transaksi, mirip isi spreadsheet lama, bisa difilter dan di-export.

### 3.2 Filter

- Rentang tanggal (`created_at` di tabel `sessions` atau `items`, tentukan salah satu sebagai basis — rekomendasi: `sessions.created_at`, karena satu sesi mewakili satu waktu belanja).
- Sesi (dropdown, dari `sessions.name`).
- Customer (dropdown, ter-scope ke sesi yang dipilih kalau sesi sudah dipilih).
- Status bayar (`is_paid`: semua / lunas / belum lunas).

### 3.3 Kolom Tabel

| Kolom         | Sumber                                                                         | Catatan                                                                            |
| ------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Tanggal       | `sessions.created_at`                                                          |                                                                                    |
| Sesi          | `sessions.name`                                                                |                                                                                    |
| Customer      | `customers.name`                                                               |                                                                                    |
| Barang        | `items.name`                                                                   |                                                                                    |
| Qty           | `items.qty`                                                                    |                                                                                    |
| Harga Asli    | `items.original_price` + `items.currency`                                      | Tampilkan mata uang asli, bukan cuma angka                                         |
| Modal (Rp)    | `items.idr_price`                                                              |                                                                                    |
| Profit        | `items.fee_amount`                                                             |                                                                                    |
| Ongkir        | dialokasikan dari `customers.total_shipping_cost`                              | Lihat catatan alokasi di §3.4                                                      |
| Total Ditagih | `idr_price + fee_amount` per item, + ongkir di level customer (bukan per item) | Jangan pecah ongkir per item kecuali memang dialokasikan proporsional — lihat §3.4 |
| Status Bayar  | `customers.is_paid`                                                            |                                                                                    |

### 3.4 Ongkir per Item (Sudah Diverifikasi)

`shipping_per_item` sudah dikonfirmasi konsisten dengan `total_shipping_cost` per customer (`SUM(shipping_per_item)` per customer = `total_shipping_cost` customer tersebut). **Opsi B dari draft sebelumnya jadi pilihan final** — tampilkan `shipping_per_item` langsung di kolom Report per baris item, aman digunakan tanpa risiko duplikasi/drift.

### 3.5 Export

- Tombol "Export ke Excel" pada Report, hasilkan file `.xlsx` sesuai kolom di atas.
- **KOREKSI dari draft sebelumnya:** `api/export-sheets/route.ts` **tidak bisa** dipakai ulang untuk ini. Route tersebut adalah mekanisme push satu arah dari app ke Google Sheets eksternal (dengan array kolom posisional, bukan struct bertipe), bukan generator laporan yang query dari Supabase. Fungsinya beda total — itu soal sinkronisasi ke sistem eksternal, bukan menghasilkan file export dari data yang sudah difilter.
- **Keputusan terbuka:** apakah `api/export-sheets/route.ts` masih dipakai (misal ada pihak lain yang bergantung ke Google Sheets itu), atau sudah bisa di-deprecate sekarang karena fungsinya digantikan oleh Report native ini? Kalau masih dipakai, route itu tetap berjalan **independen**, tidak terhubung ke implementasi Report ini.
- Implementasi export xlsx yang sebenarnya: pakai skill `xlsx` (SheetJS), generate file baru dari data Report yang sudah difilter di client/server — dibangun dari nol, bukan extend dari route Google Sheets ini.

## 4. Halaman Dashboard (`/dashboard`)

### 4.1 Fungsi

Ringkasan tren performa lintas sesi — bukan detail transaksi (itu tugas Report).

### 4.2 Filter Default

Hanya sesi "selesai" (semua customer `is_paid = true`) — sesuai definisi §2. Sediakan toggle "Tampilkan semua sesi (termasuk yang belum lunas)" untuk kasus jastiper mau lihat proyeksi, tapi default harus yang sudah final biar tidak menyesatkan.

### 4.3 Komponen

1. **Trend Margin per Sesi** — line/bar chart, sumbu X = sesi (urut berdasarkan tanggal), sumbu Y = Margin % (`SUM(fee_amount) / SUM(idr_price + fee_amount)` per sesi). Ini yang jawab pertanyaan awal: "Jastip A untung berapa%, dibanding Jastip B naik/turun."
2. **Total Profit per Sesi** — angka absolut (Rupiah), pelengkap dari persentase di atas. Margin tinggi dengan volume kecil vs margin sedang dengan volume besar itu cerita berbeda — jangan cuma tampilkan persentase tanpa angka absolut, karena itu bisa menyesatkan (sesi kecil dengan 1 barang mahal bisa punya margin % tinggi tapi profit absolut kecil).
3. **Barang Terlaris** — leaderboard dengan dua mode, keduanya wajib ada (bukan pilih salah satu):
   - **Default: "Terlaris" = `SUM(qty) DESC`** — ini standar industri retail (cara Shopify/Amazon mendefinisikan "best seller"), representasi volume unit yang benar-benar keluar.
   - **Mode kedua: "Paling Menguntungkan" = `SUM(fee_amount) DESC`** — kontribusi profit riil, bukan sekadar volume. Ini penting karena barang dengan qty tinggi belum tentu yang paling nyumbang untung (margin tipis vs margin tebal).
   - Tiap mode wajib dikasih **remark eksplisit** di UI (misal label kecil "Diurutkan berdasarkan qty terjual" atau "Diurutkan berdasarkan kontribusi profit"), supaya jastiper gak salah baca insight-nya — sama seperti keputusan label "markup" di StickySummary sebelumnya.
   - Toggle/tab sederhana buat switch antar dua mode, gak perlu 2 chart terpisah yang makan tempat.

### 4.4 Query Dasar (Supabase, konsep)

```sql
-- Margin per sesi (hanya sesi selesai)
select
  s.id as session_id,
  s.name as session_name,
  s.created_at,
  sum(i.idr_price) as total_modal,
  sum(i.fee_amount) as total_profit,
  round(
    sum(i.fee_amount)::numeric
    / nullif(sum(i.idr_price + i.fee_amount), 0) * 100,
    1
  ) as margin_percent
from sessions s
join customers c on c.session_id = s.id
join items i on i.customer_id = c.id
where s.id in (
  -- hanya sesi di mana SEMUA customer sudah is_paid
  select session_id from customers
  group by session_id
  having bool_and(is_paid) = true
)
group by s.id, s.name, s.created_at
order by s.created_at;
```

Catatan: query ini butuh diverifikasi terhadap struktur `id` yang bertipe `text` (bukan `uuid`) sesuai schema asli — pastikan tidak ada masalah tipe data saat join.

## 5. Fase Migrasi Google Sheets (Bukan Lagi Pertanyaan Terbuka)

`api/export-sheets/route.ts` **tetap berjalan untuk sementara** — ini satu-satunya cara jastiper lihat raw data sampai Report/Dashboard native terbukti bisa menggantikannya sepenuhnya. Urutan migrasi yang benar:

1. Bangun Report & Dashboard native (PRD ini).
2. Jastiper pakai Report/Dashboard secara paralel dengan Google Sheets untuk periode uji (rekomendasi: minimal beberapa sesi jastip, bukan cuma 1-2 hari), bandingkan apakah semua kebutuhan yang selama ini dipenuhi spreadsheet sudah tercakup.
3. **Baru setelah itu** deprecate `api/export-sheets/route.ts` — hapus kode, cabut kredensial service account dari `.env.local` (jangan biarkan credential nganggur tapi masih valid, itu risiko keamanan kecil yang gak perlu).

Jangan matikan jalur lama sebelum langkah 2 selesai — bukan karena ragu sama kualitas Report, tapi karena belum ada validasi nyata dari pemakaian sungguhan.

## 6. Barang Terlaris — Final

Sudah diputuskan di §4.3: dua mode (qty & profit), keduanya ditampilkan dengan remark eksplisit. Tidak ada pertanyaan terbuka tersisa di dokumen ini.
