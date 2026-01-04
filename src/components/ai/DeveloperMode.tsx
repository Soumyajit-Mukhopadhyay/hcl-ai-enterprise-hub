import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Code, 
  Terminal, 
  GitBranch, 
  Play, 
  Square,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  Shield,
  Brain,
  Wrench
} from 'lucide-react';
import { TaskDecompositionPanel, Task } from './TaskDecompositionPanel';
import { SafetyGuardrailsPanel } from './SafetyGuardrailsPanel';
import { FeedbackLearningPanel } from './FeedbackLearningPanel';
import { ApprovalWorkflowPanel, CodeChange } from './ApprovalWorkflowPanel';
import { ToolRegistryPanel } from './ToolRegistryPanel';
import { useAdvancedAgent } from '@/hooks/useAdvancedAgent';

interface DeveloperModeProps {
  sessionId: string;
  userId: string;
}

export function DeveloperMode({ sessionId, userId }: DeveloperModeProps) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [activeTab, setActiveTab] = useState('tasks');
  const [codeChanges, setCodeChanges] = useState<CodeChange[]>([]);
  const [learningEnabled, setLearningEnabled] = useState(true);

  const {
    tasks,
    safetyChecks,
    learnedPatterns,
    isProcessing,
    isPaused,
    overallSafetyScore,
    loadTasks,
    loadPatterns,
    approveTask,
    rejectTask,
    approveAllTasks,
    executeTask,
    submitFeedback,
    sendMessage,
    setIsPaused
  } = useAdvancedAgent(sessionId, userId);

  useEffect(() => {
    loadTasks();
    loadPatterns();
  }, [loadTasks, loadPatterns]);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    
    setOutput('');
    await sendMessage(input, 'fix', (chunk) => {
      setOutput(prev => prev + chunk);
    });
  };

  const handleApproveChange = (changeId: string) => {
    setCodeChanges(prev => prev.map(c => 
      c.id === changeId ? { ...c, status: 'approved' as const } : c
    ));
  };

  const handleRejectChange = (changeId: string) => {
    setCodeChanges(prev => prev.map(c => 
      c.id === changeId ? { ...c, status: 'rejected' as const } : c
    ));
  };

  // Default tools for display
  const defaultTools = [
    { name: 'read_file', description: 'Read contents of a file', category: 'file', riskLevel: 'low' as const, requiresApproval: false, usageCount: 45, successRate: 0.98, isEnabled: true },
    { name: 'write_file', description: 'Write content to a file', category: 'file', riskLevel: 'medium' as const, requiresApproval: true, usageCount: 32, successRate: 0.94, isEnabled: true },
    { name: 'search_code', description: 'Search for patterns in codebase', category: 'search', riskLevel: 'low' as const, requiresApproval: false, usageCount: 67, successRate: 0.99, isEnabled: true },
    { name: 'run_command', description: 'Execute a shell command', category: 'execution', riskLevel: 'high' as const, requiresApproval: true, usageCount: 12, successRate: 0.83, isEnabled: true },
    { name: 'git_commit', description: 'Commit changes to git', category: 'git', riskLevel: 'medium' as const, requiresApproval: true, usageCount: 28, successRate: 0.96, isEnabled: true },
    { name: 'analyze_error', description: 'Analyze an error message', category: 'analysis', riskLevel: 'low' as const, requiresApproval: false, usageCount: 89, successRate: 0.92, isEnabled: true },
    { name: 'propose_fix', description: 'Propose a code fix', category: 'code', riskLevel: 'medium' as const, requiresApproval: true, usageCount: 56, successRate: 0.88, isEnabled: true },
  ];

  return (
    <div className="h-full flex flex-col gap-4 p-4 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Code className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Developer Mode</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered code analysis, fixing, and approval workflow
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={`${overallSafetyScore >= 0.8 ? 'bg-green-500/10 text-green-600' : 
              overallSafetyScore >= 0.5 ? 'bg-yellow-500/10 text-yellow-600' : 
              'bg-red-500/10 text-red-600'}`}
          >
            <Shield className="h-3 w-3 mr-1" />
            Safety: {Math.round(overallSafetyScore * 100)}%
          </Badge>
          {isProcessing && (
            <Badge variant="secondary">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Processing
            </Badge>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
        {/* Left panel - Input & Output */}
        <div className="col-span-2 flex flex-col gap-4">
          {/* Input area */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Tell AI what to fix
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe the issue or paste error message... (e.g., 'Fix the TypeScript error in UserProfile.tsx' or 'The login form is not validating properly')"
                rows={3}
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleSubmit} 
                  disabled={isProcessing || !input.trim()}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze & Fix
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setInput('')}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for different views */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="tasks" className="flex items-center gap-1">
                <Play className="h-4 w-4" />
                Tasks
                {tasks.filter(t => t.status === 'awaiting_approval').length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                    {tasks.filter(t => t.status === 'awaiting_approval').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="changes" className="flex items-center gap-1">
                <GitBranch className="h-4 w-4" />
                Code Changes
              </TabsTrigger>
              <TabsTrigger value="output" className="flex items-center gap-1">
                <Terminal className="h-4 w-4" />
                Output
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="flex-1 mt-4">
              <TaskDecompositionPanel
                tasks={tasks}
                onApprove={approveTask}
                onReject={rejectTask}
                onApproveAll={approveAllTasks}
                onExecute={executeTask}
                onPause={() => setIsPaused(!isPaused)}
                isPaused={isPaused}
                isExecuting={isProcessing}
              />
            </TabsContent>

            <TabsContent value="changes" className="flex-1 mt-4">
              <ApprovalWorkflowPanel
                changes={codeChanges}
                onApprove={handleApproveChange}
                onReject={handleRejectChange}
                onApproveAll={() => {
                  setCodeChanges(prev => prev.map(c => 
                    c.status === 'pending' ? { ...c, status: 'approved' as const } : c
                  ));
                }}
                onRejectAll={() => {
                  setCodeChanges(prev => prev.map(c => 
                    c.status === 'pending' ? { ...c, status: 'rejected' as const } : c
                  ));
                }}
              />
            </TabsContent>

            <TabsContent value="output" className="flex-1 mt-4">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">AI Response</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {output || 'AI response will appear here...'}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right panel - Safety & Learning */}
        <div className="flex flex-col gap-4 overflow-auto">
          <SafetyGuardrailsPanel
            checks={safetyChecks}
            overallScore={overallSafetyScore}
            isAnalyzing={isProcessing}
          />

          <FeedbackLearningPanel
            patterns={learnedPatterns}
            onFeedback={submitFeedback}
            learningEnabled={learningEnabled}
            onToggleLearning={setLearningEnabled}
          />

          <ToolRegistryPanel tools={defaultTools} />
        </div>
      </div>
    </div>
  );
}
