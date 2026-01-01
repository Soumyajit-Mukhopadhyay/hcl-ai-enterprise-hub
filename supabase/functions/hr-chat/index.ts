import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HCLTech Annual Report Knowledge Base
const HCLTECH_KNOWLEDGE = `
## HCLTech Annual Report FY2024-25 - Key Information

### Financial Highlights (Page 12-23)
- **Revenue FY25**: ₹117,055 Crores ($13.84B USD)
- **Revenue Growth**: 4.3% Year-over-Year
- **Net Income**: ₹17,390 Crores
- **EBITDA Margin**: 24.2%
- **Operating Margin**: 18.6%
- **Earnings Per Share**: ₹64.12
- **Return on Equity**: 23.8%
- **Free Cash Flow**: ₹15,200 Crores

### Workforce & Operations (Page 8-11)
- **Global Headcount**: 223,420 employees
- **Geographic Presence**: 60+ countries
- **Delivery Centers**: 75+ global delivery centers
- **Client Base**: 1,900+ clients globally
- **Fortune 500 Clients**: 250+ clients
- **New Deal Wins FY25**: $9.2 Billion TCV

### Strategic Pillars (Page 34-42)
1. **AI Force**: Enterprise AI solutions, GenAI platforms, AI-powered automation
2. **CloudSMART**: Cloud migration, multi-cloud management, cloud-native development
3. **New Vistas**: Digital workplace, sustainability services, connected ecosystems
4. **Digital Foundation**: Core modernization, data engineering, cybersecurity

### Key Business Segments (Page 25-33)
- **IT Services**: 62% of revenue - Application development, infrastructure management
- **Engineering & R&D Services**: 28% of revenue - Product engineering, embedded systems
- **HCL Software**: 10% of revenue - Enterprise software products

### Risk Management (Page 45-52)
Key risks identified:
1. Geopolitical uncertainties affecting global operations
2. Rapid technological changes requiring continuous innovation
3. Talent acquisition and retention in competitive markets
4. Currency fluctuation impacts on revenue
5. Cybersecurity threats requiring robust infrastructure

### Awards & Recognition (Page 60-65)
- Leader in Gartner Magic Quadrant for IT Services
- Forbes Most Innovative Companies list
- Great Place to Work certified
- Top Employer Institute recognition in 25 countries

### HR Policies Reference
- **Annual Leave**: 21 working days per calendar year
- **Sick Leave**: 10 days per year
- **Maternity Leave**: 26 weeks fully paid
- **Paternity Leave**: 2 weeks paid leave
- **Work From Home**: Hybrid model - 2-3 days per week based on role

### IT Support Information
- **Service Desk Hours**: 24/7 global support
- **SLA Response Time**: Critical - 15 mins, High - 2 hours, Medium - 8 hours
`;

const HR_DOMAIN_KNOWLEDGE = `
## HR Operations Knowledge Base

### Leave Management
- Leave applications are processed within 24 hours of manager approval
- Emergency leave can be applied retroactively within 3 days
- Leave balance is calculated on a calendar year basis
- Encashment allowed for unused annual leave (max 10 days)

### Onboarding Process
1. Document verification (1-2 days)
2. Background verification (3-5 days)
3. System access provisioning (1 day)
4. Asset allocation (laptop, ID card) (1-2 days)
5. Welcome kit and orientation (Day 1)

### Payroll Information
- Salary credit: Last working day of month
- Payslips available on employee portal
- Tax declarations: April-January
- Investment proofs: January 15 deadline
`;

const IT_DOMAIN_KNOWLEDGE = `
## IT Service Desk Knowledge Base

### Common Issues & Resolutions
- **Password Reset**: Use self-service portal or contact IT desk
- **VPN Issues**: Check network, restart client, verify credentials
- **Email Access**: Verify Outlook configuration, check server status

### Security Policies
- Password policy: 12+ characters, special characters required
- MFA: Mandatory for all corporate applications
`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface SemanticSearchResult {
  chunkId: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  content: string;
  snippet: string;
  score: number;
}

// Perform semantic search on uploaded documents
async function performSemanticSearch(query: string, sessionId?: string): Promise<SemanticSearchResult[]> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get chunks with embeddings
    let chunksQuery = supabase
      .from('document_chunks')
      .select(`
        id, content, page_number, embedding, document_id,
        uploaded_documents!inner (id, file_name, session_id)
      `)
      .not('embedding', 'is', null)
      .limit(100);

    if (sessionId) {
      chunksQuery = chunksQuery.eq('uploaded_documents.session_id', sessionId);
    }

    const { data: chunks, error } = await chunksQuery;

    if (error || !chunks?.length) {
      console.log('No document chunks found for search');
      return [];
    }

    // Generate query embedding
    const queryEmbedding = generateQueryEmbedding(query);

    // Score chunks
    const scored = chunks.map(chunk => {
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding as number[]);
      const keywordBoost = keywordScore(query, chunk.content);
      return {
        chunkId: chunk.id,
        documentId: chunk.document_id,
        documentName: (chunk.uploaded_documents as any)?.file_name || 'Unknown',
        pageNumber: chunk.page_number || 1,
        content: chunk.content,
        snippet: chunk.content.slice(0, 300),
        score: similarity * 0.7 + Math.min(keywordBoost * 0.1, 0.3),
      };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .filter(r => r.score > 0.05);
  } catch (e) {
    console.error('Semantic search error:', e);
    return [];
  }
}

function generateQueryEmbedding(text: string): number[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'this', 'that', 'it', 'what', 'how', 'why', 'when', 'where', 'who']);
  
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  const wordFreq = new Map<string, number>();
  for (const word of words) wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  
  const embedding = new Array(256).fill(0);
  for (const [word, freq] of wordFreq) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) { hash = ((hash << 5) - hash) + word.charCodeAt(i); hash = hash & hash; }
    embedding[Math.abs(hash) % 256] += freq * (1 + Math.log(freq));
  }
  
  const mag = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
  if (mag > 0) for (let i = 0; i < embedding.length; i++) embedding[i] /= mag;
  return embedding;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i]; }
  const mag = Math.sqrt(magA) * Math.sqrt(magB);
  return mag > 0 ? dot / mag : 0;
}

function keywordScore(query: string, content: string): number {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const contentLower = content.toLowerCase();
  let score = 0;
  for (const word of words) {
    const matches = contentLower.match(new RegExp(word, 'gi'));
    if (matches) score += matches.length;
  }
  return score;
}

function buildSystemPrompt(domain: string, documentContext?: string, searchResults?: SemanticSearchResult[]): string {
  let basePrompt = `You are HCL Agent, an intelligent enterprise assistant for HCLTech employees. You are powered by advanced AI and have access to comprehensive knowledge.

## Your Capabilities:
1. **Knowledge Retrieval (RAG)**: Answer questions using cited sources from documents
2. **Action Execution**: Help with leave applications, meeting scheduling, ticket creation
3. **Domain Expertise**: HR Operations, IT Service Desk, Developer Support

## Response Guidelines:
- Be professional, helpful, and concise
- When citing information, include source: [DocumentName, Page X]
- For action requests, confirm details before proceeding
- If unsure, ask clarifying questions

## Citation Format:
"HCLTech's revenue was ₹117,055 Crores [HCL-AR-2025, Page 12]"

${HCLTECH_KNOWLEDGE}
${HR_DOMAIN_KNOWLEDGE}
${IT_DOMAIN_KNOWLEDGE}
`;

  if (domain === 'hr') {
    basePrompt += `\n\n## Current Focus: HR Operations\nSpecialized in leave management, payroll, onboarding, performance reviews.`;
  } else if (domain === 'it') {
    basePrompt += `\n\n## Current Focus: IT Service Desk\nSpecialized in password resets, hardware issues, software installations.`;
  } else if (domain === 'dev') {
    basePrompt += `\n\n## Current Focus: Developer Support\nSpecialized in code reviews, API integrations, technical guidance.`;
  }

  // Add uploaded document context from semantic search
  if (searchResults && searchResults.length > 0) {
    basePrompt += `\n\n## Relevant Document Excerpts (from uploaded files):\n`;
    searchResults.forEach((result, i) => {
      basePrompt += `\n### [${result.documentName}, Page ${result.pageNumber}]\n${result.content}\n`;
    });
  }

  if (documentContext) {
    basePrompt += `\n\n## Additional Document Context:\n${documentContext}`;
  }

  return basePrompt;
}

function summarizeConversation(messages: ChatMessage[]): string {
  if (messages.length <= 10) return '';
  const older = messages.slice(0, -10);
  const summary = older.filter(m => m.role !== 'system')
    .map(m => `[${m.role}]: ${m.content.slice(0, 100)}${m.content.length > 100 ? '...' : ''}`)
    .join('\n');
  return `## Conversation Summary:\n${summary}\n\n---\n`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, domain = 'general', documentContext, sessionId, stream = true } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing chat - Domain: ${domain}, Messages: ${messages.length}, Session: ${sessionId}`);

    // Get latest user message for semantic search
    const latestUserMessage = [...messages].reverse().find(m => m.role === 'user');
    let searchResults: SemanticSearchResult[] = [];
    
    if (latestUserMessage) {
      searchResults = await performSemanticSearch(latestUserMessage.content, sessionId);
      console.log(`Found ${searchResults.length} relevant document chunks`);
    }

    // Build system prompt with search results
    const systemPrompt = buildSystemPrompt(domain, documentContext, searchResults);
    
    // Build messages
    const contextualMessages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];
    
    // Add summary for long conversations
    if (messages.length > 10) {
      const summary = summarizeConversation(messages);
      if (summary) contextualMessages.push({ role: 'system', content: summary });
    }

    // Add recent messages
    const recent = messages.length > 10 ? messages.slice(-10) : messages;
    contextualMessages.push(...recent);

    console.log(`Sending ${contextualMessages.length} messages to AI`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: contextualMessages,
        stream,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    } else {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("HR Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
