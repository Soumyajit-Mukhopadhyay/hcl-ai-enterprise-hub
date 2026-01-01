import { supabase } from '@/integrations/supabase/client';
import type { Message, Citation, ActionSchema } from '@/types/agent';
import { v4 as uuidv4 } from 'uuid';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hr-chat`;

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

export async function streamChatResponse({
  messages, domain = 'general', documentContext, onDelta, onDone, onError,
}: {
  messages: ChatMessage[];
  domain?: string;
  documentContext?: string;
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
      body: JSON.stringify({ messages, domain, documentContext, stream: true }),
    });

    if (!resp.ok || !resp.body) throw new Error(`Request failed: ${resp.status}`);

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
    onError?.(error instanceof Error ? error : new Error('Unknown error'));
  }
}

export function parseAIResponse(content: string): { citations: Citation[]; action: ActionSchema | null } {
  const citations: Citation[] = [];
  const pageRegex = /\[Page\s*(\d+)\]/g;
  let match;
  while ((match = pageRegex.exec(content)) !== null) {
    citations.push({ docId: 'HCL_AR_2024_25', pageNum: parseInt(match[1]), snippet: '' });
  }
  return { citations, action: null };
}
