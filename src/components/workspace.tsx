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
  settingsSchema,
} from "@/lib/validation";
import { localDeadline, formatDeadline, dayKey, taskGroups } from "@/lib/time";
import {
  statuses,
  priorities,
  type Course,
  type Task,
  type Note,
  type Workspace,
} from "@/lib/types";

type Editor =
  | { kind: "course"; value?: Course }
  | { kind: "task"; value?: Task; courseId?: string }
  | { kind: "note"; value?: Note; courseId?: string }
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
  ["academic", "Mata kuliah"],
  ["calendar", "Kalender"],
  ["notes", "Catatan"],
  ["settings", "Pengaturan"],
] as const;
const later = [
  ["focus", "Pomodoro"],
  ["committee", "Kepanitiaan"],
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
          };
          return {
            ...current,
            profile: { ...current.profile, name: v.name },
            settings: {
              timezone: v.timezone,
              academic_module_enabled: v.academic_module_enabled,
            },
          };
        }
        if (resource === "courses") {
          const courses = remove
            ? current.courses.filter((c) => c.id !== id)
            : id
              ? current.courses.map((c) => (c.id === id ? value : c))
              : [...current.courses, value];
          // Mirrors ON DELETE SET NULL so linked notes stay without a reload.
          const notes = remove
            ? current.notes.map((n) =>
                n.course_id === id ? { ...n, course_id: null } : n,
              )
            : current.notes;
          return { ...current, courses, notes };
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
      setMessage(remove ? "Data dihapus." : "Perubahan tersimpan.");
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
                  data?.settings.academic_module_enabled !== false),
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
        <div className="later-nav">
          <p className="muted small">Nanti di ruangmu</p>
          {later.map(([id, label]) => (
            <Link key={id} href={"/" + id}>
              <Icon name={id} />
              <span>{label}</span>
              <span className="later-label">Nanti</span>
            </Link>
          ))}
        </div>
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
              {[...nav, ...later].find(([id]) => path === "/" + id)?.[1] ||
                "Dashboard"}
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
            <span className="task-course">
              <span className="source-dot" />
              {data.courses.find((c) => c.id === task.course_id)?.name}
            </span>
          )}
          <button
            className="task-content"
            onClick={() => edit({ kind: "task", value: task })}
          >
            <strong>{task.title}</strong>
            <span>
              {board
                ? task.description || "Belum ada deskripsi."
                : data.courses.find((c) => c.id === task.course_id)?.name}
            </span>
          </button>
          <span className="task-due">
            <Icon name="calendar" />
            {DateTime.fromISO(task.deadline_at)
              .setZone(data.settings.timezone)
              .setLocale("id")
              .toFormat("d LLL, HH.mm")}
          </span>
          <span className={"priority " + task.priority}>
            {priorities[task.priority]}
          </span>
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
function taskPayload(t: Task) {
  return {
    course_id: t.course_id,
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
    tasks =
      term && data.settings.academic_module_enabled
        ? data.tasks
            .filter((t) => t.title.toLocaleLowerCase("id").includes(term))
            .slice(0, 6)
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
        ) : !courses.length && !tasks.length ? (
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
                  <small>
                    {data.courses.find((c) => c.id === task.course_id)?.name}
                  </small>
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
  if (section === "notes") return <NotesView />;
  if (section !== "dashboard")
    return (
      <>
        <div className="page-heading">
          <h1>{later.find(([id]) => id === section)?.[1]}</h1>
        </div>
        <Empty title="Tahap berikutnya">
          <p>
            Fitur ini belum tersedia pada fondasi P0. Untuk saat ini, gunakan
            Mata kuliah, tugas, dan Kalender.
          </p>
          <Link className="primary button" href="/dashboard">
            Kembali ke Dashboard
          </Link>
        </Empty>
      </>
    );
  return <Dashboard />;
}
function Dashboard() {
  const { data, edit, now } = useWorkspace(),
    [filter, setFilter] = useState<"today" | "overdue" | "upcoming" | "done">(
      "today",
    );
  const groups = taskGroups(data.tasks, data.settings.timezone, now),
    done = data.tasks.filter((t) => t.status === "done"),
    total = data.tasks.length;
  const zone = data.settings.timezone,
    today = now.setZone(zone),
    [selectedDay, setSelectedDay] = useState(today.toISODate()!);
  const days = Array.from({ length: 7 }, (_, i) =>
    today.startOf("week").plus({ days: i }),
  );
  const agenda = data.tasks
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
        {data.settings.academic_module_enabled && data.courses.length > 0 && (
          <button
            className="primary"
            onClick={() =>
              edit(data.courses.length ? { kind: "task" } : { kind: "course" })
            }
          >
            <Icon name="plus" />
            {data.courses.length ? "Tambah tugas" : "Tambah mata kuliah"}
          </button>
        )}
      </div>
      {!data.settings.academic_module_enabled ? (
        <AcademicOff />
      ) : !data.courses.length ? (
        <section className="welcome-start">
          <span className="welcome-symbol">
            <Icon name="academic" />
          </span>
          <h2>Mulai dari mata kuliah pertamamu.</h2>
          <p>
            Beri tempat untuk tugas-tugasmu. Deadline yang kamu tambahkan nanti
            akan tersusun di Dashboard dan Kalender.
          </p>
          <button className="primary" onClick={() => edit({ kind: "course" })}>
            <Icon name="plus" />
            Tambah mata kuliah
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
                      count = data.tasks.filter(
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
                            {
                              data.courses.find((c) => c.id === task.course_id)
                                ?.name
                            }
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
              <div className="calendar-note">
                <Icon name="calendar" />
                <p>
                  Jadwal kelas dan integrasi Google Calendar hadir pada tahap
                  berikutnya.
                </p>
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
    [view, setView] = useState<"board" | "list">("board");
  const course = data.courses.find((c) => c.id === courseId),
    tasks = data.tasks.filter((t) => !courseId || t.course_id === courseId);
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
            <div className="kanban">
              {Object.entries(statuses).map(([status, label]) => (
                <section
                  className={"kanban-column status-" + status}
                  key={status}
                >
                  <h3>
                    <span className="kanban-status-dot" />
                    {label}{" "}
                    <span>
                      {tasks.filter((t) => t.status === status).length}
                    </span>
                  </h3>
                  <TaskRows
                    board
                    tasks={tasks.filter((t) => t.status === status)}
                  />
                </section>
              ))}
            </div>
          )}
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
function CalendarView() {
  const { data, now, edit } = useWorkspace(),
    zone = data.settings.timezone;
  const [month, setMonth] = useState(now.setZone(zone).startOf("month")),
    [selected, setSelected] = useState(now.setZone(zone).toISODate()!);
  const start = month.startOf("week"),
    tasks = data.tasks
      .filter((t) => dayKey(t.deadline_at, zone) === selected)
      .sort((a, b) => a.deadline_at.localeCompare(b.deadline_at));
  if (!data.settings.academic_module_enabled)
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
          <p>Deadline semua mata kuliah, dalam waktu {zone}.</p>
        </div>
        <button
          className="primary"
          onClick={() =>
            edit(data.courses.length ? { kind: "task" } : { kind: "course" })
          }
        >
          {data.courses.length ? "Tambah tugas" : "Tambah mata kuliah"}
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
                items = data.tasks.filter(
                  (t) => dayKey(t.deadline_at, zone) === key,
                ),
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
                      items.length +
                      " tugas"
                    }
                    aria-pressed={selected === key}
                    onClick={() => setSelected(key)}
                  >
                    <span>{day.day}</span>
                  </button>
                  <div className="calendar-items">
                    {items.slice(0, 2).map((t) => (
                      <button
                        className={
                          "calendar-item color-" +
                          (Math.max(
                            0,
                            data.courses.findIndex((c) => c.id === t.course_id),
                          ) %
                            3) +
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
                    {items.length > 2 && (
                      <small>+{items.length - 2} tugas</small>
                    )}
                  </div>
                  {items.length > 0 && (
                    <span className="calendar-mobile-count" aria-hidden="true">
                      {items.length} tugas
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="calendar-legend">
            {data.courses.map((course, i) => (
              <span key={course.id}>
                <i className={"color-" + (i % 3)} />
                {course.name}
              </span>
            ))}
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
          <TaskRows tasks={tasks} />
        </section>
      </div>
      <p className="muted small">
        Kalender P0 berisi deadline tugas. Jadwal kelas, Kepanitiaan, dan Google
        Calendar belum tersedia.
      </p>
    </>
  );
}
function SettingsView() {
  const { data, save, busy } = useWorkspace(),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const value = settingsSchema.parse({
        name: String(f.get("name")),
        timezone: String(f.get("timezone")),
        academic_module_enabled: f.get("academic") === "on",
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
          Pomodoro, Kepanitiaan, login Google, Google Calendar, dan Gmail belum
          tersedia. Tidak ada sinkronisasi atau pengiriman email melalui Gmail
          pada tahap ini.
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
    noun = { course: "mata kuliah", task: "tugas", note: "catatan" }[
      editor.kind
    ];
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
            course_id: String(f.get("course_id")),
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
        { course: "courses", task: "tasks", note: "notes" }[editor.kind],
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
                  Mata kuliah
                  <select
                    name="course_id"
                    defaultValue={
                      task?.course_id || editor.courseId || data.courses[0]?.id
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
