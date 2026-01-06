import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate simple embedding for query
function generateQueryEmbedding(text: string): number[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these', 'those', 'it', 'its', 'what', 'how', 'why', 'when', 'where', 'who', 'which']);
  
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  
  const wordFreq = new Map<string, number>();
  for (const word of words) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  }
  
  const embeddingSize = 256;
  const embedding = new Array(embeddingSize).fill(0);
  
  for (const [word, freq] of wordFreq) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(i);
      hash = hash & hash;
    }
    const bucket = Math.abs(hash) % embeddingSize;
    embedding[bucket] += freq * (1 + Math.log(freq));
  }
  
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }
  
  return embedding;
}

// Calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude > 0 ? dotProduct / magnitude : 0;
}

// Keyword-based scoring as fallback
function keywordScore(query: string, content: string): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const contentLower = content.toLowerCase();
  
  let score = 0;
  for (const word of queryWords) {
    const regex = new RegExp(word, 'gi');
    const matches = contentLower.match(regex);
    if (matches) {
      score += matches.length * (1 / Math.log(word.length + 1));
    }
  }
  
  return score;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, sessionId, limit = 5 } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Semantic search: "${query}", session: ${sessionId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get document chunks (optionally filtered by session)
    let chunksQuery = supabase
      .from('document_chunks')
      .select(`
        id,
        content,
        page_number,
        section_title,
        embedding,
        document_id,
        uploaded_documents!inner (
          id,
          file_name,
          session_id
        )
      `)
      .not('embedding', 'is', null);

    // Include session-specific documents AND global documents (like Annual Reports)
    if (sessionId) {
      // Use OR filter: session docs OR global docs
      chunksQuery = chunksQuery.or(`session_id.eq.${sessionId},is_global.eq.true`, { referencedTable: 'uploaded_documents' });
    }
    // If no sessionId, search all documents (service role bypasses RLS)

    const { data: chunks, error: chunksError } = await chunksQuery;

    if (chunksError) {
      console.error('Chunks query error:', chunksError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch document chunks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!chunks || chunks.length === 0) {
      console.log('No chunks found');
      return new Response(
        JSON.stringify({ results: [], message: 'No documents indexed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching ${chunks.length} chunks`);

    // Generate query embedding
    const queryEmbedding = generateQueryEmbedding(query);

    // Score each chunk
    const scoredChunks = chunks.map(chunk => {
      const chunkEmbedding = chunk.embedding as number[];
      const embeddingSimilarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
      const keywordSim = keywordScore(query, chunk.content);
      
      // Combined score (embedding + keyword boost)
      const combinedScore = embeddingSimilarity * 0.7 + Math.min(keywordSim * 0.1, 0.3);
      
      return {
        ...chunk,
        score: combinedScore,
        embeddingScore: embeddingSimilarity,
        keywordScore: keywordSim,
      };
    });

    // Sort by score and take top results
    const topResults = scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .filter(r => r.score > 0.05) // Minimum threshold
      .map(r => ({
        chunkId: r.id,
        documentId: r.document_id,
        documentName: (r.uploaded_documents as any)?.file_name || 'Unknown',
        pageNumber: r.page_number,
        content: r.content,
        snippet: r.content.slice(0, 300) + (r.content.length > 300 ? '...' : ''),
        score: r.score,
      }));

    console.log(`Found ${topResults.length} relevant chunks`);

    return new Response(
      JSON.stringify({ 
        results: topResults,
        query,
        totalChunks: chunks.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
