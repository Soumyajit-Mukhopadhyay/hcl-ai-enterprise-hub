import { v4 as uuidv4 } from 'uuid';
import type { Message, Citation, ActionSchema, AgentNode, RiskLevel } from '@/types/agent';
import { HCLTECH_KNOWLEDGE } from '@/types/agent';

// Simulated delay for realistic agent behavior
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Knowledge base for RAG simulation
const knowledgeBase: Record<string, { answer: string; citations: Citation[] }> = {
  'revenue': {
    answer: `HCLTech's revenue for FY25 was ${HCLTECH_KNOWLEDGE.revenueFY25}, representing a growth of ${HCLTECH_KNOWLEDGE.revenueGrowth}. The company demonstrated strong performance across all business segments, with particularly notable growth in the Digital Business Services vertical.`,
    citations: [
      { docId: 'HCL_AR_2024_25', pageNum: 12, snippet: 'Total revenue for FY25 stood at ₹117,055 Crores ($13.84B), representing 4.3% YoY growth...' },
      { docId: 'HCL_AR_2024_25', pageNum: 45, snippet: 'Revenue growth was driven by strong performance in Americas (52%) and Europe (32%)...' },
    ],
  },
  'net income': {
    answer: `HCLTech's Net Income for FY25 was ${HCLTECH_KNOWLEDGE.netIncome}. The company maintained healthy profitability with an EBITDA margin of ${HCLTECH_KNOWLEDGE.keyHighlights['EBITDA Margin']} and operating margin of ${HCLTECH_KNOWLEDGE.keyHighlights['Operating Margin']}.`,
    citations: [
      { docId: 'HCL_AR_2024_25', pageNum: 18, snippet: 'Net Income reached ₹17,390 Crores, reflecting strong operational efficiency...' },
      { docId: 'HCL_AR_2024_25', pageNum: 23, snippet: 'EBITDA margin of 24.2% was maintained through disciplined cost management...' },
    ],
  },
  'headcount': {
    answer: `HCLTech employs ${HCLTECH_KNOWLEDGE.headcount} globally, operating in ${HCLTECH_KNOWLEDGE.keyHighlights['Geographic Presence']}. The company serves ${HCLTECH_KNOWLEDGE.keyHighlights['Client Base']} including ${HCLTECH_KNOWLEDGE.keyHighlights['Fortune 500 Clients']}.`,
    citations: [
      { docId: 'HCL_AR_2024_25', pageNum: 8, snippet: 'Our global workforce of 223,420 employees represents our greatest asset...' },
    ],
  },
  'strategic': {
    answer: `HCLTech's strategic pillars for growth include: ${HCLTECH_KNOWLEDGE.strategicPillars.join(', ')}. These initiatives are designed to accelerate digital transformation for clients while driving sustainable growth.`,
    citations: [
      { docId: 'HCL_AR_2024_25', pageNum: 34, snippet: 'AI Force, CloudSMART, New Vistas, and Digital Foundation form the cornerstone of our strategy...' },
    ],
  },
  'risks': {
    answer: `Key risks identified in the FY25 Annual Report include: 1) Geopolitical uncertainties affecting global operations, 2) Rapid technological changes requiring continuous innovation, 3) Talent acquisition and retention challenges, 4) Currency fluctuation impacts on revenue, and 5) Cybersecurity threats requiring robust security infrastructure.`,
    citations: [
      { docId: 'HCL_AR_2024_25', pageNum: 45, snippet: 'Key risks include geopolitical uncertainties, technology disruption, and talent challenges...' },
      { docId: 'HCL_AR_2024_25', pageNum: 46, snippet: 'Mitigation strategies include geographic diversification and continuous R&D investment...' },
    ],
  },
  'leave policy': {
    answer: `HCLTech's leave policy includes: Annual Leave (21 days), Sick Leave (10 days), Maternity Leave (26 weeks), Paternity Leave (2 weeks), and Flexible Working arrangements. Leave applications are processed within 24 hours of manager approval.`,
    citations: [
      { docId: 'HR_POLICY_2024', pageNum: 12, snippet: 'Annual leave entitlement: 21 working days per calendar year, accrued monthly...' },
      { docId: 'HR_POLICY_2024', pageNum: 15, snippet: 'Maternity leave: 26 weeks fully paid leave as per statutory requirements...' },
    ],
  },
  'maternity': {
    answer: `HCLTech provides 26 weeks of fully paid Maternity Leave as per statutory requirements. This includes pre-natal and post-natal care support, flexible return-to-work options, and childcare assistance programs. Employees are eligible after completing 80 days of service.`,
    citations: [
      { docId: 'HR_POLICY_2024', pageNum: 15, snippet: 'Maternity leave: 26 weeks fully paid leave as per statutory requirements...' },
      { docId: 'HR_POLICY_2024', pageNum: 16, snippet: 'Flexible return-to-work options include part-time arrangements for up to 6 months...' },
    ],
  },
};

// Action detection and schema generation
function detectActionIntent(message: string): ActionSchema | null {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('schedule') && lowerMessage.includes('meeting')) {
    return {
      actionType: 'schedule_meeting',
      tool: 'schedule_meeting_v1',
      parameters: {
        requester_id: 'user@hcltech.com',
        group: 'HR',
        purpose: 'Sync meeting with HR representative',
        duration_minutes: 30,
        preferred_times: [new Date(Date.now() + 86400000).toISOString()],
        attendees: ['hr@hcltech.com'],
        timezone: 'Asia/Kolkata',
        idempotency_token: uuidv4(),
      },
      riskScore: 25,
      riskLevel: 'low',
      idempotencyToken: uuidv4(),
    };
  }

  if (lowerMessage.includes('apply') && lowerMessage.includes('leave')) {
    const daysMatch = lowerMessage.match(/(\d+)\s*days?/);
    const numDays = daysMatch ? parseInt(daysMatch[1]) : 1;
    const startDate = new Date(Date.now() + 86400000);
    const endDate = new Date(startDate.getTime() + (numDays - 1) * 86400000);

    return {
      actionType: 'leave_request',
      tool: 'process_leave_v1',
      parameters: {
        emp_id: 'E12345',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        leave_type: lowerMessage.includes('sick') ? 'sick' : 'annual',
        reason: 'Personal leave request',
        leave_balance: 12,
        attachment_ids: [],
        idempotency_token: uuidv4(),
      },
      riskScore: 35,
      riskLevel: 'medium',
      idempotencyToken: uuidv4(),
    };
  }

  if (lowerMessage.includes('payslip')) {
    return {
      actionType: 'fetch_payslip',
      tool: 'fetch_payslip_v1',
      parameters: {
        emp_id: 'E12345',
        month: new Date().toISOString().slice(0, 7),
      },
      riskScore: 45,
      riskLevel: 'medium',
      idempotencyToken: uuidv4(),
    };
  }

  if (lowerMessage.includes('ticket') || lowerMessage.includes('support')) {
    return {
      actionType: 'create_ticket',
      tool: 'create_ticket_v1',
      parameters: {
        requester: 'user@hcltech.com',
        category: lowerMessage.includes('it') ? 'IT' : 'HR',
        priority: 'medium',
        description: 'Support request generated from chat',
        attachments: [],
        idempotency_token: uuidv4(),
      },
      riskScore: 20,
      riskLevel: 'low',
      idempotencyToken: uuidv4(),
    };
  }

  if (lowerMessage.includes('onboard') && lowerMessage.includes('employee')) {
    return {
      actionType: 'onboard',
      tool: 'onboard_v1',
      parameters: {
        candidate_id: 'C' + Math.random().toString(36).substr(2, 5).toUpperCase(),
        role: 'Senior Developer',
        start_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        location: 'London',
        assets: ['laptop', 'monitor', 'headset'],
        manager_email: 'manager@hcltech.com',
      },
      riskScore: 55,
      riskLevel: 'medium',
      idempotencyToken: uuidv4(),
    };
  }

  if (lowerMessage.includes('reset') && lowerMessage.includes('password')) {
    return {
      actionType: 'password_reset',
      tool: 'reset_password_v1',
      parameters: {
        requester: 'user@hcltech.com',
        system: 'corporate_sso',
        verification_method: 'email',
        idempotency_token: uuidv4(),
      },
      riskScore: 50,
      riskLevel: 'medium',
      idempotencyToken: uuidv4(),
    };
  }

  return null;
}

// RAG search simulation
function searchKnowledgeBase(query: string): { answer: string; citations: Citation[] } | null {
  const lowerQuery = query.toLowerCase();

  for (const [keyword, data] of Object.entries(knowledgeBase)) {
    if (lowerQuery.includes(keyword)) {
      return data;
    }
  }

  // Default response for general questions
  if (lowerQuery.includes('hcl') || lowerQuery.includes('company') || lowerQuery.includes('about')) {
    return {
      answer: `HCLTech is a global technology company headquartered in Noida, India. With ${HCLTECH_KNOWLEDGE.headcount} and operations in ${HCLTECH_KNOWLEDGE.keyHighlights['Geographic Presence']}, HCLTech provides digital, engineering, cloud, and AI services. The company's FY25 revenue was ${HCLTECH_KNOWLEDGE.revenueFY25} with strategic focus on ${HCLTECH_KNOWLEDGE.strategicPillars.join(', ')}.`,
      citations: [
        { docId: 'HCL_AR_2024_25', pageNum: 1, snippet: 'HCLTech is a global technology company delivering digital, engineering, and AI services...' },
      ],
    };
  }

  return null;
}

// Main agent processing function
export async function processMessage(
  userMessage: string,
  onNodeUpdate?: (nodes: AgentNode[]) => void
): Promise<Message> {
  const nodes: AgentNode[] = [
    { id: 'intent', name: 'Intent Router', description: 'Classifying user intent', status: 'pending' },
    { id: 'auth', name: 'Auth & RBAC', description: 'Verifying permissions', status: 'pending' },
    { id: 'retrieve', name: 'RAG Retrieval', description: 'Searching knowledge base', status: 'pending' },
    { id: 'planner', name: 'Planner', description: 'Planning execution steps', status: 'pending' },
    { id: 'tool', name: 'Tool Selector', description: 'Selecting appropriate tools', status: 'pending' },
    { id: 'validator', name: 'Schema Validator', description: 'Validating JSON schema', status: 'pending' },
    { id: 'summarizer', name: 'Summarizer', description: 'Generating response', status: 'pending' },
  ];

  const updateNode = async (id: string, status: AgentNode['status']) => {
    const node = nodes.find(n => n.id === id);
    if (node) {
      node.status = status;
      onNodeUpdate?.([...nodes]);
    }
    await delay(300 + Math.random() * 400);
  };

  // Step 1: Intent Router
  await updateNode('intent', 'active');
  await delay(500);
  await updateNode('intent', 'complete');

  // Step 2: Auth Check
  await updateNode('auth', 'active');
  await delay(400);
  await updateNode('auth', 'complete');

  // Step 3: RAG Retrieval
  await updateNode('retrieve', 'active');
  const ragResult = searchKnowledgeBase(userMessage);
  await delay(600);
  await updateNode('retrieve', 'complete');

  // Step 4: Check for action intent
  const actionSchema = detectActionIntent(userMessage);

  if (actionSchema) {
    // Action flow
    await updateNode('planner', 'active');
    await delay(400);
    await updateNode('planner', 'complete');

    await updateNode('tool', 'active');
    await delay(300);
    await updateNode('tool', 'complete');

    await updateNode('validator', 'active');
    await delay(400);
    await updateNode('validator', 'complete');

    await updateNode('summarizer', 'active');
    await delay(300);
    await updateNode('summarizer', 'complete');

    const riskMessage = actionSchema.riskLevel === 'low'
      ? 'This action is ready for execution.'
      : actionSchema.riskLevel === 'medium'
        ? 'This action requires your approval before execution.'
        : 'This action is blocked due to high risk and requires manual escalation.';

    return {
      id: uuidv4(),
      role: 'assistant',
      content: `I've prepared the following action for you. ${riskMessage}\n\nPlease review the details below:`,
      timestamp: new Date(),
      action: actionSchema,
      agentNodes: nodes,
    };
  }

  // Knowledge query flow
  await updateNode('planner', 'complete');
  await updateNode('tool', 'complete');
  await updateNode('validator', 'complete');

  await updateNode('summarizer', 'active');
  await delay(400);
  await updateNode('summarizer', 'complete');

  if (ragResult) {
    return {
      id: uuidv4(),
      role: 'assistant',
      content: ragResult.answer,
      timestamp: new Date(),
      citations: ragResult.citations,
      agentNodes: nodes,
    };
  }

  // Fallback response
  return {
    id: uuidv4(),
    role: 'assistant',
    content: "I couldn't find specific information about that in my knowledge base. Could you please rephrase your question or ask about HCLTech's financial performance, strategic initiatives, HR policies, or request a specific action?",
    timestamp: new Date(),
    agentNodes: nodes,
  };
}
