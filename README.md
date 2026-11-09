# floo.

**Ruang produktivitas untuk mahasiswa.** FLOO menyatukan mata kuliah, tugas, jadwal kelas, kepanitiaan, dan catatan dalam satu tempat, supaya kamu tahu apa yang harus dikerjakan hari ini dan bisa menyelesaikannya satu per satu.

🔗 **Coba sekarang:** [floo-productivity.vercel.app](https://floo-productivity.vercel.app)

## Kenapa FLOO

Tugas kuliah ada di satu tempat, deadline kepanitiaan di grup chat, jadwal kelas di foto KRS, dan to-do kecil di kepala. FLOO mengumpulkan semuanya dalam satu ruang pribadi dengan satu kalender, jadi tidak ada deadline yang terlewat.

## Fitur

| | |
|---|---|
| **Dashboard** | Ringkasan tugas hari ini, yang terlambat, dan yang akan datang, agenda pekanan, serta progres yang benar-benar tersimpan. |
| **Mata kuliah** | Simpan SKS dan dosen, kelola tugas di papan Kanban (belum, sedang, selesai), dan atur jadwal kelas mingguan. |
| **Harian** | Tugas kecil yang tidak perlu masuk ke mata kuliah atau kepanitiaan, dengan tanggal opsional. |
| **Kepanitiaan** | Event dengan peran, deadline, checklist, dan tugas sendiri. Tersedia template checklist siap pakai. |
| **Kalender** | Semua deadline mata kuliah dan kepanitiaan dalam satu tampilan bulanan. |
| **Catatan** | Catatan bebas atau terhubung ke satu mata kuliah. |
| **Pomodoro** | Timer fokus dengan riwayat sesi per mata kuliah. |
| **Pencarian** | Tekan Cmd/Ctrl+K untuk mencari tugas, mata kuliah, dan Event. |

### Khusus mahasiswa Informatika Universitas Udayana

Aktifkan status mahasiswa Informatika Udayana saat daftar atau di Pengaturan, lalu jawab satu pertanyaan verifikasi. Setelah itu:

- Mata kuliah semester 1–4 beserta SKS-nya bisa ditambahkan sekali klik.
- Template jobdesc tiap Sie untuk kepanitiaan HIMA: INVENTION, WEBNAS, Informatika Mengajar, dan SUPREMASI XIX (34 Sie).

## Teknologi

- [Next.js](https://nextjs.org) 16 (App Router) dan React 19, TypeScript
- [Supabase](https://supabase.com): Postgres dengan Row Level Security, autentikasi email dan Google
- Zod untuk validasi, Luxon untuk zona waktu
- Di-hosting di [Vercel](https://vercel.com)

Setiap data terikat ke pemiliknya lewat RLS di database, jadi satu akun tidak bisa membaca atau mengubah data akun lain.

## Menjalankan di komputer sendiri

Butuh Node.js 20.9 atau lebih baru dan sebuah project Supabase.

```bash
git clone https://github.com/mdchrstian/FlooProductivity.git
cd FlooProductivity
npm ci
cp .env.example .env.local   # isi URL dan publishable key Supabase-mu
npm run dev
```

Buka http://localhost:3000. Untuk project Supabase baru, jalankan semua file di `supabase/migrations/` secara berurutan lewat SQL Editor, lalu ikuti [panduan setup Supabase](docs/SETUP_SUPABASE_HOSTED.md) untuk URL redirect dan login Google.

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan di port 3000 |
| `npm run build` / `npm start` | Build dan jalankan versi produksi |
| `npm run typecheck` | Pemeriksaan TypeScript |
| `npm test` | Unit test |
| `npm run test:integration` | Uji database dan RLS dengan dua akun uji (lihat `scripts/test-integration.ts`) |

## Struktur

```
src/app          halaman, landing page, callback auth, dan API
src/components   workspace, form autentikasi, landing page, ikon
src/lib          validasi, tipe, waktu, data kurikulum dan template
supabase         migrasi database (tabel, RLS, fungsi) dan template email
tests            unit test
scripts          uji integrasi dan setup lokal
```

## Status

FLOO adalah proyek capstone dan masih terus dikembangkan. Sinkronisasi Google Calendar dan notifikasi belum tersedia.
