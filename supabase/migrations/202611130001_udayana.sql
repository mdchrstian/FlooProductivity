-- Informatika Udayana student profile: flag + semester on settings.
alter table public.settings add column udayana_student boolean not null default false;
alter table public.settings add column semester smallint check(semester between 1 and 14);
alter table public.settings add constraint settings_semester_needs_student check(udayana_student or semester is null);
grant update(udayana_student,semester) on public.settings to authenticated;

-- New accounts read the flag and semester from sign-up metadata; Google gives full_name instead of name.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
declare tz text; stu boolean; sem smallint;
begin
 tz=coalesce(new.raw_user_meta_data->>'timezone','Asia/Makassar');
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=tz) then tz='Asia/Makassar'; end if;
 stu=coalesce(new.raw_user_meta_data->>'udayana_student','')='true';
 if stu and coalesce(new.raw_user_meta_data->>'semester','')~'^\d{1,2}$' and (new.raw_user_meta_data->>'semester')::int between 1 and 14
  then sem=(new.raw_user_meta_data->>'semester')::smallint; else sem=null; end if;
 if sem is null then stu=false; end if;
 insert into public.users(id,name,email) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),nullif(trim(new.raw_user_meta_data->>'full_name'),''),'Mahasiswa'),100),new.email);
 insert into public.settings(user_id,timezone,udayana_student,semester) values(new.id,tz,stu,sem);
 return new;
end;$$;

drop function public.update_preferences(text,text,boolean,boolean);
create function public.update_preferences(p_name text,p_timezone text,p_academic boolean,p_committee boolean,p_udayana boolean,p_semester smallint) returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 update public.users set name=p_name where id=auth.uid();
 update public.settings set timezone=p_timezone,academic_module_enabled=p_academic,committee_module_enabled=p_committee,
  udayana_student=p_udayana,semester=case when p_udayana then p_semester else null end where user_id=auth.uid();
end;$$;
revoke execute on function public.update_preferences(text,text,boolean,boolean,boolean,smallint) from public,anon;
grant execute on function public.update_preferences(text,text,boolean,boolean,boolean,smallint) to authenticated;
