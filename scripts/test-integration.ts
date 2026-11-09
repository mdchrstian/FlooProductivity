import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
if (existsSync(".env.local"))
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0 && !process.env[line.slice(0, i)])
      process.env[line.slice(0, i)] = line.slice(i + 1).trim();
  }
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const results: {
  id: string;
  scenario: string;
  status: string;
  actual: string;
}[] = [];
const record = (
  id: string,
  scenario: string,
  actual: string,
  status = "PASS",
) => {
  results.push({ id, scenario, status, actual });
  console.log(status, id, scenario);
};
mkdirSync("docs/evidence", { recursive: true });
const save = () =>
  writeFileSync(
    "docs/evidence/integration-results.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        environment: url?.includes("127.0.0.1")
          ? "Supabase lokal"
          : "Supabase hosted",
        results,
      },
      null,
      2,
    ),
  );
if (!url || !key) {
  record(
    "INT-00",
    "Konfigurasi Supabase",
    "URL dan publishable key belum tersedia.",
    "BLOCKED",
  );
  save();
  process.exit(1);
}
const client = () =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
if (!existsSync(".test-accounts.json")) {
  record(
    "INT-00",
    "Dua akun uji",
    "File akun pengujian belum tersedia.",
    "BLOCKED",
  );
  save();
  process.exit(1);
}
const accounts = JSON.parse(readFileSync(".test-accounts.json", "utf8")) as {
  a: { email: string; password: string };
  b: { email: string; password: string };
};
const a = client(),
  b = client(),
  anon = client();
async function check(id: string, name: string, fn: () => Promise<string>) {
  try {
    record(id, name, await fn());
  } catch (e) {
    record(id, name, (e as Error).message, "FAIL");
  }
}
let ca = "",
  cb = "",
  ta = "",
  uidA = "",
  uidB = "";
await check("INT-01", "Login dua akun terverifikasi", async () => {
  for (const [c, account] of [
    [a, accounts.a],
    [b, accounts.b],
  ] as const) {
    const r = await c.auth.signInWithPassword(account);
    assert.equal(r.error, null);
    assert.ok(r.data.user);
  }
  uidA = (await a.auth.getUser()).data.user!.id;
  uidB = (await b.auth.getUser()).data.user!.id;
  assert.notEqual(uidA, uidB);
  return "Kedua akun berhasil masuk dengan ID berbeda.";
});
await check("INT-02", "Login password salah", async () => {
  assert.ok(
    (
      await client().auth.signInWithPassword({
        ...accounts.a,
        password: "wrong-password",
      })
    ).error,
  );
  return "Autentikasi ditolak.";
});
await check("INT-03", "Tambah Course pada akun A dan B", async () => {
  const ra = await a
    .from("courses")
    .insert({ user_id: uidA, name: "Uji isolasi A", credits: 3 })
    .select()
    .single();
  assert.equal(ra.error, null);
  ca = ra.data.id;
  const rb = await b
    .from("courses")
    .insert({ user_id: uidB, name: "Uji isolasi B", credits: 2 })
    .select()
    .single();
  assert.equal(rb.error, null);
  cb = rb.data.id;
  return "Course masing-masing tersimpan.";
});
await check("INT-04", "Akun A tidak dapat membaca Course B", async () => {
  const r = await a.from("courses").select("*").eq("id", cb);
  assert.equal(r.error, null);
  assert.deepEqual(r.data, []);
  return "SELECT mengembalikan nol baris.";
});
await check(
  "INT-05",
  "Akun A tidak dapat mengubah/hapus Course B",
  async () => {
    for (const r of [
      await a.from("courses").update({ name: "forged" }).eq("id", cb).select(),
      await a.from("courses").delete().eq("id", cb).select(),
    ])
      assert.deepEqual(r.data, []);
    assert.equal(
      (await b.from("courses").select("name").eq("id", cb).single()).data?.name,
      "Uji isolasi B",
    );
    return "UPDATE dan DELETE tidak mengubah Course B.";
  },
);
await check(
  "INT-06",
  "Akun A tidak dapat menyamar sebagai pemilik B",
  async () => {
    assert.ok(
      (
        await a
          .from("courses")
          .insert({ user_id: uidB, name: "forged", credits: 3 })
      ).error,
    );
    assert.ok(
      (await a.from("courses").update({ user_id: uidB }).eq("id", ca)).error,
    );
    return "INSERT owner palsu dan perubahan ownership ditolak.";
  },
);
await check("INT-07", "Validasi database terhadap data buruk", async () => {
  for (const payload of [
    { name: " ", credits: 3 },
    { name: "RPL", credits: 0 },
    { name: "RPL", credits: -1 },
  ])
    assert.ok(
      (await a.from("courses").insert({ user_id: uidA, ...payload })).error,
    );
  return "Nama kosong dan SKS tidak positif ditolak.";
});
const payload = {
  course_id: "",
  title: "Uji RLS task",
  description: "Data pengujian",
  deadline_at: new Date(Date.now() + 86400000).toISOString(),
  status: "todo",
  priority: "medium",
};
await check("INT-08", "Tambah Task pada Course sendiri", async () => {
  const r = await a
    .from("tasks")
    .insert({ ...payload, course_id: ca })
    .select()
    .single();
  assert.equal(r.error, null);
  ta = r.data.id;
  assert.equal(r.data.status, "todo");
  return "Task tersimpan dengan status todo.";
});
await check("INT-09", "Cegah Task pada Course akun lain", async () => {
  assert.ok(
    (await a.from("tasks").insert({ ...payload, course_id: cb })).error,
  );
  assert.ok(
    (await a.from("tasks").update({ course_id: cb }).eq("id", ta)).error,
  );
  return "INSERT dan pemindahan Task lintas akun ditolak.";
});
await check(
  "INT-10",
  "Akun B tidak dapat membaca/ubah/hapus Task A",
  async () => {
    assert.deepEqual((await b.from("tasks").select().eq("id", ta)).data, []);
    assert.deepEqual(
      (await b.from("tasks").update({ title: "forged" }).eq("id", ta).select())
        .data,
      [],
    );
    assert.deepEqual(
      (await b.from("tasks").delete().eq("id", ta).select()).data,
      [],
    );
    return "Tiga operasi tidak mengakses Task A.";
  },
);
await check(
  "INT-11",
  "Constraint status, prioritas, dan konteks Task",
  async () => {
    for (const change of [
      { status: "bad" },
      { priority: "urgent" },
      { title: " " },
      { course_id: null },
    ])
      assert.ok(
        (await a.from("tasks").insert({ ...payload, course_id: ca, ...change }))
          .error,
      );
    return "Seluruh nilai tidak valid ditolak database.";
  },
);
await check(
  "INT-12",
  "Status Kanban bertahan saat dibaca kembali",
  async () => {
    for (const status of ["todo", "in_progress", "done"]) {
      assert.equal(
        (await a.from("tasks").update({ status }).eq("id", ta)).error,
        null,
      );
      assert.equal(
        (await a.from("tasks").select("status").eq("id", ta).single()).data
          ?.status,
        status,
      );
    }
    return "Ketiga status tersimpan dan terbaca kembali.";
  },
);
await check(
  "INT-N1",
  "Catatan terisolasi dan Course dihapus melepas catatan",
  async () => {
    const c = (
      await a
        .from("courses")
        .insert({ user_id: uidA, name: "Uji catatan", credits: 1 })
        .select()
        .single()
    ).data!.id;
    const linked = await a
      .from("notes")
      .insert({ user_id: uidA, course_id: c, content: "terkait" })
      .select()
      .single();
    const free = await a
      .from("notes")
      .insert({ user_id: uidA, content: "bebas" })
      .select()
      .single();
    assert.equal(linked.error, null);
    assert.equal(free.error, null);
    assert.deepEqual(
      (await b.from("notes").select().eq("id", free.data.id)).data,
      [],
    );
    assert.deepEqual(
      (
        await b
          .from("notes")
          .update({ content: "forged" })
          .eq("id", free.data.id)
          .select()
      ).data,
      [],
    );
    assert.deepEqual(
      (await b.from("notes").delete().eq("id", free.data.id).select()).data,
      [],
    );
    assert.ok(
      (await a.from("notes").insert({ user_id: uidB, content: "x" })).error,
    );
    assert.ok(
      (
        await a
          .from("notes")
          .insert({ user_id: uidA, course_id: cb, content: "x" })
      ).error,
    );
    assert.ok(
      (
        await a
          .from("notes")
          .update({ course_id: cb })
          .eq("id", free.data.id)
          .select()
      ).error,
    );
    assert.ok(
      (await a.from("notes").update({ user_id: uidB }).eq("id", free.data.id))
        .error,
    );
    assert.equal((await a.from("courses").delete().eq("id", c)).error, null);
    assert.equal(
      (
        await a
          .from("notes")
          .select("course_id")
          .eq("id", linked.data.id)
          .single()
      ).data?.course_id,
      null,
    );
    assert.equal(
      (await a.from("notes").delete().in("id", [linked.data.id, free.data.id]))
        .error,
      null,
    );
    return "RLS menolak akses silang; SET NULL mempertahankan catatan.";
  },
);
await check(
  "INT-P1",
  "Sesi Pomodoro terisolasi dan Course dihapus melepas sesi",
  async () => {
    const c = (
      await a
        .from("courses")
        .insert({ user_id: uidA, name: "Uji pomodoro", credits: 1 })
        .select()
        .single()
    ).data!.id;
    const linked = await a
      .from("pomodoro_sessions")
      .insert({ user_id: uidA, course_id: c, duration_minutes: 25 })
      .select()
      .single();
    assert.equal(linked.error, null);
    assert.deepEqual(
      (await b.from("pomodoro_sessions").select().eq("id", linked.data.id))
        .data,
      [],
    );
    assert.deepEqual(
      (
        await b
          .from("pomodoro_sessions")
          .delete()
          .eq("id", linked.data.id)
          .select()
      ).data,
      [],
    );
    assert.ok(
      (
        await a
          .from("pomodoro_sessions")
          .insert({ user_id: uidA, duration_minutes: 0 })
      ).error,
    );
    assert.ok(
      (
        await a
          .from("pomodoro_sessions")
          .insert({ user_id: uidA, duration_minutes: 181 })
      ).error,
    );
    assert.ok(
      (
        await a
          .from("pomodoro_sessions")
          .insert({ user_id: uidB, duration_minutes: 25 })
      ).error,
    );
    assert.ok(
      (
        await a
          .from("pomodoro_sessions")
          .insert({ user_id: uidA, course_id: cb, duration_minutes: 25 })
      ).error,
    );
    assert.deepEqual(
      (
        await a
          .from("pomodoro_sessions")
          .update({ duration_minutes: 99 })
          .eq("id", linked.data.id)
          .select()
      ).data ?? [],
      [],
    );
    assert.equal((await a.from("courses").delete().eq("id", c)).error, null);
    assert.equal(
      (
        await a
          .from("pomodoro_sessions")
          .select("course_id")
          .eq("id", linked.data.id)
          .single()
      ).data?.course_id,
      null,
    );
    assert.equal(
      (await a.from("pomodoro_sessions").delete().eq("id", linked.data.id))
        .error,
      null,
    );
    return "RLS menolak akses silang; durasi dibatasi; SET NULL mempertahankan sesi.";
  },
);
await check(
  "INT-S1",
  "Jadwal kuliah terisolasi dan ikut terhapus bersama Course",
  async () => {
    const c = (
      await a
        .from("courses")
        .insert({ user_id: uidA, name: "Uji jadwal", credits: 1 })
        .select()
        .single()
    ).data!.id;
    const slot = await a
      .from("schedule_items")
      .insert({
        user_id: uidA,
        course_id: c,
        day_of_week: 2,
        start_time: "08:00",
        end_time: "09:40",
      })
      .select()
      .single();
    assert.equal(slot.error, null);
    assert.deepEqual(
      (await b.from("schedule_items").select().eq("id", slot.data.id)).data,
      [],
    );
    assert.deepEqual(
      (
        await b
          .from("schedule_items")
          .update({ day_of_week: 5 })
          .eq("id", slot.data.id)
          .select()
      ).data,
      [],
    );
    assert.deepEqual(
      (await b.from("schedule_items").delete().eq("id", slot.data.id).select())
        .data,
      [],
    );
    const bad = {
      user_id: uidA,
      course_id: c,
      day_of_week: 2,
      start_time: "08:00",
      end_time: "09:40",
    };
    assert.ok(
      (await a.from("schedule_items").insert({ ...bad, day_of_week: 8 })).error,
    );
    assert.ok(
      (await a.from("schedule_items").insert({ ...bad, end_time: "07:00" }))
        .error,
    );
    assert.ok(
      (await a.from("schedule_items").insert({ ...bad, user_id: uidB })).error,
    );
    assert.ok(
      (await a.from("schedule_items").insert({ ...bad, course_id: cb })).error,
    );
    assert.ok(
      (
        await a
          .from("schedule_items")
          .update({ course_id: cb })
          .eq("id", slot.data.id)
          .select()
      ).error,
    );
    assert.ok(
      (
        await a
          .from("schedule_items")
          .update({ user_id: uidB })
          .eq("id", slot.data.id)
      ).error,
    );
    assert.equal((await a.from("courses").delete().eq("id", c)).error, null);
    assert.deepEqual(
      (await a.from("schedule_items").select().eq("id", slot.data.id)).data,
      [],
    );
    return "RLS menolak akses silang; batas hari/jam ditegakkan; CASCADE menghapus slot.";
  },
);
await check(
  "INT-E1",
  "Event, checklist, dan konteks Task tepat satu",
  async () => {
    const ev = await a
      .from("events")
      .insert({
        user_id: uidA,
        name: "Uji event",
        deadline_at: "2026-12-31T16:00:00Z",
      })
      .select()
      .single();
    assert.equal(ev.error, null);
    const eid = ev.data.id;
    const chk = await a
      .from("checklist_items")
      .insert({ event_id: eid, label: "Item uji" })
      .select()
      .single();
    assert.equal(chk.error, null);
    // isolation: B sees and changes nothing of A's Event or checklist
    assert.deepEqual((await b.from("events").select().eq("id", eid)).data, []);
    assert.deepEqual(
      (await b.from("events").update({ name: "forged" }).eq("id", eid).select())
        .data,
      [],
    );
    assert.deepEqual(
      (await b.from("events").delete().eq("id", eid).select()).data,
      [],
    );
    assert.deepEqual(
      (await b.from("checklist_items").select().eq("id", chk.data.id)).data,
      [],
    );
    assert.deepEqual(
      (
        await b
          .from("checklist_items")
          .update({ label: "forged" })
          .eq("id", chk.data.id)
          .select()
      ).data,
      [],
    );
    assert.ok(
      (
        await b
          .from("checklist_items")
          .insert({ event_id: eid, label: "intruder" })
      ).error,
    );
    assert.ok(
      (
        await a.from("events").insert({
          user_id: uidB,
          name: "x",
          deadline_at: "2026-12-31T16:00:00Z",
        })
      ).error,
    );
    // Task: exactly one parent, only owned parents
    const t = { title: "Tugas Event", deadline_at: "2026-12-31T16:00:00Z" };
    assert.ok(
      (await a.from("tasks").insert({ ...t, course_id: ca, event_id: eid }))
        .error,
    );
    assert.ok((await a.from("tasks").insert({ ...t })).error);
    const own = await a
      .from("tasks")
      .insert({ ...t, event_id: eid })
      .select()
      .single();
    assert.equal(own.error, null);
    const bEv = (
      await b
        .from("events")
        .insert({
          user_id: uidB,
          name: "Event B",
          deadline_at: "2026-12-31T16:00:00Z",
        })
        .select()
        .single()
    ).data!.id;
    assert.ok((await a.from("tasks").insert({ ...t, event_id: bEv })).error);
    assert.ok(
      (
        await a
          .from("tasks")
          .update({ course_id: null, event_id: bEv })
          .eq("id", own.data.id)
          .select()
      ).error,
    );
    assert.deepEqual(
      (await b.from("tasks").select().eq("id", own.data.id)).data,
      [],
    );
    // Event with Tasks cannot be deleted
    assert.equal(
      (await a.from("events").delete().eq("id", eid)).error?.code,
      "23503",
    );
    assert.equal(
      (await a.from("tasks").delete().eq("id", own.data.id)).error,
      null,
    );
    // create_event is atomic, limited to 20 items, and RLS-bound
    const made = await a.rpc("create_event", {
      p_name: "Via RPC",
      p_role: "Ketua",
      p_deadline: "2026-12-31T16:00:00Z",
      p_items: ["Satu", "Dua"],
    });
    assert.equal(made.error, null);
    assert.equal(made.data.items.length, 2);
    assert.deepEqual(
      made.data.items.map((i: { position: number }) => i.position),
      [0, 1],
    );
    assert.ok(
      (
        await a.rpc("create_event", {
          p_name: "Banyak",
          p_role: "",
          p_deadline: "2026-12-31T16:00:00Z",
          p_items: Array.from({ length: 21 }, (_, i) => "x" + i),
        })
      ).error,
    );
    assert.deepEqual(
      (await a.from("events").select("id").eq("name", "Banyak")).data,
      [],
    );
    assert.ok(
      (
        await anon.rpc("create_event", {
          p_name: "x",
          p_role: "",
          p_deadline: "2026-12-31T16:00:00Z",
          p_items: [],
        })
      ).error,
    );
    // deleting an Event removes its checklist; toggle persists through update_preferences
    const rpcId = made.data.event.id;
    assert.equal((await a.from("events").delete().eq("id", rpcId)).error, null);
    assert.deepEqual(
      (await a.from("checklist_items").select().eq("event_id", rpcId)).data,
      [],
    );
    assert.equal((await a.from("events").delete().eq("id", eid)).error, null);
    assert.equal((await b.from("events").delete().eq("id", bEv)).error, null);
    const prefs = (
      await a
        .from("settings")
        .select("timezone,academic_module_enabled,committee_module_enabled")
        .eq("user_id", uidA)
        .single()
    ).data!;
    const name = (await a.from("users").select("name").eq("id", uidA).single())
      .data!.name;
    const set = (committee: boolean) =>
      a.rpc("update_preferences", {
        p_name: name,
        p_timezone: prefs.timezone,
        p_academic: prefs.academic_module_enabled,
        p_committee: committee,
      });
    assert.equal((await set(!prefs.committee_module_enabled)).error, null);
    assert.equal(
      (
        await a
          .from("settings")
          .select("committee_module_enabled")
          .eq("user_id", uidA)
          .single()
      ).data?.committee_module_enabled,
      !prefs.committee_module_enabled,
    );
    assert.equal((await set(prefs.committee_module_enabled)).error, null);
    return "Isolasi, tepat-satu-konteks, RESTRICT, CASCADE checklist, create_event atomik, dan toggle lulus.";
  },
);
await check("INT-13", "Course dengan Task tidak dapat dihapus", async () => {
  assert.equal(
    (await a.from("courses").delete().eq("id", ca)).error?.code,
    "23503",
  );
  return "Foreign key RESTRICT menolak penghapusan.";
});
await check("INT-14", "Settings dan profil terisolasi", async () => {
  assert.deepEqual(
    (await a.from("settings").select().eq("user_id", uidB)).data,
    [],
  );
  assert.deepEqual((await a.from("users").select().eq("id", uidB)).data, []);
  assert.deepEqual(
    (
      await a
        .from("settings")
        .update({ timezone: "UTC" })
        .eq("user_id", uidB)
        .select()
    ).data,
    [],
  );
  return "Profil dan Settings B tidak terbaca atau berubah oleh A.";
});
await check(
  "INT-15",
  "Settings tersimpan atomik dan zona tidak valid ditolak",
  async () => {
    assert.equal(
      (
        await a.rpc("update_preferences", {
          p_name: "Akun Uji A",
          p_timezone: "Asia/Makassar",
          p_academic: false,
          p_committee: true,
        })
      ).error,
      null,
    );
    assert.equal(
      (await a.from("settings").select().eq("user_id", uidA).single()).data
        ?.academic_module_enabled,
      false,
    );
    assert.ok(
      (
        await a.rpc("update_preferences", {
          p_name: "rollback-test",
          p_timezone: "Invalid/Zone",
          p_academic: true,
          p_committee: true,
        })
      ).error,
    );
    assert.equal(
      (await a.from("users").select("name").eq("id", uidA).single()).data?.name,
      "Akun Uji A",
    );
    await a.rpc("update_preferences", {
      p_name: "Akun Uji A",
      p_timezone: "Asia/Makassar",
      p_academic: true,
      p_committee: true,
    });
    return "Perubahan valid tersimpan; transaksi invalid rollback.";
  },
);
await check("INT-16", "Permintaan tanpa autentikasi ditolak", async () => {
  for (const table of ["users", "settings", "courses", "tasks"]) {
    const r = await anon.from(table).select();
    assert.ok(r.error || r.data?.length === 0);
  }
  assert.ok(
    (
      await anon
        .from("courses")
        .insert({ name: "anon", credits: 3, user_id: uidA })
    ).error,
  );
  return "Data pribadi tidak terbuka dan INSERT anonim gagal.";
});
await check("INT-17", "Edit dan hapus data sendiri", async () => {
  assert.equal(
    (await a.from("tasks").update({ title: "Task telah diubah" }).eq("id", ta))
      .error,
    null,
  );
  assert.equal(
    (await a.from("tasks").select("title").eq("id", ta).single()).data?.title,
    "Task telah diubah",
  );
  assert.equal((await a.from("tasks").delete().eq("id", ta)).error, null);
  assert.equal((await a.from("courses").delete().eq("id", ca)).error, null);
  assert.equal((await b.from("courses").delete().eq("id", cb)).error, null);
  return "Edit berhasil, Task dihapus, lalu Course dapat dihapus.";
});
await check(
  "INT-18",
  "Token tidak valid dengan klaim kedaluwarsa ditolak",
  async () => {
    const expired = createClient(url, key, {
      auth: { persistSession: false },
      global: {
        headers: {
          Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjF9.expired",
        },
      },
    });
    const r = await expired.from("courses").select();
    assert.ok(r.error);
    return "JWT buatan dengan klaim kedaluwarsa ditolak. Ini bukan pengujian menunggu kedaluwarsa token valid.";
  },
);
await a.auth.signOut();
await b.auth.signOut();
save();
if (results.some((r) => r.status !== "PASS")) process.exitCode = 1;
