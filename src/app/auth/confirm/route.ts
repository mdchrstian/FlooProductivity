import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
export async function GET(req: NextRequest) {
  const url = new URL(req.url),
    client = await serverClient();
  const code = url.searchParams.get("code"),
    token_hash = url.searchParams.get("token_hash"),
    type = url.searchParams.get("type") as EmailOtpType | null;
  const next =
    url.searchParams.get("next") === "/reset-password"
      ? "/reset-password"
      : "/dashboard";
  const result = code
    ? await client.auth.exchangeCodeForSession(code)
    : token_hash && type && ["signup", "recovery", "email"].includes(type)
      ? await client.auth.verifyOtp({ token_hash, type })
      : { error: new Error("Tautan tidak valid") };
  return NextResponse.redirect(
    new URL(result.error ? "/login?error=link" : next, req.url),
  );
}
