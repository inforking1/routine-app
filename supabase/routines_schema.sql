-- ==========================================
-- 1. Routines Table (루틴 목록)
-- ==========================================
create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  order_index int default 0,
  category text default 'morning', -- 'morning', 'evening', etc.
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for efficient querying by user and category
create index if not exists idx_routines_user_category 
  on routines (user_id, category, order_index);


-- ==========================================
-- 2. Routine Logs Table (루틴 수행 기록)
-- ==========================================
create table if not exists routine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references routines(id) on delete cascade,
  date date not null, -- YYYY-MM-DD
  is_done boolean default false,
  created_at timestamp with time zone default now()
);

-- Index for fetching daily logs
create index if not exists idx_routine_logs_user_date 
  on routine_logs (user_id, date);

-- Index for analytics (stats by routine)
create index if not exists idx_routine_logs_routine_date 
  on routine_logs (routine_id, date);


-- ==========================================
-- 3. Row Level Security (RLS) Policies
-- ==========================================
alter table routines enable row level security;
alter table routine_logs enable row level security;

-- Routines: Users can only see/edit their own
create policy "Users can view their own routines" on routines
  for select using (auth.uid() = user_id);

create policy "Users can insert their own routines" on routines
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own routines" on routines
  for update using (auth.uid() = user_id);

create policy "Users can delete their own routines" on routines
  for delete using (auth.uid() = user_id);

-- Logs: Users can only see/edit their own logs
create policy "Users can view their own logs" on routine_logs
  for select using (auth.uid() = user_id);

create policy "Users can insert their own logs" on routine_logs
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own logs" on routine_logs
  for update using (auth.uid() = user_id);

create policy "Users can delete their own logs" on routine_logs
  for delete using (auth.uid() = user_id);
