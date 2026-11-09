// Informatika Udayana data: curriculum (semester 1-4) and HIMA committee Sie templates.
const c = (semester: number, credits: number, names: string[]) =>
  names.map((name) => ({ semester, name, credits }));
export const curriculum = [
  ...c(1, 2, [
    "Etika Profesi",
    "Kewarganegaraan",
    "Bahasa Indonesia",
    "Ilmu Sosial Dasar",
    "Matematika Diskrit I",
    "Statistika Dasar",
  ]),
  ...c(1, 3, [
    "Matematika Informatika",
    "Algoritma & Pemrograman",
    "Sistem Digital",
  ]),
  ...c(2, 2, [
    "Pancasila",
    "Pendidikan Agama",
    "Matematika Diskrit II",
    "Pengantar Probabilitas",
    "Kewirausahaan",
    "Tata Tulis Karya Ilmiah",
  ]),
  ...c(2, 3, [
    "Struktur Data",
    "Sistem Operasi",
    "Organisasi dan Arsitektur Komputer",
  ]),
  ...c(3, 3, [
    "Interaksi Manusia dan Komputer",
    "Basis Data",
    "Desain dan Analisis Algoritma",
    "Rekayasa Perangkat Lunak",
    "Pemrograman Berorientasi Obyek",
    "Komunikasi Data dan Jaringan Komputer",
    "Teori Bahasa dan Otomata",
  ]),
  ...c(4, 2, ["Metode Penelitian"]),
  ...c(4, 3, [
    "Analisis dan Desain Sistem",
    "Pengantar Kecerdasan Buatan",
    "Sistem Informasi",
    "Pengantar Pemrosesan Data Multimedia",
    "Keamanan Jaringan",
    "Pemrograman Berbasis Web",
  ]),
];
export const curriculumSemesters = [1, 2, 3, 4];
type Sie = [label: string, items: string[], note?: string];
const budget = ["Membuat RAB sie", "Membuat timeline sie"];
const committees: { id: string; group: string; sies: Sie[] }[] = [
  {
    id: "invention",
    group: "INVENTION 2026",
    sies: [
      [
        "Acara",
        [
          "Membuat dan merevisi konsep acara (Pelatihan, TM, Puncak), rundown, dan rundown teknis gladi dan acara",
          "Membuat dan merevisi TOR pembicara pelatihan",
          "Koordinasi tapping video tari Kumuda Sari, hiburan, serta video dekan dan kaprodi bersama WEBNAS, inti, dan sie lain; gladi tapping",
          "Mencari perangkat acara: sepasang MC puncak, tiga moderator pelatihan, MC TM, MC pelatihan, pembaca doa, dirigen",
          "Membuat teks doa, teks MC, dan teks moderator pelatihan; latihan berkala bersama MC dan moderator",
          "Berkoordinasi dengan Bidlom dan inti untuk juri sekaligus pembicara pelatihan",
          "Mendata sponsor dan media partner untuk teks MC (dengan Sponsorship dan Prodis)",
          "Mengoordinasikan PPT hari H ke sie 3D dan keperluan hari H ke sie lain, terutama SPTK",
          "Survei tempat bersama SPTK; koordinasi makeup, hairdo, dan pakaian MC puncak dengan Sponsorship",
          "Membuat tata tertib panitia dan peserta lomba, serta menambah list live report untuk Humas",
          "Follow-up seluruh sie untuk gladi dan hari H; mengarahkan gladi sesuai RDT",
          "Membuat kertas waktu, memimpin briefing hari H, mengawasi jalannya acara",
          "Membuat formulir feedback peserta dan pembicara pelatihan",
        ],
      ],
      [
        "Bidang Lomba (Bidlom)",
        [
          "Mencari referensi dan menentukan jumlah serta jenis cabang lomba bersama inti",
          "Membuat guide book (peraturan dan konsep), timetable, isi proposal lomba, tema dan subtema tiap cabang",
          "Membuat kontrak pembicara dan juri; mencari dan menghubungi juri; koordinasi penuh dengan juri",
          "Membuat formulir penilaian dan rekap penyisihan; mengirim berkas penyisihan ke juri",
          "Menjawab pertanyaan peserta, membuat FAQ, berkoordinasi dengan Humas",
          "Menjadi moderator TM; membuat grup juri, peserta, dan finalis",
          "Mengumumkan finalis, memastikan finalis masuk grup, mengumpulkan mockup finalis",
          "Membuat spreadsheet penilaian final; merekap nilai penyisihan sampai final dan menentukan juara saat hari H",
          "Menghandle juri hari H dan menjadi moderator presentasi final",
          "Merekap alamat pemenang (dengan SPTK)",
          "Berkoordinasi dengan tim web dan sie 3D; ikut take video tutorial pendaftaran dan upload karya bersama Humas",
        ],
      ],
      [
        "Dekorasi, Dokumentasi, dan Desain (3D)",
        [
          "Membuat PP grup (sie, SC, inti, peserta, finalis, juri)",
          "Menyiapkan dan melaksanakan semua tapping video; dokumentasi kegiatan; video sponsor jika perlu",
          "Mendesain stiker piala, invoice sponsor, open recruitment panitia, pamflet dan semua media publikasi, baju panitia",
          "Me-redesign maskot dan memilih nama maskot",
          "Mendesain sertifikat, cover juknis lomba, cover dan header-footer proposal sponsorship dan lomba",
          "Koordinasi publikasi dengan Humas; membuat feed IG, live report, story IG",
          "Membuat video Coming Soon dan After Event; menjadi operator hari H",
        ],
      ],
      [
        "Hubungan Masyarakat (Humas)",
        [
          "Mengirim email surat permohonan partisipan ke SMA/SMK dan universitas; mengirim email ke peserta",
          "Memposting dan mengelola admin Instagram INVENTION; membuat timeline postingan dan caption",
          "Follow-up undangan dan dosen; meng-update informasi di website",
          "Membuat video tutorial pendaftaran dan penggunaan Zoom; membuat form open question batch 1 dan 2",
          "Konfirmasi masuk grup peserta (setelah cek ke bendahara); memberi link Zoom hari H",
          "Meng-acc finalis dan juri serta merekap kedatangan; membagikan link presensi dan caption",
          "Menjaga ketertiban Zoom; merekap like lomba poster; membantu Prodis mengirim proposal via email",
        ],
      ],
      [
        "Kesekretariatan",
        [
          "Menyampaikan surat yang diminta sie lain (peminjaman gedung dan alat, pemberitahuan, izin, undangan)",
          "Notulensi rapat inko dan rapat sie",
          "Membuat surat permohonan partisipan, lembar pengesahan, surat pengantar dan proposal sponsorship, media partner, invitation",
          "Membantu sekretaris membuat sampai mencetak proposal kegiatan",
          "Membuat surat pemberitahuan dan undangan rapat umum dan rapat teknis, surat untuk juri dan dosen pembimbing",
          "Mendata nomor surat keluar untuk LPJ; membuat KOP undangan; mencetak amplop; mem-PDF undangan online",
          "Menyiapkan absen registrasi peserta, panitia, juri, dan undangan",
        ],
      ],
      [
        "Konsumsi, Kerohanian, dan Kesehatan (3K)",
        [
          "Menyiapkan konsumsi MUA saat tapping, konsumsi panitia dan undangan hari H, survei rumah makan",
          "Menyiapkan obat-obatan; mengoordinasikan surat kerja sama penanganan luka berat klinik ke kesekre",
          "Menyiapkan sarana persembahyangan; persembahyangan tiap rapat dan hari H; matur piuning; daftar tempat mebanten",
          "Berkoordinasi dengan SPTK untuk jemput makanan dan keperluan persembahyangan; membantu belanja saat gladi dan hari H",
        ],
      ],
      [
        "Penggalian Dana (Pengdan)",
        [
          "Jualan wajib, jastip, pre-order, paid promote, jasa kuesioner, google review",
          "Melapor ke bendahara soal dana masuk dan keluar; menjaga ketertiban dan kebersihan tempat hari H",
        ],
      ],
      [
        "Sponsorship",
        [
          "Mendata donatur dan sumber dana; membuat strategi mendapatkan sponsor",
          "Mengirim dan mengonfirmasi proposal; follow-up dan mendata sponsor; koordinasi feedback dengan perusahaan",
          "Mencari sponsor dan menghandle pengadaan baju INVENTION",
        ],
        "rab-only",
      ],
      [
        "Propaganda dan Distribusi (Prodis)",
        [
          "Membuat daftar kontak panitia; sosialisasi dan promosi ke angkatan (menekankan SKP) dan komunitas",
          "Follow-up sekolah peserta tahun lalu, peserta lolos final, proposal lomba, media partner",
          "Membuat rekapan sekolah, universitas, HIMA, BEM, GDSC; mengirim undangan ketua OSIS",
          "Membuat konsep alur penyebaran dan strategi menarik peserta; membantu live streaming YouTube hari H",
        ],
      ],
      [
        "Sarana, Prasarana, Transportasi, dan Keamanan (SPTK)",
        [
          "Membawa keperluan tapping; survei tempat membeli piala; membungkus dan mengirim piala ke ekspedisi",
          "Menyiapkan ruangan atau link Zoom tiap rangkaian; daftar kebutuhan perlengkapan semua sie",
          "Menyiapkan keperluan hari H, mengangkut barang; cek ruangan sebelum gladi; survei tempat bersama Acara",
        ],
      ],
    ],
  },
  {
    id: "webnas",
    group: "WEBNAS 2026",
    sies: [
      [
        "Acara",
        [
          "Membuat RD dan RDT, tema, konsep acara, denah atau layout hari H, TOR pembicara",
          "Mencari dan berkoordinasi dengan pembicara; mencari MC, moderator, dirigen, pembaca doa, pengisi acara; mencari games",
          "Membuat teks MC, moderator, dan doa; latihan MC dan moderator; tata tertib peserta",
          "Mengoordinir dan briefing seluruh panitia hari H; mengirim plakat dan sertifikat pembicara",
        ],
      ],
      [
        "Desain, Dekorasi, dan Dokumentasi",
        [
          "Menentukan pakem design dan postingan; video coming soon, grand opening, after event, bumper",
          "Desain perkenalan panitia di IG, PPT, sertifikat, virtual background puncak, backdrop, baju panitia, desain operator",
          "Mendokumentasikan seluruh kegiatan; menyiarkan acara lewat room (operator); tapping dan editing pengisi acara",
          "Desain kebutuhan sie lain (bahan acara, cover dan header-footer proposal, pamflet Pengdan)",
        ],
      ],
      [
        "Hubungan Masyarakat",
        [
          "Mengurus pengiriman surat; mengirim proposal kegiatan; menjalin kerja sama media partner",
          "Menyusun redaksi konten dan pengumuman; mengelola live report saat sosialisasi dan hari H",
          "Mengawasi peserta, absensi peserta dan undangan, follow-up peserta",
          "Berkoordinasi dengan Desain dan Ticketing soal postingan",
        ],
      ],
      [
        "Konsumsi dan Rohani",
        [
          "Menentukan tempat konsumsi hari H dan menyediakan konsumsi panitia",
          "Persembahyangan tiap kegiatan offline; menentukan tanggal dan menyiapkan keperluan matur piuning; keperluan konsumsi dan rohani untuk tapping",
        ],
      ],
      [
        "Penggalian Dana",
        [
          "Melaksanakan penggalangan dana; menyusun daftar sponsor dan sumber dana",
          "Mengirim proposal, konfirmasi, dan follow-up sponsor; koordinasi feedback dan kesepakatan",
          "Melapor berkala ke bendahara; berkoordinasi dengan tim penggalangan dana acara lain; pengadaan baju panitia",
        ],
      ],
      [
        "Ticketing",
        [
          "Strategi penyebaran tiket, sosialisasi, konten promosi tiket",
          "Formulir pendaftaran, alur pendaftaran, perhitungan dan rekapitulasi tiket, form absensi peserta",
          "Koordinasi caption dan postingan dengan Humas",
        ],
      ],
      [
        "Keamanan, Perlengkapan, dan Transportasi",
        [
          "Menyiapkan ruangan dan perlengkapan kegiatan offline; mendata kebutuhan semua sie; merancang dan membuat backdrop",
          "Koordinasi peminjaman gedung dengan sekretaris; transportasi loading barang; persiapan tapping; survei harga Zoom untuk gladi dan puncak",
        ],
      ],
    ],
  },
  {
    id: "mengajar",
    group: "Informatika Mengajar 2026",
    sies: [
      [
        "Acara",
        [
          "Menyiapkan tema dan alur; rundown dan rundown teknis; mencari MC, pembaca doa, dirigen; teks doa dan MC",
          "Denah acara; games ice breaking; koordinasi keperluan hari H (terutama Kampertrans); mengawasi jalannya kegiatan",
        ],
      ],
      [
        "Mentor",
        [
          "Mengatur pembentukan kelompok siswa; menyiapkan dan menyampaikan materi",
          "Mempelajari media pembelajaran; menyiapkan dan menilai penugasan (termasuk install aplikasi); menyiapkan laptop untuk praktik",
          "Menjadi mentor satu kelompok; koordinasi dengan Acara soal konsep penyampaian materi",
        ],
      ],
      [
        "Kontribusi, Konsumsi, Kerohanian, dan Kesehatan (K4)",
        [
          "Follow-up desain kontribusi ke 3D; menghubungi konveksi dan memberi MOU; menentukan harga bersama inti",
          "Mendata pembelian, pembayaran, pembagian; bertanggung jawab pemesanan, produksi, dan distribusi baju panitia",
          "Menentukan tempat konsumsi; menyiapkan dan membagikan konsumsi panitia dan undangan",
          "Persembahyangan rapat dan kegiatan; keperluan matur piuning; obat-obatan",
        ],
      ],
      [
        "3D",
        [
          "Desain coming soon, pamflet, baju, PPT mengajar, sertifikat, banner; kebutuhan akun Instagram (logo, desain)",
          "Dokumentasi, live report bersama Humas, operator, video after event",
        ],
      ],
      [
        "Kampertrans",
        [
          "Ruangan dan perlengkapan rapat all crew dan rapat teknis; survei tempat kegiatan",
          "Daftar dan penyiapan kebutuhan semua sie; transportasi loading; keperluan hari H; backup laptop",
          "Mengatur parkiran panitia; membersihkan ruangan setelah acara; koordinasi ruangan dengan Acara",
        ],
      ],
      [
        "Hubungan Masyarakat",
        [
          "Timeline postingan (dengan 3D); mengirim surat ke pihak terkait; follow-up tamu undangan",
          "Mengelola Instagram Informatika Mengajar; menyiapkan konten video",
        ],
      ],
      [
        "Kesekretariatan",
        [
          "Membantu sekretaris menyusun proposal, notulensi, dan LPJ; surat izin ke sekolah dan surat lain; daftar absensi rapat dan hari H",
        ],
      ],
    ],
  },
  {
    id: "supremasi",
    group: "SUPREMASI XIX 2026",
    sies: [
      [
        "Acara",
        [
          "Rundown, rundown teknis, konsep detail, dan denah untuk Hemo Volunteer, Funday, Puncak",
          "Merancang konsep games Funday dan menyiapkan hadiahnya",
          "Mencari, menentukan, dan mendampingi perangkat acara; teks doa dan MC (Funday dan Puncak)",
          "Bertanggung jawab atas jalannya seluruh rangkaian",
        ],
        "Wakil Ketua",
      ],
      [
        "Perlombaan",
        [
          "Konsep dan mekanisme lomba (misalnya UI/UX Design dan Web Design); menentukan jumlah dan jenis cabang",
          "Berkoordinasi dengan juri soal tema dan konsep; menyusun rules dan ketentuan teknis",
          "Mengatur alur pendaftaran sampai lomba selesai; formulir penilaian dan konsultasi dengan juri; rekap hasil",
          "Mengikuti dan menjawab pertanyaan di TM; membuat link pengumpulan karya dan spreadsheet penilaian final",
          "Merekap nilai finalis dan menentukan juara; berkoordinasi dengan Acara, SPTK, Humas, 3D; hadir di rangkaian lain",
        ],
        "Wakil Ketua",
      ],
      [
        "Pertandingan",
        [
          "Menyebarkan Google Form minat peserta; menyusun peraturan tiap cabang; bagan pertandingan; juknis",
          "Mengatur jalannya pertandingan saat Funday; mencari dan menjadi wasit bila perlu",
          "Menyewa tempat pertandingan; menyiapkan reward pemenang; rundown pertandingan dan TM (memimpin TM)",
          "Koordinasi kebutuhan perlengkapan dengan SPTK",
        ],
        "Wakil Ketua",
      ],
      [
        "SPTK",
        [
          "Daftar kebutuhan tiap sie dan daftar peminjaman barang untuk rapat dan hari H",
          "Bertanggung jawab atas barang selama acara; survei sewa gedung, dekorasi, dan vendor puncak; mengambil barang pesanan",
          "Menyiapkan sarana hari H; menjamin keamanan; koordinasi dengan Acara dan Ketua Panitia soal teknis dan logistik",
        ],
      ],
      [
        "3D",
        [
          "Seluruh kebutuhan grafis: logo, maskot, pamflet Instagram, header-footer surat, nametag, feeds, PP grup, sertifikat, twibbon, pamflet pre-order, banner, spanduk, frame live report, tema visual",
          "Desain merchandise; piagam pemenang; sertifikat dan nametag panitia; spesifikasi cetak",
          "Operator rapat; operator sound dan video hari H; bumper transisi; aset fisik di lokasi",
          "Dokumentasi rapat dan seluruh acara",
        ],
        "Acara dan Sekretaris",
      ],
      [
        "Humas",
        [
          "Mengirim surat undangan; mengelola media sosial resmi; caption dan redaksi ke grup angkatan",
          "Menyebarkan informasi berkala ke angkatan aktif Informatika; membantu Media Kreatif sebagai talent",
          "Membuat list dan melakukan live report (IG HIMA dan IG SUPREMASI XIX); menjadi jembatan distribusi persuratan",
        ],
        "seluruh sie dan Sekretaris",
      ],
      [
        "Sponsorship & Media Kreatif",
        [
          "Pendataan dan penyebaran sponsorship; strategi mendapatkan sponsor; diskusi proposal dengan inti",
          "Mengirim dan mengonfirmasi proposal; koordinasi feedback perusahaan",
          "Menyusun dan memproduksi konten publikasi kegiatan",
        ],
        "Sekretaris",
      ],
      [
        "Kontribusi",
        [
          "Voting desain baju SUPREMASI XIX; menyiapkan dan mengelola merchandise yang dijual",
          "Mendata angkatan aktif, angkatan atas, dan alumni pembeli atau penyumbang; mempromosikan kontribusi",
          "Memesan baju panitia, peserta, dosen; bertanggung jawab dari pemesanan, produksi, sampai distribusi",
        ],
        "Bendahara",
      ],
      [
        "K3",
        [
          "Matur piuning panitia; mebanten di tiap rangkaian; menghaturkan pejati saat Hemo Volunteer, Funday, Puncak",
          "Konsumsi Hemo Volunteer, Funday, Puncak; nasi tumpeng dan snack tamu undangan; survei konsumsi dan perlengkapan persembahyangan",
          "Sarana upacara dan persembahyangan; pembaca doa hari puncak; distribusi konsumsi hari H",
          "Mengobati pemain yang terluka; kesehatan panitia dan peserta; kebutuhan medis",
        ],
        "seluruh sie, terutama Bendahara",
      ],
      [
        "Pengdan",
        [
          "Jualan wajib offline sesuai target; menyusun SOP penggalian dana bersama Bendahara",
          "Sistem pre-order makanan sesuai kesepakatan inti; koordinasi dengan pihak McD untuk bazar dan rekap penjualan",
        ],
        "seluruh sie dan Bendahara",
      ],
    ],
  },
];
export type Template = {
  label: string;
  items: readonly string[];
  group?: string;
  role?: string;
};
export const committeeTemplates: Record<string, Template> = {};
for (const g of committees)
  for (const [label, items, note] of g.sies) {
    const sie = "Sie " + label;
    const extra = note === "rab-only" ? [budget[0]] : budget;
    const lead =
      note && note !== "rab-only" ? ["Koordinasi lewat jalur: " + note] : [];
    committeeTemplates[
      g.id +
        "-" +
        label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
    ] = {
      label: sie,
      group: g.group,
      role: sie,
      items: [...lead, ...items, ...extra],
    };
  }

export const verifyQuestion =
  "Apa nama himpunan mahasiswa Informatika Universitas Udayana?";
// shortcut: client-side soft gate, not real verification; upgrade to a campus email check if abuse appears.
export const isHimaif = (answer: string) =>
  answer.trim().toLowerCase() === "himaif";
// shortcut: logo is matched from the Event name, not stored; upgrade to a column if Events get renamed often.
const logos = ["invention", "webnas", "mengajar", "supremasi"];
export const committeeLogo = (name: string) => {
  const key = logos.find((l) => name.toLowerCase().includes(l));
  return key ? "/committee/" + key + ".jpg" : null;
};
