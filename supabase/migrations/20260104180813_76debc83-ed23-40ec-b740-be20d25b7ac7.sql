-- Feedback Learning System Tables
CREATE TABLE public.ai_learned_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_type TEXT NOT NULL, -- 'task_decomposition', 'error_fix', 'tool_selection', 'response_style'
  pattern_key TEXT NOT NULL, -- unique identifier for the pattern
  pattern_data JSONB NOT NULL, -- the learned pattern
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  is_validated BOOLEAN DEFAULT false,
  is_harmful BOOLEAN DEFAULT false,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pattern_type, pattern_key)
);

-- Safety Audit Log
CREATE TABLE public.ai_safety_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.chat_sessions(id),
  user_id UUID,
  action_type TEXT NOT NULL, -- 'task_execution', 'code_change', 'tool_call', 'feedback_learning'
  action_data JSONB NOT NULL,
  safety_score DECIMAL(3,2), -- 0-1, higher is safer
  risk_flags TEXT[], -- array of risk identifiers
  was_blocked BOOLEAN DEFAULT false,
  block_reason TEXT,
  was_approved BOOLEAN,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Task Decomposition Tracking
CREATE TABLE public.ai_task_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.chat_sessions(id),
  user_id UUID,
  parent_task_id UUID REFERENCES public.ai_task_queue(id),
  task_order INTEGER NOT NULL DEFAULT 0,
  task_type TEXT NOT NULL, -- 'analysis', 'code_fix', 'code_review', 'deployment', 'test', etc.
  task_description TEXT NOT NULL,
  task_context JSONB,
  proposed_changes JSONB, -- for code changes, stores the diff
  status TEXT DEFAULT 'pending', -- 'pending', 'awaiting_approval', 'approved', 'executing', 'completed', 'failed', 'rejected'
  approval_required BOOLEAN DEFAULT true,
  risk_level TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  execution_result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Tool Registry
CREATE TABLE public.ai_tool_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_name TEXT NOT NULL UNIQUE,
  tool_description TEXT NOT NULL,
  tool_category TEXT NOT NULL, -- 'code', 'file', 'git', 'search', 'analysis', 'execution'
  parameters_schema JSONB NOT NULL,
  required_approval BOOLEAN DEFAULT false,
  risk_level TEXT DEFAULT 'low',
  is_enabled BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Harmful Content Patterns (for safety filtering)
CREATE TABLE public.ai_blocked_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_type TEXT NOT NULL, -- 'prompt_injection', 'harmful_code', 'data_exfil', 'privilege_escalation'
  pattern_regex TEXT,
  pattern_keywords TEXT[],
  severity TEXT DEFAULT 'high', -- 'low', 'medium', 'high', 'critical'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conversation Feedback
CREATE TABLE public.ai_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.chat_sessions(id),
  message_id UUID REFERENCES public.chat_messages(id),
  user_id UUID,
  feedback_type TEXT NOT NULL, -- 'thumbs_up', 'thumbs_down', 'correction', 'report'
  feedback_data JSONB,
  original_response TEXT,
  corrected_response TEXT,
  is_processed BOOLEAN DEFAULT false,
  pattern_extracted UUID REFERENCES public.ai_learned_patterns(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_learned_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_safety_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tool_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_blocked_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view learned patterns" ON public.ai_learned_patterns FOR SELECT USING (true);
CREATE POLICY "System can manage patterns" ON public.ai_learned_patterns FOR ALL USING (true);

CREATE POLICY "Users can view their safety audit" ON public.ai_safety_audit FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert safety audit" ON public.ai_safety_audit FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their tasks" ON public.ai_task_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their tasks" ON public.ai_task_queue FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can manage tasks" ON public.ai_task_queue FOR ALL USING (true);

CREATE POLICY "Anyone can view tool registry" ON public.ai_tool_registry FOR SELECT USING (true);
CREATE POLICY "System can manage tools" ON public.ai_tool_registry FOR ALL USING (true);

CREATE POLICY "System can manage blocked patterns" ON public.ai_blocked_patterns FOR ALL USING (true);

CREATE POLICY "Users can submit feedback" ON public.ai_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their feedback" ON public.ai_feedback FOR SELECT USING (auth.uid() = user_id);

-- Insert default tools
INSERT INTO public.ai_tool_registry (tool_name, tool_description, tool_category, parameters_schema, required_approval, risk_level) VALUES
('read_file', 'Read contents of a file', 'file', '{"file_path": "string"}', false, 'low'),
('write_file', 'Write content to a file', 'file', '{"file_path": "string", "content": "string"}', true, 'medium'),
('delete_file', 'Delete a file', 'file', '{"file_path": "string"}', true, 'high'),
('search_code', 'Search for patterns in codebase', 'search', '{"query": "string", "file_types": "array"}', false, 'low'),
('run_command', 'Execute a shell command', 'execution', '{"command": "string", "args": "array"}', true, 'high'),
('git_commit', 'Commit changes to git', 'git', '{"message": "string", "files": "array"}', true, 'medium'),
('git_push', 'Push changes to remote', 'git', '{"branch": "string"}', true, 'high'),
('analyze_error', 'Analyze an error message', 'analysis', '{"error": "string", "context": "object"}', false, 'low'),
('propose_fix', 'Propose a code fix', 'code', '{"file": "string", "issue": "string", "fix": "string"}', true, 'medium'),
('run_tests', 'Run test suite', 'execution', '{"test_pattern": "string"}', false, 'low'),
('lint_code', 'Run linter on code', 'analysis', '{"files": "array"}', false, 'low'),
('build_project', 'Build the project', 'execution', '{"config": "object"}', true, 'medium');

-- Insert default blocked patterns
INSERT INTO public.ai_blocked_patterns (pattern_type, pattern_keywords, severity, description) VALUES
('prompt_injection', ARRAY['ignore previous', 'disregard instructions', 'new instructions', 'system prompt'], 'critical', 'Attempts to override system instructions'),
('harmful_code', ARRAY['rm -rf', 'format c:', 'del /f', ':(){:|:&};:', 'fork bomb'], 'critical', 'Destructive system commands'),
('data_exfil', ARRAY['curl.*api_key', 'wget.*secret', 'send.*password', 'upload.*credentials'], 'high', 'Data exfiltration attempts'),
('privilege_escalation', ARRAY['sudo', 'chmod 777', 'chown root', 'admin.add'], 'high', 'Privilege escalation attempts'),
('sql_injection', ARRAY['DROP TABLE', 'DELETE FROM', 'TRUNCATE', '1=1', 'OR 1=1'], 'high', 'SQL injection attempts');

-- Create indexes
CREATE INDEX idx_task_queue_session ON public.ai_task_queue(session_id);
CREATE INDEX idx_task_queue_status ON public.ai_task_queue(status);
CREATE INDEX idx_safety_audit_session ON public.ai_safety_audit(session_id);
CREATE INDEX idx_learned_patterns_type ON public.ai_learned_patterns(pattern_type);
CREATE INDEX idx_feedback_session ON public.ai_feedback(session_id);