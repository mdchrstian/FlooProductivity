# FLOO P0

Arah yang dipilih pengguna: pulihkan komposisi prototipe FLOO, lalu matangkan untuk penggunaan nyata. Putih-biru, tenang, ringan, dan akrab untuk mahasiswa. ENERGY 2 / RHYTHM 2 / MOTION 1. Antislop: during, sesuai pilihan sesi.

## Identitas yang dipertahankan

- DM Sans 400–700, disimpan lokal di public/fonts beserta OFL. Wordmark teks `floo.` dengan titik biru.
- Biru #245ce4 untuk tindakan utama dan navigasi aktif; tinta #202b43; latar #f7f9fc; garis #e7ecf3. Lavender akademik dan hijau lembut membantu membedakan sumber, selalu bersama nama mata kuliah.
- Sidebar putih, workspace pribadi, profil di bawah, topbar pencarian dan tanggal. Ikon SVG berasal dari prototipe, bukan emoji atau logo baru.
- Panel bertepi tipis, radius 12px, tanpa bayangan dekoratif. Bayangan hanya untuk dialog, drawer mobile, dan pemberitahuan.

## Komposisi dan perilaku

Dashboard mempertahankan empat ringkasan, agenda pekanan di kolom utama, daftar tugas di bawahnya, serta panel biru di kanan. Lingkaran kanan menunjukkan persentase Task selesai yang benar-benar tersimpan; tidak menyimulasikan Pomodoro. Data kosong menampilkan tindakan membuat mata kuliah pertama, tanpa isian contoh.

Kartu mata kuliah menampilkan SKS, dosen bila tersedia, jumlah tugas aktif, dan progres nyata. Memilih mata kuliah membuka papan tugas dalam konteksnya; URL menyimpan pilihan tersebut. Status Kanban memakai select native agar dapat dipakai dengan keyboard dan sentuhan.

Kalender desktop menampilkan nama tugas yang dapat membuka editor. Pada mobile, sel menampilkan jumlah tugas dan tanggal memilih agenda harian yang lebih terbaca. Nama mata kuliah tetap tersedia pada agenda dan detail.

Pencarian Cmd/Ctrl+K mencari data snapshot akun, membuka Task atau konteks Course. Modul akademik yang disembunyikan tidak muncul sebagai hasil pencarian. Fitur lanjutan berlabel Tahap berikutnya.

## Tipografi, responsif, dan akses

Heading utama 32px desktop / 27px mobile; isi memakai hierarki DM Sans yang sama. Metadata lebih kecil hanya untuk informasi pendamping. Warna muted #5e6c82 dipakai agar label tetap terbaca. Fokus biru jelas; dialog native menahan fokus dan mengembalikannya ketika ditutup. Gerak terbatas pada umpan balik kontrol dan progres, dengan prefers-reduced-motion.

Pada 390px, sidebar menjadi drawer, ringkasan dua kolom, agenda serta panel kanan bertumpuk, dan Kanban satu kolom. Tidak menambah library UI, sistem tema, layanan, atau lapisan data baru untuk perbaikan visual ini.

## Sumber dan bukti

Sumber visual: legacy/frontend dan docs/evidence/original-ui-desktop.png. Perbandingan migrasi sebelum/sesudah menggunakan akun QA dan data yang sama di docs/ui-review. Data QA tidak ditambahkan ke akun pengguna. Mobbin tidak digunakan sebagai bukti karena akses pencariannya memerlukan paket berbayar.
