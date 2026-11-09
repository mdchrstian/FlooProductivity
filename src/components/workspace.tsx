"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import { browserClient } from "@/lib/supabase/browser";
import Icon from "./icon";
import {
  courseSchema,
  taskSchema,
  noteSchema,
  sessionSchema,
  scheduleSchema,
  eventSchema,
  checklistSchema,
  dailySchema,
  settingsSchema,
} from "@/lib/validation";
import { eventTemplates } from "@/lib/templates";
import {
  committeeLogo,
  curriculum,
  curriculumSemesters,
  isHimaif,
  verifyQuestion,
} from "@/lib/udayana";
import { localDeadline, formatDeadline, dayKey, taskGroups } from "@/lib/time";
import {
  statuses,
  priorities,
  type Course,
  type Task,
  type Note,
  type CommitteeEvent,
  type ScheduleItem,
  weekdays,
  type Workspace,
} from "@/lib/types";

type Editor =
  | { kind: "course"; value?: Course }
  | { kind: "task"; value?: Task; courseId?: string; eventId?: string }
  | { kind: "event"; value?: CommitteeEvent }
  | { kind: "note"; value?: Note; courseId?: string }
  | { kind: "schedule"; value?: ScheduleItem; courseId?: string }
  | null;
type Store = {
  data: Workspace;
  busy: boolean;
  now: DateTime;
  save: (
    resource: string,
    payload?: unknown,
    id?: string,
    remove?: boolean,
  ) => Promise<void>;
  edit: (editor: Editor) => void;
  notice: (s: string) => void;
};
const Context = createContext<Store | null>(null);
function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("Workspace unavailable");
  return value;
}
const nav = [
  ["dashboard", "Dashboard"],
  ["daily", "Harian"],
  ["academic", "Mata kuliah"],
  ["committee", "Kepanitiaan"],
  ["calendar", "Kalender"],
  ["notes", "Catatan"],
  ["focus", "Pomodoro"],
  ["settings", "Pengaturan"],
] as const;
export default function WorkspaceShell({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string;
}) {
  const [data, setData] = useState<Workspace | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [editor, setEditor] = useState<Editor>(null),
    [menu, setMenu] = useState(false),
    [now, setNow] = useState(DateTime.now());
  const [actionError, setActionError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const path = usePathname();
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);
  async function load(signal?: AbortSignal) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/workspace", { cache: "no-store", signal });
      if (res.status === 401) {
        setData(null);
        window.location.replace("/login");
        return;
      }
      if (!res.ok)
        throw new Error(
          "Data belum dapat dimuat. Periksa Supabase dan koneksi kamu.",
        );
      const value: Workspace = await res.json();
      if (value.userId !== userId)
        throw new Error("Sesi berubah. Silakan masuk kembali.");
      setData(value);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [userId]); // A new signed-in user always gets a fresh workspace.
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(DateTime.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setMenu(false);
    setMessage("");
    setActionError("");
  }, [path]);
  async function save(
    resource: string,
    payload?: unknown,
    id?: string,
    remove = false,
  ) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setActionError("");
    try {
      const res = await fetch("/api/" + resource + (id ? "/" + id : ""), {
        method: remove
          ? "DELETE"
          : id || resource === "settings"
            ? "PATCH"
            : "POST",
        headers: { "Content-Type": "application/json" },
        body: remove ? undefined : JSON.stringify(payload),
      });
      const value = await res.json();
      if (res.status === 401) {
        setData(null);
        window.location.replace("/login");
        throw new Error("Sesi berakhir. Silakan masuk kembali.");
      }
      if (!res.ok) throw new Error(value.error || "Penyimpanan gagal.");
      setData((current) => {
        if (!current) return current;
        if (resource === "settings") {
          const v = payload as {
            name: string;
            timezone: string;
            academic_module_enabled: boolean;
            committee_module_enabled: boolean;
            udayana_student: boolean;
            semester: number | null;
          };
          return {
            ...current,
            profile: { ...current.profile, name: v.name },
            settings: {
              timezone: v.timezone,
              academic_module_enabled: v.academic_module_enabled,
              committee_module_enabled: v.committee_module_enabled,
              udayana_student: v.udayana_student,
              semester: v.semester,
            },
          };
        }
        if (resource === "courses") {
          const courses = remove
            ? current.courses.filter((c) => c.id !== id)
            : id
              ? current.courses.map((c) => (c.id === id ? value : c))
              : [
                  ...current.courses,
                  ...(Array.isArray(value) ? value : [value]),
                ];
          // Mirrors ON DELETE SET NULL so linked notes stay without a reload.
          const notes = remove
            ? current.notes.map((n) =>
                n.course_id === id ? { ...n, course_id: null } : n,
              )
            : current.notes;
          const sessions = remove
            ? current.sessions.map((s) =>
                s.course_id === id ? { ...s, course_id: null } : s,
              )
            : current.sessions;
          // Mirrors ON DELETE CASCADE for class slots.
          const schedule = remove
            ? current.schedule.filter((x) => x.course_id !== id)
            : current.schedule;
          return { ...current, courses, notes, sessions, schedule };
        }
        if (resource === "events") {
          // POST returns { event, items }; PATCH returns the event row.
          if (remove)
            return {
              ...current,
              events: current.events.filter((x) => x.id !== id),
              checklist: current.checklist.filter((x) => x.event_id !== id),
            };
          if (id)
            return {
              ...current,
              events: current.events.map((x) => (x.id === id ? value : x)),
            };
          return {
            ...current,
            events: [...current.events, value.event],
            checklist: [...current.checklist, ...value.items],
          };
        }
        if (resource === "checklist_items") {
          const checklist = remove
            ? current.checklist.filter((x) => x.id !== id)
            : id
              ? current.checklist.map((x) => (x.id === id ? value : x))
              : [...current.checklist, value];
          return { ...current, checklist };
        }
        if (resource === "schedule_items") {
          const byTime = (a: ScheduleItem, b: ScheduleItem) =>
            a.day_of_week - b.day_of_week ||
            a.start_time.localeCompare(b.start_time);
          const schedule = remove
            ? current.schedule.filter((x) => x.id !== id)
            : id
              ? current.schedule.map((x) => (x.id === id ? value : x))
              : [...current.schedule, value];
          return { ...current, schedule: schedule.sort(byTime) };
        }
        if (resource === "pomodoro_sessions") {
          const sessions = remove
            ? current.sessions.filter((s) => s.id !== id)
            : [value, ...current.sessions];
          return { ...current, sessions };
        }
        if (resource === "daily_tasks") {
          const daily = remove
            ? current.daily.filter((d) => d.id !== id)
            : id
              ? current.daily.map((d) => (d.id === id ? value : d))
              : [...current.daily, value];
          return { ...current, daily };
        }
        if (resource === "notes") {
          const notes = remove
            ? current.notes.filter((n) => n.id !== id)
            : id
              ? current.notes.map((n) => (n.id === id ? value : n))
              : [value, ...current.notes];
          return { ...current, notes };
        }
        const tasks = remove
          ? current.tasks.filter((t) => t.id !== id)
          : id
            ? current.tasks.map((t) => (t.id === id ? value : t))
            : [...current.tasks, value];
        return { ...current, tasks };
      });
      setMessage(
        remove
          ? "Data dihapus."
          : Array.isArray(value)
            ? value.length
              ? value.length + " mata kuliah ditambahkan."
              : "Semua mata kuliah semester ini sudah ada."
            : "Perubahan tersimpan.",
      );
    } catch (e) {
      throw new Error(
        (e as Error).message.includes("fetch")
          ? "Koneksi terputus. Data belum tersimpan; coba lagi."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError("");
    try {
      const { error } = await browserClient().auth.signOut();
      if (error) throw error;
      setData(null);
      window.location.replace("/login");
    } catch {
      setError("Gagal keluar. Periksa koneksi lalu coba lagi.");
      setBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <a className="skip" href="#content">
        Lewati navigasi
      </a>
      <aside
        id="mobile-navigation"
        className={"sidebar " + (menu ? "open" : "")}
        onClick={(event) => {
          if ((event.target as Element).closest("a")) setMenu(false);
        }}
      >
        <Link href="/dashboard" className="wordmark">
          floo<span>.</span>
        </Link>
        <p className="brand-caption">Your day, in flow.</p>
        <div className="workspace-identity">
          <span className="workspace-monogram">F</span>
          <div>
            <strong>Ruang pribadimu</strong>
            <small>Untuk rencana dan langkahmu</small>
          </div>
        </div>
        <p className="workspace-label">Ruang belajarmu</p>
        <nav aria-label="Navigasi utama">
          {nav
            .filter(
              ([id]) =>
                id !== "settings" &&
                (id !== "academic" ||
                  data?.settings.academic_module_enabled !== false) &&
                (id !== "committee" ||
                  data?.settings.committee_module_enabled !== false),
            )
            .map(([id, label]) => (
              <Link
                key={id}
                href={"/" + id}
                aria-current={path === "/" + id ? "page" : undefined}
              >
                <Icon name={id} />
                <span>{label}</span>
                {id === "academic" && !!data?.courses.length && (
                  <small className="nav-count">{data.courses.length}</small>
                )}
              </Link>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <Link
            className="settings-link"
            href="/settings"
            aria-current={path === "/settings" ? "page" : undefined}
          >
            <Icon name="settings" />
            Pengaturan
          </Link>
          <div className="profile">
            <div className="avatar">
              {data?.profile.name.slice(0, 1).toUpperCase() || "F"}
            </div>
            <div>
              <strong>{data?.profile.name || "FLOO"}</strong>
              <span className="small muted">Akun pribadi</span>
            </div>
            <button className="profile-logout" onClick={logout} disabled={busy}>
              Keluar
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-expanded={menu}
            aria-controls="mobile-navigation"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "Tutup menu" : "Menu"}
          >
            <Icon name="menu" />
          </button>
          <div className="breadcrumb">
            <span>Ruangku</span>
            <span className="breadcrumb-divider">/</span>
            <strong>
              {nav.find(([id]) => path === "/" + id)?.[1] || "Dashboard"}
            </strong>
          </div>
          <div className="top-actions">
            <button
              className="search-trigger"
              aria-label="Cari di ruangmu"
              onClick={() => setSearchOpen(true)}
              disabled={!data}
            >
              <Icon name="search" />
              <span>Cari di ruangmu</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="top-date">
              <Icon name="calendar" />
              {now
                .setZone(data?.settings.timezone || "local")
                .setLocale("id")
                .toFormat("cccc, d LLLL yyyy")}
            </span>
            <Link
              href="/settings"
              className="top-avatar"
              aria-label="Buka pengaturan profil"
            >
              {data?.profile.name.slice(0, 1).toUpperCase() || "F"}
            </Link>
          </div>
        </header>
        <main id="content" tabIndex={-1}>
          {loading ? (
            <div className="loading" role="status">
              <div className="skeleton" />
              <div className="skeleton" />
              <p>Memuat ruangmu…</p>
            </div>
          ) : error ? (
            <section className="empty">
              <h1>Ruangmu belum dapat dibuka</h1>
              <p role="alert" className="error">
                {error}
              </p>
              <button className="primary" onClick={() => load()}>
                Coba lagi
              </button>
            </section>
          ) : data ? (
            <Context.Provider
              value={{
                data,
                busy,
                save,
                edit: setEditor,
                notice: (s) => {
                  setMessage("");
                  setActionError(s);
                },
                now,
              }}
            >
              {message && !menu && (
                <div role="status" className="notice">
                  <Icon name="check" />
                  <span>{message}</span>
                  <button
                    className="notice-close"
                    aria-label="Tutup pemberitahuan"
                    onClick={() => setMessage("")}
                  >
                    <Icon name="plus" />
                  </button>
                </div>
              )}
              {actionError && (
                <p role="alert" className="error">
                  {actionError}
                </p>
              )}
              {children}
              {editor && (
                <EditorDialog editor={editor} close={() => setEditor(null)} />
              )}
              {searchOpen && (
                <SearchDialog close={() => setSearchOpen(false)} />
              )}
            </Context.Provider>
          ) : null}
        </main>
        <footer className="workspace-footer">
          <span>Ruang kecil untuk rencana besar.</span>
          <span>FLOO · {data?.settings.timezone || "Ruang pribadimu"}</span>
        </footer>
      </div>
    </div>
  );
}
function Empty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-symbol">
        <Icon name="book" />
      </span>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
function AcademicOff() {
  return (
    <Empty title="Modul Akademik sedang disembunyikan">
      <p>Data mata kuliah dan tugasmu tetap tersimpan.</p>
      <Link className="primary button" href="/settings">
        Buka Pengaturan
      </Link>
    </Empty>
  );
}
function TaskRows({
  tasks,
  board = false,
}: {
  tasks: Task[];
  board?: boolean;
}) {
  const { data, edit, save, busy, notice } = useWorkspace();
  return tasks.length ? (
    <div className="task-list">
      {tasks.map((task) => (
        <div
          className={"task-row " + (task.status === "done" ? "completed" : "")}
          key={task.id}
        >
          {!board && (
            <input
              className="task-check"
              type="checkbox"
              checked={task.status === "done"}
              disabled={busy}
              aria-label={
                (task.status === "done"
                  ? "Tandai belum selesai "
                  : "Selesaikan ") + task.title
              }
              onChange={async (e) => {
                try {
                  await save(
                    "tasks",
                    {
                      ...taskPayload(task),
                      status: e.target.checked ? "done" : "todo",
                    },
                    task.id,
                  );
                } catch (err) {
                  notice((err as Error).message);
                }
              }}
            />
          )}
          {board && (
            <div className="task-head">
              <span className="task-course">
                <span
                  className={
                    "source-dot " +
                    (taskContext(data, task).committee ? "committee" : "")
                  }
                />
                {taskContext(data, task).committee && "Panitia · "}
                {taskContext(data, task).name}
              </span>
              <span className={"priority " + task.priority}>
                {priorities[task.priority]}
              </span>
            </div>
          )}
          <button
            className="task-content"
            onClick={() => edit({ kind: "task", value: task })}
          >
            <strong>{task.title}</strong>
            <span>
              {board
                ? task.description || "Belum ada deskripsi."
                : taskContext(data, task).name}
            </span>
          </button>
          <span className="task-due">
            <Icon name="calendar" />
            {DateTime.fromISO(task.deadline_at)
              .setZone(data.settings.timezone)
              .setLocale("id")
              .toFormat("d LLL, HH.mm")}
          </span>
          {!board && (
            <span className={"priority " + task.priority}>
              {priorities[task.priority]}
            </span>
          )}
          {board && (
            <>
              <label className="sr-only" htmlFor={"status-" + task.id}>
                Status {task.title}
              </label>
              <select
                id={"status-" + task.id}
                value={task.status}
                disabled={busy}
                onChange={async (e) => {
                  try {
                    await save(
                      "tasks",
                      { ...taskPayload(task), status: e.target.value },
                      task.id,
                    );
                  } catch (err) {
                    notice((err as Error).message);
                  }
                }}
              >
                {Object.entries(statuses).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </>
          )}
          {!board && (
            <button
              className="task-more icon-button"
              aria-label={"Detail " + task.title}
              onClick={() => edit({ kind: "task", value: task })}
            >
              <Icon name="arrow" />
            </button>
          )}
        </div>
      ))}
    </div>
  ) : (
    <Empty title="Tidak ada tugas di bagian ini">
      <p>Tugasmu akan muncul di sini saat sudah ditambahkan.</p>
    </Empty>
  );
}
// A Task belongs to exactly one Course or Event; name + source label for display.
function taskContext(data: Workspace, t: Task) {
  const event = t.event_id && data.events.find((e) => e.id === t.event_id);
  return event
    ? { name: event.name, committee: true }
    : {
        name: data.courses.find((c) => c.id === t.course_id)?.name,
        committee: false,
      };
}
// Hiding a module hides its Tasks everywhere without deleting them.
function visibleTasks(data: Workspace) {
  return data.tasks.filter((t) =>
    t.event_id
      ? data.settings.committee_module_enabled
      : data.settings.academic_module_enabled,
  );
}
function taskPayload(t: Task) {
  return {
    course_id: t.course_id,
    event_id: t.event_id,
    title: t.title,
    description: t.description,
    deadline_at: t.deadline_at,
    status: t.status,
    priority: t.priority,
  };
}
function SearchDialog({ close }: { close: () => void }) {
  const { data, edit } = useWorkspace(),
    router = useRouter(),
    ref = useRef<HTMLDialogElement>(null),
    [query, setQuery] = useState("");
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      (opener?.isConnected
        ? opener
        : document.getElementById("content")
      )?.focus({ preventScroll: true });
    };
  }, []);
  const term = query.trim().toLocaleLowerCase("id"),
    courses =
      term && data.settings.academic_module_enabled
        ? data.courses
            .filter((c) => c.name.toLocaleLowerCase("id").includes(term))
            .slice(0, 5)
        : [],
    tasks = term
      ? visibleTasks(data)
          .filter((t) => t.title.toLocaleLowerCase("id").includes(term))
          .slice(0, 6)
      : [],
    events =
      term && data.settings.committee_module_enabled
        ? data.events
            .filter((e) => e.name.toLocaleLowerCase("id").includes(term))
            .slice(0, 5)
        : [];
  return (
    <dialog
      className="search-dialog"
      ref={ref}
      aria-labelledby="search-title"
      onCancel={close}
    >
      <div className="dialog-heading">
        <h2 id="search-title">Cari di ruangmu</h2>
        <button
          className="dialog-close"
          aria-label="Tutup pencarian"
          onClick={close}
        >
          <Icon name="plus" />
        </button>
      </div>
      <div className="search-input-wrap">
        <Icon name="search" />
        <input
          autoFocus
          aria-label="Cari tugas atau mata kuliah"
          placeholder="Judul tugas atau nama mata kuliah..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <kbd>Esc</kbd>
      </div>
      <div className="search-results">
        {!term ? (
          <p className="search-hint">
            Mulai dari judul tugas atau mata kuliah yang kamu cari.
          </p>
        ) : !courses.length && !tasks.length && !events.length ? (
          <p className="search-hint">Belum ada hasil untuk "{query}".</p>
        ) : (
          <>
            {courses.length > 0 && <h3>Mata kuliah</h3>}
            {courses.map((course) => (
              <button
                key={course.id}
                className="search-result"
                onClick={() => {
                  router.push("/academic?course=" + course.id);
                  close();
                }}
              >
                <Icon name="academic" />
                <span>
                  <strong>{course.name}</strong>
                  <small>{course.credits} SKS</small>
                </span>
                <Icon name="arrow" />
              </button>
            ))}
            {events.length > 0 && <h3>Kepanitiaan</h3>}
            {events.map((event) => (
              <button
                key={event.id}
                className="search-result"
                onClick={() => {
                  router.push("/committee?event=" + event.id);
                  close();
                }}
              >
                <Icon name="committee" />
                <span>
                  <strong>{event.name}</strong>
                  <small>{event.role || "Event"}</small>
                </span>
                <Icon name="arrow" />
              </button>
            ))}
            {tasks.length > 0 && <h3>Tugas</h3>}
            {tasks.map((task) => (
              <button
                key={task.id}
                className="search-result"
                onClick={() => {
                  close();
                  edit({ kind: "task", value: task });
                }}
              >
                <Icon name="check" />
                <span>
                  <strong>{task.title}</strong>
                  <small>{taskContext(data, task).name}</small>
                </span>
                <Icon name="arrow" />
              </button>
            ))}
          </>
        )}
      </div>
    </dialog>
  );
}
export function WorkspaceView({ section }: { section: string }) {
  const { data, edit, now } = useWorkspace();
  if (section === "settings") return <SettingsView />;
  if (section === "calendar") return <CalendarView />;
  if (section === "academic") return <AcademicView />;
  if (section === "daily") return <DailyView />;
  if (section === "notes") return <NotesView />;
  if (section === "focus") return <FocusView />;
  if (section === "committee") return <CommitteeView />;
  return <Dashboard />;
}
function Dashboard() {
  const { data, edit, now } = useWorkspace(),
    [filter, setFilter] = useState<"today" | "overdue" | "upcoming" | "done">(
      "today",
    );
  const mine = visibleTasks(data),
    academic = data.settings.academic_module_enabled,
    committee = data.settings.committee_module_enabled,
    hasContent =
      (academic && data.courses.length > 0) ||
      (committee && data.events.length > 0);
  const groups = taskGroups(mine, data.settings.timezone, now),
    done = mine.filter((t) => t.status === "done"),
    total = mine.length;
  const zone = data.settings.timezone,
    today = now.setZone(zone),
    [selectedDay, setSelectedDay] = useState(today.toISODate()!);
  const days = Array.from({ length: 7 }, (_, i) =>
    today.startOf("week").plus({ days: i }),
  );
  const agenda = mine
    .filter((t) => dayKey(t.deadline_at, zone) === selectedDay)
    .sort((a, b) => a.deadline_at.localeCompare(b.deadline_at));
  const percent = total ? Math.round((done.length / total) * 100) : 0;
  const period =
    today.hour < 11 && today.hour >= 5
      ? "pagi"
      : today.hour < 15 && today.hour >= 11
        ? "siang"
        : today.hour < 18 && today.hour >= 15
          ? "sore"
          : "malam";
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            Selamat {period}, <span>{data.profile.name.split(" ")[0]}.</span>
          </h1>
          <p>
            {total
              ? `Ada ${total - done.length} tugas aktif di ruangmu. Satu per satu, kamu bisa.`
              : "Ruangmu sudah siap. Mulai dari mata kuliah pertamamu."}
          </p>
        </div>
        {hasContent && (
          <button className="primary" onClick={() => edit({ kind: "task" })}>
            <Icon name="plus" />
            Tambah tugas
          </button>
        )}
      </div>
      {!academic && !committee ? (
        <Empty title="Semua modul sedang disembunyikan">
          <p>Data tetap tersimpan. Aktifkan modul lagi di Pengaturan.</p>
          <Link className="primary button" href="/settings">
            Buka Pengaturan
          </Link>
        </Empty>
      ) : !hasContent ? (
        <section className="welcome-start">
          <span className="welcome-symbol">
            <Icon name="academic" />
          </span>
          <h2>
            {academic
              ? "Mulai dari mata kuliah pertamamu."
              : "Mulai dari Event pertamamu."}
          </h2>
          <p>
            Beri tempat untuk tugas-tugasmu. Deadline yang kamu tambahkan nanti
            akan tersusun di Dashboard dan Kalender.
          </p>
          <button
            className="primary"
            onClick={() =>
              edit(academic ? { kind: "course" } : { kind: "event" })
            }
          >
            <Icon name="plus" />
            {academic ? "Tambah mata kuliah" : "Tambah Event"}
          </button>
          <div className="onboarding-trail">
            <span>
              <Icon name="academic" />
              Mata kuliah
            </span>
            <Icon name="arrow" />
            <span>
              <Icon name="check" />
              Tugas dan progres
            </span>
            <Icon name="arrow" />
            <span>
              <Icon name="calendar" />
              Kalendermu
            </span>
          </div>
        </section>
      ) : (
        <>
          <div className="summary">
            <div>
              <span className="stat-label">
                Terlambat <Icon name="clock" />
              </span>
              <strong>{groups.overdue.length}</strong>
              <small>
                {groups.overdue.length
                  ? "Perlu kamu lihat kembali"
                  : "Belum ada yang terlewat"}
              </small>
            </div>
            <div>
              <span className="stat-label">
                Deadline hari ini <Icon name="calendar" />
              </span>
              <strong>{groups.today.length}</strong>
              <small>Fokus pada langkah hari ini</small>
            </div>
            <div>
              <span className="stat-label">
                7 hari mendatang <Icon name="book" />
              </span>
              <strong>{groups.upcoming.length}</strong>
              <small>Ruang untuk menyiapkan diri</small>
            </div>
            <div>
              <span className="stat-label">
                Tugas selesai <Icon name="check" />
              </span>
              <strong>
                {done.length}
                <small> / {total}</small>
              </strong>
              <small>
                {total
                  ? `${percent}% dari seluruh tugas`
                  : "Langkah pertamamu dimulai di sini"}
              </small>
            </div>
          </div>
          <div className="dashboard-layout">
            <div className="dashboard-main-column">
              <section className="panel agenda-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Agenda pekan ini</h2>
                    <span>
                      {today.startOf("week").setLocale("id").toFormat("d LLL")}{" "}
                      -{" "}
                      {today
                        .endOf("week")
                        .setLocale("id")
                        .toFormat("d LLL yyyy")}
                    </span>
                  </div>
                  <Link href="/calendar" className="text-button">
                    Lihat kalender <Icon name="arrow" />
                  </Link>
                </div>
                <div className="week-strip">
                  {days.map((day) => {
                    const key = day.toISODate()!,
                      count = mine.filter(
                        (t) => dayKey(t.deadline_at, zone) === key,
                      ).length;
                    return (
                      <button
                        key={key}
                        className={
                          "week-day " + (selectedDay === key ? "active" : "")
                        }
                        aria-pressed={selectedDay === key}
                        aria-label={
                          day.setLocale("id").toFormat("d LLLL yyyy") +
                          ", " +
                          count +
                          " tugas"
                        }
                        onClick={() => setSelectedDay(key)}
                      >
                        <span>{day.setLocale("id").toFormat("ccc")}</span>
                        <strong>{day.day}</strong>
                        <i className={count ? "has-agenda" : ""} />
                      </button>
                    );
                  })}
                </div>
                <div className="agenda-body">
                  <div className="agenda-date-label">
                    <span>
                      {DateTime.fromISO(selectedDay)
                        .setLocale("id")
                        .toFormat("cccc, d LLLL")}
                    </span>
                    <span>{agenda.length} deadline</span>
                  </div>
                  {agenda.length ? (
                    agenda.slice(0, 4).map((task) => (
                      <button
                        className={
                          "agenda-row " +
                          (task.status === "done" ? "completed" : "")
                        }
                        key={task.id}
                        onClick={() => edit({ kind: "task", value: task })}
                      >
                        <span className="agenda-time">
                          {DateTime.fromISO(task.deadline_at)
                            .setZone(zone)
                            .toFormat("HH.mm")}
                          <small>Deadline</small>
                        </span>
                        <span className="agenda-task">
                          <strong>{task.title}</strong>
                          <span>
                            <Icon name="academic" />
                            {taskContext(data, task).name}
                          </span>
                        </span>
                        <span className="agenda-status">
                          {task.status === "done" ? (
                            <Icon name="check" />
                          ) : (
                            <Icon name="arrow" />
                          )}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="agenda-empty">
                      <span className="empty-symbol">
                        <Icon name="calendar" />
                      </span>
                      <h3>Belum ada deadline pada hari ini</h3>
                      <p>Kamu tetap bisa melihat tugas lain di daftar bawah.</p>
                    </div>
                  )}
                  {agenda.length > 4 && (
                    <Link className="text-button" href="/calendar">
                      Lihat {agenda.length - 4} deadline lainnya{" "}
                      <Icon name="arrow" />
                    </Link>
                  )}
                </div>
              </section>
              <section className="panel task-panel" id="task-panel">
                <div className="panel-heading">
                  <h2>Tugas terdekat</h2>
                  <Link href="/academic" className="text-button">
                    Buka papan tugas <Icon name="arrow" />
                  </Link>
                </div>
                <div className="tabs" role="group" aria-label="Filter tugas">
                  {(
                    [
                      ["today", "Hari ini"],
                      ["overdue", "Terlambat"],
                      ["upcoming", "Mendatang"],
                      ["done", "Selesai"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      aria-pressed={filter === key}
                      className={filter === key ? "active" : ""}
                      onClick={() => setFilter(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <TaskRows tasks={filter === "done" ? done : groups[filter]} />
              </section>
            </div>
            <aside className="dashboard-side-column">
              <section className="progress-panel">
                <div className="progress-heading">
                  <Icon name="check" />
                  <h2>Progres belajarmu</h2>
                </div>
                <p>Pelan-pelan, tetap berjalan.</p>
                <div className="progress-ring">
                  <svg
                    viewBox="0 0 200 200"
                    role="img"
                    aria-label={percent + " persen tugas selesai"}
                  >
                    <circle className="ring-track" cx="100" cy="100" r="84" />
                    <circle
                      className="ring-value"
                      cx="100"
                      cy="100"
                      r="84"
                      strokeDasharray="527.79"
                      strokeDashoffset={527.79 * (1 - percent / 100)}
                    />
                  </svg>
                  <div>
                    <strong>
                      {percent}
                      <small>%</small>
                    </strong>
                    <span>Tugas selesai</span>
                  </div>
                </div>
                <p className="progress-count">
                  <strong>{done.length}</strong> dari <strong>{total}</strong>{" "}
                  tugas sudah selesai
                </p>
                <button
                  className="primary full"
                  onClick={() => {
                    setFilter("done");
                    document.getElementById("task-panel")?.scrollIntoView({
                      block: "nearest",
                      behavior: window.matchMedia(
                        "(prefers-reduced-motion: reduce)",
                      ).matches
                        ? "instant"
                        : "smooth",
                    });
                  }}
                >
                  Lihat yang selesai <Icon name="arrow" />
                </button>
                <span className="progress-footnote">
                  Satu hal dalam satu waktu.
                </span>
              </section>
              {academic && (
                <section className="panel courses-overview">
                  <div className="panel-heading">
                    <h2>Mata kuliahmu</h2>
                    <span>{data.courses.length}</span>
                  </div>
                  {data.courses.length ? (
                    <div className="course-mini-list">
                      {data.courses.slice(0, 3).map((course, i) => (
                        <Link
                          href={"/academic?course=" + course.id}
                          key={course.id}
                        >
                          <span className={"course-mini-icon color-" + (i % 3)}>
                            <Icon name="academic" />
                          </span>
                          <span>
                            <strong>{course.name}</strong>
                            <small>
                              {
                                data.tasks.filter(
                                  (t) =>
                                    t.course_id === course.id &&
                                    t.status !== "done",
                                ).length
                              }{" "}
                              tugas aktif · {course.credits} SKS
                            </small>
                          </span>
                          <Icon name="arrow" />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="course-mini-empty">
                      Mata kuliah pertamamu akan muncul di sini.
                    </p>
                  )}
                  <Link href="/academic" className="course-overview-link">
                    Lihat semua mata kuliah <Icon name="arrow" />
                  </Link>
                </section>
              )}
              <div className="calendar-note">
                <Icon name="calendar" />
                <p>Integrasi Google Calendar hadir pada tahap berikutnya.</p>
              </div>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
function AcademicView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data, edit } = useWorkspace(),
    [courseId, setCourseId] = useState(
      data.courses.some((c) => c.id === searchParams.get("course"))
        ? searchParams.get("course")!
        : "",
    ),
    [view, setView] = useState<"board" | "list">("board"),
    [curError, setCurError] = useState(""),
    { save, busy } = useWorkspace();
  const sem = data.settings.udayana_student ? data.settings.semester : null;
  const course = data.courses.find((c) => c.id === courseId),
    tasks = data.tasks.filter(
      (t) => t.course_id && (!courseId || t.course_id === courseId),
    );
  useEffect(() => {
    const id = searchParams.get("course");
    setCourseId(id && data.courses.some((c) => c.id === id) ? id : "");
  }, [searchParams, data.courses]);
  function chooseCourse(id: string) {
    setCourseId(id);
    router.replace(id ? "/academic?course=" + id : "/academic", {
      scroll: false,
    });
  }
  if (!data.settings.academic_module_enabled)
    return (
      <>
        <h1>Mata kuliah</h1>
        <AcademicOff />
      </>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{course?.name || "Mata kuliah"}</h1>
          <p>
            {course
              ? `${course.lecturer || "Dosen belum diisi"} · ${course.credits} SKS`
              : "Susun tugas sesuai konteks mata kuliahnya."}
          </p>
        </div>
        <div className="actions">
          {course && (
            <Link
              className="secondary button"
              href={"/notes?course=" + course.id}
            >
              Catatan (
              {data.notes.filter((n) => n.course_id === course.id).length})
            </Link>
          )}
          {course && (
            <button
              className="secondary"
              onClick={() => edit({ kind: "course", value: course })}
            >
              Edit mata kuliah
            </button>
          )}
          {!course && sem !== null && sem <= 4 && (
            <button
              className="secondary"
              disabled={busy}
              onClick={async () => {
                setCurError("");
                try {
                  await save("courses", { curriculum_semester: sem });
                } catch (e) {
                  setCurError((e as Error).message);
                }
              }}
            >
              Tambah mata kuliah semester {sem}
            </button>
          )}
          <button
            className="primary"
            onClick={() =>
              edit(
                course
                  ? { kind: "task", courseId: course.id }
                  : { kind: "course" },
              )
            }
          >
            {course ? "Tambah tugas" : "Tambah mata kuliah"}
          </button>
        </div>
      </div>
      {curError && (
        <p className="error" role="alert">
          {curError}
        </p>
      )}
      {course ? (
        <button className="text-button back" onClick={() => chooseCourse("")}>
          Kembali ke semua mata kuliah
        </button>
      ) : data.courses.length ? (
        <div className="course-grid">
          {data.courses.map((c, courseIndex) => (
            <article className="course" key={c.id}>
              <button
                className="course-title"
                onClick={() => chooseCourse(c.id)}
              >
                <span className={"course-cover color-" + (courseIndex % 3)}>
                  <Icon name="academic" />
                </span>
                <h2>{c.name}</h2>
                <p>{c.lecturer || "Dosen belum diisi"}</p>
              </button>
              <div className="course-meta">
                <span>
                  {c.credits} SKS ·{" "}
                  {
                    data.tasks.filter(
                      (t) => t.course_id === c.id && t.status !== "done",
                    ).length
                  }{" "}
                  tugas aktif
                </span>
                <button
                  className="text-button"
                  aria-label={"Edit " + c.name}
                  onClick={() => edit({ kind: "course", value: c })}
                >
                  Edit
                </button>
              </div>
              <div className="course-progress">
                <span>
                  <i
                    style={{
                      width:
                        (data.tasks.filter((t) => t.course_id === c.id).length
                          ? (data.tasks.filter(
                              (t) =>
                                t.course_id === c.id && t.status === "done",
                            ).length /
                              data.tasks.filter((t) => t.course_id === c.id)
                                .length) *
                            100
                          : 0) + "%",
                    }}
                  />
                </span>
                <small>
                  {
                    data.tasks.filter(
                      (t) => t.course_id === c.id && t.status === "done",
                    ).length
                  }{" "}
                  dari {data.tasks.filter((t) => t.course_id === c.id).length}{" "}
                  tugas selesai
                </small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="Belum ada mata kuliah">
          <p>
            Mulai dengan mata kuliah pertama, lalu tambahkan tugas di dalamnya.
          </p>
          <button className="primary" onClick={() => edit({ kind: "course" })}>
            Tambah mata kuliah pertama
          </button>
        </Empty>
      )}
      {course && <ScheduleSection course={course} />}
      {data.courses.length > 0 && (
        <>
          <div className="section-heading">
            <h2>{course ? "Papan tugas" : "Semua tugas"}</h2>
            <div className="actions">
              <select
                aria-label="Filter mata kuliah"
                value={courseId}
                onChange={(e) => chooseCourse(e.target.value)}
              >
                <option value="">Semua mata kuliah</option>
                {data.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                className="secondary"
                onClick={() => setView(view === "board" ? "list" : "board")}
              >
                {view === "board" ? "Tampilan daftar" : "Tampilan papan"}
              </button>
              {!course && (
                <button
                  className="primary"
                  onClick={() =>
                    edit({ kind: "task", courseId: courseId || undefined })
                  }
                >
                  Tambah tugas
                </button>
              )}
            </div>
          </div>
          {view === "list" ? (
            <TaskRows tasks={tasks} />
          ) : (
            <KanbanBoard tasks={tasks} />
          )}
        </>
      )}
    </>
  );
}
function DailyView() {
  const { data, save, busy, notice } = useWorkspace(),
    zone = data.settings.timezone,
    today = DateTime.now().setZone(zone).toISODate()!,
    [error, setError] = useState(""),
    [showDone, setShowDone] = useState(false);
  const open = data.daily
      .filter((d) => !d.is_done)
      .sort((a, b) =>
        (a.due_date || "9999").localeCompare(b.due_date || "9999"),
      ),
    done = data.daily.filter((d) => d.is_done);
  async function run(p: Promise<void>) {
    try {
      await p;
    } catch (e) {
      notice((e as Error).message);
    }
  }
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const form = e.currentTarget,
      f = new FormData(form);
    try {
      await save(
        "daily_tasks",
        dailySchema.parse({
          title: String(f.get("title")),
          due_date: String(f.get("due")) || null,
        }),
      );
      form.reset();
    } catch (err) {
      setError(validationMessage(err));
    }
  }
  const label = (d: string) =>
    d === today
      ? "Hari ini"
      : d < today
        ? "Terlambat · " + DateTime.fromISO(d).setLocale("id").toFormat("d LLL")
        : DateTime.fromISO(d).setLocale("id").toFormat("d LLL");
  const row = (d: (typeof data.daily)[number]) => (
    <div
      className={"task-row daily-row " + (d.is_done ? "completed" : "")}
      key={d.id}
    >
      <input
        className="task-check"
        type="checkbox"
        checked={d.is_done}
        disabled={busy}
        aria-label={
          (d.is_done ? "Tandai belum selesai " : "Selesaikan ") + d.title
        }
        onChange={(e) =>
          run(
            save(
              "daily_tasks",
              {
                title: d.title,
                due_date: d.due_date,
                is_done: e.target.checked,
              },
              d.id,
            ),
          )
        }
      />
      <div className="task-content">
        <strong>{d.title}</strong>
      </div>
      {d.due_date && (
        <span className="task-due">
          <Icon name="calendar" />
          {label(d.due_date)}
        </span>
      )}
      <button
        className="text-button"
        disabled={busy}
        aria-label={"Hapus " + d.title}
        onClick={() => run(save("daily_tasks", undefined, d.id, true))}
      >
        Hapus
      </button>
    </div>
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Harian</h1>
          <p>Tugas ringan yang tidak perlu masuk ke mata kuliah atau Event.</p>
        </div>
      </div>
      <form method="post" className="daily-add" onSubmit={add}>
        <input
          name="title"
          placeholder="Tulis tugas, lalu tekan Enter"
          aria-label="Judul tugas harian"
          required
          maxLength={200}
        />
        <input name="due" type="date" aria-label="Tanggal (opsional)" />
        <button className="primary" disabled={busy}>
          Tambah
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {open.length ? (
        <div className="task-list">{open.map(row)}</div>
      ) : (
        <Empty title="Belum ada tugas harian">
          <p>Tambahkan satu di atas, misalnya &quot;Fotokopi KRS&quot;.</p>
        </Empty>
      )}
      {done.length > 0 && (
        <>
          <div className="section-heading">
            <h2>{done.length} selesai</h2>
            <button
              className="text-button"
              onClick={() => setShowDone(!showDone)}
            >
              {showDone ? "Sembunyikan" : "Tampilkan"}
            </button>
          </div>
          {showDone && <div className="task-list">{done.map(row)}</div>}
        </>
      )}
    </>
  );
}
function NotesView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data, edit } = useWorkspace();
  // "" = semua, "none" = tanpa mata kuliah, otherwise a course id.
  const valid = (v: string | null) =>
    v === "none" || data.courses.some((c) => c.id === v) ? v! : "";
  const [filter, setFilter] = useState(valid(searchParams.get("course")));
  useEffect(() => {
    setFilter(valid(searchParams.get("course")));
  }, [searchParams, data.courses]);
  function choose(v: string) {
    setFilter(v);
    router.replace(v ? "/notes?course=" + v : "/notes", { scroll: false });
  }
  const notes = data.notes.filter((n) =>
    !filter ? true : filter === "none" ? !n.course_id : n.course_id === filter,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Catatan</h1>
          <p>Catat materi bebas atau kaitkan dengan satu mata kuliah.</p>
        </div>
        <div className="actions">
          <button
            className="primary"
            onClick={() =>
              edit({
                kind: "note",
                courseId: filter && filter !== "none" ? filter : undefined,
              })
            }
          >
            Catatan baru
          </button>
        </div>
      </div>
      {data.notes.length > 0 && (
        <div className="section-heading">
          <h2>{notes.length} catatan</h2>
          <div className="actions">
            <select
              aria-label="Filter mata kuliah"
              value={filter}
              onChange={(e) => choose(e.target.value)}
            >
              <option value="">Semua catatan</option>
              <option value="none">Tanpa mata kuliah</option>
              {data.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      {notes.length ? (
        <div className="course-grid">
          {notes.map((n) => {
            const [first, ...rest] = n.content.split("\n");
            return (
              <article className="course note" key={n.id}>
                <button
                  className="course-title"
                  aria-label={"Edit catatan " + first}
                  onClick={() => edit({ kind: "note", value: n })}
                >
                  <h2>{first}</h2>
                  {rest.join("\n").trim() && (
                    <p className="note-body">{rest.join("\n").trim()}</p>
                  )}
                </button>
                <div className="course-meta">
                  <span>
                    {data.courses.find((c) => c.id === n.course_id)?.name ||
                      "Tanpa mata kuliah"}
                  </span>
                  <span>
                    {DateTime.fromISO(n.created_at)
                      .setZone(data.settings.timezone)
                      .setLocale("id")
                      .toFormat("d MMM yyyy")}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty
          title={
            data.notes.length
              ? "Tidak ada catatan di filter ini"
              : "Belum ada catatan"
          }
        >
          <p>
            {data.notes.length
              ? "Pilih filter lain atau buat catatan baru."
              : "Tulis catatan pertama, misalnya ringkasan materi kuliah."}
          </p>
        </Empty>
      )}
    </>
  );
}
const focusOptions = [15, 25, 45, 60];
function FocusView() {
  const { data, save, notice } = useWorkspace();
  const [minutes, setMinutes] = useState(25),
    [courseId, setCourseId] = useState(""),
    [run, setRun] = useState<{
      end: number;
      minutes: number;
      courseId: string;
    } | null>(null),
    [left, setLeft] = useState(25 * 60);
  // Counts down from an end timestamp so background-tab throttling cannot drift it.
  useEffect(() => {
    if (!run) return;
    const timer = setInterval(async () => {
      const s = Math.max(0, Math.ceil((run.end - Date.now()) / 1000));
      setLeft(s);
      if (s > 0) return;
      clearInterval(timer);
      setRun(null);
      try {
        await save(
          "pomodoro_sessions",
          sessionSchema.parse({
            duration_minutes: run.minutes,
            course_id: run.courseId || null,
          }),
        );
      } catch (e) {
        notice((e as Error).message);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [run]);
  const shown = run ? left : minutes * 60,
    today = DateTime.now().setZone(data.settings.timezone).toISODate(),
    todayTotal = data.sessions
      .filter((s) => dayKey(s.created_at, data.settings.timezone) === today)
      .reduce((sum, s) => sum + s.duration_minutes, 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Pomodoro</h1>
          <p>Fokus satu sesi, lalu catat otomatis saat waktu habis.</p>
        </div>
      </div>
      <section className="panel focus-panel">
        <div className="focus-time" role="timer" aria-label="Sisa waktu fokus">
          {String(Math.floor(shown / 60)).padStart(2, "0")}:
          {String(shown % 60).padStart(2, "0")}
        </div>
        <div className="actions">
          <label>
            Durasi
            <select
              value={minutes}
              disabled={!!run}
              onChange={(e) => setMinutes(Number(e.target.value))}
            >
              {focusOptions.map((m) => (
                <option key={m} value={m}>
                  {m} menit
                </option>
              ))}
            </select>
          </label>
          <label>
            Mata kuliah (opsional)
            <select
              value={courseId}
              disabled={!!run}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Tanpa mata kuliah</option>
              {data.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {run ? (
            <button className="secondary" onClick={() => setRun(null)}>
              Hentikan (tidak dicatat)
            </button>
          ) : (
            <button
              className="primary"
              onClick={() => {
                setLeft(minutes * 60);
                setRun({
                  end: Date.now() + minutes * 60000,
                  minutes,
                  courseId,
                });
              }}
            >
              Mulai fokus
            </button>
          )}
        </div>
        <p className="muted small">
          Timer berjalan selama halaman ini terbuka. Pindah halaman
          menghentikannya tanpa mencatat sesi.
        </p>
      </section>
      <div className="section-heading">
        <h2>Riwayat sesi</h2>
        <span className="muted">Hari ini: {todayTotal} menit</span>
      </div>
      {data.sessions.length ? (
        <div className="task-list">
          {data.sessions.slice(0, 20).map((s) => (
            <div className="task-row" key={s.id}>
              <span>
                {s.duration_minutes} menit ·{" "}
                {data.courses.find((c) => c.id === s.course_id)?.name ||
                  "Tanpa mata kuliah"}
              </span>
              <span className="muted small">
                {formatDeadline(s.created_at, data.settings.timezone)}
              </span>
              <button
                className="text-button"
                aria-label="Hapus sesi"
                onClick={async () => {
                  try {
                    await save("pomodoro_sessions", undefined, s.id, true);
                  } catch (e) {
                    notice((e as Error).message);
                  }
                }}
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="Belum ada sesi">
          <p>Mulai sesi pertamamu. Sesi tercatat saat timer selesai.</p>
        </Empty>
      )}
    </>
  );
}
function KanbanBoard({ tasks }: { tasks: Task[] }) {
  return (
    <div className="kanban">
      {Object.entries(statuses).map(([status, label]) => (
        <section className={"kanban-column status-" + status} key={status}>
          <h3>
            <span className="kanban-status-dot" />
            {label}{" "}
            <span>{tasks.filter((t) => t.status === status).length}</span>
          </h3>
          <TaskRows board tasks={tasks.filter((t) => t.status === status)} />
        </section>
      ))}
    </div>
  );
}
function CommitteeView() {
  const searchParams = useSearchParams(),
    router = useRouter(),
    { data, edit, save, notice, busy } = useWorkspace(),
    zone = data.settings.timezone,
    event = data.events.find((e) => e.id === searchParams.get("event")),
    [label, setLabel] = useState(""),
    [error, setError] = useState("");
  if (!data.settings.committee_module_enabled)
    return (
      <>
        <h1>Kepanitiaan</h1>
        <Empty title="Modul Kepanitiaan sedang disembunyikan">
          <p>Event, checklist, dan tugas Event tetap tersimpan.</p>
          <Link className="primary button" href="/settings">
            Buka Pengaturan
          </Link>
        </Empty>
      </>
    );
  const eventTasks = (id: string) =>
      data.tasks.filter((t) => t.event_id === id),
    items = event ? data.checklist.filter((c) => c.event_id === event.id) : [],
    doneCount = items.filter((c) => c.is_completed).length;
  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await save(
        "checklist_items",
        checklistSchema.parse({
          event_id: event!.id,
          label,
          position: items.length,
        }),
      );
      setLabel("");
    } catch (err) {
      setError(validationMessage(err));
    }
  }
  // COMM-04: Event deadlines and open Event Tasks in one time-ordered list.
  const deadlines = [
    ...data.events.map((e) => ({
      key: "e" + e.id,
      at: e.deadline_at,
      title: e.name,
      kind: "Event",
      event: e,
    })),
    ...data.tasks
      .filter((t) => t.event_id && t.status !== "done")
      .map((t) => ({
        key: "t" + t.id,
        at: t.deadline_at,
        title: t.title,
        kind: "Tugas",
        event: data.events.find((e) => e.id === t.event_id)!,
      })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{event?.name || "Kepanitiaan"}</h1>
          <p>
            {event
              ? `${event.role || "Event"} · deadline ${formatDeadline(event.deadline_at, zone)}`
              : "Kelola Event, checklist, dan tugas kepanitiaanmu."}
          </p>
        </div>
        <div className="actions">
          {event && (
            <button
              className="secondary"
              onClick={() => edit({ kind: "event", value: event })}
            >
              Edit Event
            </button>
          )}
          <button
            className="primary"
            onClick={() =>
              edit(
                event ? { kind: "task", eventId: event.id } : { kind: "event" },
              )
            }
          >
            {event ? "Tambah tugas" : "Tambah Event"}
          </button>
        </div>
      </div>
      {event ? (
        <>
          <button
            className="text-button back"
            onClick={() => router.replace("/committee", { scroll: false })}
          >
            Kembali ke semua Event
          </button>
          <section className="panel checklist-panel">
            <div className="panel-heading">
              <h2>Checklist</h2>
              <span>
                {doneCount}/{items.length}
              </span>
            </div>
            {items.length ? (
              <ul className="checklist">
                {items.map((c) => (
                  <li key={c.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={c.is_completed}
                        disabled={busy}
                        onChange={async () => {
                          try {
                            await save(
                              "checklist_items",
                              {
                                event_id: c.event_id,
                                label: c.label,
                                is_completed: !c.is_completed,
                              },
                              c.id,
                            );
                          } catch (err) {
                            notice((err as Error).message);
                          }
                        }}
                      />
                      <span className={c.is_completed ? "completed" : ""}>
                        {c.label}
                      </span>
                    </label>
                    <button
                      className="text-button"
                      aria-label={"Hapus item " + c.label}
                      disabled={busy}
                      onClick={async () => {
                        try {
                          await save("checklist_items", undefined, c.id, true);
                        } catch (err) {
                          notice((err as Error).message);
                        }
                      }}
                    >
                      Hapus
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small checklist-empty">
                Belum ada item checklist.
              </p>
            )}
            <form className="checklist-add" onSubmit={addItem}>
              <input
                aria-label="Item checklist baru"
                placeholder="Tambah item checklist…"
                value={label}
                maxLength={200}
                onChange={(e) => setLabel(e.target.value)}
              />
              <button className="secondary" disabled={busy}>
                Tambah item
              </button>
            </form>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </section>
          <div className="section-heading">
            <h2>Papan tugas</h2>
          </div>
          <KanbanBoard tasks={eventTasks(event.id)} />
        </>
      ) : data.events.length ? (
        <>
          <div className="course-grid">
            {data.events.map((e) => {
              const mine = eventTasks(e.id),
                list = data.checklist.filter((c) => c.event_id === e.id);
              return (
                <article className="course" key={e.id}>
                  <button
                    className="course-title"
                    onClick={() =>
                      router.replace("/committee?event=" + e.id, {
                        scroll: false,
                      })
                    }
                  >
                    {committeeLogo(e.name) ? (
                      <img
                        className="course-cover logo"
                        src={committeeLogo(e.name)!}
                        alt=""
                      />
                    ) : (
                      <span className="course-cover color-3">
                        <Icon name="committee" />
                      </span>
                    )}
                    <h2>{e.name}</h2>
                    <p>
                      {e.role || "Peran belum diisi"} · deadline{" "}
                      {formatDeadline(e.deadline_at, zone)}
                    </p>
                  </button>
                  <div className="course-meta">
                    <span>
                      {mine.filter((t) => t.status !== "done").length} tugas
                      aktif · checklist{" "}
                      {list.filter((c) => c.is_completed).length}/{list.length}
                    </span>
                    <button
                      className="text-button"
                      aria-label={"Edit " + e.name}
                      onClick={() => edit({ kind: "event", value: e })}
                    >
                      Edit
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="section-heading">
            <h2>Deadline kepanitiaan</h2>
          </div>
          <div className="task-list">
            {deadlines.map((d) => (
              <div className="task-row" key={d.key}>
                <span>
                  {formatDeadline(d.at, zone)} · {d.title}
                </span>
                <span className="muted small">
                  {d.kind} · {d.event.name}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <Empty title="Belum ada Event">
          <p>
            Tambahkan Event kepanitiaan, lalu kelola checklist dan tugasnya di
            sini.
          </p>
          <button className="primary" onClick={() => edit({ kind: "event" })}>
            Tambah Event pertama
          </button>
        </Empty>
      )}
    </>
  );
}
function ScheduleSection({ course }: { course: Course }) {
  const { data, edit } = useWorkspace(),
    slots = data.schedule.filter((x) => x.course_id === course.id);
  return (
    <>
      <div className="section-heading">
        <h2>Jadwal kuliah</h2>
        <button
          className="secondary"
          onClick={() => edit({ kind: "schedule", courseId: course.id })}
        >
          Tambah jadwal
        </button>
      </div>
      {slots.length ? (
        <div className="task-list">
          {slots.map((x) => (
            <div className="task-row" key={x.id}>
              <span>
                {weekdays[x.day_of_week - 1]} · {x.start_time.slice(0, 5)}–
                {x.end_time.slice(0, 5)}
              </span>
              <button
                className="text-button"
                aria-label={
                  "Edit jadwal " +
                  weekdays[x.day_of_week - 1] +
                  " " +
                  course.name
                }
                onClick={() => edit({ kind: "schedule", value: x })}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted small">
          Belum ada jadwal. Tambahkan hari dan jam kuliah mingguan.
        </p>
      )}
    </>
  );
}
function CalendarView() {
  const { data, now, edit } = useWorkspace(),
    zone = data.settings.timezone;
  const [month, setMonth] = useState(now.setZone(zone).startOf("month")),
    [selected, setSelected] = useState(now.setZone(zone).toISODate()!);
  const start = month.startOf("week"),
    committee = data.settings.committee_module_enabled,
    academic = data.settings.academic_module_enabled,
    tasks = visibleTasks(data)
      .filter((t) => dayKey(t.deadline_at, zone) === selected)
      .sort((a, b) => a.deadline_at.localeCompare(b.deadline_at)),
    dayEvents = committee
      ? data.events.filter((e) => dayKey(e.deadline_at, zone) === selected)
      : [],
    classes = academic
      ? data.schedule.filter(
          (x) => x.day_of_week === DateTime.fromISO(selected).weekday,
        )
      : [];
  if (!academic && !committee)
    return (
      <>
        <h1>Kalender</h1>
        <AcademicOff />
      </>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Kalender</h1>
          <p>Deadline, jadwal kuliah, dan Event, dalam waktu {zone}.</p>
        </div>
        <button
          className="primary"
          onClick={() =>
            edit(
              (academic && data.courses.length) ||
                (committee && data.events.length)
                ? { kind: "task" }
                : academic
                  ? { kind: "course" }
                  : { kind: "event" },
            )
          }
        >
          {(academic && data.courses.length) ||
          (committee && data.events.length)
            ? "Tambah tugas"
            : academic
              ? "Tambah mata kuliah"
              : "Tambah Event"}
        </button>
      </div>
      <div className="calendar-layout">
        <section className="calendar-panel">
          <div className="section-heading">
            <h2>{month.setLocale("id").toFormat("LLLL yyyy")}</h2>
            <div className="actions">
              <button
                className="secondary"
                onClick={() => setMonth(month.minus({ months: 1 }))}
                aria-label="Bulan sebelumnya"
              >
                <Icon name="arrow" className="reverse" />
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setMonth(now.setZone(zone).startOf("month"));
                  setSelected(now.setZone(zone).toISODate()!);
                }}
              >
                Hari ini
              </button>
              <button
                className="secondary"
                onClick={() => setMonth(month.plus({ months: 1 }))}
                aria-label="Bulan berikutnya"
              >
                <Icon name="arrow" />
              </button>
            </div>
          </div>
          <div className="calendar-week" aria-hidden="true">
            {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {Array.from({ length: 42 }, (_, i) => {
              const day = start.plus({ days: i }),
                key = day.toISODate()!,
                items = visibleTasks(data).filter(
                  (t) => dayKey(t.deadline_at, zone) === key,
                ),
                evs = committee
                  ? data.events.filter(
                      (e) => dayKey(e.deadline_at, zone) === key,
                    )
                  : [],
                today = key === now.setZone(zone).toISODate();
              return (
                <div
                  key={key}
                  className={
                    "calendar-day " +
                    (day.month !== month.month ? "other-month " : "") +
                    (selected === key ? "selected " : "") +
                    (today ? "today" : "")
                  }
                >
                  <button
                    className="calendar-date"
                    aria-label={
                      day.setLocale("id").toFormat("d LLLL yyyy") +
                      ", " +
                      (items.length + evs.length) +
                      " agenda"
                    }
                    aria-pressed={selected === key}
                    onClick={() => setSelected(key)}
                  >
                    <span>{day.day}</span>
                  </button>
                  <div className="calendar-items">
                    {evs.slice(0, 2).map((e) => (
                      <button
                        className="calendar-item color-3"
                        key={e.id}
                        title={"Panitia · " + e.name}
                        aria-label={"Detail Event " + e.name}
                        onClick={() => {
                          setSelected(key);
                          edit({ kind: "event", value: e });
                        }}
                      >
                        Panitia · {e.name}
                      </button>
                    ))}
                    {items.slice(0, Math.max(0, 2 - evs.length)).map((t) => (
                      <button
                        className={
                          "calendar-item color-" +
                          (t.event_id
                            ? 3
                            : Math.max(
                                0,
                                data.courses.findIndex(
                                  (c) => c.id === t.course_id,
                                ),
                              ) % 3) +
                          " " +
                          (t.status === "done" ? "completed" : "")
                        }
                        key={t.id}
                        title={t.title}
                        aria-label={"Detail " + t.title}
                        onClick={() => {
                          setSelected(key);
                          edit({ kind: "task", value: t });
                        }}
                      >
                        {t.title}
                      </button>
                    ))}
                    {items.length + evs.length > 2 && (
                      <small>+{items.length + evs.length - 2} agenda</small>
                    )}
                  </div>
                  {items.length + evs.length > 0 && (
                    <span className="calendar-mobile-count" aria-hidden="true">
                      {items.length + evs.length} agenda
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="calendar-legend">
            {academic &&
              data.courses.map((course, i) => (
                <span key={course.id}>
                  <i className={"color-" + (i % 3)} />
                  {course.name}
                </span>
              ))}
            {committee && (
              <span>
                <i className="color-3" />
                Kepanitiaan
              </span>
            )}
          </div>
        </section>
        <section className="daily-agenda">
          <div className="day-focus">
            <strong>{DateTime.fromISO(selected).toFormat("d")}</strong>
            <div>
              <span>
                {DateTime.fromISO(selected).setLocale("id").toFormat("cccc")}
              </span>
              <small>
                {DateTime.fromISO(selected)
                  .setLocale("id")
                  .toFormat("LLLL yyyy")}
              </small>
            </div>
          </div>
          <h2>
            Agenda{" "}
            {DateTime.fromISO(selected).setLocale("id").toFormat("d LLLL yyyy")}
          </h2>
          {dayEvents.length > 0 && (
            <>
              <h3>Event</h3>
              <div className="task-list">
                {dayEvents.map((e) => (
                  <div className="task-row" key={e.id}>
                    <span>
                      {DateTime.fromISO(e.deadline_at)
                        .setZone(zone)
                        .toFormat("HH.mm")}{" "}
                      · {e.name}
                      {e.role && " (" + e.role + ")"}
                    </span>
                    <Link
                      className="text-button"
                      href={"/committee?event=" + e.id}
                    >
                      Buka
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
          {classes.length > 0 && (
            <>
              <h3>Jadwal kuliah</h3>
              <div className="task-list">
                {classes.map((x) => (
                  <div className="task-row" key={x.id}>
                    <span>
                      {x.start_time.slice(0, 5)}–{x.end_time.slice(0, 5)} ·{" "}
                      {data.courses.find((c) => c.id === x.course_id)?.name}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          {(classes.length > 0 || dayEvents.length > 0) && <h3>Deadline</h3>}
          <TaskRows tasks={tasks} />
        </section>
      </div>
      <p className="muted small">
        Kalender berisi deadline tugas, jadwal kuliah mingguan, dan deadline
        Event pada agenda harian. Google Calendar belum tersedia.
      </p>
    </>
  );
}
function SettingsView() {
  const { data, save, busy } = useWorkspace(),
    [error, setError] = useState(""),
    [student, setStudent] = useState(data.settings.udayana_student);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      if (
        student &&
        !data.settings.udayana_student &&
        !isHimaif(String(f.get("verify") || ""))
      )
        throw new Error("Jawaban pertanyaan verifikasi salah.");
      const value = settingsSchema.parse({
        name: String(f.get("name")),
        timezone: String(f.get("timezone")),
        academic_module_enabled: f.get("academic") === "on",
        committee_module_enabled: f.get("committee") === "on",
        udayana_student: f.get("udayana") === "on",
        semester:
          f.get("udayana") === "on" ? Number(f.get("semester")) || null : null,
      });
      await save("settings", value);
    } catch (e) {
      setError(validationMessage(e));
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Pengaturan</h1>
          <p>Sesuaikan ruangmu dengan cara kamu belajar.</p>
        </div>
      </div>
      <form method="post" className="settings-form" onSubmit={submit}>
        <h2>Profil dan waktu</h2>
        <label>
          Nama tampilan
          <input
            name="name"
            defaultValue={data.profile.name}
            required
            maxLength={100}
          />
        </label>
        <p className="muted small">Email akun: {data.profile.email}</p>
        <label>
          Zona waktu
          <input
            name="timezone"
            defaultValue={data.settings.timezone}
            list="timezones"
            required
          />
          <datalist id="timezones">
            {[
              "Asia/Jakarta",
              "Asia/Makassar",
              "Asia/Jayapura",
              "Asia/Singapore",
              "Europe/London",
              "America/New_York",
              "UTC",
            ].map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
        </label>
        <p className="muted small">
          Gunakan nama zona IANA, misalnya Asia/Makassar. Mengubah zona waktu
          mengubah tampilan jam, bukan waktu deadline yang tersimpan.
        </p>
        <h2>Status mahasiswa</h2>
        <label className="toggle">
          <input
            name="udayana"
            type="checkbox"
            checked={student}
            onChange={(e) => setStudent(e.target.checked)}
          />
          <span>
            Mahasiswa aktif Informatika Universitas Udayana
            <small>
              Membuka daftar mata kuliah dan template kepanitiaan HIMA.
            </small>
          </span>
        </label>
        {student && !data.settings.udayana_student && (
          <label>
            {verifyQuestion}
            <input name="verify" autoComplete="off" required />
          </label>
        )}
        {student && (
          <label>
            Semester
            <select
              name="semester"
              defaultValue={data.settings.semester ?? ""}
              required
            >
              <option value="" disabled>
                Pilih semester
              </option>
              {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Semester {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <h2>Modul</h2>
        <label className="toggle">
          <input
            name="academic"
            type="checkbox"
            defaultChecked={data.settings.academic_module_enabled}
          />
          <span>
            Tampilkan Modul Akademik
            <small>Data tetap tersimpan ketika modul disembunyikan.</small>
          </span>
        </label>
        <label className="toggle">
          <input
            name="committee"
            type="checkbox"
            defaultChecked={data.settings.committee_module_enabled}
          />
          <span>
            Tampilkan Modul Kepanitiaan
            <small>Event, checklist, dan tugas Event tetap tersimpan.</small>
          </span>
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan pengaturan"}
        </button>
      </form>
      <section className="roadmap">
        <h2>Tahap berikutnya</h2>
        <p>
          Google Calendar dan Gmail belum tersedia. Tidak ada sinkronisasi atau
          pengiriman email melalui Gmail pada tahap ini.
        </p>
        <Link href="/forgot-password">Pulihkan password akun</Link>
      </section>
    </>
  );
}
function validationMessage(error: unknown) {
  const e = error as { issues?: { message: string }[]; message?: string };
  return (
    e.issues?.map((i) => i.message).join(" ") ||
    e.message ||
    "Periksa isian kembali."
  );
}
function EditorDialog({
  editor,
  close,
}: {
  editor: Exclude<Editor, null>;
  close: () => void;
}) {
  const { data, save, busy } = useWorkspace(),
    ref = useRef<HTMLDialogElement>(null),
    [error, setError] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    const d = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    d?.showModal();
    return () => {
      d?.close();
      (opener?.isConnected
        ? opener
        : document.getElementById("content")
      )?.focus({ preventScroll: true });
    };
  }, []);
  const task = editor.kind === "task" ? editor.value : undefined,
    course = editor.kind === "course" ? editor.value : undefined,
    note = editor.kind === "note" ? editor.value : undefined,
    slot = editor.kind === "schedule" ? editor.value : undefined,
    committeeEvent = editor.kind === "event" ? editor.value : undefined,
    academicOn = data.settings.academic_module_enabled,
    committeeOn = data.settings.committee_module_enabled,
    // Task context is "course:<id>" or "event:<id>": exactly one parent.
    ctxDefault =
      editor.kind !== "task"
        ? ""
        : task
          ? task.event_id
            ? "event:" + task.event_id
            : "course:" + task.course_id
          : editor.eventId
            ? "event:" + editor.eventId
            : editor.courseId
              ? "course:" + editor.courseId
              : academicOn && data.courses[0]
                ? "course:" + data.courses[0].id
                : committeeOn && data.events[0]
                  ? "event:" + data.events[0].id
                  : "",
    noun = {
      course: "mata kuliah",
      task: "tugas",
      note: "catatan",
      schedule: "jadwal kuliah",
      event: "Event",
    }[editor.kind];
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      if (editor.kind === "course")
        await save(
          "courses",
          courseSchema.parse({
            name: String(f.get("name")),
            lecturer: String(f.get("lecturer")),
            credits: Number(f.get("credits")),
          }),
          course?.id,
        );
      else if (editor.kind === "event")
        await save(
          "events",
          eventSchema.parse({
            name: String(f.get("name")),
            role: String(f.get("role")),
            deadline_at: localDeadline(
              String(f.get("deadline")),
              data.settings.timezone,
            ),
            template: String(f.get("template") || "") || undefined,
          }),
          committeeEvent?.id,
        );
      else if (editor.kind === "schedule")
        await save(
          "schedule_items",
          scheduleSchema.parse({
            course_id: String(f.get("course_id")),
            day_of_week: Number(f.get("day_of_week")),
            start_time: String(f.get("start_time")),
            end_time: String(f.get("end_time")),
          }),
          slot?.id,
        );
      else if (editor.kind === "note")
        await save(
          "notes",
          noteSchema.parse({
            content: String(f.get("content")),
            course_id: String(f.get("course_id")) || null,
          }),
          note?.id,
        );
      else
        await save(
          "tasks",
          taskSchema.parse({
            title: String(f.get("title")),
            course_id: String(f.get("context")).startsWith("course:")
              ? String(f.get("context")).slice(7)
              : null,
            event_id: String(f.get("context")).startsWith("event:")
              ? String(f.get("context")).slice(6)
              : null,
            description: String(f.get("description")),
            deadline_at: localDeadline(
              String(f.get("deadline")),
              data.settings.timezone,
            ),
            status: String(f.get("status")),
            priority: String(f.get("priority")),
          }),
          task?.id,
        );
      close();
    } catch (e) {
      setError(validationMessage(e));
    }
  }
  async function remove() {
    setError("");
    try {
      await save(
        {
          course: "courses",
          task: "tasks",
          note: "notes",
          schedule: "schedule_items",
          event: "events",
        }[editor.kind],
        undefined,
        editor.value!.id,
        true,
      );
      close();
    } catch (e) {
      setError(validationMessage(e));
      setConfirmDelete(false);
    }
  }
  return (
    <dialog
      ref={ref}
      aria-labelledby="editor-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else close();
      }}
    >
      <div className="dialog-heading">
        <h2 id="editor-title">
          {confirmDelete
            ? "Hapus " + noun + "?"
            : (editor.value ? "Edit " : "Tambah ") + noun}
        </h2>
        <button
          type="button"
          className="dialog-close"
          aria-label="Tutup"
          disabled={busy}
          onClick={close}
        >
          <Icon name="plus" />
        </button>
      </div>
      {confirmDelete ? (
        <>
          <p>
            Data ini akan dihapus dari akunmu. Tindakan ini tidak dapat
            dibatalkan.
          </p>
          <div className="actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setConfirmDelete(false)}
            >
              Batal
            </button>
            <button className="danger" disabled={busy} onClick={remove}>
              {busy ? "Menghapus…" : "Ya, hapus"}
            </button>
          </div>
        </>
      ) : (
        <form method="post" onSubmit={submit}>
          <fieldset disabled={busy}>
            {editor.kind === "course" ? (
              <>
                {data.settings.udayana_student && !course && (
                  <label>
                    Dari kurikulum Informatika Udayana (opsional)
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const c = curriculum[Number(e.target.value)];
                        if (!c) return;
                        const form = e.target.form!;
                        (
                          form.elements.namedItem("name") as HTMLInputElement
                        ).value = c.name;
                        (
                          form.elements.namedItem("credits") as HTMLInputElement
                        ).value = String(c.credits);
                      }}
                    >
                      <option value="">Isi manual</option>
                      {[
                        ...new Set([
                          data.settings.semester,
                          ...curriculumSemesters,
                        ]),
                      ]
                        .filter((s) => s && curriculumSemesters.includes(s))
                        .map((s) => (
                          <optgroup key={s} label={"Semester " + s}>
                            {curriculum.map(
                              (c, i) =>
                                c.semester === s && (
                                  <option key={i} value={i}>
                                    {c.name} ({c.credits} SKS)
                                  </option>
                                ),
                            )}
                          </optgroup>
                        ))}
                    </select>
                  </label>
                )}
                <label>
                  Nama mata kuliah
                  <input
                    name="name"
                    defaultValue={course?.name}
                    required
                    maxLength={200}
                  />
                </label>
                <label>
                  Dosen (opsional)
                  <input
                    name="lecturer"
                    defaultValue={course?.lecturer}
                    maxLength={200}
                  />
                </label>
                <label>
                  SKS
                  <input
                    name="credits"
                    type="number"
                    min="1"
                    step="1"
                    defaultValue={course?.credits || 3}
                    required
                  />
                </label>
              </>
            ) : editor.kind === "event" ? (
              <>
                <label>
                  Nama Event
                  <input
                    name="name"
                    defaultValue={committeeEvent?.name}
                    required
                    maxLength={200}
                  />
                </label>
                <label>
                  Peran kamu (opsional)
                  <input
                    name="role"
                    defaultValue={committeeEvent?.role}
                    maxLength={100}
                  />
                </label>
                <label>
                  Deadline ({data.settings.timezone})
                  <input
                    name="deadline"
                    type="datetime-local"
                    defaultValue={
                      committeeEvent
                        ? DateTime.fromISO(committeeEvent.deadline_at)
                            .setZone(data.settings.timezone)
                            .toFormat("yyyy-MM-dd'T'HH:mm")
                        : DateTime.now()
                            .setZone(data.settings.timezone)
                            .toISODate() + "T23:59"
                    }
                    required
                  />
                </label>
                {!committeeEvent && (
                  <label>
                    Template checklist (opsional)
                    <select name="template" defaultValue="">
                      <option value="">Tanpa template</option>
                      {Object.entries(eventTemplates)
                        .filter(([, t]) => !t.group)
                        .map(([key, t]) => (
                          <option key={key} value={key}>
                            {t.label} ({t.items.length} item)
                          </option>
                        ))}
                      {data.settings.udayana_student &&
                        [
                          ...new Set(
                            Object.values(eventTemplates).map((t) => t.group),
                          ),
                        ]
                          .filter(Boolean)
                          .map((g) => (
                            <optgroup key={g} label={g}>
                              {Object.entries(eventTemplates)
                                .filter(([, t]) => t.group === g)
                                .map(([key, t]) => (
                                  <option key={key} value={key}>
                                    {t.label} ({t.items.length} item)
                                  </option>
                                ))}
                            </optgroup>
                          ))}
                    </select>
                  </label>
                )}
              </>
            ) : editor.kind === "note" ? (
              <>
                <label>
                  Isi catatan
                  <textarea
                    name="content"
                    defaultValue={note?.content}
                    required
                    maxLength={10000}
                    rows={8}
                  />
                </label>
                <label>
                  Mata kuliah (opsional)
                  <select
                    name="course_id"
                    defaultValue={
                      note ? note.course_id || "" : editor.courseId || ""
                    }
                  >
                    <option value="">Tanpa mata kuliah</option>
                    {data.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : editor.kind === "schedule" ? (
              <>
                <label>
                  Mata kuliah
                  <select
                    name="course_id"
                    defaultValue={
                      slot?.course_id || editor.courseId || data.courses[0]?.id
                    }
                    required
                  >
                    {data.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Hari
                  <select
                    name="day_of_week"
                    defaultValue={slot?.day_of_week || 1}
                  >
                    {weekdays.map((d, i) => (
                      <option key={d} value={i + 1}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    Mulai
                    <input
                      name="start_time"
                      type="time"
                      defaultValue={slot?.start_time.slice(0, 5) || "08:00"}
                      required
                    />
                  </label>
                  <label>
                    Selesai
                    <input
                      name="end_time"
                      type="time"
                      defaultValue={slot?.end_time.slice(0, 5) || "09:40"}
                      required
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                <label>
                  Judul tugas
                  <input
                    name="title"
                    defaultValue={task?.title}
                    required
                    maxLength={200}
                  />
                </label>
                <label>
                  Mata kuliah atau Event
                  <select name="context" defaultValue={ctxDefault} required>
                    {academicOn && data.courses.length > 0 && (
                      <optgroup label="Mata kuliah">
                        {data.courses.map((c) => (
                          <option key={c.id} value={"course:" + c.id}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {committeeOn && data.events.length > 0 && (
                      <optgroup label="Kepanitiaan">
                        {data.events.map((e) => (
                          <option key={e.id} value={"event:" + e.id}>
                            {e.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </label>
                <label>
                  Deskripsi (opsional)
                  <textarea
                    name="description"
                    defaultValue={task?.description}
                    maxLength={5000}
                    rows={3}
                  />
                </label>
                <label>
                  Deadline ({data.settings.timezone})
                  <input
                    name="deadline"
                    type="datetime-local"
                    defaultValue={
                      task
                        ? DateTime.fromISO(task.deadline_at)
                            .setZone(data.settings.timezone)
                            .toFormat("yyyy-MM-dd'T'HH:mm")
                        : DateTime.now()
                            .setZone(data.settings.timezone)
                            .toISODate() + "T23:59"
                    }
                    required
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Status
                    <select name="status" defaultValue={task?.status || "todo"}>
                      {Object.entries(statuses).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Prioritas
                    <select
                      name="priority"
                      defaultValue={task?.priority || "medium"}
                    >
                      {Object.entries(priorities).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            )}
            {error && (
              <div role="alert" className="error">
                {error}
                {editor.kind === "course" &&
                  error.includes("masih memiliki tugas") && (
                    <p>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          close();
                          window.location.assign("/academic");
                        }}
                      >
                        Buka daftar tugas
                      </button>
                    </p>
                  )}
              </div>
            )}
            <div className="form-actions">
              {editor.value && (
                <button
                  className="danger subtle"
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                >
                  Hapus
                </button>
              )}
              <button className="secondary" type="button" onClick={close}>
                Batal
              </button>
              <button className="primary">
                {busy ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </dialog>
  );
}
