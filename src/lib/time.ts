import { DateTime } from "luxon";
import type { Task } from "./types";
export function localDeadline(value: string, zone: string): string {
  const date = DateTime.fromISO(value, { zone });
  if (!date.isValid || date.toFormat("yyyy-MM-dd'T'HH:mm") !== value)
    throw new Error("Tanggal atau jam tidak valid pada zona waktu ini.");
  if (date.getPossibleOffsets().length > 1)
    throw new Error(
      "Jam ini ambigu karena perubahan waktu musiman. Pilih jam lain.",
    );
  return date.toUTC().toISO()!;
}
export function dayKey(value: string, zone: string) {
  return DateTime.fromISO(value).setZone(zone).toISODate()!;
}
export function formatDeadline(value: string, zone: string) {
  return DateTime.fromISO(value)
    .setZone(zone)
    .setLocale("id")
    .toFormat("d MMM yyyy, HH.mm");
}
export function taskGroups(
  tasks: Task[],
  zone: string,
  now: DateTime = DateTime.now(),
) {
  const current = now.setZone(zone),
    end = current.startOf("day").plus({ days: 8 });
  const active = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => Date.parse(a.deadline_at) - Date.parse(b.deadline_at));
  return {
    overdue: active.filter(
      (t) => DateTime.fromISO(t.deadline_at).toMillis() < current.toMillis(),
    ),
    today: active.filter(
      (t) => dayKey(t.deadline_at, zone) === current.toISODate(),
    ),
    upcoming: active.filter((t) => {
      const dt = DateTime.fromISO(t.deadline_at);
      return dt >= current.startOf("day").plus({ days: 1 }) && dt < end;
    }),
  };
}
