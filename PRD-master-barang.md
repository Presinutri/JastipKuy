# PRD: Menu Master Barang — JastipKuy

**Versi:** 1.0
**Tanggal:** 3 Juli 2026
**Status:** Draft untuk review
**Produk:** JastipKuy (https://jastipkuy.netlify.app/)

---

## 1. Latar Belakang

JastipKuy saat ini punya 2 menu utama: **Home** dan **Kalkulator Jastip**. Di alur Kalkulator Jastip, tiap kali jastiper nambah barang pesanan, nama barang harus diketik manual dari nol — meski barang tersebut sudah pernah diinput di sesi sebelumnya. Ini repetitif dan rawan typo (yang berdampak ke pencatatan/laporan jadi tidak konsisten, misal "Serum A" vs "Serum A " vs "serum a").

**Masalah yang mau diselesaikan:** jastiper perlu tempat untuk menyimpan daftar barang yang sering dijastipkan (Master Barang), lalu saat input pesanan di Kalkulator Jastip, cukup _search_ dari daftar tersebut alih-alih ngetik manual dari awal.

**Batasan scope yang disepakati (bukan celah, tapi keputusan sadar):**

- Fitur ini BUKAN modul supplier/POS/inventori.
- Skala pengguna masih kecil, jadi arsitektur sengaja disederhanakan (belum butuh multi-user role, approval flow, dsb).

**⚠️ Update scope (revisi setelah PRD v1.0):** permintaan awal adalah harga TIDAK masuk master karena sifatnya fluktuatif (kurs, promo, supplier beda tiap sesi). Setelah feedback dari jastiper, `harga_asli`, `mata_uang`, dan `harga_jual` tetap dimasukkan ke Master Barang — TAPI statusnya adalah **harga referensi terakhir dipakai (last-used reference), bukan source of truth**. Field ini auto-fill untuk mempercepat input, tapi tetap wajib editable dan diberi sinyal "kapan terakhir diupdate" supaya jastiper sadar kalau harga sudah basi (lihat §6.2 dan §7.3). Kalau ini tidak diimplementasikan dengan disiplin, risikonya adalah kesalahan kalkulasi profit yang tidak terlihat — bukan error yang jelas, tapi angka yang diam-diam salah karena kurs sudah berubah sejak terakhir diinput.

---

## 2. Tujuan (Goals)

1. Jastiper bisa menyimpan daftar barang yang sering dijastipkan di menu baru **Master Barang**.
2. Saat menambah barang pesanan di Kalkulator Jastip, jastiper bisa _search-and-select_ dari Master Barang alih-alih mengetik nama dari nol.
3. Field yang bisa di-auto-fill dari master: **nama barang**, **berat**, **harga asli**, **mata uang**, dan **harga jual** — dengan catatan harga bersifat referensi terakhir dipakai, wajib bisa diedit, dan diberi indikator kapan terakhir diupdate (lihat §6.2). Qty tetap manual per pesanan.
4. Data tetap bisa dipakai offline (localStorage) dan tersinkron ke Supabase saat online — konsisten dengan arsitektur existing.

## 3. Non-Goals (Eksplisit di luar scope)

- ❌ Harga di master sebagai **source of truth**. Harga di master adalah referensi terakhir dipakai, bukan patokan resmi — jastiper tetap bertanggung jawab verifikasi tiap transaksi (lihat §6.2).
- ❌ Manajemen supplier.
- ❌ Manajemen stok/inventori (ini bukan POS).
- ❌ Kategori bertingkat (sub-kategori) — kalau dibutuhkan, cukup 1 level flat dulu.
- ❌ Multi-user / kolaborasi antar jastiper dalam satu akun.

---

## 4. Struktur Menu (Update)

Dari 2 menu menjadi 3 menu:

```
┌─────────────┬──────────────────────┬────────────────┐
│    Home     │   Kalkulator Jastip   │  Master Barang │
└─────────────┴──────────────────────┴────────────────┘
```

---

## 5. Skema Data

### 5.1 Tabel baru di Supabase: `barang_master`

| Kolom              | Tipe        | Wajib | Default             | Keterangan                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------ | ----------- | ----- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | uuid        | ✅    | `gen_random_uuid()` | Primary key                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `user_id`          | uuid        | ✅    | —                   | FK ke akun jastiper (jaga-jaga kalau nanti multi-akun)                                                                                                                                                                                                                                                                                                                                                                              |
| `nama_barang`      | text        | ✅    | —                   | Wajib unik per `user_id` (constraint `UNIQUE(user_id, nama_barang)`)                                                                                                                                                                                                                                                                                                                                                                |
| `kategori`         | text        | ❌    | `null`              | Free text — TIDAK ada tabel referensi kategori terpisah. UI menampilkan autocomplete/suggestion dari nilai `kategori` yang sudah pernah diinput jastiper sendiri (`select distinct kategori from barang_master where user_id = ... and kategori is not null`), supaya konsisten tanpa perlu CRUD kategori terpisah. Kategori baru otomatis "terdaftar" begitu pertama kali diketik dan disimpan — tidak ada langkah admin tambahan. |
| `berat_default`    | numeric     | ❌    | `null`              | Dalam gram. Nullable karena sebagian barang beratnya variatif per varian                                                                                                                                                                                                                                                                                                                                                            |
| `harga_asli`       | numeric     | ❌    | `null`              | **Harga referensi terakhir dipakai, BUKAN source of truth.** Denominasi sesuai `mata_uang`. Wajib editable saat auto-fill di form pesanan (lihat §6.2)                                                                                                                                                                                                                                                                              |
| `mata_uang`        | text        | ❌    | `null`              | Kode mata uang untuk `harga_asli` (misal `USD`, `JPY`, `KRW`, `CNY`) — wajib diisi berpasangan kalau `harga_asli` diisi                                                                                                                                                                                                                                                                                                             |
| `harga_jual`       | numeric     | ❌    | `null`              | Dalam Rupiah. **Harga referensi terakhir**, sama seperti `harga_asli` — turunan dari kurs + margin yang berubah tiap sesi, jangan diperlakukan sebagai harga final                                                                                                                                                                                                                                                                  |
| `harga_updated_at` | timestamptz | ❌    | `null`              | Kapan `harga_asli`/`harga_jual` terakhir diupdate. Dipakai untuk kasih sinyal "harga ini sudah X hari — cek ulang" di form pesanan                                                                                                                                                                                                                                                                                                  |
| `foto_url`         | text        | ❌    | `null`              | Opsional, nyusul kalau daftar barang sudah panjang                                                                                                                                                                                                                                                                                                                                                                                  |
| `remark`           | text        | ❌    | `null`              | Free text (catatan bebas)                                                                                                                                                                                                                                                                                                                                                                                                           |
| `is_active`        | boolean     | ✅    | `true`              | Soft delete — lihat §7.2                                                                                                                                                                                                                                                                                                                                                                                                            |
| `created_at`       | timestamptz | ✅    | `now()`             | Auto                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `updated_at`       | timestamptz | ✅    | `now()`             | Auto, update on write                                                                                                                                                                                                                                                                                                                                                                                                               |

### 5.2 Perubahan pada tabel Barang Pesanan (existing, di dalam sesi Kalkulator Jastip)

**Tidak diubah jadi foreign key ke `barang_master`.** Tetap simpan `nama_barang` dan `berat` sebagai nilai independen (snapshot) di record pesanan, persis seperti sekarang — cuma cara isinya yang berubah (dari ketik manual jadi pilih dari search lalu auto-fill).

Opsional (nice-to-have, bukan wajib MVP): tambah kolom `barang_master_id` (nullable) sebagai jejak referensi asal — berguna untuk analitik "barang apa yang paling sering dijastipkan", tapi field `nama_barang`/`berat` di record pesanan tetap jadi sumber kebenaran (source of truth) untuk transaksi tersebut, bukan hasil join ke master.

**Kenapa snapshot, bukan live-link:** kalau barang di master nanti diedit atau dinonaktifkan, riwayat transaksi lama yang sudah selesai tidak boleh ikut berubah. Ini prinsip dasar pencatatan keuangan — data historis harus immutable.

---

## 6. User Flow

### 6.1 Menu Master Barang (baru)

1. **List Barang** — tampilkan semua barang aktif milik jastiper (grid/list dengan foto kalau ada, nama, kategori, berat).
2. **Tambah Barang** — form dengan field sesuai §5.1 (nama_barang wajib, sisanya opsional).
   - Validasi: cek duplikat nama_barang (case-insensitive) sebelum simpan, tampilkan warning kalau sudah ada.
   - Field kategori: textbox dengan autocomplete/suggestion dari daftar kategori yang sudah pernah dipakai jastiper (bukan dropdown tetap, bukan tabel master terpisah). Jastiper tetap bisa mengetik kategori baru bebas — tidak ada validasi "harus pilih dari daftar". Ini keputusan sadar untuk menghindari over-engineering di skala pemakaian saat ini (lihat diskusi keputusan kategori — opsi B dipilih atas opsi tabel kategori terpisah).
3. **Edit Barang** — ubah data master. Perubahan ini **tidak** mempengaruhi transaksi lama (lihat §5.2).
4. **Nonaktifkan Barang** (bukan hapus permanen) — set `is_active = false`. Barang hilang dari hasil search di Kalkulator Jastip tapi tetap ada di database untuk integritas histori. Tampilkan opsi "Aktifkan Kembali" di list filter "Nonaktif".

### 6.2 Kalkulator Jastip — Tambah Barang Pesanan (diubah)

**Alur lama:** ketik nama barang manual → isi berat, qty, harga, mata uang manual.

**Alur baru:**

1. Jastiper mengetik di textbox nama barang → sistem menampilkan hasil pencarian dari `barang_master` (filter `is_active = true`, match substring, case-insensitive) secara real-time (debounce ~300ms).
2. Jastiper pilih salah satu hasil → field **nama barang, berat, harga asli, mata uang, dan harga jual** ter-auto-fill dari master.
3. Field yang ter-auto-fill (termasuk harga) tetap **fully editable** — bukan textbox yang di-disable. Jastiper bebas ubah langsung tanpa langkah tambahan.
4. Di dekat field harga asli/harga jual, tampilkan indikator pasif minimal: teks kecil non-alarm seperti `Diupdate 12 hari lalu` (berdasarkan `harga_updated_at`). Tidak ada warna alarm, tidak ada ikon peringatan, tidak memblokir apa pun — sekadar informasi tambahan. Kalau `harga_updated_at` masih `null` (barang baru), tampilkan `Belum ada histori harga` supaya jelas ini bukan `0` yang valid.
5. Field **qty** tetap manual — tidak ada default yang masuk akal untuk ini.
6. Begitu jastiper mengubah `harga_asli` atau `harga_jual` di form pesanan, sistem otomatis **write-through** update nilai tersebut (plus `harga_updated_at`) ke `barang_master` — tanpa modal konfirmasi, tanpa langkah tambahan. Ini membuat referensi harga makin akurat secara organik dari pemakaian sehari-hari.
7. Kalau barang yang dicari tidak ada di master, jastiper tetap bisa ketik manual bebas (tidak dipaksa pilih dari master). Sistem menampilkan pesan pasif yang mengarahkan ke menu Master Barang (misal: _"Barang tidak ditemukan di master. Lanjut ketik manual, atau tambahkan barang ini lewat menu Master Barang biar lain kali bisa langsung dicari."_) — **tanpa** tombol/CTA "simpan otomatis" di form ini. Alur menambahkan barang baru tetap lewat menu Master Barang secara terpisah, bukan dari dalam Kalkulator Jastip.

---

## 7. Detail Teknis & Sinkronisasi

### 7.1 Offline-first (localStorage ↔ Supabase)

Konsisten dengan arsitektur existing JastipKuy:

- Perubahan (tambah/edit/nonaktifkan barang master) langsung tersimpan ke localStorage dulu.
- Saat online, sync ke tabel `barang_master` di Supabase.
- **Konflik sync** yang perlu ditangani secara eksplisit: kalau jastiper edit barang yang sama dari 2 device berbeda saat salah satunya offline, siapa yang menang? Rekomendasi MVP: **last-write-wins berdasarkan `updated_at`**, cukup untuk skala kecil saat ini. Jangan over-engineer dengan merge logic dulu.
- Unique constraint `nama_barang` per user harus divalidasi juga di sisi client (localStorage) sebelum sempat sync, supaya tidak ada duplikat menumpuk saat offline lalu baru ketahuan pas sync.

### 7.2 Soft Delete

`is_active = false` alih-alih `DELETE`. Alasan sudah dijelaskan di §5.2 — histori transaksi harus tetap valid meski barang master-nya sudah tidak dipakai lagi.

### 7.3 Indikator Umur Harga (Keputusan Risiko — Dicatat Sadar)

**Konteks keputusan:** draft awal PRD ini mengusulkan warning block eksplisit (dengan threshold hari dan sinyal visual kuat) sebagai satu-satunya pengaman dari risiko kesalahan kalkulasi profit akibat harga referensi yang sudah basi (kurs berubah, tapi harga di master belum diupdate). Setelah didiskusikan, warning block tersebut **ditolak** karena dianggap berlebihan untuk skala pemakaian saat ini.

**Keputusan final:** indikator pasif minimal — teks kecil non-alarm di dekat field harga (`Diupdate X hari lalu` / `Belum ada histori harga`), tanpa warna alarm, tanpa blocking, tanpa threshold hari yang di-hardcode. Interpretasi "basi atau belum" diserahkan sepenuhnya ke penilaian jastiper.

**Risiko yang secara sadar diterima dengan keputusan ini:** kemungkinan jastiper submit harga yang sudah basi tanpa sadar tetap ada, karena tidak ada mekanisme yang memaksa mereka mengecek ulang. Mitigasi yang tersisa hanya §7.3 (write-through update otomatis saat harga di-override manual) — yang berarti akurasi referensi bergantung penuh pada seberapa sering jastiper benar-benar mengoreksi harga saat transaksi, bukan pada sistem yang secara aktif mendorong mereka melakukannya.

**Kapan revisit keputusan ini:** kalau ke depan jumlah barang di master tumbuh signifikan (puluhan-ratusan) atau ada insiden nyata profit salah hitung akibat harga basi, threshold + warning yang lebih tegas perlu dipertimbangkan ulang — bukan diasumsikan tidak akan pernah dibutuhkan.

---

## 8. Edge Cases & Open Questions

Ini bagian yang **belum final** — perlu keputusan sebelum development, jangan diasumsikan sendiri oleh developer saat coding:

1. **Barang dengan varian (ukuran/warna) yang beratnya beda.** MVP ini treat tiap varian sebagai row terpisah di master (misal "Kaos Polo - M" dan "Kaos Polo - L" jadi 2 entry). Kalau jumlah variasi sudah banyak dan bikin daftar berantakan, baru pertimbangkan struktur varian bertingkat — tapi itu di luar scope MVP ini.
2. **Auto-save barang baru dari Kalkulator Jastip ke Master Barang — diputuskan TIDAK dilakukan.** Barang yang diketik manual (tidak match master) tidak ditawarkan opsi simpan otomatis. Sistem cukup menunjukkan pesan pasif yang mengarahkan jastiper ke menu Master Barang untuk menambahkannya secara manual di sana. Ini keputusan sadar untuk membatasi scope MVP — kalau nanti terasa jadi friksi nyata (jastiper sering lupa nambahin barang baru ke master), baru dipertimbangkan ulang.
3. **Limit jumlah barang di master** — belum ada indikasi butuh, tapi kalau daftar sudah ratusan, search perlu pagination/index yang baik di Supabase (`nama_barang` sebaiknya di-index).

---

## 9. Prioritas Implementasi (MVP vs Nice-to-have)

**MVP (wajib untuk rilis pertama):**

- Tabel `barang_master` di Supabase + sync localStorage.
- Menu Master Barang: List, Tambah, Edit, Nonaktifkan.
- Search-and-select di Kalkulator Jastip dengan auto-fill nama + berat.
- Validasi duplikat nama barang.

**Nice-to-have (boleh menyusul):**

- Foto barang.
- Filter list barang berdasarkan kategori (bukan soal input-nya — itu sudah final di §5.1/§6.1, ini soal UI filter di halaman List Barang).
- Kolom `barang_master_id` untuk analitik "barang terlaris".

---

## 10. Acceptance Criteria

- [ ] Jastiper bisa menambah, mengedit, dan menonaktifkan barang di menu Master Barang.
- [ ] Nama barang tidak bisa duplikat (case-insensitive) per akun jastiper.
- [ ] Di Kalkulator Jastip, mengetik di textbox nama barang menampilkan hasil pencarian dari Master Barang secara real-time.
- [ ] Memilih hasil pencarian mengisi otomatis field nama, berat, harga asli, mata uang, dan harga jual — semuanya tetap fully editable, tidak ada yang terkunci/disabled.
- [ ] Field harga menampilkan indikator pasif "Diupdate X hari lalu" (atau "Belum ada histori harga" kalau belum pernah diisi) — tanpa warna alarm, tanpa blocking.
- [ ] Mengubah harga asli/harga jual di form pesanan otomatis meng-update `barang_master` (write-through), tanpa modal konfirmasi tambahan.
- [ ] Barang yang dinonaktifkan tidak muncul di hasil pencarian tapi tidak menghapus/merusak data transaksi lama yang sudah memakainya.
- [ ] Field kategori di form Tambah Barang menampilkan suggestion dari kategori yang sudah pernah dipakai jastiper, tapi tetap menerima input bebas/kategori baru.
- [ ] Data tetap berfungsi saat offline dan tersinkron otomatis ke Supabase saat online kembali.
