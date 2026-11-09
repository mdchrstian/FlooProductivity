import { createBrowserClient } from "@supabase/ssr";
export function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
export async function signInWithGoogle() {
  const { error } = await browserClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + "/auth/confirm" },
  });
  return error;
}
