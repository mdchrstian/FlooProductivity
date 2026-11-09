import { z } from "zod";
import { IANAZone } from "luxon";
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
    course_id: z.uuid("Pilih mata kuliah."),
    title: z.string().trim().min(1, "Judul tugas wajib diisi.").max(200),
    description: z.string().trim().max(5000).default(""),
    deadline_at: z.iso.datetime({ offset: true }),
    status: z.enum(["todo", "in_progress", "done"]).default("todo"),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
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
export const settingsSchema = z
  .object({
    timezone: timezoneSchema,
    academic_module_enabled: z.boolean(),
    name: z.string().trim().min(1, "Nama wajib diisi.").max(100),
  })
  .strict();
export const registrationSchema = z
  .object({
    name: z.string().trim().min(1, "Nama wajib diisi.").max(100),
    email: z.email("Email tidak valid."),
    password: z.string().min(8, "Password minimal 8 karakter."),
    confirm: z.string(),
    timezone: timezoneSchema,
  })
  .refine((v) => v.password === v.confirm, {
    message: "Konfirmasi password tidak sama.",
    path: ["confirm"],
  });
