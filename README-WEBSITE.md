# PUSTAKA YOGA — Frontend awal

## Struktur
- `index.html`: beranda
- `katalog.html`: daftar buku
- `buku.html?slug=...`: detail buku
- `checkout.html`: keranjang dan pratinjau data pemesan
- `pesanan.html`: halaman pratinjau konfirmasi
- `assets/css/style.css`: gaya editorial responsif
- `assets/js/app.js`: katalog awal dan interaksi keranjang berbasis browser

## Catatan penting
Versi ini adalah **prototipe frontend**, belum terhubung ke Supabase. Keranjang memakai localStorage browser. Form checkout hanya menampilkan pratinjau dan tidak membuat pesanan, tidak mengumpulkan pembayaran, serta tidak mengunggah bukti transfer.

Data katalog pada `assets/js/app.js` merupakan data awal. Sinopsis masih berupa teks sementara dan perlu diganti dengan sinopsis resmi. Sampul buku saat ini berupa ilustrasi tipografi CSS, bukan sampul final.

## GitHub Pages
Jika GitHub Pages diaktifkan dari branch `main` dengan folder root, halaman utama akan menggunakan `index.html`. URL rencana:
https://pakyoga-pjok.github.io/PUSTAKA-YOGA/

## Tahap berikutnya sebelum publikasi
1. Ganti ilustrasi sampul dengan file sampul resmi.
2. Lengkapi sinopsis, penulis, dan detail buku.
3. Hubungkan katalog ke Supabase.
4. Review dan deploy Edge Functions setelah pengamanan endpoint selesai.
5. Integrasikan checkout, pembayaran, dan unggah bukti.
6. Uji alur transaksi dan akses admin sebelum membuka pemesanan publik.
