-- Analytics and AI stats tracking
CREATE TABLE public.ai_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID,
  query_type TEXT NOT NULL DEFAULT 'general',
  domain TEXT NOT NULL DEFAULT 'hr',
  tool_called TEXT,
  tool_success BOOLEAN DEFAULT true,
  risk_level TEXT DEFAULT 'low',
  response_time_ms INTEGER,
  token_count INTEGER DEFAULT 0,
  confidence_score NUMERIC(3,2) DEFAULT 0.85,
  has_citation BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for analytics
CREATE POLICY "Anyone can create analytics" ON public.ai_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "HR can view all analytics" ON public.ai_analytics FOR SELECT USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Users can view own analytics" ON public.ai_analytics FOR SELECT USING (auth.uid() = user_id);

-- Payroll/Payslip requests table
CREATE TABLE public.payslip_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'generated',
  payslip_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payslip_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payslips" ON public.payslip_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can request payslips" ON public.payslip_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Training requests table
CREATE TABLE public.training_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  training_name TEXT NOT NULL,
  training_type TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own training" ON public.training_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can request training" ON public.training_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "HR can view all training" ON public.training_requests FOR SELECT USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "HR can approve training" ON public.training_requests FOR UPDATE USING (has_role(auth.uid(), 'hr'::app_role));

-- Reimbursement requests table
CREATE TABLE public.reimbursement_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  receipt_path TEXT,
  status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reimbursement_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reimbursements" ON public.reimbursement_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create reimbursements" ON public.reimbursement_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "HR can view all reimbursements" ON public.reimbursement_requests FOR SELECT USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "HR can update reimbursements" ON public.reimbursement_requests FOR UPDATE USING (has_role(auth.uid(), 'hr'::app_role));

-- Developer PR/deployment requests
CREATE TABLE public.deployment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  environment TEXT NOT NULL,
  service_name TEXT NOT NULL,
  version TEXT,
  status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  deployed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deployment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Devs can view deployments" ON public.deployment_requests FOR SELECT USING (has_role(auth.uid(), 'developer'::app_role) OR auth.uid() = requester_id);
CREATE POLICY "Devs can create deployments" ON public.deployment_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Devs can approve deployments" ON public.deployment_requests FOR UPDATE USING (has_role(auth.uid(), 'developer'::app_role));

-- Access requests table
CREATE TABLE public.access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  access_level TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own access requests" ON public.access_requests FOR SELECT USING (auth.uid() = requester_id);
CREATE POLICY "Users can create access requests" ON public.access_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Devs can view access requests" ON public.access_requests FOR SELECT USING (has_role(auth.uid(), 'developer'::app_role));
CREATE POLICY "Devs can approve access" ON public.access_requests FOR UPDATE USING (has_role(auth.uid(), 'developer'::app_role));

-- Incident reports table
CREATE TABLE public.incident_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  service_name TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  root_cause TEXT,
  resolution TEXT,
  status TEXT DEFAULT 'open',
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Devs can view incidents" ON public.incident_reports FOR SELECT USING (has_role(auth.uid(), 'developer'::app_role) OR auth.uid() = reporter_id);
CREATE POLICY "Devs can create incidents" ON public.incident_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Devs can update incidents" ON public.incident_reports FOR UPDATE USING (has_role(auth.uid(), 'developer'::app_role));