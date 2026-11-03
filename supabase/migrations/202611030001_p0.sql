grant usage on schema public to authenticated;
create table public.users (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 100),
 email text not null,
 created_at timestamptz not null default now()
);
create table public.settings (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references public.users(id) on delete cascade,
 timezone text not null default 'Asia/Makassar',
 academic_module_enabled boolean not null default true,
 committee_module_enabled boolean not null default true,
 pomodoro_enabled boolean not null default true,
 notes_enabled boolean not null default true,
 calendar_sync_enabled boolean not null default false,
 email_integration_enabled boolean not null default false
);
create table public.courses (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 200),
 lecturer text not null default '' check(length(lecturer)<=200),
 credits integer not null check(credits>0),
 created_at timestamptz not null default now()
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.courses(id) on delete restrict,
 title text not null check(length(trim(title)) between 1 and 200),
 description text not null default '' check(length(description)<=5000),
 deadline_at timestamptz not null check(isfinite(deadline_at)),
 status text not null default 'todo' check(status in ('todo','in_progress','done')),
 priority text not null default 'medium' check(priority in ('low','medium','high')),
 created_at timestamptz not null default now()
);
create index courses_user_idx on public.courses(user_id);
create index tasks_course_deadline_idx on public.tasks(course_id,deadline_at);
alter table public.users enable row level security;
alter table public.settings enable row level security;
alter table public.courses enable row level security;
alter table public.tasks enable row level security;
revoke all on public.users,public.settings,public.courses,public.tasks from anon,authenticated;
grant select on public.users,public.settings,public.courses,public.tasks to authenticated;
grant update(name) on public.users to authenticated;
grant update(timezone,academic_module_enabled) on public.settings to authenticated;
grant insert,delete on public.courses,public.tasks to authenticated;
grant update(name,lecturer,credits) on public.courses to authenticated;
grant update(course_id,title,description,deadline_at,status,priority) on public.tasks to authenticated;
create policy own_profile_read on public.users for select to authenticated using(id=(select auth.uid()));
create policy own_profile_update on public.users for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy own_settings_read on public.settings for select to authenticated using(user_id=(select auth.uid()));
create policy own_settings_update on public.settings for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_courses on public.courses for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_tasks on public.tasks for all to authenticated
 using(exists(select 1 from public.courses c where c.id=course_id and c.user_id=(select auth.uid())))
 with check(exists(select 1 from public.courses c where c.id=course_id and c.user_id=(select auth.uid())));
create function public.check_timezone() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone) then raise exception 'Invalid timezone' using errcode='23514'; end if;
 return new;
end;$$;
create trigger valid_timezone before insert or update on public.settings for each row execute function public.check_timezone();
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
declare tz text;
begin
 tz=coalesce(new.raw_user_meta_data->>'timezone','Asia/Makassar');
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=tz) then tz='Asia/Makassar'; end if;
 insert into public.users(id,name,email) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),'Mahasiswa'),100),new.email);
 insert into public.settings(user_id,timezone) values(new.id,tz);
 return new;
end;$$;
revoke execute on function public.handle_new_user() from public,anon,authenticated;
create trigger new_user after insert on auth.users for each row execute function public.handle_new_user();
-- Invoker rights keep both statements subject to the caller's RLS, in one transaction.
create function public.update_preferences(p_name text,p_timezone text,p_academic boolean) returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 update public.users set name=p_name where id=auth.uid();
 update public.settings set timezone=p_timezone,academic_module_enabled=p_academic where user_id=auth.uid();
end;$$;
revoke execute on function public.update_preferences(text,text,boolean) from public,anon;
grant execute on function public.update_preferences(text,text,boolean) to authenticated;
