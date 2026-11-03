import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import WorkspaceShell from "@/components/workspace";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    return (
      <main className="setup">
        <h1>Konfigurasi FLOO</h1>
        <p>
          Salin .env.example ke .env.local dan isi URL serta publishable key
          dari Supabase lokal, kemudian jalankan kembali aplikasi.
        </p>
      </main>
    );
  const client = await serverClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");
  return <WorkspaceShell userId={user.id}>{children}</WorkspaceShell>;
}
