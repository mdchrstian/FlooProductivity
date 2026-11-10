**# FLOO: Productivity App**

Fondasi fungsional P0 untuk produktivitas mahasiswa. Next.js App Router, TypeScript, dan Supabase hosted. Tampilan mempertahankan karakter putih-biru prototipe FLOO. Situs publik lama tidak diperbarui.

# Project By KELOMPOK PENERBANG ROKET

Anggota:
- Dimas Shakuntala Adi Pratama (NIM. 2508561047)
-
-
-

**## Menjalankan**

\`\`\`sh
cd FlooProductivity
npm run dev
\`\`\`

Buka [http://localhost:3000](http://localhost:3000). Pada checkout baru, jalankan \`npm ci\` lalu buat \`.env.local\` berdasarkan \`.env.example\`. Isi konfigurasi proyek Supabase milikmu; kredensial tidak disertakan dalam repositori. Node.js 26.4.0 dipakai pada pengujian di Mac ini.

Untuk versi produksi lokal, hentikan dev server, jalankan \`npm run build\`, kemudian \`npm start\`. Dev dan start menggunakan port 3000; jangan jalankan bersamaan. Script memanggil CLI lewat Node agar nama folder yang mengandung titik dua tetap dapat digunakan.

**## Konfigurasi Supabase**

Isi URL proyek, **\*\*publishable key\*\***, dan \`NEXT_PUBLIC_APP_URL=[http://localhost:3000](http://localhost:3000)\`. Aplikasi tidak memerlukan secret key atau service_role. Jangan commit \`.env.local\`.

Pada proyek Supabase baru yang kosong, jalankan \`supabase/migrations/202611030001_p0.sql\` sekali melalui SQL Editor. Konfigurasikan email/password, konfirmasi email, Site URL localhost, serta dua callback yang tercantum di [panduan hosted]\(docs/SETUP_SUPABASE_HOSTED.md).

Callback mendukung PKCE dari template email hosted bawaan dan token_hash. Pengguna sudah mengonfirmasi satu registrasi melalui email nyata berhasil sampai Dashboard. Pengiriman email pemulihan, SMTP khusus, dan penerima umum di luar batas layanan email bawaan belum terverifikasi.

Konfigurasi Supabase lokal tetap tersedia sebagai alternatif: \`npm run supabase:start\`, \`npm run db:reset\`, lalu \`npm run configure:local\`. Ini membutuhkan container runtime dan ruang disk yang cukup. Stack lokal belum berhasil diuji karena disk Mac penuh; pengujian database menggunakan hosted atas pilihan pengguna. Jangan menjalankan \`db:reset\` sebagai langkah setup hosted.

**## Fitur P0**

\- Registrasi, verifikasi email, login, logout, dan form pemulihan password, dengan sesi cookie dan pemeriksaan autentikasi server.
\- CRUD mata kuliah. Mata kuliah yang masih memiliki tugas tidak dapat dihapus.
\- CRUD Task, status Kanban todo/in_progress/done, checkbox selesai, prioritas, dan deadline wajib. Status dapat diubah tanpa drag-and-drop.
\- Dashboard dengan ringkasan, agenda pekanan, filter tugas, progres nyata, dan pintasan mata kuliah.
\- Kalender bulanan lintas mata kuliah dan agenda harian. Item desktop membuka detail; mobile menampilkan jumlah tugas dan agenda yang dapat dibuka.
\- Pengaturan nama, zona waktu IANA, dan visibilitas Modul Akademik. Menyembunyikan modul tidak menghapus data.
\- Pencarian Task/Course melalui tombol atau Cmd/Ctrl+K, mengikuti data akun dan visibilitas modul.

Data P0 disimpan per akun di Supabase, tanpa localStorage atau isian demo. Satu snapshot React Context dipakai bersama; mutasi memperbarui tampilan setelah server menyatakan penyimpanan berhasil. Deadline disimpan sebagai timestamptz dan ditampilkan dalam zona pengguna. Tanggal memakai waktu berjalan.

Notes, Pomodoro, Kepanitiaan, login Google, Google Calendar, dan Gmail berstatus **\*\*Tahap berikutnya\*\***. Tidak ada sinkronisasi Google atau timer yang disimulasikan sebagai fitur aktif.

**## Pengujian**

\`\`\`sh
npm run typecheck
npm test
npm run build
npm run test:integration
node scripts/test-http.mjs
\`\`\`

Pengujian integrasi memerlukan \`.test-accounts.json\` berisi dua akun khusus uji yang sudah dikonfirmasi, dengan bentuk \`{"a":{"email":"...","password":"..."},"b":{"email":"...","password":"..."}}\`. File ini diabaikan Git. Pengujian membuat dan membersihkan datanya sendiri menggunakan publishable key dan sesi tiap akun; RLS tetap berlaku. Jangan memakai akun berisi data penting. Pemeriksaan HTTP membutuhkan server di port 3000.

Ringkasan hasil aktual dan keterbatasan: [VERIFICATION.md]\(VERIFICATION.md). Log lengkap dan screenshot QA disimpan lokal serta diabaikan Git karena dapat memuat informasi akun. Akun baru memulai dengan data kosong.

**## Struktur dan kelanjutan**

\- \`src/app\`: halaman, callback autentikasi, dan API.
\- \`src/components\`: workspace, form autentikasi, dan ikon asli FLOO.
\- \`src/lib\`: validasi Zod, waktu Luxon, tipe, dan klien Supabase.
\- \`supabase\`: migrasi RLS, constraint, konfigurasi lokal, dan template email opsional.
\- \`legacy/frontend\`: prototipe awal; data contoh/localStorage di sana bukan alur aplikasi P0.
\- \`docs\`: panduan konfigurasi Supabase hosted. Laporan akademik, catatan revisi, serta bukti pengujian lokal diabaikan Git.

[DESIGN.md]\(DESIGN.md) mencatat karakter visual yang dipulihkan. Deployment publik dan fitur roadmap tetap pekerjaan lanjutan.

**## Berkas publik dan lokal**

\`.gitignore\` mengecualikan laporan, referensi, aset laporan, screenshot/log QA, environment, akun/token uji, build, konfigurasi hosting mesin, dan berkas kunci. Panduan Supabase hosted di \`docs\` tetap disertakan. Berkas lokal tersebut tetap ada di mesin kerja. Jangan memakai \`git add -f\` untuk memasukkan berkas yang diabaikan.

Repositori project: [https://github.com/mdchrstian/FlooProductivity](https://github.com/mdchrstian/FlooProductivity). Migrasi dan source P0 disiapkan untuk diunggah oleh pemilik repositori.

**## Demo sementara dari luar jaringan**

Untuk tunnel HTTPS sementara, isi \`SHARE_APP_URL\` dengan origin tunnel yang tepat lalu restart server produksi. Nilai ini hanya dibaca server; origin utama tetap berlaku. Tambahkan URL \`/auth/confirm\` dan \`/auth/confirm?next=/reset-password\` dari origin tersebut pada redirect allowlist Supabase. Hapus origin demo setelah tunnel dihentikan. Tautan tunnel bergantung pada Mac, server Next.js, dan proses tunnel yang tetap hidup.
