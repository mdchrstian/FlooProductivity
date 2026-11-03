"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="setup">
      <h1>FLOO belum dapat dimuat</h1>
      <p>Periksa koneksi dan pastikan Supabase lokal berjalan.</p>
      <button onClick={reset}>Coba lagi</button>
    </main>
  );
}
