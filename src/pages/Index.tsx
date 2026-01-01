import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Users, MessageSquare, CheckCircle, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { AgentReasoningPanel } from '@/components/chat/AgentReasoningPanel';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { processMessage } from '@/lib/agentService';
import type { Message, AgentNode } from '@/types/agent';

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentNodes, setAgentNodes] = useState<AgentNode[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const response = await processMessage(content, setAgentNodes);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Error processing message:', error);
    } finally {
      setIsProcessing(false);
      setAgentNodes([]);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background">
      <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold">HCLTech Agentic Enterprise Assistant</h1>
            <p className="text-xs text-muted-foreground">Powered by LangGraph • RAG-enabled • Kshitij 2026</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-success">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              System Online
            </span>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {messages.length === 0 ? (
              /* Welcome State */
              <div className="flex-1 p-6 overflow-auto">
                <div className="max-w-5xl mx-auto space-y-6">
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary text-white mb-4 shadow-glow">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold gradient-text mb-2">
                      Welcome to HCL Agent
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Your AI-powered enterprise assistant for HR operations, IT support, and knowledge retrieval.
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard title="Active Employees" value="223,420" icon={Users} variant="primary" trend={{ value: 3.2, isPositive: true }} />
                    <MetricCard title="Queries Today" value="1,247" icon={MessageSquare} variant="secondary" />
                    <MetricCard title="Actions Executed" value="89" icon={CheckCircle} variant="success" />
                    <MetricCard title="Avg Response" value="1.2s" icon={Clock} variant="default" />
                  </div>

                  <QuickActions onActionClick={handleSendMessage} />

                  {/* Key Highlights */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="glass-card rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">FY25 Highlights</h3>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-medium">₹117,055 Cr</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Growth</span><span className="font-medium text-success">+4.3% YoY</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Net Income</span><span className="font-medium">₹17,390 Cr</span></div>
                      </div>
                    </div>
                    <div className="glass-card rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="w-5 h-5 text-secondary" />
                        <h3 className="font-semibold">Strategic Pillars</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['AI Force', 'CloudSMART', 'New Vistas', 'Digital Foundation'].map(pillar => (
                          <span key={pillar} className="px-3 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary">{pillar}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Chat State */
              <div className="flex-1 overflow-auto p-6">
                <div className="max-w-3xl mx-auto space-y-4">
                  {messages.map(message => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
              <div className="max-w-3xl mx-auto">
                <ChatInput onSend={handleSendMessage} isLoading={isProcessing} />
              </div>
            </div>
          </main>

          {/* Agent Reasoning Panel */}
          <div className="relative">
            <AgentReasoningPanel nodes={agentNodes.length ? agentNodes : undefined} isProcessing={isProcessing} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
