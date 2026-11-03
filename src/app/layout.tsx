import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "FLOO | Ruang produktivitas mahasiswa",
  description:
    "Kelola mata kuliah, tugas, dan deadline dalam satu ruang pribadi.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
