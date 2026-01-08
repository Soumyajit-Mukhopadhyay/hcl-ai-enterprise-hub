-- ============================================================================
-- GITHUB OPERATIONS TRACKING TABLE
-- ============================================================================
CREATE TABLE public.github_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL, -- 'create_pr', 'push_commit', 'create_branch', 'merge_pr', 'list_files', 'get_file'
  repo_owner TEXT,
  repo_name TEXT,
  branch_name TEXT,
  target_branch TEXT,
  pr_number INTEGER,
  pr_url TEXT,
  pr_title TEXT,
  pr_body TEXT,
  commit_sha TEXT,
  commit_message TEXT,
  files_changed JSONB DEFAULT '[]',
  operation_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'executing', 'completed', 'failed', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  error_message TEXT,
  requires_approval BOOLEAN DEFAULT true,
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.github_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for github_operations
CREATE POLICY "Users can view their own github operations"
ON public.github_operations
FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'developer'));

CREATE POLICY "Users can create their own github operations"
ON public.github_operations
FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'developer'));

CREATE POLICY "Users can update their own github operations"
ON public.github_operations
FOR UPDATE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'developer'));

-- ============================================================================
-- DATABASE MIGRATIONS LOG TABLE
-- ============================================================================
CREATE TABLE public.database_migrations_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  proposed_by TEXT NOT NULL, -- 'ai_agent' or user_id
  user_id UUID,
  migration_name TEXT NOT NULL,
  migration_description TEXT,
  migration_sql TEXT NOT NULL,
  rollback_sql TEXT,
  tables_affected TEXT[] DEFAULT '{}',
  operation_type TEXT NOT NULL CHECK (operation_type IN ('create_table', 'alter_table', 'add_column', 'drop_column', 'create_index', 'add_rls', 'other')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'executed', 'failed', 'rejected', 'rolled_back')),
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  safety_analysis JSONB DEFAULT '{}',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  error_message TEXT,
  execution_result JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.database_migrations_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for database_migrations_log
CREATE POLICY "Developers can view all migrations"
ON public.database_migrations_log
FOR SELECT
USING (public.has_role(auth.uid(), 'developer'));

CREATE POLICY "System can create migrations"
ON public.database_migrations_log
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Developers can update migrations"
ON public.database_migrations_log
FOR UPDATE
USING (public.has_role(auth.uid(), 'developer'));

-- ============================================================================
-- FILE OPERATIONS LOG TABLE
-- ============================================================================
CREATE TABLE public.file_operations_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('create', 'read', 'update', 'delete', 'list', 'search')),
  file_path TEXT NOT NULL,
  file_content TEXT,
  original_content TEXT,
  change_description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'executed', 'failed', 'rejected')),
  requires_approval BOOLEAN DEFAULT true,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.file_operations_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their file operations"
ON public.file_operations_log
FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'developer'));

CREATE POLICY "Users can create file operations"
ON public.file_operations_log
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their file operations"
ON public.file_operations_log
FOR UPDATE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'developer'));

-- Add indexes for performance
CREATE INDEX idx_github_operations_user_id ON public.github_operations(user_id);
CREATE INDEX idx_github_operations_status ON public.github_operations(status);
CREATE INDEX idx_github_operations_created_at ON public.github_operations(created_at DESC);

CREATE INDEX idx_migrations_log_status ON public.database_migrations_log(status);
CREATE INDEX idx_migrations_log_created_at ON public.database_migrations_log(created_at DESC);

CREATE INDEX idx_file_operations_user_id ON public.file_operations_log(user_id);
CREATE INDEX idx_file_operations_status ON public.file_operations_log(status);