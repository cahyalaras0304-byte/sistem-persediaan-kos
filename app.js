/* KOSTA — logika aplikasi (Vanilla JS). Data: Supabase REST bila config.js terisi, jika tidak: localStorage (Mode Demo). */
const C = window.KOST_CONFIG || {}, ONLINE = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);
const KAT = ['Listrik','Air','Internet','Kebersihan','Perbaikan & Pemeliharaan','Gaji Penjaga','Keamanan','Lain-lain'];
const KATB = ['Kebersihan','Listrik & Lampu','Air & Galon','Perlengkapan Kamar','Lainnya'];
const $ = s => document.querySelector(s);
const rp = n => (n < 0 ? '-' : '') + 'Rp ' + Math.round(Math.abs(n)).toLocaleString('id-ID');
const num = n => (+n).toLocaleString('id-ID', { maximumFractionDigits: 2 });
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sum = a => a.reduce((x, y) => x + y, 0);
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '' + Math.random());
const opt = (a, v) => a.map(o => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('');
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); };

/* ---------- Lapisan data ---------- */
const H = () => ({ apikey: C.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + C.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' });
const U = t => `${C.SUPABASE_URL}/rest/v1/${t}`;
const ls = (t, v) => v ? localStorage.setItem('kosta_' + t, JSON.stringify(v)) : JSON.parse(localStorage.getItem('kosta_' + t) || '[]');
const chk = async r => { if (!r.ok) throw new Error(await r.text()); return r; };
const db = {
  async list(t) { return ONLINE ? (await chk(await fetch(U(t) + '?select=*&order=created_at.asc', { headers: H() }))).json() : ls(t); },
  async add(t, row) {
    if (!ONLINE) { const a = ls(t); a.push({ ...row, id: uid(), created_at: new Date().toISOString() }); return ls(t, a); }
    await chk(await fetch(U(t), { method: 'POST', headers: H(), body: JSON.stringify(row) }));
  },
  async del(t, id) {
    if (!ONLINE) {
      ls(t, ls(t).filter(x => x.id !== id));
      if (t === 'barang') ls('mutasi_persediaan', ls('mutasi_persediaan').filter(x => x.barang_id !== id));
      return;
    }
    await chk(await fetch(U(t) + '?id=eq.' + id, { method: 'DELETE', headers: H() }));
  }
};

/* ---------- State & perhitungan akuntansi ---------- */
let S = { barang: [], mutasi: [], pengeluaran: [] }, tab = 'dashboard', bulan = '';
const inP = t => !bulan || t.tanggal.startsWith(bulan);

// Kartu persediaan — metode rata-rata bergerak (perpetual).
function kartu() {
  const m = {};
  S.barang.forEach(b => m[b.id] = { ...b, stok: 0, nilai: 0, avg: 0, hist: [] });
  [...S.mutasi].sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.created_at.localeCompare(b.created_at)).forEach(t => {
    const b = m[t.barang_id]; if (!b) return;
    const q = +t.qty, h = +t.harga_satuan;
    if (t.jenis === 'masuk') { t.total = q * h; t.hrg = h; b.nilai += t.total; b.stok += q; b.avg = b.stok ? b.nilai / b.stok : 0; }
    else { t.hrg = b.avg; t.total = q * b.avg; b.nilai -= t.total; b.stok -= q; }
    b.hist.push({ ...t, saldoQ: b.stok, saldoN: b.nilai });
  });
  return m;
}
function beban() {
  const o = {};
  S.pengeluaran.filter(inP).forEach(p => o[p.kategori] = (o[p.kategori] || 0) + +p.jumlah);
  const pakai = sum(S.mutasi.filter(t => t.jenis === 'keluar' && inP(t)).map(t => t.total || 0));
  if (pakai) o['Pemakaian Perlengkapan'] = pakai;
  return o;
}
function jurnal(K) {
  const j = [];
  S.mutasi.filter(inP).forEach(t => {
    const b = K[t.barang_id]; if (!b) return;
    j.push(t.jenis === 'masuk'
      ? { tgl: t.tanggal, ket: `Pembelian ${b.nama} (${num(t.qty)} ${b.satuan})`, d: 'Persediaan Perlengkapan', k: 'Kas', v: t.total }
      : { tgl: t.tanggal, ket: `Pemakaian ${b.nama} (${num(t.qty)} ${b.satuan})`, d: 'Beban Perlengkapan', k: 'Persediaan Perlengkapan', v: t.total });
  });
  S.pengeluaran.filter(inP).forEach(p => j.push({ tgl: p.tanggal, ket: p.deskripsi, d: 'Beban ' + p.kategori, k: p.metode === 'Transfer' ? 'Bank' : 'Kas', v: +p.jumlah }));
  return j.sort((a, b) => a.tgl.localeCompare(b.tgl));
}
const status = b => b.stok <= 0 ? ['habis', 'Habis'] : b.stok <= +b.stok_min ? ['tipis', 'Menipis'] : ['aman', 'Aman'];
const stat = (l, v, w) => `<div class="stat${w ? ' warn' : ''}"><small>${l}</small><span class="num">${v}</span></div>`;
const delBtn = (t, id) => `<button class="btn sm del" data-act="del" data-t="${t}" data-id="${id}">Hapus</button>`;
const empty = m => `<p class="empty">${m}</p>`;

/* ---------- Tampilan ---------- */
const V = {
  dashboard(K) {
    const B = beban(), items = Object.values(K), low = items.filter(b => b.stok <= +b.stok_min), max = Math.max(1, ...Object.values(B));
    const seed = !ONLINE && !S.barang.length ? `<div class="card"><h3>Mulai cepat</h3><p>Belum ada data. Coba dengan data contoh, atau tambah barang di menu Persediaan.</p><button class="btn" data-act="seed">Isi data contoh</button></div>` : '';
    return seed + `<section class="grid">
      ${stat('Nilai persediaan saat ini', rp(sum(items.map(b => b.nilai))))}
      ${stat('Jenis barang', items.length)}
      ${stat('Barang perlu restock', low.length, low.length)}
      ${stat('Total beban operasional' + (bulan ? ' (' + bulan + ')' : ''), rp(sum(Object.values(B))))}</section>
    <div class="two"><div class="card"><h3>Beban per kategori</h3>
      ${Object.entries(B).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="bar"><span>${esc(k)}</span><i style="width:${v / max * 100}%"></i><b>${rp(v)}</b></div>`).join('') || empty('Belum ada pengeluaran pada periode ini.')}</div>
    <div class="card"><h3>Perlu restock</h3>${low.length ? `<table><tr><th>Barang</th><th class="r">Stok</th><th>Status</th></tr>${low.map(b => `<tr><td>${esc(b.nama)}</td><td class="r">${num(b.stok)} ${esc(b.satuan)}</td><td><span class="bdg ${status(b)[0]}">${status(b)[1]}</span></td></tr>`).join('')}</table>` : empty('Semua stok aman.')}</div></div>`;
  },
  persediaan(K) {
    const items = Object.values(K).sort((a, b) => a.kode.localeCompare(b.kode));
    return `<div class="card"><h3>Tambah barang</h3><form data-f="barang">
      <div><label>Kode</label><input name="kode" required placeholder="BRG-001"></div>
      <div><label>Nama barang</label><input name="nama" required></div>
      <div><label>Kategori</label><select name="kategori">${opt(KATB)}</select></div>
      <div><label>Satuan</label><input name="satuan" value="pcs" required></div>
      <div><label>Stok minimum</label><input name="stok_min" type="number" min="0" value="0" required></div>
      <button class="btn">Simpan barang</button></form></div>
    <div class="card"><h3>Daftar persediaan</h3>${items.length ? `<table><tr><th>Kode</th><th>Barang</th><th>Kategori</th><th class="r">Stok</th><th class="r">Harga rata-rata</th><th class="r">Nilai</th><th>Status</th><th></th></tr>
      ${items.map(b => `<tr><td>${esc(b.kode)}</td><td>${esc(b.nama)}</td><td>${esc(b.kategori)}</td><td class="r">${num(b.stok)} ${esc(b.satuan)}</td><td class="r">${rp(b.avg)}</td><td class="r">${rp(b.nilai)}</td><td><span class="bdg ${status(b)[0]}">${status(b)[1]}</span></td>
      <td><button class="btn sm ghost" data-act="kartu" data-id="${b.id}">Kartu stok</button> ${delBtn('barang', b.id)}</td></tr>`).join('')}
      <tfoot><tr><td colspan="5">Total persediaan</td><td class="r">${rp(sum(items.map(b => b.nilai)))}</td><td colspan="2"></td></tr></tfoot></table>` : empty('Belum ada barang. Tambahkan lewat form di atas.')}</div>`;
  },
  stok(K) {
    const rows = S.mutasi.filter(inP).slice().reverse();
    return `<div class="card"><h3>Catat mutasi stok</h3>${S.barang.length ? `<form data-f="mutasi">
      <div><label>Tanggal</label><input type="date" name="tanggal" value="${today()}" required></div>
      <div><label>Barang</label><select name="barang_id">${S.barang.map(b => `<option value="${b.id}">${esc(b.kode)} — ${esc(b.nama)}</option>`).join('')}</select></div>
      <div><label>Jenis</label><select name="jenis"><option value="masuk">Masuk (pembelian)</option><option value="keluar">Keluar (pemakaian)</option></select></div>
      <div><label>Jumlah</label><input type="number" name="qty" min="0.01" step="any" required></div>
      <div><label>Harga beli / satuan (untuk Masuk)</label><input type="number" name="harga_satuan" min="0" step="any" value="0"></div>
      <div><label>Keterangan</label><input name="keterangan"></div>
      <button class="btn">Simpan mutasi</button></form>` : empty('Tambahkan barang dulu di menu Persediaan.')}</div>
    <div class="card"><h3>Riwayat mutasi</h3>${rows.length ? `<table><tr><th>Tanggal</th><th>Barang</th><th>Jenis</th><th class="r">Jumlah</th><th class="r">Harga / HPP</th><th class="r">Total</th><th>Ket.</th><th></th></tr>
      ${rows.map(t => { const b = K[t.barang_id]; return `<tr><td>${t.tanggal}</td><td>${esc(b?.nama)}</td><td><span class="bdg ${t.jenis === 'masuk' ? 'aman' : 'tipis'}">${t.jenis}</span></td><td class="r">${num(t.qty)}</td><td class="r">${rp(t.hrg)}</td><td class="r">${rp(t.total)}</td><td>${esc(t.keterangan)}</td><td>${delBtn('mutasi_persediaan', t.id)}</td></tr>`; }).join('')}</table>` : empty('Belum ada mutasi pada periode ini.')}</div>`;
  },
  pengeluaran() {
    const rows = S.pengeluaran.filter(inP).slice().sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    return `<div class="card"><h3>Catat pengeluaran operasional</h3><form data-f="pengeluaran">
      <div><label>Tanggal</label><input type="date" name="tanggal" value="${today()}" required></div>
      <div><label>Kategori</label><select name="kategori">${opt(KAT)}</select></div>
      <div><label>Deskripsi</label><input name="deskripsi" required></div>
      <div><label>Jumlah (Rp)</label><input type="number" name="jumlah" min="1" required></div>
      <div><label>Dibayar via</label><select name="metode">${opt(['Tunai', 'Transfer'])}</select></div>
      <button class="btn">Simpan pengeluaran</button></form></div>
    <div class="card"><h3>Riwayat pengeluaran</h3>${rows.length ? `<table><tr><th>Tanggal</th><th>Kategori</th><th>Deskripsi</th><th>Via</th><th class="r">Jumlah</th><th></th></tr>
      ${rows.map(p => `<tr><td>${p.tanggal}</td><td>${esc(p.kategori)}</td><td>${esc(p.deskripsi)}</td><td>${esc(p.metode)}</td><td class="r">${rp(p.jumlah)}</td><td>${delBtn('pengeluaran', p.id)}</td></tr>`).join('')}
      <tfoot><tr><td colspan="4">Total</td><td class="r">${rp(sum(rows.map(p => +p.jumlah)))}</td><td></td></tr></tfoot></table>` : empty('Belum ada pengeluaran pada periode ini.')}</div>`;
  },
  laporan(K) {
    const B = beban(), tot = sum(Object.values(B)), J = jurnal(K), items = Object.values(K);
    return `<div class="actions"><button class="btn" data-act="print">Cetak / simpan PDF</button><button class="btn ghost" data-act="csv">Ekspor jurnal (CSV)</button></div>
    <div class="two"><div class="card"><h3>Laporan beban operasional ${bulan ? '— ' + bulan : '(semua periode)'}</h3>
      <table><tr><th>Beban</th><th class="r">Jumlah</th><th class="r">%</th></tr>${Object.entries(B).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r">${rp(v)}</td><td class="r">${(v / tot * 100).toFixed(1)}%</td></tr>`).join('')}
      <tfoot><tr><td>Total beban</td><td class="r">${rp(tot)}</td><td></td></tr></tfoot></table></div>
    <div class="card"><h3>Posisi persediaan akhir</h3><table><tr><th>Barang</th><th class="r">Stok</th><th class="r">Nilai</th></tr>${items.map(b => `<tr><td>${esc(b.nama)}</td><td class="r">${num(b.stok)} ${esc(b.satuan)}</td><td class="r">${rp(b.nilai)}</td></tr>`).join('')}
      <tfoot><tr><td colspan="2">Total persediaan</td><td class="r">${rp(sum(items.map(b => b.nilai)))}</td></tr></tfoot></table></div></div>
    <div class="card"><h3>Jurnal umum (otomatis)</h3>${J.length ? `<table class="jr"><tr><th>Tanggal</th><th>Keterangan / Akun</th><th class="r">Debit</th><th class="r">Kredit</th></tr>
      ${J.map(r => `<tr><td>${r.tgl}</td><td>${esc(r.d)}<br><small>${esc(r.ket)}</small></td><td class="r">${rp(r.v)}</td><td></td></tr><tr><td></td><td style="padding-left:28px">${esc(r.k)}</td><td></td><td class="r">${rp(r.v)}</td></tr>`).join('')}
      <tfoot><tr><td colspan="2">Total</td><td class="r">${rp(sum(J.map(r => r.v)))}</td><td class="r">${rp(sum(J.map(r => r.v)))}</td></tr></tfoot></table>` : empty('Belum ada transaksi.')}</div>`;
  }
};

async function load() {
  try { [S.barang, S.mutasi, S.pengeluaran] = await Promise.all(['barang', 'mutasi_persediaan', 'pengeluaran'].map(t => db.list(t))); }
  catch (e) { toast('Gagal memuat data: cek config.js & schema.sql'); console.error(e); }
  render();
}
function render() {
  const K = kartu();
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $('#view').innerHTML = V[tab](K);
  $('#mode').textContent = ONLINE ? '● Terhubung ke Supabase' : '● Mode Demo — data tersimpan di browser ini';
}

/* ---------- Aksi ---------- */
function seed() {
  const t = today().slice(0, 8), ts = n => new Date(Date.now() + n).toISOString();
  const B = [['BRG-001', 'Sabun Pel Lantai 1L', 'Kebersihan', 'botol', 5], ['BRG-002', 'Lampu LED 12W', 'Listrik & Lampu', 'pcs', 4], ['BRG-003', 'Galon Isi Ulang', 'Air & Galon', 'galon', 3], ['BRG-004', 'Kantong Sampah', 'Kebersihan', 'pak', 5]]
    .map(([kode, nama, kategori, satuan, stok_min], i) => ({ id: uid(), created_at: ts(i), kode, nama, kategori, satuan, stok_min }));
  const M = [[0, 'masuk', 20, 18000], [1, 'masuk', 10, 25000], [2, 'masuk', 6, 18000], [3, 'masuk', 12, 9000], [0, 'keluar', 6], [1, 'keluar', 3], [2, 'keluar', 4], [1, 'masuk', 5, 27000], [0, 'keluar', 10]]
    .map(([i, jenis, qty, h], n) => ({ id: uid(), created_at: ts(100 + n), tanggal: t + String(1 + n).padStart(2, '0'), barang_id: B[i].id, jenis, qty, harga_satuan: h || 0, keterangan: '' }));
  const P = [['Listrik', 'Token listrik kost', 450000], ['Air', 'Tagihan PDAM', 180000], ['Internet', 'WiFi bulanan', 350000], ['Kebersihan', 'Upah kebersihan', 200000], ['Perbaikan & Pemeliharaan', 'Servis pompa air', 275000], ['Gaji Penjaga', 'Gaji penjaga kost', 1000000]]
    .map(([kategori, deskripsi, jumlah], n) => ({ id: uid(), created_at: ts(200 + n), tanggal: t + String(2 + n).padStart(2, '0'), kategori, deskripsi, jumlah, metode: n % 2 ? 'Transfer' : 'Tunai' }));
  ls('barang', B); ls('mutasi_persediaan', M); ls('pengeluaran', P);
}
function csv(K) {
  const q = s => '"' + String(s).replace(/"/g, '""') + '"';
  const rows = [['Tanggal', 'Akun', 'Keterangan', 'Debit', 'Kredit']];
  jurnal(K).forEach(r => { rows.push([r.tgl, r.d, r.ket, Math.round(r.v), '']); rows.push([r.tgl, r.k, r.ket, '', Math.round(r.v)]); });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' }));
  a.download = 'jurnal-kosta.csv'; a.click();
}

document.addEventListener('submit', async e => {
  const f = e.target.dataset.f; if (!f) return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  try {
    if (f === 'barang') {
      if (S.barang.some(b => b.kode.toLowerCase() === d.kode.trim().toLowerCase())) return toast('Kode barang sudah dipakai');
      await db.add('barang', { ...d, kode: d.kode.trim(), stok_min: +d.stok_min });
    } else if (f === 'mutasi') {
      d.qty = +d.qty; d.harga_satuan = d.jenis === 'masuk' ? +d.harga_satuan : 0;
      if (d.jenis === 'keluar' && d.qty > (kartu()[d.barang_id]?.stok || 0)) return toast('Stok tidak cukup untuk pemakaian ini');
      await db.add('mutasi_persediaan', d);
    } else { d.jumlah = +d.jumlah; await db.add('pengeluaran', d); }
    toast('Tersimpan'); await load();
  } catch (err) { toast('Gagal menyimpan: ' + err.message.slice(0, 80)); }
});

document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act],nav button'); if (!el) return;
  if (el.dataset.tab) { tab = el.dataset.tab; return render(); }
  const a = el.dataset.act, K = kartu();
  if (a === 'seed') { seed(); await load(); toast('Data contoh dimuat'); }
  else if (a === 'print') window.print();
  else if (a === 'csv') csv(K);
  else if (a === 'del') {
    if (!confirm('Hapus data ini? Menghapus barang juga menghapus seluruh mutasinya.')) return;
    try { await db.del(el.dataset.t, el.dataset.id); toast('Dihapus'); await load(); } catch (err) { toast('Gagal menghapus'); }
  } else if (a === 'kartu') {
    const b = K[el.dataset.id];
    $('#dlg').innerHTML = `<h3>Kartu persediaan — ${esc(b.nama)}</h3><p>Metode rata-rata bergerak · satuan ${esc(b.satuan)}</p>
      ${b.hist.length ? `<div style="overflow-x:auto"><table><tr><th>Tanggal</th><th>Jenis</th><th class="r">Jumlah</th><th class="r">Harga</th><th class="r">Total</th><th class="r">Saldo qty</th><th class="r">Saldo nilai</th></tr>
      ${b.hist.map(h => `<tr><td>${h.tanggal}</td><td>${h.jenis}</td><td class="r">${num(h.qty)}</td><td class="r">${rp(h.hrg)}</td><td class="r">${rp(h.total)}</td><td class="r">${num(h.saldoQ)}</td><td class="r">${rp(h.saldoN)}</td></tr>`).join('')}</table></div>` : empty('Belum ada mutasi untuk barang ini.')}
      <p><button class="btn" onclick="$('#dlg').close()">Tutup</button></p>`;
    $('#dlg').showModal();
  }
});
$('#bulan').addEventListener('change', e => { bulan = e.target.value; render(); });
load();
