import { z } from "zod";
import { IANAZone } from "luxon";
import { templateKeys } from "./templates";
export const timezoneSchema = z
  .string()
  .refine((v) => IANAZone.isValidZone(v), "Zona waktu tidak valid.");
export const courseSchema = z
  .object({
    name: z.string().trim().min(1, "Nama mata kuliah wajib diisi.").max(200),
    lecturer: z.string().trim().max(200).default(""),
    credits: z
      .number()
      .int("SKS harus bilangan bulat.")
      .positive("SKS harus lebih dari nol."),
  })
  .strict();
export const taskSchema = z
  .object({
    course_id: z.uuid("Pilih mata kuliah.").nullable().default(null),
    event_id: z.uuid("Pilih Event.").nullable().default(null),
    title: z.string().trim().min(1, "Judul tugas wajib diisi.").max(200),
    description: z.string().trim().max(5000).default(""),
    deadline_at: z.iso.datetime({ offset: true }),
    status: z.enum(["todo", "in_progress", "done"]).default("todo"),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
  })
  .strict()
  .refine((v) => (v.course_id === null) !== (v.event_id === null), {
    message: "Pilih tepat satu mata kuliah atau Event.",
    path: ["course_id"],
  });
export const eventSchema = z
  .object({
    name: z.string().trim().min(1, "Nama Event wajib diisi.").max(200),
    role: z.string().trim().max(100).default(""),
    deadline_at: z.iso.datetime({ offset: true }),
    template: z.enum(templateKeys).optional(),
  })
  .strict();
export const checklistSchema = z
  .object({
    event_id: z.uuid("Event tidak valid."),
    label: z.string().trim().min(1, "Isi item wajib diisi.").max(200),
    is_completed: z.boolean().default(false),
    position: z.number().int().min(0).max(1000).optional(),
  })
  .strict();
export const dailySchema = z
  .object({
    title: z.string().trim().min(1, "Judul wajib diisi.").max(200),
    due_date: z.iso.date("Tanggal tidak valid.").nullable().default(null),
    is_done: z.boolean().default(false),
  })
  .strict();
export const noteSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Isi catatan wajib diisi.")
      .max(10000, "Catatan maksimal 10.000 karakter."),
    course_id: z.uuid("Mata kuliah tidak valid.").nullable().default(null),
  })
  .strict();
export const sessionSchema = z
  .object({
    duration_minutes: z
      .number()
      .int("Durasi harus bilangan bulat.")
      .min(1, "Durasi minimal 1 menit.")
      .max(180, "Durasi maksimal 180 menit."),
    course_id: z.uuid("Mata kuliah tidak valid.").nullable().default(null),
  })
  .strict();
const clock = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Jam harus berformat HH:MM.");
export const scheduleSchema = z
  .object({
    course_id: z.uuid("Pilih mata kuliah."),
    day_of_week: z.number().int().min(1).max(7),
    start_time: clock,
    end_time: clock,
  })
  .strict()
  .refine((v) => v.end_time > v.start_time, {
    message: "Jam selesai harus setelah jam mulai.",
    path: ["end_time"],
  });
const studentFields = {
  udayana_student: z.boolean(),
  semester: z.number().int().min(1).max(14).nullable(),
};
const studentOk = (v: { udayana_student: boolean; semester: number | null }) =>
  v.udayana_student === (v.semester !== null);
const studentIssue = {
  message: "Pilih semester untuk mahasiswa Informatika Udayana.",
  path: ["semester"],
};
export const curriculumSchema = z
  .object({ curriculum_semester: z.number().int().min(1).max(4) })
  .strict();
export const settingsSchema = z
  .object({
    timezone: timezoneSchema,
    academic_module_enabled: z.boolean(),
    committee_module_enabled: z.boolean(),
    name: z.string().trim().min(1, "Nama wajib diisi.").max(100),
    ...studentFields,
  })
  .strict()
  .refine(studentOk, studentIssue);
export const registrationSchema = z
  .object({
    name: z.string().trim().min(1, "Nama wajib diisi.").max(100),
    email: z.email("Email tidak valid."),
    password: z.string().min(8, "Password minimal 8 karakter."),
    confirm: z.string(),
    timezone: timezoneSchema,
    ...studentFields,
  })
  .refine(studentOk, studentIssue)
  .refine((v) => v.password === v.confirm, {
    message: "Konfirmasi password tidak sama.",
    path: ["confirm"],
  });
