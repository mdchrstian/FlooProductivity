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

## P1 Catatan (9 November 2026)

Dijalankan: `tsc --noEmit`, `next build --webpack`, `npm test` (10 lulus), migrasi `202611090001_notes.sql` pada proyek hosted, dan `npm run test:integration` (19 kasus lulus, termasuk INT-N1: isolasi dua akun, penolakan Course/user_id akun lain, Course dihapus melepas catatan menjadi `course_id = null`).

Uji browser manual (akun A, lebar panel sempit ±700 px, hosted): keadaan kosong, validasi isi kosong, buat catatan bebas dan terkait Course, urutan terbaru dahulu, filter Semua/Tanpa mata kuliah, tautan `?course=` dengan keadaan filter kosong, data bertahan setelah muat ulang, edit, hapus dengan konfirmasi, hitungan "Catatan (n)" pada halaman Course.

Uji browser lanjutan (akun A, hosted): lebar 375 px (satu kolom, tanpa overflow horizontal, dialog 17–358 px, isi panjang terpotong) dan 1440 px (tiga kolom, menu Catatan aktif). Data uji dihapus setelah pengecekan.

Belum dijalankan: uji browser akun B (isolasi hanya dibuktikan pada level database oleh INT-N1), hapus Course berisi catatan lewat UI. `scripts/check-ui.mjs` menguji bundel prototipe lama `dist/app.js`, bukan aplikasi Next.js, sehingga tidak relevan untuk Catatan dan tidak dijalankan.

## P1 Pomodoro (10 November 2026)

Dijalankan: `tsc --noEmit`, `next build --webpack`, `npm test` (11 lulus), migrasi `202611100001_pomodoro.sql` pada proyek hosted, dan `npm run test:integration` (20 kasus lulus, termasuk INT-P1: isolasi dua akun, batas durasi 1–180, penolakan Course/user_id akun lain, sesi tidak dapat diubah, Course dihapus melepas sesi menjadi `course_id = null`).

Uji browser (akun A, hosted): timer menghitung mundur dan tombol Hentikan muncul; saat waktu habis sesi tersimpan otomatis dan tampil di riwayat dengan total "Hari ini"; data bertahan setelah muat ulang; lebar 375 px tanpa overflow horizontal; hapus sesi lewat UI. Selesainya timer disimulasikan dengan memajukan `Date.now()` di halaman, bukan menunggu 25 menit nyata.

Belum dijalankan: uji browser akun B, lebar desktop lebar, hentikan timer lalu pastikan tidak tercatat, timer saat tab latar belakang, hapus Course berisi sesi lewat UI. Tidak ada pengaturan `pomodoro_enabled`. Timer berhenti saat pindah halaman.

## P1 Jadwal kelas (11 November 2026)

Dijalankan: `tsc --noEmit`, `next build --webpack`, `npm test` (12 lulus), migrasi `202611110001_schedule.sql` pada proyek hosted, dan `npm run test:integration` (21 kasus lulus, termasuk INT-S1: isolasi dua akun, batas hari 1–7, jam selesai setelah jam mulai, penolakan Course/user_id akun lain, Course dihapus ikut menghapus slot).

Uji browser (akun A, hosted): bagian "Jadwal kuliah" pada halaman Mata kuliah dengan keadaan kosong; tambah slot; validasi jam selesai sebelum jam mulai ditolak dengan pesan; slot Selasa 10.00–11.40 tersimpan dan muncul pada agenda Kalender 10 November 2026 (hari Selasa) serta tidak muncul pada hari Senin dan Rabu; dialog edit memuat nilai tersimpan; ubah hari ke Kamis tersimpan; hapus dengan konfirmasi; lebar 375 px tanpa overflow dan dialog muat (17–358 px). Data uji dihapus setelah pengecekan.

Belum dijalankan: uji browser akun B, lebar desktop lebar, tampilan agenda dengan beberapa slot dan tugas sekaligus, hapus Course berisi slot lewat UI (hanya lewat uji integrasi), tampilan Kalender saat Modul Akademik disembunyikan. Tidak ada pemeriksaan slot yang tumpang tindih.

## P1 Kepanitiaan (12 November 2026)

Dijalankan: `tsc --noEmit`, `next build --webpack`, `npm test` (14 lulus), migrasi `202611120001_committee.sql` pada proyek hosted, dan `npm run test:integration` (22 kasus lulus). INT-E1 mencakup isolasi dua akun untuk Event dan checklist, Task wajib tepat satu Course atau Event (keduanya atau tidak satu pun ditolak), penolakan Event milik akun lain, Event dengan Task tidak dapat dihapus (23503), checklist ikut terhapus bersama Event, `create_event` atomik dengan batas 20 item dan ditolak tanpa autentikasi, serta toggle modul lewat `update_preferences`. INT-15 disesuaikan karena fungsi `update_preferences` kini menerima argumen `p_committee`; seluruh INT-01…INT-18 dan N1/P1/S1 tetap lulus setelah kebijakan `own_tasks` diganti.

Uji browser (akun A, hosted): Event tanpa template (0 item) dan dengan template Seminar (5 item berurutan); centang checklist dan tambah item (posisi setelah item template) bertahan di database; Task Event tersimpan dengan `course_id` kosong dan `event_id` terisi, kartu berlabel "Panitia ·", status berpindah di Kanban dan tersimpan; Dashboard dan Kalender menampilkan Task serta deadline Event dengan warna dan label sumber; hapus Event yang masih punya Task ditolak dengan pesan; toggle Modul Kepanitiaan mati menyembunyikan menu, Dashboard, Kalender, dan halaman Kepanitiaan tanpa menghapus data, lalu menyala kembali dengan 3 Event, 11 item checklist, dan 1 Task utuh; Task Course tetap berjumlah 5 aktif; lebar 375 px tanpa overflow. Data uji (berawalan "Uji") dihapus; Event "INVENTION" milik pengguna tidak disentuh.

Belum dijalankan: uji browser akun B, lebar desktop lebar, hapus Event tanpa Task lewat UI (hanya lewat uji integrasi dan pembersihan), mengubah Task antara Course dan Event lewat editor, pencarian Event (Cmd+K), Modul Akademik mati saat Kepanitiaan menyala, edit/hapus item checklist selain hapus lewat uji, dan kasus pembuatan Event dengan template yang gagal sebagian (dijamin satu transaksi oleh `create_event`, hanya diuji lewat integrasi). Tidak ada penghubung catatan ke Event.

## Udayana sign-up, kurikulum, template kepanitiaan, login Google

Status: migration `202611130001_udayana.sql` sudah diterapkan ke hosted (SQL Editor). Uji integrasi 22/22 lulus, termasuk blok Udayana (simpan, tolak semester 20, semester dikosongkan saat bukan mahasiswa). Uji browser (akun Uji A, data uji dibersihkan setelahnya) lulus: form daftar (toggle memunculkan semester), Pengaturan (semester wajib; simpan Udayana semester 2), tombol "Tambah mata kuliah semester 2" (9 ditambahkan, klik kedua 0), pemilih kurikulum mengisi nama dan SKS, grup template di editor Event (10/7/7/10 Sie), Event "Uji WEBNAS" dari template mendapat peran "Sie Acara" dan 6 item checklist.

- Lulus: `tsc --noEmit`, `npm test` (17 unit test: SKS per semester 21/21/21/20, 34 template Sie muat batas 20 item dan 200 karakter, aturan semester pada skema), `next build --webpack`.
- Belum diuji: trigger sign-up dengan metadata Udayana (butuh daftar akun nyata) dan akun B di UI.
- Catatan: pengecekan duplikat memakai nama persis, jadi mata kuliah buatan sendiri dengan ejaan beda (mis. "Interaksi Manusia & Komputer") tidak dianggap sudah ada.
- Google: pemilik mengisi Google Cloud dan provider Supabase, lalu melaporkan login Google berhasil (dicoba sendiri oleh pemilik, tidak diamati oleh Claude). Belum dicek: nama dari akun Google terisi benar di profil, dan pengguna Google baru mendapat Pengaturan bawaan (bukan mahasiswa Udayana).
- Batas: kurikulum hanya semester 1-4 (data yang diberikan); semester lebih tinggi hanya menyimpan status. Template kepanitiaan tidak diblokir server untuk non-mahasiswa Udayana (hanya disembunyikan di UI).

### Pertanyaan verifikasi dan logo Event
- Opsi Udayana (daftar dan Pengaturan) meminta jawaban "HIMAIF" (tanpa beda huruf besar/kecil dan spasi). Lulus di browser: jawaban salah ditolak dan tidak tersimpan, jawaban benar tersimpan; akun dikembalikan ke semula.
- Batas: ini pagar ringan di sisi klien. Siapa pun yang memanggil API langsung bisa melewatinya. Form daftar belum diuji end-to-end (butuh sign-up nyata).
- Logo (`public/committee/*.jpg`) tampil di kartu Event bila nama Event memuat invention, webnas, mengajar, atau supremasi. Hanya INVENTION yang terlihat di akun uji; tiga logo lain belum dilihat di layar. Penetapan gambar 2 ke Informatika Mengajar dan gambar 3 ke WEBNAS adalah tebakan dari isi gambar.

## Harian (tugas ringan tanpa mata kuliah/Event)
- Migration `202611140001_daily.sql` diterapkan ke hosted. Tabel `daily_tasks` (user_id, judul, tanggal opsional, selesai), RLS pemilik saja.
- Lulus di browser (akun Uji A, data "Uji" dihapus): tambah dengan dan tanpa tanggal, label "Hari ini" dan "Terlambat", centang memindahkan ke "N selesai" dan tersimpan, hapus, tampilan desktop dan sempit.
- Lulus: `tsc`, 18 unit test (skema harian).
- Belum diuji: isolasi akun B untuk `daily_tasks` (tidak ada di `test-integration.ts`), edit judul (hanya tambah, centang, hapus). Tugas harian belum tampil di Dashboard, Kalender, atau pencarian.

## Landing page (`/`)
- `/` untuk pengunjung yang belum masuk menampilkan landing (hero, 4 fitur, blok Informatika Udayana, cara mulai, FAQ, footer); pengguna yang sudah masuk diarahkan ke `/dashboard`. `/login` dan `/register` tidak berubah. Pemanggilan `signInWithOAuth` dipindah ke `signInWithGoogle()` (`src/lib/supabase/browser.ts`) dan dipakai form login serta tombol landing.
- Lulus: `tsc --noEmit`, `npm test` (18), prettier, `next build --webpack`. Browser (build produksi, belum masuk): lebar 1280 dan 390 px tanpa overflow horizontal, gambar termuat, tombol aktif setelah hydration. Tombol "Masuk dengan Google" diklik sekali dan berujung dengan sesi masuk (akun Google pemilik, tidak dibaca lebih jauh).
- Gambar `public/landing/*.jpg` ditangkap dari akun Uji A (800 px lebar, resolusi terbatas pane). Data berawalan "Uji" (7 tugas, 1 Event, 1 tugas Event) sudah dihapus; jumlah tugas akun kembali 6 aktif, 2 dari 8 selesai. Chip Event INVENTION/SUPREMASI disembunyikan dari tangkapan Kalender dan Kepanitiaan memakai Event "Uji" yang sudah dihapus.
- Belum diuji: fokus keyboard dan `prefers-reduced-motion` secara visual (hanya lewat CSS), tampilan 768 px, layar <390 px, tema gelap (tidak ada).
- Catatan: tangkapan masih menampilkan teks "Uji ..." pada tugas dan nama "Akun"; ganti dengan data yang lebih netral bila ingin lebih rapi. Server dev lokal harus dijalankan dengan `NEXT_PUBLIC_APP_URL=http://localhost:3000` agar simpan data tidak ditolak (`.env.local` menunjuk ke domain Vercel).
