"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
import { registrationSchema } from "@/lib/validation";
import { isHimaif, verifyQuestion } from "@/lib/udayana";
export default function AuthForm({
  mode,
}: {
  mode: "login" | "register" | "forgot" | "reset";
}) {
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [student, setStudent] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "link")
      setError("Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru.");
  }, []);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const labels = {
    login: "Masuk ke ruangmu",
    register: "Buat akun FLOO",
    forgot: "Pulihkan password",
    reset: "Password baru",
  };
  async function google() {
    setError("");
    const { error } = await browserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/confirm" },
    });
    if (error) setError("Login Google belum dapat digunakan. Coba lagi nanti.");
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    const values = new FormData(e.currentTarget),
      email = String(values.get("email") || "").trim(),
      password = String(values.get("password") || ""),
      confirm = String(values.get("confirm") || "");
    try {
      const registration =
        mode === "register"
          ? registrationSchema.parse({
              name: String(values.get("name") || ""),
              email,
              password,
              confirm,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              udayana_student: values.get("udayana") === "on",
              semester:
                values.get("udayana") === "on"
                  ? Number(values.get("semester")) || null
                  : null,
            })
          : null;
      if (
        mode === "register" &&
        values.get("udayana") === "on" &&
        !isHimaif(String(values.get("verify") || ""))
      )
        throw new Error(
          "Jawaban pertanyaan verifikasi salah. Lepas centang Udayana jika kamu bukan mahasiswa Informatika Udayana.",
        );
      if (mode === "reset" && (password.length < 8 || password !== confirm))
        throw new Error(
          password.length < 8
            ? "Password minimal 8 karakter."
            : "Konfirmasi password tidak sama.",
        );
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      )
        throw new Error(
          "Supabase belum dikonfigurasi. Isi .env.local terlebih dahulu.",
        );
      const db = browserClient(),
        origin = window.location.origin;
      if (mode === "register") {
        const data = registration!;
        const { error } = await db.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              name: data.name,
              timezone: data.timezone,
              udayana_student: data.udayana_student,
              semester: data.semester,
            },
            emailRedirectTo: origin + "/auth/confirm",
          },
        });
        if (error) throw error;
        setMessage(
          "Permintaan registrasi diproses. Periksa email untuk verifikasi. Jika akun sudah ada, gunakan halaman masuk atau pemulihan password.",
        );
      } else if (mode === "login") {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.replace("/dashboard");
      } else if (mode === "forgot") {
        const { error } = await db.auth.resetPasswordForEmail(email, {
          redirectTo: origin + "/auth/confirm?next=/reset-password",
        });
        if (error) throw error;
        setMessage(
          "Jika email terdaftar, tautan pemulihan akan dikirim. Periksa email kamu.",
        );
      } else {
        if (password.length < 8)
          throw new Error("Password minimal 8 karakter.");
        if (password !== confirm)
          throw new Error("Konfirmasi password tidak sama.");
        const {
          data: { user },
        } = await db.auth.getUser();
        if (!user)
          throw new Error(
            "Tautan pemulihan tidak valid atau kedaluwarsa. Minta tautan baru.",
          );
        const { error } = await db.auth.updateUser({ password });
        if (error) throw error;
        await db.auth.signOut();
        setMessage("Password diperbarui. Silakan masuk kembali.");
      }
    } catch (err) {
      const e = err as { issues?: { message: string }[]; message?: string };
      const msg = e.issues?.map((i) => i.message).join(" ") || e.message || "";
      setError(
        msg === "Invalid login credentials"
          ? "Email atau password salah."
          : msg === "Email not confirmed"
            ? "Verifikasi email terlebih dahulu."
            : msg.includes("fetch")
              ? "Tidak dapat terhubung ke Supabase. Periksa koneksi dan layanan lokal."
              : msg || "Permintaan gagal. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <Link className="wordmark" href="/login">
          floo<span>.</span>
        </Link>
        <h1>
          Ruang untuk <br />
          langkah berikutnya.
        </h1>
        <p>
          Tata mata kuliah dan tugasmu. Lihat deadline dalam satu kalender, lalu
          kerjakan satu per satu.
        </p>
        <div className="auth-note">Satu akun, satu ruang pribadi.</div>
      </section>
      <section className="auth-panel">
        <div className="auth-form">
          <h2>{labels[mode]}</h2>
          <p>
            {mode === "register"
              ? "Mulai dengan mata kuliah pertamamu."
              : "Atur kembali ritme belajarmu."}
          </p>
          <form method="post" onSubmit={submit}>
            {mode === "register" && (
              <label>
                Nama
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                />
              </label>
            )}
            {mode !== "reset" && (
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={mode === "login" ? undefined : 8}
                  required
                />
              </label>
            )}
            {(mode === "register" || mode === "reset") && (
              <label>
                Konfirmasi password
                <input
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </label>
            )}
            {mode === "register" && (
              <>
                <label className="toggle">
                  <input
                    name="udayana"
                    type="checkbox"
                    checked={student}
                    onChange={(e) => setStudent(e.target.checked)}
                  />
                  <span>
                    Saya mahasiswa aktif Informatika Universitas Udayana
                  </span>
                </label>
                {student && (
                  <label>
                    {verifyQuestion}
                    <input name="verify" autoComplete="off" required />
                  </label>
                )}
                {student && (
                  <label>
                    Semester
                    <select name="semester" defaultValue="" required>
                      <option value="" disabled>
                        Pilih semester
                      </option>
                      {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          Semester {n}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="success">
                {message}
              </p>
            )}
            <button className="primary full" disabled={busy || !ready}>
              {busy
                ? "Memproses…"
                : mode === "login"
                  ? "Masuk"
                  : mode === "register"
                    ? "Daftar"
                    : mode === "forgot"
                      ? "Kirim tautan pemulihan"
                      : "Simpan password"}
            </button>
          </form>
          {(mode === "login" || mode === "register") && (
            <button
              type="button"
              className="secondary full"
              disabled={!ready}
              onClick={google}
            >
              Masuk dengan Google
            </button>
          )}
          <div className="auth-links">
            {mode === "login" ? (
              <>
                <Link href="/forgot-password">Lupa password?</Link>
                <span>
                  Belum punya akun? <Link href="/register">Daftar</Link>
                </span>
              </>
            ) : (
              <Link href="/login">Kembali ke halaman masuk</Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
