# PUSTAKA YOGA

Website katalog dan pemesanan buku dengan sistem pre-order dan pembayaran transfer manual.

## Backend

Proyek Supabase aktif: `tbsleqrqpvqpuxgrbfws` (region `ap-southeast-1`).

### Edge Functions yang disiapkan

- `checkout`: validasi data pemesan, memeriksa status/periode PO dan kuota, menghitung harga dari database, lalu membuat pesanan, item, dan pembayaran dalam satu transaksi PostgreSQL.
- `create-proof-upload`: membuat signed upload URL sementara ke bucket privat `payment-proofs`.
- `submit-payment-proof`: memeriksa file yang sudah diunggah dan mengubah status pembayaran/pesanan secara transaksional.

Kode fungsi ada di `supabase/functions/`.

### Catatan keamanan sebelum deployment

1. Jangan pernah menaruh `service_role` atau secret key di frontend, GitHub, atau HTML publik.
2. Bucket `payment-proofs` harus tetap private. File bukti hanya dapat dibaca admin aktif.
3. Origin CORS sementara untuk GitHub Pages: `https://pakyoga-pjok.github.io` (origin tidak mencakup path `/PUSTAKA-YOGA/`). Edge Functions belum dideploy. Tetapkan konfigurasi JWT/public invocation dengan sengaja sebelum deployment.
4. Terapkan pembatasan request untuk endpoint unggah dan konfirmasi bukti sebelum menerima trafik publik.
5. Aktifkan leaked-password protection di Supabase Auth.
6. Uji checkout, signed upload, konfirmasi bukti, RLS admin, dan penolakan akses anonim sebelum website dipublikasikan.

## Katalog awal

- Kompas dari Ayah — Rp50.000; PO 1–9 November 2026.
- Simfoni Lapangan — Rp50.000; PO terbuka.
- Petualangan Bandeng — Rp60.000; PO terbuka.
- Menghidupkan Kembali Permainan Tradisional — segera hadir.

Bonus totebag untuk Kompas dari Ayah ditentukan secara manual oleh admin.

## Status saat ini

Database dan bucket privat telah disiapkan di proyek Supabase baru. Source code Edge Functions sudah disimpan di repository, tetapi belum dideploy. Proyek Supabase lama tidak disentuh.
