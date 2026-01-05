import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatSession } from '@/hooks/useChatSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatHistorySidebar } from '@/components/chat/ChatHistorySidebar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { GlassBoxVisualization } from '@/components/chat/GlassBoxVisualization';
import { TaskDecompositionPanel, Task } from '@/components/ai/TaskDecompositionPanel';
import { 
  ArrowLeft, 
  Brain, 
  Shield, 
  Zap, 
  Activity,
  PanelRightOpen,
  PanelRightClose,
  ListTodo
} from 'lucide-react';

export default function Assistant() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const {
    sessions,
    messages,
    currentSessionId,
    isProcessing,
    agentNodes,
    selectSession,
    startNewChat,
    deleteSession,
    sendMessage,
  } = useChatSession();

  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Parse tasks from AI responses
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.content) {
      // Check for multi-task JSON in response
      try {
        const jsonMatch = lastMessage.content.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.action === 'analyze_multi_task' && parsed.data?.execution_order) {
            const newTasks: Task[] = parsed.data.execution_order.map((t: any, i: number) => ({
              id: `task-${Date.now()}-${i}`,
              order: t.order || i,
              type: t.type,
              description: t.description,
              status: 'pending' as const,
              riskLevel: t.risk || 'low',
              requiresApproval: t.requires_approval || false,
              dependencies: t.depends_on || []
            }));
            setTasks(newTasks);
            setShowTaskPanel(true);
          }
        }
      } catch (e) {
        // Not valid JSON, ignore
      }
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleApproveTask = (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'approved' as const } : t
    ));
  };

  const handleRejectTask = (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'rejected' as const } : t
    ));
  };

  const handleApproveAllTasks = () => {
    setTasks(prev => prev.map(t => 
      t.status === 'awaiting_approval' ? { ...t, status: 'approved' as const } : t
    ));
  };

  const handleExecuteTask = async (taskId: string) => {
    setIsExecuting(true);
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'executing' as const } : t
    ));
    
    // Simulate execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'completed' as const } : t
    ));
    setIsExecuting(false);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleSend = (content: string) => {
    sendMessage(content);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={selectSession}
        onNewChat={startNewChat}
        onDeleteSession={deleteSession}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="font-semibold">AI Assistant</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Safety: Active
            </Badge>
            <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
              <Zap className="h-3 w-3" />
              Multi-Task Ready
            </Badge>
            {tasks.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowTaskPanel(!showTaskPanel)}
                className="gap-1"
              >
                <ListTodo className="h-4 w-4" />
                {tasks.length} Tasks
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowRightPanel(!showRightPanel)}
            >
              {showRightPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Task Panel (Collapsible) */}
          {showTaskPanel && tasks.length > 0 && (
            <div className="w-80 border-r border-border bg-muted/30 p-3 overflow-auto">
              <TaskDecompositionPanel
                tasks={tasks}
                onApprove={handleApproveTask}
                onReject={handleRejectTask}
                onApproveAll={handleApproveAllTasks}
                onExecute={handleExecuteTask}
                onPause={handlePause}
                isPaused={isPaused}
                isExecuting={isExecuting}
              />
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <Brain className="h-16 w-16 mx-auto text-primary/30 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Multi-Task AI Assistant</h2>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      I can handle multiple tasks in a single prompt. Just tell me what you need - 
                      I'll analyze, check safety, and execute them sequentially.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Badge variant="secondary">🔒 Safety Checked</Badge>
                      <Badge variant="secondary">📋 Task Dependencies</Badge>
                      <Badge variant="secondary">✅ Approval Workflow</Badge>
                      <Badge variant="secondary">🔄 Auto-Retry Failed Tasks</Badge>
                    </div>
                    <div className="mt-8 p-4 bg-muted/50 rounded-lg text-left max-w-lg mx-auto">
                      <p className="text-sm font-medium mb-2">Try asking:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>"Fix the login bug, then run tests, and deploy to staging"</li>
                        <li>"Check my leave balance, submit a leave request, and notify my manager"</li>
                        <li>"Create a bug ticket, analyze the code, and propose a fix"</li>
                      </ul>
                    </div>
                  </div>
                )}
                
                {messages.map((message) => (
                  <ChatMessage 
                    key={message.id} 
                    message={message}
                  />
                ))}
                
                {isProcessing && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="h-4 w-4 animate-pulse" />
                    <span className="text-sm">AI is processing your request...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border p-4">
              <div className="max-w-3xl mx-auto">
                <ChatInput
                  onSend={handleSend}
                  isLoading={isProcessing}
                  placeholder="Give me multiple tasks... I'll handle them all!"
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Tip: Use "and", "then", or numbered lists for multiple tasks
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel - Glass Box */}
          {showRightPanel && (
            <div className="w-72 border-l border-border bg-muted/30 p-3 space-y-3 overflow-auto">
              {agentNodes.length > 0 ? (
                <GlassBoxVisualization nodes={agentNodes} isProcessing={isProcessing} />
              ) : (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      Agent Reasoning
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Agent reasoning will appear here as I process your requests.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Role Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Your Access</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge variant="outline" className="w-full justify-center">
                    {role === 'developer' ? '👨‍💻 Developer' : 
                     role === 'hr' ? '👥 HR Manager' : 
                     role === 'it' ? '🔧 IT Admin' : '👤 Employee'}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {role === 'developer' 
                      ? 'Full access: Code operations, AI training, deployments'
                      : role === 'hr'
                      ? 'HR access: Leave management, employee data'
                      : 'Standard access: Tickets, calendar, basic requests'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
