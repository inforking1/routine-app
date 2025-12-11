-- Performance Optimization Phase 1: Add Indexes

-- 1. Todos
CREATE INDEX IF NOT EXISTS idx_todos_user_created_at 
ON public.todos (user_id, created_at DESC);

-- 2. Routines (Often queried by user_id)
CREATE INDEX IF NOT EXISTS idx_routines_user_id 
ON public.routines (user_id);

-- 3. Routine Logs (Queried by user_id + date for "today's routine")
-- Existing PK is likely id, but we usually query by user_id + date
CREATE INDEX IF NOT EXISTS idx_routine_logs_user_date 
ON public.routine_logs (user_id, date);

-- 4. Anniversaries
CREATE INDEX IF NOT EXISTS idx_anniversaries_user_date 
ON public.anniversaries (user_id, date);

-- 5. Gratitudes
CREATE INDEX IF NOT EXISTS idx_gratitudes_user_created_at 
ON public.gratitudes (user_id, created_at DESC);

-- 6. Posts (Community) - already has heavy queries
CREATE INDEX IF NOT EXISTS idx_posts_created_at 
ON public.posts (created_at DESC);

-- If filtering my posts
CREATE INDEX IF NOT EXISTS idx_posts_user_created_at 
ON public.posts (user_id, created_at DESC);
