import test from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
import {
  courseSchema,
  taskSchema,
  noteSchema,
  sessionSchema,
  scheduleSchema,
  eventSchema,
  checklistSchema,
  settingsSchema,
  registrationSchema,
} from "../src/lib/validation";
import { localDeadline, dayKey, taskGroups } from "../src/lib/time";
import { eventTemplates } from "../src/lib/templates";
import type { Task } from "../src/lib/types";
const task: Task = {
  id: "x",
  course_id: "7a6c61e0-9d80-41e3-bddc-6877f40d2207",
  event_id: null,
  title: "Makalah",
  description: "",
  deadline_at: "2026-12-31T16:00:00Z",
  status: "todo",
  priority: "medium",
};
test("Course requires a nonblank name and positive integer credits", () => {
  for (const credits of [0, -1, 1.5])
    assert.equal(
      courseSchema.safeParse({ name: "RPL", credits }).success,
      false,
    );
  assert.equal(
    courseSchema.safeParse({ name: " ", credits: 3 }).success,
    false,
  );
  assert.equal(courseSchema.parse({ name: " RPL ", credits: 3 }).name, "RPL");
});
test("Task requires an owned-context identifier, deadline and valid enums", () => {
  assert.equal(taskSchema.safeParse({ ...task, id: undefined }).success, false);
  const { id, ...payload } = task;
  assert.equal(taskSchema.safeParse(payload).success, true);
  for (const change of [
    { course_id: "" },
    { title: " " },
    { status: "unknown" },
    { deadline_at: "demo" },
    { priority: "urgent" },
  ])
    assert.equal(
      taskSchema.safeParse({ ...payload, ...change }).success,
      false,
    );
});
test("Registration checks confirmation and minimum password", () => {
  const base = {
    name: "Tian",
    email: "test@example.com",
    password: "password1",
    confirm: "password1",
    timezone: "Asia/Makassar",
  };
  assert.equal(registrationSchema.safeParse(base).success, true);
  assert.equal(
    registrationSchema.safeParse({ ...base, confirm: "wrong" }).success,
    false,
  );
  assert.equal(
    registrationSchema.safeParse({ ...base, email: "bad" }).success,
    false,
  );
});
test("Settings rejects invalid timezone", () => {
  assert.equal(
    settingsSchema.safeParse({
      name: "Tian",
      timezone: "Not/AZone",
      academic_module_enabled: true,
    }).success,
    false,
  );
});
test("Local deadline converts Makassar time to UTC", () => {
  assert.equal(
    localDeadline("2026-11-03T23:59", "Asia/Makassar"),
    "2026-11-03T15:59:00.000Z",
  );
});
test("Year boundary follows the user zone", () => {
  assert.equal(dayKey(task.deadline_at, "Asia/Makassar"), "2027-01-01");
  assert.equal(dayKey(task.deadline_at, "America/New_York"), "2026-12-31");
});
test("Impossible date and DST missing/ambiguous hour are rejected", () => {
  for (const [value, zone] of [
    ["2026-02-30T12:00", "Asia/Makassar"],
    ["2026-03-08T02:30", "America/New_York"],
    ["2026-11-01T01:30", "America/New_York"],
  ])
    assert.throws(() => localDeadline(value, zone));
  assert.ok(localDeadline("2026-11-01T03:00", "America/New_York"));
});
test("Dashboard excludes completed tasks and includes exactly next seven days", () => {
  const now = DateTime.fromISO("2026-12-31T12:00", { zone: "Asia/Makassar" });
  const items = [
    { ...task, deadline_at: "2026-12-31T01:00:00Z" },
    task,
    { ...task, deadline_at: "2027-01-07T15:59:00Z" },
    { ...task, deadline_at: "2027-01-07T16:00:00Z" },
    { ...task, status: "done" as const },
  ];
  const groups = taskGroups(items, "Asia/Makassar", now);
  assert.equal(groups.overdue.length, 1);
  assert.equal(groups.today.length, 1);
  assert.equal(groups.upcoming.length, 2);
});
test("Empty workspace has zero groups", () => {
  const groups = taskGroups([], "Asia/Makassar");
  assert.equal(
    groups.today.length + groups.upcoming.length + groups.overdue.length,
    0,
  );
});
test("Note needs trimmed content up to 10000 chars and an optional Course uuid", () => {
  const id = "7a6c61e0-9d80-41e3-bddc-6877f40d2207";
  for (const content of ["", "   ", "x".repeat(10001)])
    assert.equal(noteSchema.safeParse({ content }).success, false);
  assert.equal(noteSchema.parse({ content: " halo " }).content, "halo");
  assert.equal(noteSchema.parse({ content: "a" }).course_id, null);
  assert.equal(
    noteSchema.safeParse({ content: "a", course_id: id }).success,
    true,
  );
  assert.equal(
    noteSchema.safeParse({ content: "a", course_id: "x" }).success,
    false,
  );
  assert.equal(
    noteSchema.safeParse({ content: "a", user_id: id }).success,
    false,
  );
});
test("Pomodoro session needs an integer duration of 1 to 180 minutes", () => {
  for (const duration_minutes of [0, 181, 2.5, -5])
    assert.equal(sessionSchema.safeParse({ duration_minutes }).success, false);
  assert.equal(sessionSchema.parse({ duration_minutes: 25 }).course_id, null);
  assert.equal(
    sessionSchema.safeParse({ duration_minutes: 25, user_id: "x" }).success,
    false,
  );
});
test("Schedule slot needs a valid weekday, HH:MM times and end after start", () => {
  const course_id = "7a6c61e0-9d80-41e3-bddc-6877f40d2207";
  const ok = {
    course_id,
    day_of_week: 3,
    start_time: "08:00",
    end_time: "09:40",
  };
  assert.equal(scheduleSchema.safeParse(ok).success, true);
  for (const bad of [
    { day_of_week: 0 },
    { day_of_week: 8 },
    { start_time: "8:00" },
    { end_time: "24:00" },
    { end_time: "08:00" },
    { end_time: "07:00" },
    { course_id: "x" },
    { user_id: course_id },
  ])
    assert.equal(scheduleSchema.safeParse({ ...ok, ...bad }).success, false);
});
test("Task belongs to exactly one Course or Event", () => {
  const { id, ...payload } = task;
  const eventId = "0f1d5b6a-5c4e-4b1b-9d0a-2f6c1f6f7a11";
  assert.equal(taskSchema.safeParse(payload).success, true);
  assert.equal(
    taskSchema.safeParse({ ...payload, course_id: null, event_id: eventId })
      .success,
    true,
  );
  assert.equal(
    taskSchema.safeParse({ ...payload, event_id: eventId }).success,
    false,
  );
  assert.equal(
    taskSchema.safeParse({ ...payload, course_id: null }).success,
    false,
  );
});
test("Event and checklist input limits, templates are chosen by key", () => {
  const eventId = "0f1d5b6a-5c4e-4b1b-9d0a-2f6c1f6f7a11";
  const ok = { name: "Seminar", deadline_at: "2026-12-31T16:00:00Z" };
  assert.equal(eventSchema.safeParse(ok).success, true);
  assert.equal(
    eventSchema.safeParse({ ...ok, template: "seminar" }).success,
    true,
  );
  for (const bad of [
    { name: " " },
    { name: "x".repeat(201) },
    { template: "unknown" },
    { deadline_at: "besok" },
    { user_id: eventId },
  ])
    assert.equal(eventSchema.safeParse({ ...ok, ...bad }).success, false);
  const item = { event_id: eventId, label: "Pesan tempat" };
  assert.equal(checklistSchema.parse(item).is_completed, false);
  assert.equal(
    checklistSchema.safeParse({ ...item, label: " " }).success,
    false,
  );
  for (const t of Object.values(eventTemplates)) {
    assert.ok(t.items.length >= 1 && t.items.length <= 20);
    for (const label of t.items)
      assert.ok(label.length >= 1 && label.length <= 200);
  }
});
