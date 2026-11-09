// Starter checklists chosen by key, so the client can never send its own item list.
export const eventTemplates = {
  seminar: {
    label: "Seminar",
    items: [
      "Tentukan tema dan narasumber",
      "Pesan tempat dan perlengkapan",
      "Buat poster dan publikasi",
      "Buka pendaftaran peserta",
      "Siapkan rundown acara",
    ],
  },
  lomba: {
    label: "Lomba",
    items: [
      "Susun peraturan dan kriteria penilaian",
      "Rekrut juri",
      "Buka pendaftaran peserta",
      "Siapkan hadiah dan sertifikat",
      "Atur jadwal pertandingan",
    ],
  },
  baksos: {
    label: "Bakti sosial",
    items: [
      "Tentukan lokasi dan sasaran",
      "Kumpulkan donasi atau dana",
      "Siapkan transportasi",
      "Bagi tugas relawan",
      "Buat laporan kegiatan",
    ],
  },
} as const;
export type TemplateKey = keyof typeof eventTemplates;
export const templateKeys = Object.keys(eventTemplates) as [
  TemplateKey,
  ...TemplateKey[],
];
