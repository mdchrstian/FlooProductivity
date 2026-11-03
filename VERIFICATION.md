# Verifikasi FLOO P0 dan revisi UI

Pengujian dilakukan pada 3 November 2026 (Asia/Makassar), Mac, Node.js 26.4.0. Database memakai proyek Supabase hosted kelompok; frontend berjalan lokal. Tidak ada deployment publik dalam pekerjaan ini.

## Pemeriksaan kode dan produksi

| Pemeriksaan | Hasil aktual | Bukti |
| --- | --- | --- |
| TypeScript | Lulus | docs/ui-review/typecheck.txt |
| Unit validasi dan waktu | 9 lulus, 0 gagal | docs/ui-review/unit-tests.txt |
| Build produksi Next.js | Lulus | docs/ui-review/build.txt |
| HTTP/SSR tanpa autentikasi dan Origin | 7 lulus pada server produksi | docs/evidence/http-results.json; docs/ui-review/http-checks.txt |
| Impeccable statis | 0 temuan | docs/ui-review/impeccable.json |

Unit mencakup nama/judul wajib, integer SKS positif, status/prioritas, tanggal tidak mungkin, DST ambigu/tidak ada, batas tahun, tujuh hari mendatang, dan keadaan kosong. Form autentikasi memakai POST serta menonaktifkan submit sebelum hydration agar kredensial tidak masuk query URL.

## Database dan autentikasi

18 kasus integrasi hosted lulus menggunakan dua akun QA nyata di Supabase dan publishable key. Bukti: docs/evidence/integration-results.json. Cakupan: CRUD, persistensi status, constraint, FK RESTRICT, profil/pengaturan, penolakan anon, baca/ubah/hapus lintas akun, pemalsuan pemilik, dan penautan Task ke Course akun lain. Operasi aplikasi tetap tunduk pada RLS. Tidak ada service_role dalam aplikasi.

Empat uji token signup/recovery lulus (docs/evidence/auth-token-results.json). Token pengujian dibuat melalui helper QA satu kali; ini menguji callback dan sesi, bukan pengiriman email. Pengguna sendiri mengonfirmasi registrasi dan verifikasi melalui inbox nyata berhasil sampai Dashboard (docs/evidence/user-confirmation.json).

Kasus token dengan klaim kedaluwarsa memakai token tidak valid; ini membuktikan penolakan token tersebut, bukan berlalunya umur JWT valid. Sesi yang benar-benar habis masa berlaku tetap belum diuji.

## Browser dan visual

23 observasi browser fondasi awal tersedia di docs/evidence/browser-results.json, termasuk CRUD, validasi, keadaan kosong, sinkron Task/Dashboard/Kalender, modul, timezone, jaringan gagal, logout, pergantian akun, dan fitur tertunda.

Sesudah perubahan UI, 22 observasi regresi tercatat terpisah di docs/ui-review/browser-results.json. Angka ini tidak dijumlahkan sebagai kasus unik dengan fase sebelumnya. Desktop 1440×1000 dan mobile 390×844 ditinjau; produksi menguji mutasi, navigasi, Kalender, serta notifikasi. Data QA terdiri dari tiga Course dan tujuh Task, sementara akun B kosong.

Temuan fokus dialog, notifikasi yang menutupi navigasi, dan klik cepat saat drawer menutup telah diperbaiki serta diuji ulang. Probe kontras pada keadaan normal Dashboard, Academic, dan Kalender tidak menemukan rasio di bawah ambang yang diperiksa setelah koreksi. Ini bukan audit aksesibilitas menyeluruh atau pengujian pembaca layar.

Bukti visual akhir dan catatan metode disimpan lokal pada docs/ui-review/README.md. Folder bukti tidak disertakan dalam repositori publik. Screenshot awal di docs/evidence merupakan bukti fase sebelumnya dan tidak mewakili visual terakhir.

## Respons

Lima pengulangan navigasi penuh tiap halaman pada produksi lokal dengan Supabase hosted dan cache font hangat menghasilkan median Dashboard 690ms / Kalender 632ms, serta p95 nearest-rank 799ms / 942ms. Stopwatch mencakup pemanggilan kontrol browser sampai heading konten terlihat. Semua sampel tersebut berada di bawah dua detik pada kondisi itu; tidak menjadi jaminan untuk beban atau jaringan lain. Data mentah: docs/ui-review/performance.json.

## Batas yang masih terbuka

- Stack Supabase lokal dan penampung email lokal belum diuji karena disk penuh; pengguna menyetujui hosted sebagai pengganti.
- Pengiriman email pemulihan, SMTP khusus, dan pengiriman ke penerima umum belum terverifikasi.
- Kedaluwarsa JWT valid secara nyata, perangkat mobile fisik, pembaca layar, lintas browser, uji beban, dan pemulihan backup belum diuji.
- Hilangnya notifikasi otomatis diamati, tetapi durasi persis empat detik tidak diukur secara andal pada IAB.
- Notes, Pomodoro, Kepanitiaan, login Google, Google Calendar, Gmail, dan deployment publik belum diimplementasikan/diuji pada tahap ini.

Tidak ada klaim P0 tanpa keterbatasan. Bukti yang tersedia harus dibaca sesuai lingkup dan fase pengujiannya.

Laporan, referensi, log, screenshot, serta metadata QA disimpan lokal dan diabaikan Git. Path bukti di atas merupakan lokasi arsip lokal, bukan tautan unduhan dalam repositori publik.
