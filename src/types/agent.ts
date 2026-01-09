export type RiskLevel = 'low' | 'medium' | 'high';

export type AgentNodeStatus = 'pending' | 'active' | 'complete' | 'error';

export interface AgentNode {
  id: string;
  name: string;
  description: string;
  status: AgentNodeStatus;
  startTime?: Date;
  endTime?: Date;
}

export interface Citation {
  docId: string;
  pageNum: number;
  snippet: string;
  chunkId?: string;
}

export interface ActionSchema {
  actionType: string;
  tool: string;
  parameters: Record<string, unknown>;
  riskScore: number;
  riskLevel: RiskLevel;
  idempotencyToken: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  citations?: Citation[];
  action?: ActionSchema;
  jsonSchemas?: any[];  // For displaying structured AI outputs
  agentNodes?: AgentNode[];
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface HCLTechData {
  revenueFY25: string;
  revenueGrowth: string;
  netIncome: string;
  headcount: string;
  strategicPillars: string[];
  keyHighlights: Record<string, string>;
}

export const HCLTECH_KNOWLEDGE: HCLTechData = {
  revenueFY25: '₹117,055 Crores ($13.84B)',
  revenueGrowth: '4.3% YoY',
  netIncome: '₹17,390 Crores',
  headcount: '223,420 employees',
  strategicPillars: ['AI Force', 'CloudSMART', 'New Vistas', 'Digital Foundation'],
  keyHighlights: {
    'EBITDA Margin': '24.2%',
    'Operating Margin': '18.1%',
    'Dividend Per Share': '₹52',
    'Geographic Presence': '60+ countries',
    'Client Base': '1,862 active clients',
    'Fortune 500 Clients': '232 clients',
    'Deal Wins': '$13.4B TCV',
    'R&D Investment': '₹2,890 Crores',
  }
};

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  details?: string;
}
