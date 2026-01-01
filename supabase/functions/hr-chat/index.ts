import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
6. Regulatory compliance across multiple jurisdictions
7. Client concentration risk management
8. Supply chain disruptions

### Awards & Recognition (Page 60-65)
- Leader in Gartner Magic Quadrant for IT Services
- Forbes Most Innovative Companies list
- Great Place to Work certified
- Top Employer Institute recognition in 25 countries

### HR Policies Reference
- **Annual Leave**: 21 working days per calendar year
- **Sick Leave**: 10 days per year
- **Maternity Leave**: 26 weeks fully paid (as per statutory requirements)
- **Paternity Leave**: 2 weeks paid leave
- **Work From Home**: Hybrid model - 2-3 days per week based on role
- **Leave Carry Forward**: Maximum 10 days to next year

### IT Support Information
- **Service Desk Hours**: 24/7 global support
- **SLA Response Time**: Critical - 15 mins, High - 2 hours, Medium - 8 hours
- **Password Reset**: Self-service portal available 24/7
- **Hardware Requests**: 5-7 business days processing
`;

// HR Domain Knowledge
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

### Performance Management
- Annual review cycle: April
- Mid-year review: October
- 360-degree feedback enabled
- Rating scale: 1-5 (Outstanding to Needs Improvement)
`;

// IT Service Desk Knowledge
const IT_DOMAIN_KNOWLEDGE = `
## IT Service Desk Knowledge Base

### Common Issues & Resolutions
- **Password Reset**: Use self-service portal or contact IT desk
- **VPN Issues**: Check network, restart client, verify credentials
- **Email Access**: Verify Outlook configuration, check server status
- **Laptop Performance**: Clear temp files, check RAM usage, restart

### Asset Management
- Laptop refresh cycle: 3 years
- Monitor allocation: Based on role
- Mobile devices: Manager approval required

### Security Policies
- Password policy: 12+ characters, special characters required
- MFA: Mandatory for all corporate applications
- Data classification: Public, Internal, Confidential, Restricted
`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ConversationContext {
  messages: ChatMessage[];
  summary?: string;
  documentContext?: string;
}

function buildSystemPrompt(domain: string, documentContext?: string): string {
  let basePrompt = `You are HCL Agent, an intelligent enterprise assistant for HCLTech employees. You are powered by advanced AI and have access to comprehensive knowledge about HCLTech.

## Your Capabilities:
1. **Knowledge Retrieval (RAG)**: Answer questions about HCLTech financials, policies, procedures using cited sources
2. **Action Execution**: Help with leave applications, meeting scheduling, ticket creation, etc.
3. **Domain Expertise**: HR Operations, IT Service Desk, Developer Support

## Response Guidelines:
- Always be professional, helpful, and concise
- When citing information, include the source page number in format: [Page X]
- For action requests, confirm the details before proceeding
- If unsure, ask clarifying questions
- Use empathetic tone for sensitive HR matters
- Provide risk assessment for actions (Low/Medium/High)

## Citation Format:
When providing factual information, cite sources like this:
"HCLTech's revenue was ₹117,055 Crores [Page 12]"

## Action Response Format:
When user requests an action, respond with:
1. Confirmation of understanding
2. Structured JSON action payload
3. Risk level assessment
4. Next steps

${HCLTECH_KNOWLEDGE}

${HR_DOMAIN_KNOWLEDGE}

${IT_DOMAIN_KNOWLEDGE}
`;

  if (domain === 'hr') {
    basePrompt += `\n\n## Current Domain Focus: HR Operations
You are specialized in HR queries including leave management, payroll, onboarding, performance reviews, and employee policies.`;
  } else if (domain === 'it') {
    basePrompt += `\n\n## Current Domain Focus: IT Service Desk
You are specialized in IT support including password resets, hardware issues, software installations, and security queries.`;
  } else if (domain === 'dev') {
    basePrompt += `\n\n## Current Domain Focus: Developer Support
You are specialized in developer queries including code reviews, legacy system documentation, API integrations, and technical guidance.`;
  }

  if (documentContext) {
    basePrompt += `\n\n## Uploaded Document Context:\n${documentContext}`;
  }

  return basePrompt;
}

function summarizeConversation(messages: ChatMessage[]): string {
  if (messages.length <= 10) {
    return '';
  }

  // Create a weighted summary of older messages
  const olderMessages = messages.slice(0, -10);
  const summary = olderMessages
    .filter(m => m.role !== 'system')
    .map((m, i) => {
      const weight = 0.3 + (i / olderMessages.length) * 0.4; // 0.3 to 0.7 weight
      const truncatedContent = m.content.length > 100 
        ? m.content.substring(0, 100) + '...' 
        : m.content;
      return `[${m.role}]: ${truncatedContent}`;
    })
    .join('\n');

  return `## Conversation Summary (Earlier Context):\n${summary}\n\n---\n`;
}

function buildMessagesWithContext(context: ConversationContext, domain: string): ChatMessage[] {
  const systemPrompt = buildSystemPrompt(domain, context.documentContext);
  
  // Start with system prompt
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt }
  ];

  // Add summary if conversation is long
  if (context.messages.length > 10 && context.summary) {
    messages.push({
      role: 'system',
      content: context.summary
    });
  }

  // Add recent messages (last 10 for context)
  const recentMessages = context.messages.length > 10 
    ? context.messages.slice(-10) 
    : context.messages;

  // Apply decay weights - more recent messages have higher weight
  recentMessages.forEach((msg, index) => {
    const weight = 0.5 + (index / recentMessages.length) * 0.5; // 0.5 to 1.0 weight
    messages.push({
      role: msg.role,
      content: msg.content
    });
  });

  return messages;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, domain = 'general', documentContext, stream = true } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing chat request - Domain: ${domain}, Messages: ${messages.length}`);

    // Build conversation context
    const context: ConversationContext = {
      messages: messages,
      summary: messages.length > 10 ? summarizeConversation(messages) : undefined,
      documentContext: documentContext
    };

    // Build messages with proper context
    const contextualMessages = buildMessagesWithContext(context, domain);

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
        stream: stream,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please wait a moment and try again." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI credits exhausted. Please add credits to continue." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    if (stream) {
      return new Response(response.body, {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        },
      });
    } else {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("HR Chat error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
