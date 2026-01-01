import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedDocument {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  extracted_text?: string;
  created_at: string;
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

// Upload a document to storage
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

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(storagePath);

  // Extract text for text-based files
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
    })
    .select()
    .single();

  if (error) {
    // Cleanup uploaded file on metadata save failure
    await supabase.storage.from('documents').remove([storagePath]);
    console.error('Metadata save error:', error);
    throw new Error(`Failed to save document metadata: ${error.message}`);
  }

  return data as UploadedDocument;
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

// Delete a document
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

// Extract text from document for context (simplified - real implementation would use PDF parsing)
export async function extractDocumentContext(doc: UploadedDocument): Promise<string> {
  if (doc.extracted_text) {
    return doc.extracted_text;
  }

  // For PDFs and other documents, we'd need server-side processing
  // For now, return a placeholder indicating the document is attached
  return `[Document attached: ${doc.file_name} (${formatFileSize(doc.file_size)})]`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
