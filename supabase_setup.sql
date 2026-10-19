-- IDAD 10: execute once in your OWN Supabase project, SQL Editor.
-- Each authenticated teacher owns exactly one private JSON workspace.
-- This table DOES NOT provide any access to signed-out visitors.
create table if not exists public.teacher_workspaces (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null,
 revision bigint not null default 1 check (revision >= 1),
 updated_at timestamptz not null default now(),
 constraint payload_object check (jsonb_typeof(payload) = 'object'),
 constraint payload_size check (octet_length(payload::text) <= 5000000)
);
create or replace function public.idad_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists idad_workspace_updated on public.teacher_workspaces;
create trigger idad_workspace_updated before update on public.teacher_workspaces
 for each row execute function public.idad_touch_updated_at();

alter table public.teacher_workspaces enable row level security;
-- Make the API grants explicit, rather than depending on Supabase defaults.
revoke all on table public.teacher_workspaces from public, anon, authenticated;
grant select, insert, update on table public.teacher_workspaces to authenticated;
-- No delete grant: a teacher cannot remove the workspace by mistake.
drop policy if exists idad_teacher_select on public.teacher_workspaces;
drop policy if exists idad_teacher_insert on public.teacher_workspaces;
drop policy if exists idad_teacher_update on public.teacher_workspaces;
create policy idad_teacher_select on public.teacher_workspaces
 for select to authenticated using (owner_id = (select auth.uid()));
create policy idad_teacher_insert on public.teacher_workspaces
 for insert to authenticated with check (owner_id = (select auth.uid()));
create policy idad_teacher_update on public.teacher_workspaces
 for update to authenticated using (owner_id = (select auth.uid()))
 with check (owner_id = (select auth.uid()));
-- owner_id is the PK, so it is already indexed for RLS lookups.
