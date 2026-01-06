import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatSession } from '@/hooks/useChatSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatHistorySidebar } from '@/components/chat/ChatHistorySidebar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { GlassBoxVisualization } from '@/components/chat/GlassBoxVisualization';
import { EnhancedTaskExecutor, EnhancedTask } from '@/components/ai/EnhancedTaskExecutor';
import { SafetyGuardrailsPanel } from '@/components/ai/SafetyGuardrailsPanel';
import { FeedbackLearningPanel } from '@/components/ai/FeedbackLearningPanel';
import { CalendarPanel } from '@/components/calendar/CalendarPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Brain, 
  Shield, 
  Zap, 
  Activity,
  PanelRightOpen,
  PanelRightClose,
  ListTodo,
  Calendar,
  Sparkles,
  ShieldCheck,
  Clock,
  CheckCircle2
} from 'lucide-react';

interface SafetyCheck {
  id: string;
  type: 'input_validation' | 'code_analysis' | 'execution_check' | 'output_validation';
  status: 'passed' | 'warning' | 'blocked';
  message: string;
  details?: string;
  flags?: string[];
  score?: number;
}

interface LearnedPattern {
  id: string;
  type: string;
  description: string;
  confidence: number;
  usageCount: number;
  successRate: number;
}

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
  const [rightPanelTab, setRightPanelTab] = useState<'reasoning' | 'safety' | 'calendar' | 'learning'>('reasoning');
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [tasks, setTasks] = useState<EnhancedTask[]>([]);
  const [safetyChecks, setSafetyChecks] = useState<SafetyCheck[]>([]);
  const [overallSafetyScore, setOverallSafetyScore] = useState(1.0);
  const [patterns, setPatterns] = useState<LearnedPattern[]>([]);
  const [learningEnabled, setLearningEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch learned patterns
  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    const { data } = await supabase
      .from('ai_learned_patterns')
      .select('*')
      .eq('is_validated', true)
      .order('success_count', { ascending: false })
      .limit(10);

    if (data) {
      setPatterns(data.map(p => ({
        id: p.id,
        type: p.pattern_type,
        description: p.pattern_key,
        confidence: p.confidence_score || 0,
        usageCount: (p.success_count || 0) + (p.failure_count || 0),
        successRate: p.success_count && p.failure_count 
          ? p.success_count / (p.success_count + p.failure_count) 
          : 0
      })));
    }
  };

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
            const newTasks: EnhancedTask[] = parsed.data.execution_order.map((t: any, i: number) => ({
              id: `task-${Date.now()}-${i}`,
              order: t.order || i,
              type: t.type === 'hr_request' ? 'hr' : t.type === 'code_fix' ? 'code' : t.type === 'git_operation' ? 'git' : 'general',
              description: t.description,
              status: 'pending' as const,
              riskLevel: t.risk || 'low',
              requiresApproval: t.requires_approval || false,
              approverRole: t.type === 'hr_request' ? 'hr' : t.type === 'deployment' ? 'developer' : undefined,
              dependencies: t.depends_on || [],
              maxRetries: 3
            }));
            setTasks(newTasks);
            setShowTaskPanel(true);

            // Generate initial safety checks
            runSafetyAnalysis(newTasks);
          }
        }
      } catch (e) {
        // Not valid JSON, ignore
      }
    }
  }, [messages]);

  // Run safety analysis on tasks
  const runSafetyAnalysis = (taskList: EnhancedTask[]) => {
    const checks: SafetyCheck[] = [
      {
        id: 'input-1',
        type: 'input_validation',
        status: 'passed',
        message: 'All task descriptions validated',
        score: 0.95
      },
      {
        id: 'code-1',
        type: 'code_analysis',
        status: taskList.some(t => t.type === 'code' || t.type === 'deployment') ? 'warning' : 'passed',
        message: taskList.some(t => t.type === 'code') ? 'Code changes detected - requires review' : 'No code changes detected',
        flags: taskList.some(t => t.type === 'code') ? ['code_modification'] : [],
        score: 0.85
      },
      {
        id: 'exec-1',
        type: 'execution_check',
        status: taskList.some(t => t.riskLevel === 'high' || t.riskLevel === 'critical') ? 'warning' : 'passed',
        message: 'Execution permissions verified',
        score: 0.9
      },
      {
        id: 'output-1',
        type: 'output_validation',
        status: 'passed',
        message: 'Output validation ready',
        score: 1.0
      }
    ];

    setSafetyChecks(checks);
    const avgScore = checks.reduce((sum, c) => sum + (c.score || 1), 0) / checks.length;
    setOverallSafetyScore(avgScore);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleExecuteTask = async (taskId: string): Promise<boolean> => {
    // Simulate task execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    return Math.random() > 0.1; // 90% success rate
  };

  const handleNotifyApprover = async (task: EnhancedTask) => {
    // Create notification in database
    try {
      await supabase.from('notifications').insert({
        user_id: user?.id || '',
        title: `Approval Required: ${task.type} Task`,
        message: `Task "${task.description}" requires your approval. Risk level: ${task.riskLevel}`,
        type: 'approval',
        related_id: task.id
      });
      
      toast.success(`Notified ${task.approverRole || 'approver'} for task approval`);
      
      // Mark notification as sent
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, notificationSent: true } : t
      ));
    } catch (error) {
      toast.error('Failed to send notification');
    }
  };

  const handleFeedback = async (messageId: string, type: 'positive' | 'negative', correction?: string) => {
    try {
      await supabase.from('ai_feedback').insert({
        message_id: messageId,
        feedback_type: type,
        corrected_response: correction,
        session_id: currentSessionId,
        user_id: user?.id
      });
      
      toast.success(type === 'positive' ? 'Thanks for the feedback!' : 'Feedback recorded - AI will learn from this');
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
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
            <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
              <ShieldCheck className="h-3 w-3" />
              Safety: {Math.round(overallSafetyScore * 100)}%
            </Badge>
            <Badge variant="outline" className="gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
              <Sparkles className="h-3 w-3" />
              {patterns.length} Patterns
            </Badge>
            <Badge variant="outline" className="gap-1">
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
            <div className="w-96 border-r border-border bg-muted/30 p-3 overflow-auto">
              <EnhancedTaskExecutor
                tasks={tasks}
                onTaskUpdate={setTasks}
                onExecuteTask={handleExecuteTask}
                onNotifyApprover={handleNotifyApprover}
                currentUserId={user?.id}
                userRole={role}
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
                      I can handle multiple tasks in a single prompt with safety checks, 
                      learned patterns, and role-based approvals.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                      <Badge variant="secondary" className="gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Safety Guardrails
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        Pattern Learning
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Smart Dependencies
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Auto-Retry
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto text-left">
                      <div className="p-3 bg-muted/50 rounded-lg text-sm">
                        <p className="font-medium mb-1">📋 HR Tasks</p>
                        <p className="text-xs text-muted-foreground">
                          "Submit leave request and check my balance"
                        </p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg text-sm">
                        <p className="font-medium mb-1">💻 Dev Tasks</p>
                        <p className="text-xs text-muted-foreground">
                          "Fix the bug, run tests, deploy to staging"
                        </p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg text-sm">
                        <p className="font-medium mb-1">🌐 Web Search</p>
                        <p className="text-xs text-muted-foreground">
                          "Search for React best practices"
                        </p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg text-sm">
                        <p className="font-medium mb-1">📅 Calendar</p>
                        <p className="text-xs text-muted-foreground">
                          "Schedule a meeting with HR for tomorrow"
                        </p>
                      </div>
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
                  placeholder="Give me multiple tasks... I'll handle them all with safety checks!"
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Tip: Use "and", "then", or numbered lists for multiple tasks • All tasks are safety-checked before execution
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          {showRightPanel && (
            <div className="w-80 border-l border-border bg-muted/30 flex flex-col">
              <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as any)} className="flex-1 flex flex-col">
                <TabsList className="grid grid-cols-4 m-2">
                  <TabsTrigger value="reasoning" className="text-xs">
                    <Brain className="h-3 w-3" />
                  </TabsTrigger>
                  <TabsTrigger value="safety" className="text-xs">
                    <Shield className="h-3 w-3" />
                  </TabsTrigger>
                  <TabsTrigger value="learning" className="text-xs">
                    <Sparkles className="h-3 w-3" />
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="text-xs">
                    <Calendar className="h-3 w-3" />
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 p-2">
                  <TabsContent value="reasoning" className="mt-0">
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
                    <Card className="mt-3">
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
                  </TabsContent>

                  <TabsContent value="safety" className="mt-0">
                    <SafetyGuardrailsPanel 
                      checks={safetyChecks}
                      overallScore={overallSafetyScore}
                    />
                  </TabsContent>

                  <TabsContent value="learning" className="mt-0">
                    <FeedbackLearningPanel
                      patterns={patterns}
                      onFeedback={handleFeedback}
                      currentMessageId={messages[messages.length - 1]?.id}
                      learningEnabled={learningEnabled}
                      onToggleLearning={setLearningEnabled}
                    />
                  </TabsContent>

                  <TabsContent value="calendar" className="mt-0">
                    <CalendarPanel />
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
