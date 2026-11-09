# Konfigurasi Supabase hosted

Aplikasi berjalan lokal. Situs publik lama tetap prototipe dan tidak diperbarui oleh pekerjaan ini.

1. Masuk ke dashboard Supabase milik kelompok. Buat proyek pada paket Free yang tersedia, nama `floo-productivity-p0`, dan region Singapore bila tersedia. Jangan memilih add-on berbayar. Simpan password database sendiri, jangan kirim ke chat atau commit Git.
2. Buka SQL Editor pada proyek baru yang masih kosong. Jalankan isi `supabase/migrations/202611030001_p0.sql` satu kali. Jangan menjalankannya pada database proyek lain. Empat tabel aplikasi dan kebijakan RLS dibuat oleh migrasi ini.
3. Dari halaman Connect/API keys proyek, isi `.env.local` berdasarkan `.env.example`: URL Supabase, publishable key (atau legacy anon key), dan `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Jangan memakai secret key atau service_role.
4. Pada Authentication / URL Configuration, isi Site URL `http://localhost:3000`. Tambahkan URL `http://localhost:3000/auth/confirm` dan `http://localhost:3000/auth/confirm?next=/reset-password` pada redirect allowlist.
5. Aktifkan email/password dan konfirmasi email. Template hosted bawaan dapat dipakai dengan PKCE; callback aplikasi juga mendukung token_hash. File template di supabase/templates merupakan alternatif untuk konfigurasi yang mengizinkan template khusus, bukan prasyarat registrasi hosted yang sudah diuji.
6. Untuk pengiriman email hosted ke alamat umum, konfigurasikan SMTP milik kelompok jika layanan default membatasi penerima. Jangan menonaktifkan konfirmasi email untuk menyatakan pengujian verifikasi berhasil. Status email perlu diuji dengan inbox nyata.
7. Jalankan `npm run dev`. Registrasikan dua akun uji dengan email yang bisa diakses dan lakukan verifikasi dari inbox masing-masing.
8. Buat `.test-accounts.json` yang diabaikan Git dengan bentuk `{"a":{"email":"...","password":"..."},"b":{"email":"...","password":"..."}}`. Akun harus khusus pengujian. Script menambah data berawalan Uji dan menghapus data yang dibuatnya sendiri pada akhir uji; jangan memakai akun berisi data penting.
9. Jalankan `npm run test:integration`. Baca hasil di `docs/evidence/integration-results.json`. Pengujian ini memakai publishable key dan sesi tiap akun sehingga RLS tetap aktif.

Status aktual: migrasi dan 18 kasus integrasi database telah lulus pada hosted. Pengguna mengonfirmasi satu registrasi/verifikasi email nyata berhasil sampai Dashboard. Uji token signup/recovery tidak membuktikan pengiriman email. Pengiriman email pemulihan, SMTP khusus, penerima umum, dan deployment publik belum terverifikasi. Jangan commit `.env.local` atau `.test-accounts.json`.

## Login Google

Dilakukan sendiri oleh pemilik proyek. Jangan menempel Client Secret ke chat atau ke git.

1. Buka Google Cloud Console, buat proyek baru (misalnya `floo`).
2. APIs & Services > OAuth consent screen: pilih External, isi nama aplikasi dan email dukungan. Selama masih Testing, tambahkan email penguji pada Test users.
3. APIs & Services > Credentials > Create credentials > OAuth client ID, tipe Web application. Pada Authorized redirect URIs isi `https://<project-ref>.supabase.co/auth/v1/callback` (project ref ada di `.env.local` pada `NEXT_PUBLIC_SUPABASE_URL`).
4. Di Supabase Dashboard buka Authentication > Sign In / Providers, gulir ke daftar Auth Providers, klik baris Google. Nyalakan Enable Sign in with Google, tempel Client ID ke kolom Client IDs dan Client secret ke Client Secret (for OAuth), lalu Save. Callback URL yang harus ada di Google Cloud tertera di panel yang sama.
5. Pastikan `http://localhost:3000/auth/confirm` ada di Authentication > URL Configuration > Redirect URLs (sudah dari langkah awal).
6. Setelah semua ini, tombol "Masuk dengan Google" di halaman masuk dan daftar akan bekerja. Pengguna Google baru memakai zona waktu Asia/Makassar; atur status Udayana di Pengaturan.
