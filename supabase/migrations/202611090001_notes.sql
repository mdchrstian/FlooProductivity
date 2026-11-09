-- P1 Catatan: user_id gives free-standing notes an owner (PRD §7.1); deleting a Course keeps its notes.
create table public.notes (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.users(id) on delete cascade,
 course_id uuid references public.courses(id) on delete set null,
 content text not null check (length(trim(content)) between 1 and 10000),
 created_at timestamptz not null default now()
);
create index notes_user_idx on public.notes(user_id,created_at);
create index notes_course_idx on public.notes(course_id);
alter table public.notes enable row level security;
revoke all on public.notes from anon,authenticated;
grant select,insert,delete on public.notes to authenticated;
grant update(course_id,content) on public.notes to authenticated;
create policy own_notes on public.notes for all to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()) and (course_id is null or exists(select 1 from public.courses c where c.id=course_id and c.user_id=(select auth.uid()))));
