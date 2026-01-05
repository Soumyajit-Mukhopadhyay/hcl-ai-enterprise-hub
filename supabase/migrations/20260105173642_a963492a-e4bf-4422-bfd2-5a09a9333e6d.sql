-- Dev tickets table for bug reports
CREATE TABLE public.dev_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT NOT NULL UNIQUE,
  reporter_id UUID REFERENCES auth.users(id),
  assigned_developer_id UUID REFERENCES auth.users(id),
  service_name TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  description TEXT NOT NULL,
  error_details JSONB,
  root_cause TEXT,
  proposed_fix JSONB,
  code_changes JSONB,
  test_impact TEXT,
  deployment_risk TEXT DEFAULT 'low',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Code change proposals
CREATE TABLE public.code_change_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.dev_tickets(id),
  proposed_by TEXT NOT NULL DEFAULT 'ai',
  file_path TEXT NOT NULL,
  original_code TEXT,
  proposed_code TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'patch',
  explanation TEXT,
  risk_level TEXT DEFAULT 'low',
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI capability requests (when AI needs new abilities)
CREATE TABLE public.ai_capability_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  capability_name TEXT NOT NULL,
  capability_type TEXT NOT NULL,
  description TEXT NOT NULL,
  trigger_context TEXT,
  requested_by_user_id UUID,
  proposed_implementation JSONB,
  proposed_tool_schema JSONB,
  safety_analysis JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Self-learning sessions
CREATE TABLE public.ai_learning_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_type TEXT NOT NULL,
  trigger TEXT NOT NULL,
  user_id UUID,
  conversation_context JSONB,
  extracted_patterns JSONB,
  generated_prompt TEXT,
  safety_score NUMERIC DEFAULT 0,
  safety_analysis JSONB,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID,
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Role-based navigation config
CREATE TABLE public.navigation_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_path TEXT NOT NULL,
  route_name TEXT NOT NULL,
  required_roles TEXT[] NOT NULL,
  description TEXT,
  icon_name TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dev_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_change_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_capability_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_config ENABLE ROW LEVEL SECURITY;

-- Dev tickets policies
CREATE POLICY "Users can view all tickets" ON public.dev_tickets FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tickets" ON public.dev_tickets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Developers can update tickets" ON public.dev_tickets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'developer')
);

-- Code change proposals policies
CREATE POLICY "All can view proposals" ON public.code_change_proposals FOR SELECT USING (true);
CREATE POLICY "System can create proposals" ON public.code_change_proposals FOR INSERT WITH CHECK (true);
CREATE POLICY "Developers can update proposals" ON public.code_change_proposals FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'developer')
);

-- AI capability requests policies
CREATE POLICY "All can view capability requests" ON public.ai_capability_requests FOR SELECT USING (true);
CREATE POLICY "System can create requests" ON public.ai_capability_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Developers can update requests" ON public.ai_capability_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'developer')
);

-- Learning sessions policies
CREATE POLICY "Authenticated can view learning" ON public.ai_learning_sessions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "System can create learning" ON public.ai_learning_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Developers can approve learning" ON public.ai_learning_sessions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'developer')
);

-- Navigation config policies
CREATE POLICY "All can view navigation" ON public.navigation_config FOR SELECT USING (true);
CREATE POLICY "Developers can manage navigation" ON public.navigation_config FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'developer')
);

-- Insert default navigation config
INSERT INTO public.navigation_config (route_path, route_name, required_roles, description, icon_name, display_order) VALUES
('/dashboard', 'Dashboard', ARRAY['employee', 'hr', 'it', 'developer'], 'Main dashboard', 'LayoutDashboard', 1),
('/chat', 'AI Assistant', ARRAY['employee', 'hr', 'it', 'developer'], 'Chat with AI', 'MessageSquare', 2),
('/tickets', 'Support Tickets', ARRAY['employee', 'hr', 'it', 'developer'], 'View tickets', 'Ticket', 3),
('/hr-portal', 'HR Portal', ARRAY['hr', 'developer'], 'HR management', 'Users', 4),
('/dev-console', 'Developer Console', ARRAY['developer'], 'Code management & AI training', 'Code', 5),
('/code-review', 'Code Review', ARRAY['developer'], 'Review code changes', 'GitPullRequest', 6),
('/ai-training', 'AI Training', ARRAY['developer'], 'Train and configure AI', 'Brain', 7),
('/settings', 'Settings', ARRAY['employee', 'hr', 'it', 'developer'], 'Account settings', 'Settings', 8);

-- Trigger for updating timestamps
CREATE TRIGGER update_dev_tickets_updated_at
  BEFORE UPDATE ON public.dev_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();