-- Run this in the Supabase SQL Editor (Project > SQL Editor > New Query)

-- People table: each row is a person Saad tracks tasks for
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  role text,
  created_at timestamptz default now()
);

-- Tasks table
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  person_id uuid references people(id) on delete set null,
  title text not null,
  description text,
  priority text default 'medium' check (priority in ('urgent','high','medium','low')),
  column_id text default 'todo' check (column_id in ('todo','progress','review','blocked','done')),
  due_date date,
  tags text[] default '{}',
  subtasks jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security: owners only see their own data
alter table people enable row level security;
alter table tasks enable row level security;

create policy "Owners manage their own people"
  on people for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners manage their own tasks"
  on tasks for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Keep updated_at fresh
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row
  execute function set_updated_at();
