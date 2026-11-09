-- P1 Pomodoro: finished study sessions per account; deleting a Course keeps its sessions.
create table public.pomodoro_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.users(id) on delete cascade,
 course_id uuid references public.courses(id) on delete set null,
 duration_minutes integer not null check(duration_minutes between 1 and 180),
 created_at timestamptz not null default now()
);
create index pomodoro_user_idx on public.pomodoro_sessions(user_id,created_at);
create index pomodoro_course_idx on public.pomodoro_sessions(course_id);
alter table public.pomodoro_sessions enable row level security;
revoke all on public.pomodoro_sessions from anon,authenticated;
grant select,insert,delete on public.pomodoro_sessions to authenticated;
create policy own_pomodoro on public.pomodoro_sessions for all to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()) and (course_id is null or exists(select 1 from public.courses c where c.id=course_id and c.user_id=(select auth.uid()))));
