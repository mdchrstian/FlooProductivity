import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
if (existsSync(".env.local"))
  throw new Error(
    ".env.local sudah tersedia. Edit konfigurasi tersebut secara langsung.",
  );
const status = JSON.parse(
  execFileSync(
    process.execPath,
    ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"],
    { encoding: "utf8" },
  ),
);
const url = status.API_URL || status.api_url || status.api?.url;
const key =
  status.PUBLISHABLE_KEY ||
  status.publishable_key ||
  status.ANON_KEY ||
  status.anon_key;
if (!url || !key)
  throw new Error(
    "URL atau publishable key tidak ditemukan pada supabase status.",
  );
writeFileSync(
  ".env.local",
  `NEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}\nNEXT_PUBLIC_APP_URL=http://localhost:3000\n`,
  { mode: 0o600 },
);
console.log("Konfigurasi lokal tersimpan. Nilai key tidak dicetak.");
