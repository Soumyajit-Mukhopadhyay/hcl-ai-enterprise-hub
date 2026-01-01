import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message, AgentNode } from '@/types/agent';
import {
  createChatSession,
  getChatSessions,
  getSessionMessages,
  saveMessage,
  deleteChatSession,
  updateSessionTitle,
  streamChatResponse,
  parseAIResponse,
} from '@/lib/chatService';
import { toast } from 'sonner';

interface ChatSession {
  id: string;
  title: string;
  domain: string;
  created_at: string;
  updated_at: string;
}

export function useChatSession() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentNodes, setAgentNodes] = useState<AgentNode[]>([]);
  const [documentContext, setDocumentContext] = useState<string>('');
  const [domain, setDomain] = useState<string>('general');

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadSessionMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  const loadSessions = async () => {
    try {
      const data = await getChatSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const data = await getSessionMessages(sessionId);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load chat history');
    }
  };

  const startNewChat = async () => {
    setCurrentSessionId(null);
    setMessages([]);
    setAgentNodes([]);
    setDocumentContext('');
  };

  const selectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setAgentNodes([]);
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await deleteChatSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete chat');
    }
  };

  const simulateAgentNodes = async () => {
    const nodes: AgentNode[] = [
      { id: 'intent', name: 'Intent Router', description: 'Classifying user intent', status: 'pending' },
      { id: 'auth', name: 'Auth & RBAC', description: 'Verifying permissions', status: 'pending' },
      { id: 'retrieve', name: 'RAG Retrieval', description: 'Searching knowledge base', status: 'pending' },
      { id: 'planner', name: 'Planner', description: 'Planning execution steps', status: 'pending' },
      { id: 'tool', name: 'Tool Selector', description: 'Selecting appropriate tools', status: 'pending' },
      { id: 'validator', name: 'Schema Validator', description: 'Validating response', status: 'pending' },
      { id: 'summarizer', name: 'Response Generator', description: 'Generating response', status: 'pending' },
    ];

    setAgentNodes([...nodes]);

    const updateNode = (id: string, status: AgentNode['status']) => {
      const node = nodes.find(n => n.id === id);
      if (node) {
        node.status = status;
        setAgentNodes([...nodes]);
      }
    };

    // Simulate node progression
    const steps = ['intent', 'auth', 'retrieve', 'planner', 'tool', 'validator', 'summarizer'];
    for (const step of steps) {
      updateNode(step, 'active');
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      updateNode(step, 'complete');
    }
  };

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    // Create session if needed
    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        sessionId = await createChatSession(content.substring(0, 50), domain);
        setCurrentSessionId(sessionId);
        await updateSessionTitle(sessionId, content);
        await loadSessions();
      } catch (error) {
        console.error('Failed to create session:', error);
        toast.error('Failed to start chat session');
        setIsProcessing(false);
        return;
      }
    }

    // Save user message
    try {
      await saveMessage(sessionId, userMessage);
    } catch (error) {
      console.error('Failed to save user message:', error);
    }

    // Start agent node simulation
    simulateAgentNodes();

    // Prepare messages for API
    const chatMessages = [...messages, userMessage].map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    let assistantContent = '';
    const assistantId = uuidv4();

    // Create placeholder assistant message
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    try {
      await streamChatResponse({
        messages: chatMessages,
        domain,
        documentContext: documentContext || undefined,
        sessionId: sessionId || undefined,
        onDelta: (delta) => {
          assistantContent += delta;
          setMessages(prev => prev.map(m => 
            m.id === assistantId 
              ? { ...m, content: assistantContent }
              : m
          ));
        },
        onDone: async () => {
          const { citations, action } = parseAIResponse(assistantContent);
          
          const finalMessage: Message = {
            id: assistantId,
            role: 'assistant',
            content: assistantContent,
            timestamp: new Date(),
            citations: citations.length > 0 ? citations : undefined,
            action: action || undefined,
          };

          setMessages(prev => prev.map(m => 
            m.id === assistantId ? finalMessage : m
          ));

          // Save assistant message
          try {
            await saveMessage(sessionId!, finalMessage);
          } catch (error) {
            console.error('Failed to save assistant message:', error);
          }

          setIsProcessing(false);
          setAgentNodes([]);
        },
        onError: (error) => {
          console.error('Chat error:', error);
          toast.error(error.message || 'Failed to get response');
          
          // Remove failed message
          setMessages(prev => prev.filter(m => m.id !== assistantId));
          setIsProcessing(false);
          setAgentNodes([]);
        },
      });
    } catch (error) {
      console.error('Stream error:', error);
      toast.error('Failed to get response from AI');
      setMessages(prev => prev.filter(m => m.id !== assistantId));
      setIsProcessing(false);
      setAgentNodes([]);
    }
  }, [currentSessionId, messages, domain, documentContext]);

  return {
    sessions,
    currentSessionId,
    messages,
    isProcessing,
    agentNodes,
    domain,
    setDomain,
    documentContext,
    setDocumentContext,
    sendMessage,
    startNewChat,
    selectSession,
    deleteSession,
    loadSessions,
  };
}
