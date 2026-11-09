export type Status = "todo" | "in_progress" | "done";
export type Priority = "low" | "medium" | "high";
export type Course = {
  id: string;
  user_id: string;
  name: string;
  lecturer: string;
  credits: number;
};
export type Task = {
  id: string;
  course_id: string | null;
  event_id: string | null;
  title: string;
  description: string;
  deadline_at: string;
  status: Status;
  priority: Priority;
};
export type CommitteeEvent = {
  id: string;
  name: string;
  role: string;
  deadline_at: string;
  created_at: string;
};
export type ChecklistItem = {
  id: string;
  event_id: string;
  label: string;
  is_completed: boolean;
  position: number;
};
export type Note = {
  id: string;
  course_id: string | null;
  content: string;
  created_at: string;
};
export type PomodoroSession = {
  id: string;
  course_id: string | null;
  duration_minutes: number;
  created_at: string;
};
export type ScheduleItem = {
  id: string;
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};
export const weekdays = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];
export type Settings = {
  timezone: string;
  academic_module_enabled: boolean;
  committee_module_enabled: boolean;
};
export type Workspace = {
  userId: string;
  profile: { name: string; email: string };
  courses: Course[];
  tasks: Task[];
  notes: Note[];
  sessions: PomodoroSession[];
  schedule: ScheduleItem[];
  events: CommitteeEvent[];
  checklist: ChecklistItem[];
  settings: Settings;
};
export const statuses: Record<Status, string> = {
  todo: "Belum dimulai",
  in_progress: "Sedang dikerjakan",
  done: "Selesai",
};
export const priorities: Record<Priority, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
};
