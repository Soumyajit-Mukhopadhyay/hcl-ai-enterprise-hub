-- Add is_global flag to uploaded_documents to mark company-wide documents
ALTER TABLE public.uploaded_documents 
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- Add index for efficient global document queries
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_is_global 
ON public.uploaded_documents(is_global) WHERE is_global = true;

-- Update RLS policy to allow reading global documents
DROP POLICY IF EXISTS "Users can view global documents" ON public.uploaded_documents;
CREATE POLICY "Users can view global documents" 
ON public.uploaded_documents 
FOR SELECT 
USING (is_global = true OR user_id = auth.uid() OR user_id IS NULL);

-- Also update document_chunks to be readable if parent document is global
DROP POLICY IF EXISTS "Users can view chunks from accessible documents" ON public.document_chunks;
CREATE POLICY "Users can view chunks from accessible documents"
ON public.document_chunks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.uploaded_documents 
    WHERE uploaded_documents.id = document_chunks.document_id 
    AND (uploaded_documents.is_global = true OR uploaded_documents.user_id = auth.uid() OR uploaded_documents.user_id IS NULL)
  )
);