-- P1 Jadwal kelas: weekly class slots per Course (ISO weekday, local wall-clock times in the user's zone).
create table public.schedule_items (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.users(id) on delete cascade,
 course_id uuid not null references public.courses(id) on delete cascade,
 day_of_week smallint not null check(day_of_week between 1 and 7),
 start_time time not null,
 end_time time not null,
 created_at timestamptz not null default now(),
 check(end_time > start_time)
);
create index schedule_user_idx on public.schedule_items(user_id,day_of_week,start_time);
create index schedule_course_idx on public.schedule_items(course_id);
alter table public.schedule_items enable row level security;
revoke all on public.schedule_items from anon,authenticated;
grant select,insert,delete on public.schedule_items to authenticated;
grant update(course_id,day_of_week,start_time,end_time) on public.schedule_items to authenticated;
create policy own_schedule on public.schedule_items for all to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()) and exists(select 1 from public.courses c where c.id=course_id and c.user_id=(select auth.uid())));
