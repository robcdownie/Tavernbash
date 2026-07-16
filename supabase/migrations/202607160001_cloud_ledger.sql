-- Tavern Bash 0.91 Cloud Ledger.
-- Personal backup is private by default. An approved analytics reader can see
-- only accounts that explicitly enable balance sharing.

create schema if not exists private;

create table public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  share_balance_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.run_reports (
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id text not null check (char_length(report_id) between 1 and 180),
  game_version text not null,
  map_version integer,
  route_mode text not null check (route_mode in ('quick','long')),
  lantern smallint not null check (lantern between 0 and 10),
  result text not null,
  hero_id text,
  omen_id text,
  seed bigint check (seed between 0 and 4294967295),
  ended_at timestamptz not null,
  gameplay_ms bigint not null default 0 check (gameplay_ms >= 0),
  resolve_end integer not null default 0 check (resolve_end >= 0),
  bosses_beaten integer not null default 0 check (bosses_beaten >= 0),
  report jsonb not null check (octet_length(report::text) <= 2000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,report_id)
);

create index run_reports_owner_ended_idx
  on public.run_reports (user_id,ended_at desc);
create index run_reports_balance_idx
  on public.run_reports (game_version,route_mode,lantern,result,ended_at desc);
create index run_reports_hero_omen_idx
  on public.run_reports (hero_id,omen_id,ended_at desc);

create table private.analytics_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger player_profiles_touch_updated_at
before update on public.player_profiles
for each row execute function private.touch_updated_at();

create trigger run_reports_touch_updated_at
before update on public.run_reports
for each row execute function private.touch_updated_at();

create or replace function private.can_read_shared_runs(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from private.analytics_users a
      where a.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.player_profiles p
      where p.user_id = owner_id
        and p.share_balance_data
    );
$$;

revoke all on schema private from public,anon,authenticated;
revoke all on all tables in schema private from public,anon,authenticated;
revoke all on all functions in schema private from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.can_read_shared_runs(uuid) to authenticated;

alter table public.player_profiles enable row level security;
alter table public.run_reports enable row level security;

revoke all on public.player_profiles from anon,authenticated;
revoke all on public.run_reports from anon,authenticated;

grant select,insert,update,delete on public.player_profiles to authenticated;
grant select,insert,update,delete on public.run_reports to authenticated;

create policy "players read their profile"
on public.player_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "players create their profile"
on public.player_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "players update their profile"
on public.player_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "players delete their profile"
on public.player_profiles
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "owners and approved analysts read runs"
on public.run_reports
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or private.can_read_shared_runs(user_id)
);

create policy "players create their runs"
on public.run_reports
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "players update their runs"
on public.run_reports
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "players delete their runs"
on public.run_reports
for delete
to authenticated
using ((select auth.uid()) = user_id);

comment on table public.player_profiles is
  'Private Cloud Ledger preferences. Email remains in auth.users.';
comment on table public.run_reports is
  'Exact-once finished Tavern Bash reports keyed by account and report id.';
comment on table private.analytics_users is
  'Authenticated accounts allowed to read reports from opted-in profiles.';
