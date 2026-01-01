import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple text chunking function
function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);
    
    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > chunkSize * 0.5) {
        chunk = chunk.slice(0, breakPoint + 1);
      }
    }
    
    chunks.push(chunk.trim());
    start += chunk.length - overlap;
    if (start < 0) start = chunk.length;
  }
  
  return chunks.filter(c => c.length > 50);
}

// Extract text from PDF using basic parsing
async function extractTextFromPDF(pdfBytes: Uint8Array): Promise<{ text: string; pageCount: number }> {
  // Convert to string and look for text streams
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const pdfString = decoder.decode(pdfBytes);
  
  // Extract text between stream markers (simplified PDF text extraction)
  const textParts: string[] = [];
  
  // Look for text in parentheses (PDF text objects)
  const textRegex = /\(([^)]+)\)/g;
  let match;
  while ((match = textRegex.exec(pdfString)) !== null) {
    const text = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
    if (text.length > 2 && !/^[\x00-\x1F]+$/.test(text)) {
      textParts.push(text);
    }
  }
  
  // Also look for BT...ET text blocks with Tj/TJ operators
  const tjRegex = /\[?\(([^)]+)\)\]?\s*T[jJ]/g;
  while ((match = tjRegex.exec(pdfString)) !== null) {
    const text = match[1].replace(/\\[nrt]/g, ' ').trim();
    if (text.length > 2) {
      textParts.push(text);
    }
  }
  
  // Count pages
  const pageCount = (pdfString.match(/\/Type\s*\/Page[^s]/g) || []).length || 1;
  
  const extractedText = textParts.join(' ')
    .replace(/\s+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
  
  return { 
    text: extractedText || 'Unable to extract text from this PDF. The document may be image-based or encrypted.', 
    pageCount 
  };
}

// Generate simple embedding using TF-IDF-like approach
function generateSimpleEmbedding(text: string): number[] {
  // Common words to ignore
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these', 'those', 'it', 'its']);
  
  // Tokenize and normalize
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  
  // Create word frequency map
  const wordFreq = new Map<string, number>();
  for (const word of words) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  }
  
  // Create a fixed-size embedding using hash buckets
  const embeddingSize = 256;
  const embedding = new Array(embeddingSize).fill(0);
  
  for (const [word, freq] of wordFreq) {
    // Hash word to bucket
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(i);
      hash = hash & hash;
    }
    const bucket = Math.abs(hash) % embeddingSize;
    embedding[bucket] += freq * (1 + Math.log(freq));
  }
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }
  
  return embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, storagePath } = await req.json();
    
    if (!documentId || !storagePath) {
      return new Response(
        JSON.stringify({ error: 'documentId and storagePath are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing document: ${documentId}, path: ${storagePath}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download document' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract text based on file type
    const bytes = new Uint8Array(await fileData.arrayBuffer());
    let extractedText = '';
    let pageCount = 1;

    if (storagePath.toLowerCase().endsWith('.pdf')) {
      const result = await extractTextFromPDF(bytes);
      extractedText = result.text;
      pageCount = result.pageCount;
    } else {
      // For text files, just decode
      extractedText = new TextDecoder().decode(bytes);
    }

    console.log(`Extracted ${extractedText.length} characters, ${pageCount} pages`);

    // Update document with extracted text
    const { error: updateError } = await supabase
      .from('uploaded_documents')
      .update({
        extracted_text: extractedText.slice(0, 100000), // Limit text size
        page_count: pageCount,
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    // Chunk the text
    const chunks = chunkText(extractedText);
    console.log(`Created ${chunks.length} chunks`);

    // Create embeddings and store chunks
    const chunkInserts = chunks.map((content, index) => {
      const embedding = generateSimpleEmbedding(content);
      
      // Detect page number from content (rough estimate)
      const pageMatch = content.match(/page\s*(\d+)/i);
      const pageNumber = pageMatch ? parseInt(pageMatch[1]) : Math.floor((index / chunks.length) * pageCount) + 1;

      return {
        document_id: documentId,
        content,
        chunk_index: index,
        page_number: pageNumber,
        token_count: content.split(/\s+/).length,
        embedding: embedding,
      };
    });

    // Insert chunks in batches
    const batchSize = 20;
    for (let i = 0; i < chunkInserts.length; i += batchSize) {
      const batch = chunkInserts.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('document_chunks')
        .insert(batch);

      if (insertError) {
        console.error('Chunk insert error:', insertError);
      }
    }

    // Mark document as processed
    await supabase
      .from('uploaded_documents')
      .update({ embeddings_generated: true })
      .eq('id', documentId);

    console.log('Document processing complete');

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunksCreated: chunks.length,
        pageCount,
        textLength: extractedText.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Processing error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
