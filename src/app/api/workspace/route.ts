import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Silakan masuk kembali." },
      { status: 401 },
    );
  const results = await Promise.all([
    db.from("users").select("name,email").eq("id", user.id).single(),
    db.from("courses").select("*").order("created_at"),
    db.from("tasks").select("*").order("deadline_at"),
    db.from("notes").select("*").order("created_at", { ascending: false }),
    db
      .from("pomodoro_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("schedule_items")
      .select("*")
      .order("day_of_week")
      .order("start_time"),
    db.from("events").select("*").order("deadline_at"),
    db
      .from("checklist_items")
      .select("*")
      .order("position")
      .order("created_at"),
    db
      .from("settings")
      .select("timezone,academic_module_enabled,committee_module_enabled")
      .eq("user_id", user.id)
      .single(),
  ]);
  if (results.some((r) => r.error))
    return NextResponse.json(
      { error: "Data belum dapat dimuat. Coba lagi." },
      { status: 503 },
    );
  return NextResponse.json(
    {
      userId: user.id,
      profile: results[0].data,
      courses: results[1].data,
      tasks: results[2].data,
      notes: results[3].data,
      sessions: results[4].data,
      schedule: results[5].data,
      events: results[6].data,
      checklist: results[7].data,
      settings: results[8].data,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
