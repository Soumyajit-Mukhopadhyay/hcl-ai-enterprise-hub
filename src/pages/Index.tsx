import { useRef, useEffect, useState } from 'react';
import { MessageSquare, LayoutDashboard, Briefcase } from 'lucide-react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { AgentReasoningPanel } from '@/components/chat/AgentReasoningPanel';
import { ChatHistorySidebar } from '@/components/chat/ChatHistorySidebar';
import { PDFCitationViewer } from '@/components/chat/PDFCitationViewer';
import { GlassBoxVisualization } from '@/components/chat/GlassBoxVisualization';
import { DomainTabs } from '@/components/dashboard/DomainTabs';
import { RealtimeDashboard } from '@/components/dashboard/RealtimeDashboard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { HRWorkflowPanel } from '@/components/workflows/HRWorkflowPanel';
import { useChatSession } from '@/hooks/useChatSession';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Citation } from '@/types/agent';

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [showDashboard, setShowDashboard] = useState(true);
  const [showWorkflows, setShowWorkflows] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    sessions,
    currentSessionId,
    messages,
    isProcessing,
    agentNodes,
    domain,
    setDomain,
    setDocumentContext,
    sendMessage,
    startNewChat,
    selectSession,
    deleteSession,
  } = useChatSession();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Switch to chat view when messages exist
  useEffect(() => {
    if (messages.length > 0) {
      setShowDashboard(false);
    }
  }, [messages.length]);

  const handleSendMessage = (content: string) => {
    setShowDashboard(false);
    sendMessage(content);
  };

  const handleDocumentUploaded = (doc: any) => {
    setDocumentContext(`[Uploaded: ${doc.file_name}]`);
  };

  return (
    <div className="flex h-screen w-full bg-background">
      <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={selectSession}
        onNewChat={() => {
          startNewChat();
          setShowDashboard(true);
        }}
        onDeleteSession={deleteSession}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold">HCLTech Agentic Enterprise Assistant</h1>
              <p className="text-xs text-muted-foreground">Powered by LangGraph • RAG-enabled • Kshitij 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Domain Tabs */}
            <DomainTabs activeDomain={domain} onDomainChange={setDomain} />
            
            {/* Dashboard Toggle */}
            <Button
              variant={showDashboard ? "default" : "outline"}
              size="sm"
              onClick={() => setShowDashboard(!showDashboard)}
              className="gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Button>

            <span className="flex items-center gap-1.5 text-xs text-success">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              System Online
            </span>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {showDashboard && messages.length === 0 ? (
              /* Dashboard State */
              <div className="flex-1 p-6 overflow-auto">
                <div className="max-w-6xl mx-auto space-y-6">
                  {/* Welcome */}
                  <div className="text-center py-6">
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

                  {/* Real-time Dashboard */}
                  <RealtimeDashboard />

                  {/* Quick Actions */}
                  <QuickActions onActionClick={handleSendMessage} />
                </div>
              </div>
            ) : (
              /* Chat State */
              <div className="flex-1 overflow-auto p-6">
                <div className="max-w-3xl mx-auto space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-12">
                      <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">Start a Conversation</h3>
                      <p className="text-muted-foreground text-sm">
                        Ask about HCLTech, HR policies, or request an action
                      </p>
                    </div>
                  )}
                  {messages.map(message => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  {isProcessing && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <span className="ml-2">Agent is thinking...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
              <div className="max-w-3xl mx-auto">
                <ChatInput 
                  onSend={handleSendMessage} 
                  isLoading={isProcessing}
                  onDocumentUploaded={handleDocumentUploaded}
                />
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
