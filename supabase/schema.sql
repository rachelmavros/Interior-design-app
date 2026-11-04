-- Room to Shop: accounts, cloud saves and daily AI limits.
-- Paste this whole file into Supabase → SQL Editor → New query, then Run.
-- Safe to run again after updates.

-- ── Rooms (one row per room, the full project as JSON) ──────────────
create table if not exists public.projects (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  primary key (user_id, id)
);
alter table public.projects enable row level security;
drop policy if exists "own projects" on public.projects;
create policy "own projects" on public.projects
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Saved products, folders, history and inspo (one row per person) ─
create table if not exists public.libraries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.libraries enable row level security;
drop policy if exists "own library" on public.libraries;
create policy "own library" on public.libraries
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Daily AI edit counts. Only the app's server can touch these. ─────
create table if not exists public.usage (
  key text not null,
  day date not null,
  count integer not null default 0,
  primary key (key, day)
);
alter table public.usage enable row level security;

-- Counts one edit against every key (e.g. device and network) if all are
-- under their limits. Returns edits left on the first key, or -1 if refused.
create or replace function public.bump_usage(p_keys text[], p_limits integer[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  i integer;
  cur integer;
  first_left integer;
begin
  for i in 1 .. coalesce(array_length(p_keys, 1), 0) loop
    insert into usage (key, day, count) values (p_keys[i], current_date, 0) on conflict do nothing;
    select count into cur from usage where key = p_keys[i] and day = current_date for update;
    if cur >= p_limits[i] then
      return -1;
    end if;
    if i = 1 then
      first_left := p_limits[i] - cur - 1;
    end if;
  end loop;
  update usage set count = count + 1 where day = current_date and key = any (p_keys);
  return first_left;
end;
$$;

-- Gives an edit back when the image service failed.
create or replace function public.refund_usage(p_keys text[])
returns void
language sql
security definer
set search_path = public
as $$
  update usage set count = greatest(count - 1, 0) where day = current_date and key = any (p_keys);
$$;

create or replace function public.usage_today(p_key text)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce((select count from usage where key = p_key and day = current_date), 0);
$$;

revoke all on function public.bump_usage(text[], integer[]) from public, anon, authenticated;
revoke all on function public.refund_usage(text[]) from public, anon, authenticated;
revoke all on function public.usage_today(text) from public, anon, authenticated;
grant execute on function public.bump_usage(text[], integer[]) to service_role;
grant execute on function public.refund_usage(text[]) to service_role;
grant execute on function public.usage_today(text) to service_role;

-- ── Photo storage: each person can only reach their own folder ──────
insert into storage.buckets (id, name, public)
values ('blobs', 'blobs', false)
on conflict (id) do nothing;

drop policy if exists "own blobs read" on storage.objects;
drop policy if exists "own blobs write" on storage.objects;
drop policy if exists "own blobs update" on storage.objects;
drop policy if exists "own blobs delete" on storage.objects;
create policy "own blobs read" on storage.objects for select to authenticated
  using (bucket_id = 'blobs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own blobs write" on storage.objects for insert to authenticated
  with check (bucket_id = 'blobs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own blobs update" on storage.objects for update to authenticated
  using (bucket_id = 'blobs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own blobs delete" on storage.objects for delete to authenticated
  using (bucket_id = 'blobs' and (storage.foldername(name))[1] = auth.uid()::text);
