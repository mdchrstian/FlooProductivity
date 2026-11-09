import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "./supabase/server";
import {
  courseSchema,
  taskSchema,
  noteSchema,
  sessionSchema,
  scheduleSchema,
  settingsSchema,
} from "./validation";
import { z } from "zod";
export async function mutate(req: NextRequest, resource: string, id?: string) {
  if (
    ![
      "courses",
      "tasks",
      "notes",
      "pomodoro_sessions",
      "schedule_items",
      "settings",
    ].includes(resource)
  )
    return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  const allowedOrigins = [
    new URL(process.env.NEXT_PUBLIC_APP_URL || req.url).origin,
    process.env.SHARE_APP_URL,
  ].filter(Boolean);
  if (!allowedOrigins.includes(req.headers.get("origin") || ""))
    return NextResponse.json(
      { error: "Asal permintaan tidak valid." },
      { status: 403 },
    );
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Silakan masuk kembali." },
      { status: 401 },
    );
  if (id && !z.uuid().safeParse(id).success)
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  try {
    if (resource === "settings") {
      if (req.method !== "PATCH" || id)
        return NextResponse.json(
          { error: "Metode tidak tersedia." },
          { status: 405 },
        );
      const parsed = settingsSchema.safeParse(await req.json());
      if (!parsed.success)
        return NextResponse.json(
          { error: parsed.error.issues.map((i) => i.message).join(" ") },
          { status: 400 },
        );
      const { name, ...values } = parsed.data;
      const result = await db.rpc("update_preferences", {
        p_name: name,
        p_timezone: values.timezone,
        p_academic: values.academic_module_enabled,
      });
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true });
    }
    if (req.method === "DELETE") {
      if (!id)
        return NextResponse.json({ error: "ID wajib diisi." }, { status: 400 });
      const result = await db
        .from(resource)
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (result.error) throw result.error;
      if (!result.data)
        return NextResponse.json(
          { error: "Data tidak ditemukan." },
          { status: 404 },
        );
      return NextResponse.json({ ok: true });
    }
    const schema =
      resource === "courses"
        ? courseSchema
        : resource === "notes"
          ? noteSchema
          : resource === "pomodoro_sessions"
            ? sessionSchema
            : resource === "schedule_items"
              ? scheduleSchema
              : taskSchema;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(" ") },
        { status: 400 },
      );
    if (req.method === "PATCH" && !id)
      return NextResponse.json({ error: "ID wajib diisi." }, { status: 400 });
    const result =
      req.method === "POST"
        ? await db
            .from(resource)
            .insert({
              ...parsed.data,
              ...(resource === "tasks" ? {} : { user_id: user.id }),
            } as Record<string, unknown>)
            .select()
            .single()
        : await db
            .from(resource)
            .update(parsed.data)
            .eq("id", id!)
            .select()
            .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data)
      return NextResponse.json(
        { error: "Data tidak ditemukan." },
        { status: 404 },
      );
    return NextResponse.json(result.data, {
      status: req.method === "POST" ? 201 : 200,
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "23503" && resource === "courses")
      return NextResponse.json(
        {
          error:
            "Mata kuliah masih memiliki tugas. Hapus atau pindahkan tugas terlebih dahulu.",
        },
        { status: 409 },
      );
    if (err instanceof SyntaxError)
      return NextResponse.json(
        { error: "Isi permintaan tidak valid." },
        { status: 400 },
      );
    return NextResponse.json(
      {
        error:
          "Data gagal disimpan. Periksa isian, akses, dan koneksi, lalu coba lagi.",
      },
      { status: code === "42501" ? 403 : 400 },
    );
  }
}
