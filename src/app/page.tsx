import { redirect } from "next/navigation";
import Landing from "@/components/landing";
import { serverClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    const {
      data: { user },
    } = await (await serverClient()).auth.getUser();
    if (user) redirect("/dashboard");
  }
  return <Landing />;
}
