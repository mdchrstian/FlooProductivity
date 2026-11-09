import Image from "next/image";
import Link from "next/link";
import GoogleButton from "@/components/google-button";
import Icon, { type IconName } from "@/components/icon";

const features: {
  icon: IconName;
  title: string;
  text: string;
  image: string;
  alt: string;
}[] = [
  {
    icon: "academic",
    title: "Mata kuliah, tugas, dan jadwal kelas",
    text: "Catat SKS, dosen, dan jadwal mingguan tiap mata kuliah. Tugasnya berpindah di papan Kanban dari rencana sampai selesai.",
    image: "/landing/mata-kuliah.jpg",
    alt: "Halaman Mata kuliah FLOO dengan papan Kanban tugas",
  },
  {
    icon: "calendar",
    title: "Semua deadline dalam satu kalender",
    text: "Dashboard menampilkan agenda minggu ini dan progres tugasmu. Tugas kecil sehari-hari masuk ke tab Harian.",
    image: "/landing/kalender.jpg",
    alt: "Kalender FLOO dengan deadline tugas dan Event",
  },
  {
    icon: "committee",
    title: "Kepanitiaan tanpa grup chat berantakan",
    text: "Buat Event, isi checklist dari template, dan kerjakan tugas panitia berdampingan dengan tugas kuliah.",
    image: "/landing/kepanitiaan.jpg",
    alt: "Halaman Kepanitiaan FLOO dengan checklist Event",
  },
  {
    icon: "focus",
    title: "Fokus, catatan, dan pencarian cepat",
    text: "Pomodoro dengan riwayat, catatan per mata kuliah, dan pencarian cepat dengan Cmd/Ctrl+K.",
    image: "/landing/fokus.jpg",
    alt: "Halaman Fokus FLOO dengan timer Pomodoro",
  },
];

const steps = [
  "Masuk dengan akun Google-mu.",
  "Atur profil, termasuk semester bila kamu mahasiswa Informatika Udayana.",
  "Tambahkan mata kuliah pertama dan mulai catat tugasnya.",
];

const faq = [
  ["Apakah FLOO gratis?", "Ya, FLOO gratis dipakai."],
  [
    "Apa yang belum ada?",
    "Sinkronisasi Google Calendar, integrasi Gmail, notifikasi, dan aplikasi mobile belum tersedia. FLOO berjalan di browser, termasuk di layar ponsel.",
  ],
  [
    "Siapa yang bisa melihat data saya?",
    "Data disimpan di akunmu dan hanya bisa dibuka lewat akun itu.",
  ],
  [
    "Bisa daftar tanpa Google?",
    "Bisa, dengan email dan password. Masuk dengan Google paling cepat dan tidak butuh email verifikasi.",
  ],
];

export default function Landing() {
  return (
    <div className="landing">
      <a className="skip" href="#isi">
        Lewati ke konten
      </a>
      <header className="landing-bar">
        <Link href="/" className="wordmark">
          floo<span>.</span>
        </Link>
        <Link href="/login" className="landing-login">
          Masuk
        </Link>
      </header>
      <main id="isi">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <h1>Ruang untuk langkah berikutnya.</h1>
            <p>
              Tata mata kuliah dan tugasmu. Lihat deadline dalam satu kalender,
              lalu kerjakan satu per satu.
            </p>
            <div className="landing-cta">
              <GoogleButton className="primary" />
              <Link href="/register" className="secondary button">
                Daftar dengan email
              </Link>
            </div>
            <p className="landing-small">
              Gratis. Sudah punya akun? <Link href="/login">Masuk</Link>
            </p>
          </div>
          <Image
            className="landing-shot"
            src="/landing/dashboard.jpg"
            alt="Dashboard FLOO dengan agenda minggu ini dan progres tugas"
            width={800}
            height={502}
            priority
            sizes="(min-width: 960px) 56vw, 100vw"
          />
        </section>

        <section className="landing-section" aria-labelledby="fitur">
          <h2 id="fitur">Yang bisa kamu kerjakan di FLOO</h2>
          <div className="landing-features">
            {features.map((f) => (
              <article key={f.title}>
                <div>
                  <Icon name={f.icon} className="landing-icon" />
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
                <Image
                  className="landing-shot"
                  src={f.image}
                  alt={f.alt}
                  width={800}
                  height={502}
                  sizes="(min-width: 960px) 50vw, 100vw"
                />
              </article>
            ))}
          </div>
        </section>

        <section
          className="landing-section landing-udayana"
          aria-labelledby="udayana"
        >
          <h2 id="udayana">Untuk mahasiswa Informatika Universitas Udayana</h2>
          <p>
            Aktifkan opsi Udayana dan FLOO mengisi mata kuliah semester 1 sampai
            4 lengkap dengan SKS. Di Kepanitiaan tersedia 34 template Sie HIMA,
            jadi checklist panitia tidak perlu dimulai dari nol.
          </p>
        </section>

        <section className="landing-section" aria-labelledby="mulai">
          <h2 id="mulai">Cara mulai</h2>
          <ol className="landing-steps">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>

        <section className="landing-section" aria-labelledby="faq">
          <h2 id="faq">Pertanyaan umum</h2>
          <div className="landing-faq">
            {faq.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-final">
          <h2>Mulai dari satu langkah.</h2>
          <GoogleButton className="primary" />
        </section>
      </main>
      <footer className="landing-footer">
        <span className="wordmark">
          floo<span>.</span>
        </span>
        <nav>
          <Link href="/login">Masuk</Link>
          <Link href="/register">Daftar</Link>
        </nav>
        <small>© 2026 FLOO</small>
      </footer>
    </div>
  );
}
