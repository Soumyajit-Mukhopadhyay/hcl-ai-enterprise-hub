import { useRef, useEffect, useState } from 'react';
import { MessageSquare, LayoutDashboard, Briefcase, Brain, Trash2 } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { Citation } from '@/types/agent';

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [showDashboard, setShowDashboard] = useState(true);
  const [showWorkflows, setShowWorkflows] = useState(false);
  const [showGlassBox, setShowGlassBox] = useState(true);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [mainView, setMainView] = useState<'chat' | 'workflows'>('chat');
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
      setMainView('chat');
    }
  }, [messages.length]);

  const handleSendMessage = (content: string) => {
    setShowDashboard(false);
    setMainView('chat');
    sendMessage(content);
  };

  const handleDocumentUploaded = (doc: any) => {
    setDocumentContext(`[Uploaded: ${doc.file_name}]`);
    toast({
      title: "Document uploaded",
      description: `${doc.file_name} is now available for context`,
    });
  };

  const handleCitationClick = (citation: Citation) => {
    setSelectedCitation(citation);
  };

  const handleWorkflowAction = (actionType: string, data: any) => {
    // Trigger the chat with the action
    const prompts: Record<string, string> = {
      'leave_request': `I want to apply for ${data.type || 'annual'} leave from ${data.startDate} to ${data.endDate}. Reason: ${data.reason}`,
      'fetch_payslip': `Show me my payslip for ${data.month} ${data.year}`,
      'onboard': `I need to onboard a new employee: ${data.name} as ${data.role} starting ${data.startDate}`,
      'create_ticket': `Create a ${data.category} support ticket: ${data.subject}. Description: ${data.description}`,
    };
    
    if (prompts[actionType]) {
      handleSendMessage(prompts[actionType]);
    }
  };

  const handleDeleteCurrentChat = () => {
    if (currentSessionId) {
      deleteSession(currentSessionId);
      toast({
        title: "Chat deleted",
        description: "The conversation has been removed",
      });
    }
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
          setMainView('chat');
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
          <div className="flex items-center gap-2">
            {/* Domain Tabs */}
            <DomainTabs activeDomain={domain} onDomainChange={setDomain} />
            
            {/* View Toggles */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              <Button
                variant={mainView === 'chat' ? "default" : "ghost"}
                size="sm"
                onClick={() => setMainView('chat')}
                className="gap-2 h-8"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Chat</span>
              </Button>
              <Button
                variant={mainView === 'workflows' ? "default" : "ghost"}
                size="sm"
                onClick={() => setMainView('workflows')}
                className="gap-2 h-8"
              >
                <Briefcase className="w-4 h-4" />
                <span className="hidden sm:inline">Workflows</span>
              </Button>
            </div>

            {/* Dashboard Toggle */}
            <Button
              variant={showDashboard ? "default" : "outline"}
              size="sm"
              onClick={() => setShowDashboard(!showDashboard)}
              className="gap-2 h-8"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>

            {/* Glass Box Toggle */}
            <Button
              variant={showGlassBox ? "default" : "outline"}
              size="sm"
              onClick={() => setShowGlassBox(!showGlassBox)}
              className="gap-2 h-8"
            >
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Glass Box</span>
            </Button>

            {/* Delete Chat */}
            {currentSessionId && messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteCurrentChat}
                className="gap-2 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}

            <span className="flex items-center gap-1.5 text-xs text-success ml-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Online
            </span>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {mainView === 'workflows' ? (
              /* HR Workflows Panel */
              <HRWorkflowPanel onActionTrigger={handleWorkflowAction} />
            ) : showDashboard && messages.length === 0 ? (
              /* Dashboard State */
              <div className="flex-1 p-6 overflow-auto">
                <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
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
                    <div className="text-center py-12 animate-fade-in">
                      <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">Start a Conversation</h3>
                      <p className="text-muted-foreground text-sm">
                        Ask about HCLTech, HR policies, or request an action
                      </p>
                    </div>
                  )}
                  {messages.map((message, index) => (
                    <div 
                      key={message.id} 
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <ChatMessage 
                        message={message} 
                        onCitationClick={handleCitationClick}
                      />
                    </div>
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

            {/* Input - Always visible except in workflows view */}
            {mainView === 'chat' && (
              <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
                <div className="max-w-3xl mx-auto">
                  <ChatInput 
                    onSend={handleSendMessage} 
                    isLoading={isProcessing}
                    onDocumentUploaded={handleDocumentUploaded}
                  />
                </div>
              </div>
            )}
          </main>

          {/* Right Panel - Glass Box or Agent Reasoning */}
          {showGlassBox && (
            <div className="w-80 border-l border-border bg-card/30 backdrop-blur-sm overflow-auto p-4 animate-slide-in-right">
              {agentNodes.length > 0 ? (
                <GlassBoxVisualization nodes={agentNodes} isProcessing={isProcessing} />
              ) : (
                <AgentReasoningPanel nodes={undefined} isProcessing={isProcessing} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* PDF Citation Viewer Modal */}
      <PDFCitationViewer 
        citation={selectedCitation}
        isOpen={!!selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
};

export default Index;
