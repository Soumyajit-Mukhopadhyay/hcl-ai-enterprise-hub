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

### HR Policies Reference (Page 70-85)
- **Annual Leave**: 20 working days per calendar year
- **Casual Leave**: 12 days per year
- **Sick Leave**: 10 days per year
- **Maternity Leave**: 180 days (26 weeks) fully paid
- **Paternity Leave**: 15 days paid leave
- **Work From Home**: Hybrid model - 2-3 days per week based on role
- **Meeting Scheduling**: All meetings require reason and manager approval for external attendees
- **Critical Period**: December 15 - January 15 is blackout period for leave

### IT Support Information (Page 88-92)
- **Service Desk Hours**: 24/7 global support
- **SLA Response Time**: Critical - 15 mins, High - 2 hours, Medium - 8 hours
- **Password Policy**: 12+ characters, special characters, 90-day rotation
`;

const SENSITIVE_TOPICS = ['harassment', 'discrimination', 'grievance', 'complaint', 'mental health', 'bullying', 'abuse', 'assault', 'termination dispute', 'unfair treatment'];

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface UserContext {
  userId?: string;
  role?: string;
  fullName?: string;
  leaveBalance?: {
    casual_leave: number;
    sick_leave: number;
    annual_leave: number;
  };
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

// Tool definitions for function calling
const TOOLS = [
  {
    type: "function",
    function: {
      name: "apply_leave",
      description: "Submit a leave request for approval. Risk is assessed automatically.",
      parameters: {
        type: "object",
        properties: {
          leave_type: { type: "string", enum: ["annual", "casual", "sick", "maternity", "paternity"], description: "Type of leave" },
          start_date: { type: "string", description: "Start date in YYYY-MM-DD format" },
          end_date: { type: "string", description: "End date in YYYY-MM-DD format" },
          reason: { type: "string", description: "Reason for leave" }
        },
        required: ["leave_type", "start_date", "end_date", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "schedule_meeting",
      description: "Schedule a meeting with HR or another employee",
      parameters: {
        type: "object",
        properties: {
          attendee_email: { type: "string", description: "Email of the person to meet" },
          title: { type: "string", description: "Meeting title" },
          reason: { type: "string", description: "Reason for the meeting" },
          preferred_date: { type: "string", description: "Preferred date in YYYY-MM-DD format" },
          preferred_time: { type: "string", description: "Preferred time in HH:MM format" },
          duration_minutes: { type: "number", description: "Duration in minutes (default 30)" }
        },
        required: ["attendee_email", "title", "reason", "preferred_date", "preferred_time"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_hr_ticket",
      description: "Create an HR ticket for sensitive or complex issues",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["grievance", "policy_query", "benefits", "payroll", "other"], description: "Ticket category" },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Priority level" },
          description: { type: "string", description: "Detailed description" },
          is_confidential: { type: "boolean", description: "Whether this is a confidential matter" }
        },
        required: ["category", "priority", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_leave_balance",
      description: "Check the user's current leave balance",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_payslip",
      description: "Generate and retrieve the user's payslip for a specific month",
      parameters: {
        type: "object",
        properties: {
          month: { type: "number", description: "Month (1-12)" },
          year: { type: "number", description: "Year (e.g., 2024)" }
        },
        required: ["month", "year"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "submit_reimbursement",
      description: "Submit a reimbursement request for expenses",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["travel", "food", "equipment", "training", "medical", "other"], description: "Expense category" },
          amount: { type: "number", description: "Amount in INR" },
          description: { type: "string", description: "Description of the expense" }
        },
        required: ["category", "amount", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "request_training",
      description: "Request enrollment in a training program or course",
      parameters: {
        type: "object",
        properties: {
          training_name: { type: "string", description: "Name of the training/course" },
          training_type: { type: "string", enum: ["technical", "soft_skills", "certification", "leadership", "compliance"], description: "Type of training" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Priority level" }
        },
        required: ["training_name", "training_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "propose_code_change",
      description: "Propose a code change to fix an issue (requires developer approval)",
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "Path to the file to modify" },
          original_code: { type: "string", description: "Original code snippet" },
          proposed_code: { type: "string", description: "Proposed fixed code" },
          change_reason: { type: "string", description: "Explanation of the fix" }
        },
        required: ["file_path", "proposed_code", "change_reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_error",
      description: "Analyze an error or bug report and suggest fixes",
      parameters: {
        type: "object",
        properties: {
          error_message: { type: "string", description: "The error message or stack trace" },
          context: { type: "string", description: "Additional context about the error" }
        },
        required: ["error_message"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "request_deployment",
      description: "Request deployment of a service to an environment",
      parameters: {
        type: "object",
        properties: {
          service_name: { type: "string", description: "Name of the service" },
          environment: { type: "string", enum: ["development", "staging", "production"], description: "Target environment" },
          version: { type: "string", description: "Version to deploy" }
        },
        required: ["service_name", "environment"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "request_access",
      description: "Request access to a resource like a repository, database, or server",
      parameters: {
        type: "object",
        properties: {
          resource_type: { type: "string", enum: ["repository", "database", "server", "api", "dashboard"], description: "Type of resource" },
          resource_name: { type: "string", description: "Name of the resource" },
          access_level: { type: "string", enum: ["read", "write", "admin"], description: "Level of access needed" },
          reason: { type: "string", description: "Reason for access" }
        },
        required: ["resource_type", "resource_name", "access_level", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "report_incident",
      description: "Report a production incident or service issue",
      parameters: {
        type: "object",
        properties: {
          service_name: { type: "string", description: "Affected service" },
          severity: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Incident severity" },
          description: { type: "string", description: "Description of the incident" }
        },
        required: ["service_name", "severity", "description"]
      }
    }
  }
];

// Check if message contains sensitive topics
function isSensitiveTopic(message: string): boolean {
  const lower = message.toLowerCase();
  return SENSITIVE_TOPICS.some(topic => lower.includes(topic));
}

// Calculate risk level for leave requests
function calculateLeaveRisk(leaveType: string, startDate: string, endDate: string, balance: any): { level: string; reason: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Check blackout period
  const startMonth = start.getMonth() + 1;
  const startDay = start.getDate();
  if ((startMonth === 12 && startDay >= 15) || (startMonth === 1 && startDay <= 15)) {
    return { level: 'high', reason: 'Request falls in critical blackout period (Dec 15 - Jan 15)' };
  }

  // Check balance
  const balanceKey = `${leaveType}_leave`;
  const available = balance?.[balanceKey] || 0;
  if (days > available) {
    return { level: 'high', reason: `Insufficient balance: requesting ${days} days, only ${available} available` };
  }

  if (days > 10) {
    return { level: 'medium', reason: 'Long leave duration (>10 days) requires manager approval' };
  }

  if (available - days < 3) {
    return { level: 'medium', reason: 'This will leave you with very low leave balance' };
  }

  return { level: 'low', reason: 'Request within policy limits' };
}

// Perform semantic search on uploaded documents
async function performSemanticSearch(query: string, sessionId?: string): Promise<SemanticSearchResult[]> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      return [];
    }

    const queryEmbedding = generateQueryEmbedding(query);

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

    return scored.sort((a, b) => b.score - a.score).slice(0, 5).filter(r => r.score > 0.05);
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

function buildSystemPrompt(userRole: string, userContext: UserContext, searchResults?: SemanticSearchResult[]): string {
  let basePrompt = `You are HCL Agent, an intelligent enterprise AI assistant for HCLTech employees. You operate with full transparency and ethical guardrails.

## YOUR IDENTITY
- You are the central AI assistant for HCLTech's enterprise portal
- You have access to the HCL Annual Report, HR policies, and IT knowledge base
- You can execute actions like leave requests, meeting scheduling, and ticket creation
- You ALWAYS check the annual report and policies before answering HR questions

## CURRENT USER CONTEXT
${userContext.fullName ? `- Name: ${userContext.fullName}` : ''}
- Role: ${userRole?.toUpperCase() || 'EMPLOYEE'}
${userContext.leaveBalance ? `- Leave Balance: Annual=${userContext.leaveBalance.annual_leave}, Casual=${userContext.leaveBalance.casual_leave}, Sick=${userContext.leaveBalance.sick_leave}` : ''}

## SAFETY GUARDRAILS
1. **SENSITIVE TOPICS**: For harassment, discrimination, mental health, or grievances:
   - NEVER automate or give direct advice
   - Create an HR ticket immediately with is_confidential=true
   - Respond with empathy: "I understand this is difficult. I've created a confidential HR ticket. Someone will reach out within 4 hours."

2. **HIGH-RISK ACTIONS**: For actions that significantly impact the user:
   - Leave during blackout periods → Requires HR approval
   - Long leaves (>10 days) → Requires manager approval
   - Code changes → Requires developer approval
   - Never auto-approve high-risk actions

3. **PRIVACY**: Never share other users' personal data, leave status, or confidential information

## CITATION FORMAT
When citing information, use: [Source Name, Page X]
Example: "HCLTech's revenue was ₹117,055 Crores [HCL-AR-2025, Page 12]"

## TOOL CALLING
You have access to tools for various tasks. Always use the appropriate tool:

### HR Tools:
- apply_leave: Submit leave requests (auto-calculates risk based on balance, duration, blackout periods)
- schedule_meeting: Book meetings with HR or colleagues
- create_hr_ticket: Create HR tickets for sensitive/complex issues
- get_leave_balance: Check user's current leave balance
- get_payslip: Generate payslip for a specific month/year
- submit_reimbursement: Submit expense reimbursement requests
- request_training: Request enrollment in training programs

### Developer Tools (developer role only):
- propose_code_change: Suggest code fixes (requires approval)
- analyze_error: Debug errors and suggest root causes
- request_deployment: Request deployment to environments
- request_access: Request access to repositories/databases/servers
- report_incident: Report production incidents

## CONFIDENCE AND ACCURACY
- For factual queries from documents, express your confidence level
- If uncertain, say "Based on my analysis..." rather than stating as absolute fact
- Always prioritize information from uploaded documents over general knowledge
- Flag when you're making inferences vs stating documented facts

## PROACTIVE ASSISTANCE
- Suggest relevant actions based on context (e.g., after answering leave policy, ask if they want to apply)
- Offer to help with related tasks
- Remind users of pending items relevant to their query

## KNOWLEDGE BASE
${HCLTECH_KNOWLEDGE}
`;

  // Role-specific instructions
  if (userRole === 'hr') {
    basePrompt += `
## HR MANAGER PRIVILEGES
- You can view pending leave requests and approvals
- You can access employee records (within privacy bounds)
- You should help HR managers with policy interpretations
- Remind HR managers about pending approvals in their queue
`;
  } else if (userRole === 'developer') {
    basePrompt += `
## DEVELOPER MODE
- You can analyze code errors and suggest fixes
- You can propose code changes (these require developer approval before applying)
- When asked to fix code, you MUST:
  1. First analyze the error
  2. Propose the fix using propose_code_change tool
  3. Wait for developer approval before confirming the change
  4. If approved, confirm the change was applied
- You have read access to the codebase context
- Always explain your reasoning for code changes
`;
  } else if (userRole === 'it') {
    basePrompt += `
## IT SUPPORT MODE
- Specialized in IT infrastructure, security, and support
- Can create and escalate IT tickets
- Has access to common issue resolutions
- SLA: Critical=15min, High=2hr, Medium=8hr
`;
  } else {
    basePrompt += `
## EMPLOYEE SELF-SERVICE
- Help with leave applications, payslip queries, policy questions
- Can schedule meetings with HR or managers
- Can create IT tickets for technical issues
- For sensitive topics, always escalate to HR
`;
  }

  // Add semantic search results from uploaded documents
  if (searchResults && searchResults.length > 0) {
    basePrompt += `\n\n## RELEVANT UPLOADED DOCUMENTS:\n`;
    searchResults.forEach((result) => {
      basePrompt += `\n### [${result.documentName}, Page ${result.pageNumber}]\n${result.content}\n`;
    });
  }

  return basePrompt;
}

function summarizeOlderMessages(messages: ChatMessage[]): string {
  if (messages.length <= 10) return '';
  const older = messages.slice(0, -10);
  const summary = older.filter(m => m.role !== 'system')
    .map(m => `[${m.role}]: ${m.content.slice(0, 80)}${m.content.length > 80 ? '...' : ''}`)
    .join('\n');
  return `## EARLIER CONVERSATION SUMMARY:\n${summary}\n\n---\n`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, domain = 'general', sessionId, userContext = {}, stream = true } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing chat - Role: ${userContext.role}, Messages: ${messages.length}, Session: ${sessionId}`);

    // Check for sensitive topics in latest message
    const latestUserMessage = [...messages].reverse().find((m: ChatMessage) => m.role === 'user');
    const isSensitive = latestUserMessage && isSensitiveTopic(latestUserMessage.content);
    
    if (isSensitive) {
      console.log('Sensitive topic detected - will escalate to HR');
    }

    // Perform semantic search
    let searchResults: SemanticSearchResult[] = [];
    if (latestUserMessage) {
      searchResults = await performSemanticSearch(latestUserMessage.content, sessionId);
      console.log(`Found ${searchResults.length} relevant document chunks`);
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(userContext.role || 'employee', userContext, searchResults);
    
    // Build messages with context management
    const contextualMessages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];
    
    // Add conversation summary for long conversations
    if (messages.length > 10) {
      const summary = summarizeOlderMessages(messages);
      if (summary) {
        contextualMessages.push({ role: 'system', content: summary });
      }
    }

    // Add recent messages (last 10)
    const recentMessages = messages.length > 10 ? messages.slice(-10) : messages;
    contextualMessages.push(...recentMessages);

    console.log(`Sending ${contextualMessages.length} messages to AI`);

    // Determine which tools to include based on role
    const roleTools = TOOLS.filter(tool => {
      const devOnlyTools = ['propose_code_change', 'analyze_error', 'request_deployment', 'request_access', 'report_incident'];
      if (devOnlyTools.includes(tool.function.name)) {
        return userContext.role === 'developer';
      }
      // HR-specific tools available to employees and HR
      const hrTools = ['get_payslip', 'submit_reimbursement', 'request_training'];
      if (hrTools.includes(tool.function.name)) {
        return userContext.role === 'employee' || userContext.role === 'hr';
      }
      return true;
    });

    const requestBody: any = {
      model: "google/gemini-2.5-flash",
      messages: contextualMessages,
      stream,
    };

    // Add tools if not streaming (tool calling doesn't work well with streaming)
    if (!stream) {
      requestBody.tools = roleTools;
      requestBody.tool_choice = "auto";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
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
