-- P1 Kepanitiaan: Event, checklist and Tasks that belong to exactly one Course or Event.
create table public.events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 200),
 role text not null default '' check(length(role)<=100),
 deadline_at timestamptz not null check(isfinite(deadline_at)),
 created_at timestamptz not null default now()
);
create table public.checklist_items (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 label text not null check(length(trim(label)) between 1 and 200),
 is_completed boolean not null default false,
 position integer not null default 0,
 created_at timestamptz not null default now()
);
create index events_user_idx on public.events(user_id,deadline_at);
create index checklist_event_idx on public.checklist_items(event_id,position);
alter table public.events enable row level security;
alter table public.checklist_items enable row level security;
revoke all on public.events,public.checklist_items from anon,authenticated;
grant select,insert,delete on public.events,public.checklist_items to authenticated;
grant update(name,role,deadline_at) on public.events to authenticated;
grant update(label,is_completed) on public.checklist_items to authenticated;
create policy own_events on public.events for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_checklist on public.checklist_items for all to authenticated
 using(exists(select 1 from public.events e where e.id=event_id and e.user_id=(select auth.uid())))
 with check(exists(select 1 from public.events e where e.id=event_id and e.user_id=(select auth.uid())));

-- Tasks: exactly one of course_id / event_id. Existing rows all have a Course.
alter table public.tasks alter column course_id drop not null;
alter table public.tasks add column event_id uuid references public.events(id) on delete restrict;
alter table public.tasks add constraint tasks_one_context check(num_nonnulls(course_id,event_id)=1);
create index tasks_event_deadline_idx on public.tasks(event_id,deadline_at);
grant update(event_id) on public.tasks to authenticated;
drop policy own_tasks on public.tasks;
create policy own_tasks on public.tasks for all to authenticated
 using(exists(select 1 from public.courses c where c.id=course_id and c.user_id=(select auth.uid()))
    or exists(select 1 from public.events e where e.id=event_id and e.user_id=(select auth.uid())))
 with check(exists(select 1 from public.courses c where c.id=course_id and c.user_id=(select auth.uid()))
    or exists(select 1 from public.events e where e.id=event_id and e.user_id=(select auth.uid())));

-- Settings: the committee toggle becomes editable.
grant update(committee_module_enabled) on public.settings to authenticated;
drop function public.update_preferences(text,text,boolean);
create function public.update_preferences(p_name text,p_timezone text,p_academic boolean,p_committee boolean) returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 update public.users set name=p_name where id=auth.uid();
 update public.settings set timezone=p_timezone,academic_module_enabled=p_academic,committee_module_enabled=p_committee where user_id=auth.uid();
end;$$;
revoke execute on function public.update_preferences(text,text,boolean,boolean) from public,anon;
grant execute on function public.update_preferences(text,text,boolean,boolean) to authenticated;

-- Event + starter checklist in one transaction; invoker rights keep RLS in force.
create function public.create_event(p_name text,p_role text,p_deadline timestamptz,p_items text[]) returns jsonb language plpgsql security invoker set search_path='' as $$
declare e public.events; items jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if coalesce(array_length(p_items,1),0)>20 then raise exception 'Too many checklist items' using errcode='23514'; end if;
 insert into public.events(user_id,name,role,deadline_at) values(auth.uid(),p_name,p_role,p_deadline) returning * into e;
 insert into public.checklist_items(event_id,label,position)
  select e.id,t.label,(t.ord-1)::integer from unnest(coalesce(p_items,'{}'::text[])) with ordinality as t(label,ord);
 select coalesce(jsonb_agg(to_jsonb(c) order by c.position),'[]'::jsonb) into items from public.checklist_items c where c.event_id=e.id;
 return jsonb_build_object('event',to_jsonb(e),'items',items);
end;$$;
revoke execute on function public.create_event(text,text,timestamptz,text[]) from public,anon;
grant execute on function public.create_event(text,text,timestamptz,text[]) to authenticated;
