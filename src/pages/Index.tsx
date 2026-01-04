import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Brain, Trash2, LogOut, BarChart3, Code } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatHistorySidebar } from '@/components/chat/ChatHistorySidebar';
import { PDFCitationViewer } from '@/components/chat/PDFCitationViewer';
import { GlassBoxVisualization } from '@/components/chat/GlassBoxVisualization';
import { UserContextPanel } from '@/components/context/UserContextPanel';
import { CalendarPanel } from '@/components/calendar/CalendarPanel';
import { ApprovalPanel } from '@/components/approvals/ApprovalPanel';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { PayslipWorkflow } from '@/components/workflows/PayslipWorkflow';
import { ReimbursementWorkflow } from '@/components/workflows/ReimbursementWorkflow';
import { TrainingWorkflow } from '@/components/workflows/TrainingWorkflow';
import { DeploymentWorkflow } from '@/components/workflows/DeploymentWorkflow';
import { AccessRequestWorkflow } from '@/components/workflows/AccessRequestWorkflow';
import { IncidentWorkflow } from '@/components/workflows/IncidentWorkflow';
import { DeveloperMode } from '@/components/ai/DeveloperMode';
import { useChatSession } from '@/hooks/useChatSession';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import type { Citation } from '@/types/agent';

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, role, signOut } = useAuth();
  const [showGlassBox, setShowGlassBox] = useState(true);
  const [showDevMode, setShowDevMode] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    sessions,
    currentSessionId,
    messages,
    isProcessing,
    agentNodes,
    setDocumentContext,
    sendMessage,
    startNewChat,
    selectSession,
    deleteSession,
  } = useChatSession();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (content: string) => {
    sendMessage(content);
  };

  const handleDocumentUploaded = (doc: any) => {
    setDocumentContext(`[Uploaded: ${doc.file_name}]`);
    toast.success(`${doc.file_name} uploaded for context`);
  };

  const handleCitationClick = (citation: Citation) => {
    setSelectedCitation(citation);
  };

  const handleDeleteCurrentChat = () => {
    if (currentSessionId) {
      deleteSession(currentSessionId);
    }
  };

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={selectSession}
        onNewChat={startNewChat}
        onDeleteSession={deleteSession}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4">
          <div>
            <h1 className="text-base font-semibold">HCLTech Enterprise AI</h1>
            <p className="text-xs text-muted-foreground">Role: {role?.toUpperCase() || 'Employee'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="gap-1 h-8"
            >
              <BarChart3 className="w-3 h-3" />
              <span className="hidden sm:inline text-xs">Dashboard</span>
            </Button>

            {role === 'developer' && (
              <Button
                variant={showDevMode ? "default" : "outline"}
                size="sm"
                onClick={() => setShowDevMode(!showDevMode)}
                className="gap-1 h-8"
              >
                <Code className="w-3 h-3" />
                <span className="hidden sm:inline text-xs">Dev Mode</span>
              </Button>
            )}

            <Button
              variant={showGlassBox ? "default" : "outline"}
              size="sm"
              onClick={() => setShowGlassBox(!showGlassBox)}
              className="gap-1 h-8"
            >
              <Brain className="w-3 h-3" />
              <span className="hidden sm:inline text-xs">Glass Box</span>
            </Button>

            {currentSessionId && messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteCurrentChat}
                className="h-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}

            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={signOut} className="h-8">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Developer Mode Full Screen */}
        {showDevMode && role === 'developer' ? (
          <DeveloperMode sessionId={currentSessionId || ''} userId={user?.id || ''} />
        ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Context Panel */}
          <div className="w-80 border-r border-border bg-muted/30 overflow-auto p-3 space-y-3 hidden lg:block">
            <UserContextPanel />
            <NotificationPanel />
            {(role === 'hr' || role === 'developer') && <ApprovalPanel />}
            
            {/* Role-specific Quick Actions */}
            {(role === 'employee' || role === 'hr') && (
              <>
                <PayslipWorkflow />
                <ReimbursementWorkflow />
                <TrainingWorkflow />
              </>
            )}
            
            {role === 'developer' && (
              <>
                <DeploymentWorkflow />
                <AccessRequestWorkflow />
                <IncidentWorkflow />
              </>
            )}
          </div>

          {/* Main Chat Area */}
          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto p-4">
              <div className="max-w-2xl mx-auto space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-16 animate-fade-in">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Hello, {profile?.full_name?.split(' ')[0] || 'there'}!</h3>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      {role === 'hr' ? 'Manage leave approvals, policies, and employee requests.' :
                       role === 'developer' ? 'Debug code, propose fixes, and get technical assistance.' :
                       role === 'it' ? 'Handle IT tickets and infrastructure issues.' :
                       'Ask about HR policies, apply for leave, or schedule meetings.'}
                    </p>
                  </div>
                )}
                {messages.map((message) => (
                  <ChatMessage 
                    key={message.id}
                    message={message} 
                    onCitationClick={handleCitationClick}
                  />
                ))}
                {isProcessing && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="ml-2">Thinking...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-3 border-t border-border bg-card/50">
              <div className="max-w-2xl mx-auto">
                <ChatInput 
                  onSend={handleSendMessage} 
                  isLoading={isProcessing}
                  onDocumentUploaded={handleDocumentUploaded}
                />
              </div>
            </div>
          </main>

          {/* Right Panel - Glass Box & Calendar */}
          {showGlassBox && (
            <div className="w-72 border-l border-border bg-muted/30 overflow-auto p-3 space-y-3 hidden md:block">
              {agentNodes.length > 0 && (
                <GlassBoxVisualization nodes={agentNodes} isProcessing={isProcessing} />
              )}
              <CalendarPanel />
            </div>
          )}
        </div>
        )}
      </div>

      <PDFCitationViewer 
        citation={selectedCitation}
        isOpen={!!selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
};

export default Index;
