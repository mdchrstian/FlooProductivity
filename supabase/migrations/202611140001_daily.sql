-- Daily tasks: simple to-dos that belong to neither a Course nor an Event.
create table public.daily_tasks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.users(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 200),
 due_date date,
 is_done boolean not null default false,
 created_at timestamptz not null default now()
);
create index daily_tasks_user_idx on public.daily_tasks(user_id,is_done,due_date);
alter table public.daily_tasks enable row level security;
revoke all on public.daily_tasks from anon,authenticated;
grant select,insert,delete on public.daily_tasks to authenticated;
grant update(title,due_date,is_done) on public.daily_tasks to authenticated;
create policy own_daily on public.daily_tasks for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
