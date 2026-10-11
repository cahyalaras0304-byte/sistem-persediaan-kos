# 🏠 KOSTA — Sistem Akuntansi Persediaan & Pengeluaran Operasional Rumah Kost

### Aplikasi web untuk mencatat persediaan perlengkapan kost dan biaya operasional bulanan

![HTML5](https://img.shields.io/badge/HTML5-Frontend-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)

## 👉 [Buka Aplikasi KOSTA](https://USERNAME.github.io/NAMA-REPOSITORY/)

> Ganti `USERNAME` dan `NAMA-REPOSITORY` dengan akun dan nama repo GitHub kamu.

---

## 📖 Tentang Proyek

**KOSTA** membantu pengelola rumah kost mencatat barang persediaan (sabun, lampu, galon, kantong sampah, dll.), pemakaiannya, dan seluruh pengeluaran operasional (listrik, air, internet, kebersihan, perbaikan, gaji penjaga). Setiap transaksi otomatis menjadi **jurnal umum** dan masuk ke **laporan beban operasional**.

## Identitas Pengembang

| Informasi     | Keterangan        |
| ------------- | ----------------- |
| Nama          | *(isi namamu)*    |
| NIM           | *(isi NIM)*       |
| Program Studi | Akuntansi         |
| Universitas   | *(isi universitas)* |

---

## ✨ Fitur Utama

| Menu | Fungsi |
| ---- | ------ |
| 🏠 **Dashboard** | Nilai persediaan, jumlah barang, barang perlu restock, total beban, dan grafik beban per kategori |
| 📦 **Persediaan** | Data barang, stok, harga rata-rata, nilai, status (Aman / Menipis / Habis), dan **kartu stok** per barang |
| 🔁 **Mutasi Stok** | Pembelian (masuk) dan pemakaian (keluar); pemakaian ditolak bila stok tidak cukup |
| 💸 **Pengeluaran** | Pencatatan biaya operasional per kategori, tunai atau transfer |
| 📑 **Laporan & Jurnal** | Laporan beban, posisi persediaan akhir, jurnal umum otomatis, cetak/PDF, ekspor CSV |

Filter **periode bulanan** di pojok kanan atas berlaku untuk semua menu.

## 🧮 Logika Akuntansi

**Metode persediaan:** perpetual dengan *rata-rata bergerak (moving average)*.

- Pembelian: `harga rata-rata = (nilai persediaan lama + pembelian baru) ÷ (stok lama + qty baru)`
- Pemakaian: dinilai pada harga rata-rata saat itu.

**Jurnal otomatis**

| Transaksi | Debit | Kredit |
| --------- | ----- | ------ |
| Pembelian persediaan | Persediaan Perlengkapan | Kas |
| Pemakaian persediaan | Beban Perlengkapan | Persediaan Perlengkapan |
| Pengeluaran operasional | Beban *(kategori)* | Kas / Bank |

**Total Beban Operasional = Pengeluaran Operasional + Pemakaian Persediaan**

> Pembelian persediaan bukan beban saat dibeli; ia baru menjadi beban ketika barangnya dipakai.

## 🗄️ Basis Data

| Tabel | Fungsi |
| ----- | ------ |
| `barang` | Master data persediaan |
| `mutasi_persediaan` | Transaksi masuk/keluar, mengacu ke `barang.id` |
| `pengeluaran` | Biaya operasional |

Detail ada di `schema.sql`.

## 📂 Struktur Proyek

```
├── index.html    # struktur halaman
├── style.css     # tampilan
├── app.js        # logika aplikasi & perhitungan akuntansi
├── config.js     # konfigurasi Supabase
├── schema.sql    # skema database
└── README.md
```

## 🚀 Cara Menjalankan

### Opsi A — Mode Demo (tanpa setup)
Buka `index.html` di browser (atau lewat link GitHub Pages), lalu klik **Isi data contoh**. Data tersimpan di browser perangkat itu saja.

### Opsi B — Dengan database Supabase
1. Buat project di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, tempel isi `schema.sql`, lalu **Run**.
3. Buka **Settings → API**, salin **Project URL** dan **anon/publishable key**.
4. Isi keduanya di `config.js`.
5. Muat ulang aplikasi. Label di sidebar akan berubah menjadi *Terhubung ke Supabase*.

⚠️ Pakai **anon key** saja. Jangan pernah menaruh *service-role key* di repository.
Kebijakan RLS pada `schema.sql` membuka akses untuk siapa pun yang memegang anon key, cukup untuk tugas dan demo. Untuk pemakaian nyata, aktifkan Supabase Auth.

### Publikasi ke GitHub Pages
1. Unggah semua file ke repository (langsung di root, tanpa subfolder).
2. **Settings → Pages → Source:** *Deploy from a branch* → `main` / `(root)` → **Save**.
3. Tunggu 1–2 menit, aplikasi tersedia di `https://USERNAME.github.io/NAMA-REPOSITORY/`.

## 📝 Catatan Pengembangan

- Menghapus barang ikut menghapus seluruh mutasinya (`on delete cascade`).
- Belum ada modul pendapatan sewa, penyusutan aset, atau neraca lengkap.
- Jurnal dibuat otomatis dari transaksi, bukan diinput manual.

---

**KOSTA — Akuntansi Persediaan & Pengeluaran Operasional Rumah Kost**
