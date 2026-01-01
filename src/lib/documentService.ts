import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedDocument {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  extracted_text?: string;
  embeddings_generated?: boolean;
  page_count?: number;
  created_at: string;
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  content: string;
  snippet: string;
  score: number;
}

// Supported file types
const SUPPORTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
];

// Upload a document to storage and trigger processing
export async function uploadDocument(
  file: File,
  sessionId?: string
): Promise<UploadedDocument> {
  if (!SUPPORTED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
    throw new Error(`Unsupported file type: ${file.type}. Supported types: PDF, DOC, DOCX, PNG, JPG, GIF, WEBP, TXT`);
  }

  if (file.size > 50 * 1024 * 1024) { // 50MB limit
    throw new Error('File size exceeds 50MB limit');
  }

  const fileId = uuidv4();
  const fileExt = file.name.split('.').pop() || 'bin';
  const storagePath = `public/${fileId}.${fileExt}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  // Extract text for text-based files locally
  let extractedText = '';
  if (file.type === 'text/plain') {
    extractedText = await file.text();
  }

  // Save document metadata
  const { data, error } = await supabase
    .from('uploaded_documents')
    .insert({
      id: fileId,
      session_id: sessionId || null,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
      extracted_text: extractedText || null,
      embeddings_generated: false,
    })
    .select()
    .single();

  if (error) {
    // Cleanup uploaded file on metadata save failure
    await supabase.storage.from('documents').remove([storagePath]);
    console.error('Metadata save error:', error);
    throw new Error(`Failed to save document metadata: ${error.message}`);
  }

  // Trigger document processing for PDF files
  if (file.type === 'application/pdf') {
    processDocument(fileId, storagePath).catch(console.error);
  }

  return data as UploadedDocument;
}

// Process document (extract text, create embeddings)
export async function processDocument(documentId: string, storagePath: string): Promise<void> {
  console.log(`Processing document: ${documentId}`);
  
  const { data, error } = await supabase.functions.invoke('process-document', {
    body: { documentId, storagePath },
  });

  if (error) {
    console.error('Document processing error:', error);
    throw new Error(`Failed to process document: ${error.message}`);
  }

  console.log('Document processed:', data);
}

// Semantic search across documents
export async function semanticSearch(
  query: string, 
  sessionId?: string,
  limit: number = 5
): Promise<SearchResult[]> {
  const { data, error } = await supabase.functions.invoke('semantic-search', {
    body: { query, sessionId, limit },
  });

  if (error) {
    console.error('Semantic search error:', error);
    throw new Error(`Search failed: ${error.message}`);
  }

  return data?.results || [];
}

// Get documents for a session
export async function getSessionDocuments(sessionId: string): Promise<UploadedDocument[]> {
  const { data, error } = await supabase
    .from('uploaded_documents')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }

  return data || [];
}

// Get all documents
export async function getAllDocuments(): Promise<UploadedDocument[]> {
  const { data, error } = await supabase
    .from('uploaded_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }

  return data || [];
}

// Delete a document and its chunks
export async function deleteDocument(documentId: string): Promise<void> {
  // Get document info first
  const { data: doc, error: fetchError } = await supabase
    .from('uploaded_documents')
    .select('storage_path')
    .eq('id', documentId)
    .single();

  if (fetchError || !doc) {
    throw new Error('Document not found');
  }

  // Delete chunks first
  const { error: chunksError } = await supabase
    .from('document_chunks')
    .delete()
    .eq('document_id', documentId);

  if (chunksError) {
    console.error('Chunks delete error:', chunksError);
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('documents')
    .remove([doc.storage_path]);

  if (storageError) {
    console.error('Storage delete error:', storageError);
  }

  // Delete metadata
  const { error } = await supabase
    .from('uploaded_documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

// Get document URL
export function getDocumentUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(storagePath);
  
  return data.publicUrl;
}

// Get document processing status
export async function getDocumentStatus(documentId: string): Promise<{ processed: boolean; pageCount: number }> {
  const { data, error } = await supabase
    .from('uploaded_documents')
    .select('embeddings_generated, page_count')
    .eq('id', documentId)
    .single();

  if (error || !data) {
    return { processed: false, pageCount: 0 };
  }

  return {
    processed: data.embeddings_generated || false,
    pageCount: data.page_count || 0,
  };
}

// Format file size helper
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
