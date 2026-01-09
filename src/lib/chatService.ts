import { supabase } from '@/integrations/supabase/client';
import type { Message, Citation, ActionSchema } from '@/types/agent';

// Use advanced-agent for full AI capabilities
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/advanced-agent`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  domain: string;
  created_at: string;
  updated_at: string;
}

export async function createChatSession(title: string = 'New Chat', domain: string = 'general'): Promise<string> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ title, domain })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function getChatSessions(): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getSessionMessages(sessionId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(msg => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    timestamp: new Date(msg.created_at),
    citations: (msg.citations as unknown as Citation[]) || [],
    action: (msg.action_data as unknown as ActionSchema) || undefined,
  }));
}

export async function saveMessage(sessionId: string, message: Message): Promise<void> {
  await supabase.from('chat_messages').insert([{
    session_id: sessionId,
    role: message.role,
    content: message.content,
    citations: JSON.parse(JSON.stringify(message.citations || [])),
    action_data: message.action ? JSON.parse(JSON.stringify(message.action)) : null,
    risk_level: message.action?.riskLevel || null,
  }]);
  await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await supabase.from('chat_sessions').delete().eq('id', sessionId);
}

export async function updateSessionTitle(sessionId: string, firstMessage: string): Promise<void> {
  const title = firstMessage.length > 50 ? firstMessage.substring(0, 47) + '...' : firstMessage;
  await supabase.from('chat_sessions').update({ title }).eq('id', sessionId);
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

export async function streamChatResponse({
  messages, 
  domain = 'general', 
  documentContext, 
  sessionId,
  userContext,
  onDelta, 
  onDone, 
  onError,
}: {
  messages: ChatMessage[];
  domain?: string;
  documentContext?: string;
  sessionId?: string;
  userContext?: UserContext;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError?: (error: Error) => void;
}): Promise<void> {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, domain, sessionId, userContext, stream: true }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      if (resp.status === 429) {
        throw new Error(errorData.error || 'Rate limit exceeded. Please wait and try again.');
      }
      if (resp.status === 402) {
        throw new Error(errorData.error || 'AI credits exhausted. Please add credits.');
      }
      throw new Error(`Request failed: ${resp.status}`);
    }

    if (!resp.body) throw new Error('No response body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6);
        if (json === "[DONE]") { onDone(); return; }
        try {
          const content = JSON.parse(json).choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {}
      }
    }
    onDone();
  } catch (error) {
    console.error('Stream chat error:', error);
    onError?.(error instanceof Error ? error : new Error('Unknown error'));
  }
}

export function parseAIResponse(content: string): { citations: Citation[]; action: ActionSchema | null; jsonSchemas: any[] } {
  const citations: Citation[] = [];
  const jsonSchemas: any[] = [];
  
  // Parse [DocumentName, Page X] format
  const docPageRegex = /\[([^\],]+),\s*Page\s*(\d+)\]/g;
  let match;
  while ((match = docPageRegex.exec(content)) !== null) {
    citations.push({ 
      docId: match[1].trim(), 
      pageNum: parseInt(match[2]), 
      snippet: extractSnippet(content, match.index) 
    });
  }
  
  // Also parse simple [Page X] format
  const simplePageRegex = /\[Page\s*(\d+)\]/g;
  while ((match = simplePageRegex.exec(content)) !== null) {
    const exists = citations.some(c => c.pageNum === parseInt(match[1]));
    if (!exists) {
      citations.push({ 
        docId: 'HCL-AR-2025', 
        pageNum: parseInt(match[1]), 
        snippet: extractSnippet(content, match.index) 
      });
    }
  }

  // Extract JSON code blocks - these are AI-generated schemas
  const jsonBlockRegex = /```json\n([\s\S]*?)\n```/g;
  while ((match = jsonBlockRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      jsonSchemas.push(parsed);
    } catch (e) {
      // Invalid JSON, skip
    }
  }

  // Extract action from JSON schemas
  let action: ActionSchema | null = null;
  for (const schema of jsonSchemas) {
    if (schema.action && schema.action !== 'analyze_multi_task') {
      action = {
        actionType: schema.action,
        tool: schema.action,
        parameters: schema.data || schema,
        riskScore: schema.risk_score || 0.3,
        riskLevel: schema.risk_level || 'low',
        idempotencyToken: `action-${Date.now()}`
      };
      break;
    }
  }
  
  return { citations, action, jsonSchemas };
}

function extractSnippet(content: string, citationIndex: number): string {
  const start = Math.max(0, citationIndex - 100);
  const end = citationIndex;
  let snippet = content.slice(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  return snippet.replace(/\n/g, ' ').trim();
}
