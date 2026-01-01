-- Create chat_sessions table for conversation persistence
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  domain TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_archived BOOLEAN DEFAULT false,
  summary TEXT
);

-- Create chat_messages table for message storage
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]'::jsonb,
  action_data JSONB,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  token_count INTEGER DEFAULT 0,
  weight DECIMAL(3,2) DEFAULT 1.00
);

-- Create uploaded_documents table for document management
CREATE TABLE public.uploaded_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  extracted_text TEXT,
  embeddings_generated BOOLEAN DEFAULT false,
  page_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document_chunks table for RAG (storing embeddings as JSONB)
CREATE TABLE public.document_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.uploaded_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  page_number INTEGER,
  section_title TEXT,
  content TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  embedding JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create action_audit_log table for tracking executed actions
CREATE TABLE public.action_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_data JSONB NOT NULL,
  risk_level TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed')),
  approved_by UUID REFERENCES auth.users(id),
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions (allow anonymous access for demo)
CREATE POLICY "Anyone can view chat sessions"
ON public.chat_sessions FOR SELECT
USING (true);

CREATE POLICY "Anyone can create chat sessions"
ON public.chat_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update chat sessions"
ON public.chat_sessions FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete chat sessions"
ON public.chat_sessions FOR DELETE
USING (true);

-- RLS Policies for chat_messages
CREATE POLICY "Anyone can view messages"
ON public.chat_messages FOR SELECT
USING (true);

CREATE POLICY "Anyone can create messages"
ON public.chat_messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete messages"
ON public.chat_messages FOR DELETE
USING (true);

-- RLS Policies for uploaded_documents
CREATE POLICY "Anyone can view documents"
ON public.uploaded_documents FOR SELECT
USING (true);

CREATE POLICY "Anyone can upload documents"
ON public.uploaded_documents FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete documents"
ON public.uploaded_documents FOR DELETE
USING (true);

-- RLS Policies for document_chunks
CREATE POLICY "Anyone can view chunks"
ON public.document_chunks FOR SELECT
USING (true);

CREATE POLICY "Anyone can create chunks"
ON public.document_chunks FOR INSERT
WITH CHECK (true);

-- RLS Policies for action_audit_log
CREATE POLICY "Anyone can view action logs"
ON public.action_audit_log FOR SELECT
USING (true);

CREATE POLICY "Anyone can create action logs"
ON public.action_audit_log FOR INSERT
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for chat_sessions
CREATE TRIGGER update_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  52428800,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/gif', 'image/webp']
);

-- Storage policies for documents bucket
CREATE POLICY "Anyone can upload documents to bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Anyone can view documents in bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

CREATE POLICY "Anyone can delete documents from bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents');