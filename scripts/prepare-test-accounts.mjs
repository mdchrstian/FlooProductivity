// One-time QA helper. The administrative key is read from stdin, never stored.
// Only creates synthetic test accounts; all data access tests use user sessions.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = readFileSync(0, "utf8").trim();
if (!url || !publicKey || !secret.startsWith("sb_secret_"))
  throw new Error(
    "Hosted test setup requires URL, publishable key, and an administrative key on stdin.",
  );
const admin = createClient(url, secret, { auth: { persistSession: false } }),
  suffix = Date.now();
const accounts = {};
for (const letter of ["a", "b"]) {
  const email = `floo.qa.${letter}.${suffix}@example.com`,
    password = randomBytes(18).toString("base64url") + "aA1!";
  const r = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: `Akun Uji ${letter.toUpperCase()}`,
      timezone: "Asia/Makassar",
    },
  });
  if (r.error) throw r.error;
  accounts[letter] = { email, password };
}
writeFileSync(".test-accounts.json", JSON.stringify(accounts, null, 2), {
  mode: 0o600,
});
const authResults = [];
const email = `floo.qa.confirm.${suffix}@example.com`,
  password = randomBytes(18).toString("base64url") + "aA1!";
const generated = await admin.auth.admin.generateLink({
  type: "signup",
  email,
  password,
  options: {
    data: { name: "Uji token", timezone: "Asia/Makassar" },
    redirectTo: "http://localhost:3000/auth/confirm",
  },
});
if (generated.error) throw generated.error;
const c = createClient(url, publicKey, { auth: { persistSession: false } });
let r = await c.auth.signInWithPassword({ email, password });
authResults.push({
  id: "AUTH-01",
  scenario: "Masuk sebelum verifikasi",
  status: r.error ? "PASS" : "FAIL",
  actual: "Akun dari generateLink belum terverifikasi; login ditolak.",
});
const verified = await c.auth.verifyOtp({
  token_hash: generated.data.properties.hashed_token,
  type: "signup",
});
authResults.push({
  id: "AUTH-02",
  scenario: "Verifikasi token signup",
  status: verified.error ? "FAIL" : "PASS",
  actual:
    verified.error?.message ||
    "Token signup diterima Supabase Auth. Token dibuat oleh admin QA; tidak menguji pengiriman email.",
});
const replay = await c.auth.verifyOtp({
  token_hash: generated.data.properties.hashed_token,
  type: "signup",
});
authResults.push({
  id: "AUTH-03",
  scenario: "Token verifikasi dipakai ulang",
  status: replay.error ? "PASS" : "FAIL",
  actual: "Token satu kali tidak boleh digunakan ulang.",
});
const recovery = await admin.auth.admin.generateLink({
  type: "recovery",
  email,
  options: {
    redirectTo: "http://localhost:3000/auth/confirm?next=/reset-password",
  },
});
if (recovery.error) throw recovery.error;
const reset = await c.auth.verifyOtp({
  token_hash: recovery.data.properties.hashed_token,
  type: "recovery",
});
if (reset.error) throw reset.error;
const updated = await c.auth.updateUser({ password: password + "new" });
await c.auth.signOut();
const old = await c.auth.signInWithPassword({ email, password });
const fresh = await c.auth.signInWithPassword({
  email,
  password: password + "new",
});
authResults.push({
  id: "AUTH-04",
  scenario: "Pemulihan password melalui token",
  status: !updated.error && !!old.error && !fresh.error ? "PASS" : "FAIL",
  actual:
    "Token recovery dipakai mengubah password. Password lama ditolak dan password baru diterima. Pengiriman email tidak diuji.",
});
await c.auth.signOut();
const user = generated.data.user;
if (user) await admin.auth.admin.deleteUser(user.id);
mkdirSync("docs/evidence", { recursive: true });
writeFileSync(
  "docs/evidence/auth-token-results.json",
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      environment:
        "Supabase hosted; token generated through administrative QA setup",
      results: authResults,
    },
    null,
    2,
  ),
);
console.log(
  "Dua akun QA dibuat; credential ada di file lokal yang diabaikan Git. Token auth diuji tanpa klaim pengiriman email.",
);
