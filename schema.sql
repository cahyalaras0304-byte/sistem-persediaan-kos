-- KOSTA — skema database (PostgreSQL / Supabase)
-- Jalankan di Supabase → SQL Editor.

create table if not exists barang (
  id          uuid primary key default gen_random_uuid(),
  kode        text not null unique,
  nama        text not null,
  kategori    text not null default 'Perlengkapan',
  satuan      text not null default 'pcs',
  stok_min    numeric not null default 0 check (stok_min >= 0),
  created_at  timestamptz not null default now()
);

create table if not exists mutasi_persediaan (
  id            uuid primary key default gen_random_uuid(),
  tanggal       date not null,
  barang_id     uuid not null references barang(id) on delete cascade,
  jenis         text not null check (jenis in ('masuk','keluar')),
  qty           numeric not null check (qty > 0),
  harga_satuan  numeric not null default 0 check (harga_satuan >= 0), -- hanya dipakai untuk pembelian
  keterangan    text,
  created_at    timestamptz not null default now()
);

create table if not exists pengeluaran (
  id          uuid primary key default gen_random_uuid(),
  tanggal     date not null,
  kategori    text not null,
  deskripsi   text not null,
  jumlah      numeric not null check (jumlah > 0),
  metode      text not null default 'Tunai',
  created_at  timestamptz not null default now()
);

create index if not exists idx_mutasi_barang on mutasi_persediaan(barang_id, tanggal);
create index if not exists idx_pengeluaran_tgl on pengeluaran(tanggal);

-- Row Level Security: akses terbuka untuk anon key (cocok untuk tugas/demo).
-- Untuk penggunaan nyata, aktifkan Supabase Auth lalu ganti `to anon` menjadi `to authenticated`.
alter table barang enable row level security;
alter table mutasi_persediaan enable row level security;
alter table pengeluaran enable row level security;
create policy "akses_barang" on barang for all to anon using (true) with check (true);
create policy "akses_mutasi" on mutasi_persediaan for all to anon using (true) with check (true);
create policy "akses_pengeluaran" on pengeluaran for all to anon using (true) with check (true);
