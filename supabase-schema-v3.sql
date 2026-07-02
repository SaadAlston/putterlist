-- ═══════════════════════════════════════════════════════════
-- PutterList v3 schema — board sharing, personalized invite email
-- Run this in Supabase SQL Editor after v2.
-- ═══════════════════════════════════════════════════════════

-- 1. Store the inviting admin's email for personalized welcome emails
alter table invites add column if not exists owner_email text;

-- ═══════════════════════════════════════════════════════════
-- 2. Board sharing — admin grants a joined member view access
--    to another person's board. One board can have many viewers.
--    One viewer can see many boards. View only, no editing.
-- ═══════════════════════════════════════════════════════════
create table if not exists board_access (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  board_person_id uuid references people(id) on delete cascade not null,
  viewer_user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(board_person_id, viewer_user_id)
);

alter table board_access enable row level security;

drop policy if exists "Owner manages board access" on board_access;
create policy "Owner manages board access"
  on board_access for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Viewer reads their own grants" on board_access;
create policy "Viewer reads their own grants"
  on board_access for select
  using (auth.uid() = viewer_user_id);

-- ═══════════════════════════════════════════════════════════
-- 3. Expand people visibility: a viewer can see the name of any
--    board they've been granted access to, not just their own row.
-- ═══════════════════════════════════════════════════════════
drop policy if exists "Owner selects their people" on people;
drop policy if exists "Owner, self, or shared viewer selects people" on people;
create policy "Owner, self, or shared viewer selects people"
  on people for select
  using (
    auth.uid() = owner_id
    or auth.uid() = user_id
    or id in (select board_person_id from board_access where viewer_user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════
-- 4. Expand task visibility: a viewer sees tasks on any board
--    they've been granted access to. Select only, no edit or
--    delete rights come with a share grant.
-- ═══════════════════════════════════════════════════════════
drop policy if exists "Select own board or assigned tasks" on tasks;
drop policy if exists "Select own board, assigned, or shared tasks" on tasks;
create policy "Select own board, assigned, or shared tasks"
  on tasks for select
  using (
    auth.uid() = owner_id
    or person_id in (select id from people where user_id = auth.uid())
    or person_id in (select board_person_id from board_access where viewer_user_id = auth.uid())
  );
