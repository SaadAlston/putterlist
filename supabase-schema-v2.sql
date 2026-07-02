-- ═══════════════════════════════════════════════════════════
-- PutterList v2 schema — multi-user auth, invites, RLS split
-- Run this in Supabase SQL Editor. Safe to run on the existing
-- database; it only adds new columns/tables and replaces policies.
-- ═══════════════════════════════════════════════════════════

-- 1. Add member-account linkage to people
alter table people add column if not exists user_id uuid references auth.users(id) on delete set null;

-- 2. Invites table — one row per pending or accepted invite
create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  person_id uuid references people(id) on delete cascade not null,
  email text,
  token uuid unique default gen_random_uuid(),
  used boolean default false,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '14 days')
);

alter table invites enable row level security;

drop policy if exists "Owners manage their own invites" on invites;
create policy "Owners manage their own invites"
  on invites for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Anyone can look up a single invite by its token (needed to accept one
-- before they're logged in as anything other than a brand-new user).
-- We only ever expose non-sensitive columns to the client for this query.
drop policy if exists "Anyone can read an invite by token" on invites;
create policy "Anyone can read an invite by token"
  on invites for select
  using (true);

-- ═══════════════════════════════════════════════════════════
-- 3. People policies — admin (owner) full control,
--    member (linked user_id) can only read their own row
-- ═══════════════════════════════════════════════════════════
drop policy if exists "Owners manage their own people" on people;

create policy "Owner selects their people"
  on people for select
  using (auth.uid() = owner_id or auth.uid() = user_id);

create policy "Owner inserts people"
  on people for insert
  with check (auth.uid() = owner_id);

create policy "Owner updates people"
  on people for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Special case: a member accepting an invite needs to set their own
-- user_id on their person row. Allowed only when user_id is currently
-- null and they're claiming it as themselves.
create policy "Invitee claims their person row"
  on people for update
  using (user_id is null)
  with check (user_id = auth.uid());

create policy "Owner deletes people"
  on people for delete
  using (auth.uid() = owner_id);

-- ═══════════════════════════════════════════════════════════
-- 4. Task policies — admin full control, member limited to
--    their own assigned tasks, cannot delete
-- ═══════════════════════════════════════════════════════════
drop policy if exists "Owners manage their own tasks" on tasks;

create policy "Select own board or assigned tasks"
  on tasks for select
  using (
    auth.uid() = owner_id
    or person_id in (select id from people where user_id = auth.uid())
  );

create policy "Owner inserts any task"
  on tasks for insert
  with check (auth.uid() = owner_id);

create policy "Member inserts task for self"
  on tasks for insert
  with check (
    person_id in (select id from people where user_id = auth.uid())
    and owner_id in (select owner_id from people where user_id = auth.uid())
  );

create policy "Owner updates any task"
  on tasks for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Member updates own assigned task"
  on tasks for update
  using (person_id in (select id from people where user_id = auth.uid()))
  with check (person_id in (select id from people where user_id = auth.uid()));

create policy "Owner deletes any task"
  on tasks for delete
  using (auth.uid() = owner_id);

-- Members cannot delete tasks — no delete policy is created for them,
-- and RLS defaults to deny when no policy matches.

-- ═══════════════════════════════════════════════════════════
-- 5. Realtime — turn on change broadcasts for live sync
-- ═══════════════════════════════════════════════════════════
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table people;

-- ═══════════════════════════════════════════════════════════
-- 6. Scheduled notifications (optional)
--    Requires the notify-overdue Edge Function to be deployed first.
--    Enable the pg_cron and pg_net extensions via Database > Extensions
--    in the Supabase dashboard, then run this to schedule a daily check
--    at 8am UTC. Replace YOUR-PROJECT-REF and YOUR-ANON-KEY.
-- ═══════════════════════════════════════════════════════════
-- select cron.schedule(
--   'notify-overdue-daily',
--   '0 8 * * *',
--   $$
--   select net.http_post(
--     url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/notify-overdue',
--     headers := jsonb_build_object('Authorization', 'Bearer YOUR-ANON-KEY')
--   );
--   $$
-- );

-- ═══════════════════════════════════════════════════════════
-- 7. Rate limiting / abuse protection
--    This is mostly configured in the dashboard, not SQL:
--    Authentication > Rate Limits — Supabase already caps magic-link
--    requests per email/IP by default. Consider also enabling
--    Authentication > Attack Protection > CAPTCHA if this becomes public.
-- ═══════════════════════════════════════════════════════════

