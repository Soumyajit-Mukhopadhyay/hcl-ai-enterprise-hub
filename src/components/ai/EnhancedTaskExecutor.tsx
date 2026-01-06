import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Shield, 
  Loader2,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  SkipForward,
  RefreshCw,
  Link,
  Unlink,
  Bell,
  Users,
  Code,
  GitBranch,
  ArrowRight,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Eye
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnhancedTask {
  id: string;
  order: number;
  type: 'hr' | 'developer' | 'general' | 'calendar' | 'git' | 'code' | 'deployment';
  description: string;
  status: 'pending' | 'safety_check' | 'awaiting_approval' | 'approved' | 'executing' | 'completed' | 'failed' | 'rejected' | 'skipped' | 'retrying';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  approverRole?: 'hr' | 'developer' | 'it' | 'admin';
  dependencies: number[];
  safetyScore?: number;
  safetyFlags?: string[];
  retryCount?: number;
  maxRetries?: number;
  proposedChanges?: any;
  executionResult?: any;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  notificationSent?: boolean;
}

interface EnhancedTaskExecutorProps {
  tasks: EnhancedTask[];
  onTaskUpdate: (tasks: EnhancedTask[]) => void;
  onExecuteTask: (taskId: string) => Promise<boolean>;
  onNotifyApprover: (task: EnhancedTask) => void;
  currentUserId?: string;
  userRole?: string;
}

const statusConfig = {
  pending: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
  safety_check: { icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  awaiting_approval: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  approved: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  executing: { icon: Loader2, color: 'text-blue-500 animate-spin', bg: 'bg-blue-500/10' },
  completed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-500/10' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  rejected: { icon: XCircle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  skipped: { icon: SkipForward, color: 'text-muted-foreground', bg: 'bg-muted' },
  retrying: { icon: RefreshCw, color: 'text-yellow-500 animate-spin', bg: 'bg-yellow-500/10' }
};

const riskColors = {
  low: 'bg-green-500/10 text-green-600 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-600 border-red-500/20'
};

const typeIcons = {
  hr: Users,
  developer: Code,
  git: GitBranch,
  code: Code,
  calendar: Clock,
  deployment: Zap,
  general: CheckCircle2
};

export function EnhancedTaskExecutor({
  tasks,
  onTaskUpdate,
  onExecuteTask,
  onNotifyApprover,
  currentUserId,
  userRole
}: EnhancedTaskExecutorProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const [isAutoExecuting, setIsAutoExecuting] = useState(false);
  const [currentExecutingId, setCurrentExecutingId] = useState<string | null>(null);

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const failedCount = tasks.filter(t => t.status === 'failed').length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
  const awaitingApproval = tasks.filter(t => t.status === 'awaiting_approval');

  // Get failed task orders for dependency checking
  const failedTaskOrders = tasks
    .filter(t => t.status === 'failed' || t.status === 'rejected')
    .map(t => t.order);

  // Check if a task should be skipped due to failed dependencies
  const shouldSkipTask = (task: EnhancedTask): boolean => {
    if (!task.dependencies || task.dependencies.length === 0) return false;
    return task.dependencies.some(dep => failedTaskOrders.includes(dep));
  };

  // Run safety check on a task
  const runSafetyCheck = async (task: EnhancedTask): Promise<{ safe: boolean; score: number; flags: string[] }> => {
    // Simulate safety analysis
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const flags: string[] = [];
    let score = 1.0;

    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /delete|drop|truncate/i, flag: 'destructive_operation', penalty: 0.3 },
      { pattern: /sudo|root|admin/i, flag: 'elevated_privileges', penalty: 0.2 },
      { pattern: /password|secret|key/i, flag: 'sensitive_data', penalty: 0.1 },
      { pattern: /production|prod/i, flag: 'production_access', penalty: 0.15 }
    ];

    dangerousPatterns.forEach(({ pattern, flag, penalty }) => {
      if (pattern.test(task.description)) {
        flags.push(flag);
        score -= penalty;
      }
    });

    return {
      safe: score >= 0.5,
      score: Math.max(0, score),
      flags
    };
  };

  // Handle safety check for a task
  const handleSafetyCheck = async (taskId: string) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], status: 'safety_check' };
    onTaskUpdate(updatedTasks);

    const result = await runSafetyCheck(tasks[taskIndex]);
    
    updatedTasks[taskIndex] = {
      ...updatedTasks[taskIndex],
      safetyScore: result.score,
      safetyFlags: result.flags,
      status: result.safe 
        ? (tasks[taskIndex].requiresApproval ? 'awaiting_approval' : 'approved')
        : 'rejected',
      errorMessage: result.safe ? undefined : 'Failed safety check: ' + result.flags.join(', ')
    };

    onTaskUpdate(updatedTasks);

    // Notify approver if needed
    if (result.safe && updatedTasks[taskIndex].status === 'awaiting_approval') {
      onNotifyApprover(updatedTasks[taskIndex]);
    }
  };

  // Handle task approval
  const handleApprove = (taskId: string) => {
    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, status: 'approved' as const } : t
    );
    onTaskUpdate(updatedTasks);
    toast.success('Task approved');
  };

  // Handle task rejection
  const handleReject = (taskId: string, reason?: string) => {
    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { 
        ...t, 
        status: 'rejected' as const,
        errorMessage: reason || 'Rejected by approver'
      } : t
    );
    onTaskUpdate(updatedTasks);
    toast.info('Task rejected');
  };

  // Handle task execution
  const handleExecute = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Check for failed dependencies
    if (shouldSkipTask(task)) {
      const updatedTasks = tasks.map(t => 
        t.id === taskId ? { 
          ...t, 
          status: 'skipped' as const,
          errorMessage: 'Skipped due to failed dependency'
        } : t
      );
      onTaskUpdate(updatedTasks);
      toast.warning(`Task skipped: dependency failed`);
      return;
    }

    setCurrentExecutingId(taskId);
    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, status: 'executing' as const, startedAt: new Date().toISOString() } : t
    );
    onTaskUpdate(updatedTasks);

    try {
      const success = await onExecuteTask(taskId);
      
      const finalTasks = tasks.map(t => 
        t.id === taskId ? { 
          ...t, 
          status: success ? 'completed' as const : 'failed' as const,
          completedAt: new Date().toISOString(),
          retryCount: success ? t.retryCount : (t.retryCount || 0) + 1
        } : t
      );
      onTaskUpdate(finalTasks);

      if (success) {
        toast.success(`Task ${task.order + 1} completed`);
      } else {
        toast.error(`Task ${task.order + 1} failed`);
      }
    } catch (error) {
      const errorTasks = tasks.map(t => 
        t.id === taskId ? { 
          ...t, 
          status: 'failed' as const,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          retryCount: (t.retryCount || 0) + 1
        } : t
      );
      onTaskUpdate(errorTasks);
      toast.error(`Task failed: ${error}`);
    } finally {
      setCurrentExecutingId(null);
    }
  };

  // Handle retry
  const handleRetry = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || (task.retryCount || 0) >= (task.maxRetries || 3)) {
      toast.error('Maximum retries exceeded');
      return;
    }

    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, status: 'retrying' as const } : t
    );
    onTaskUpdate(updatedTasks);

    await handleExecute(taskId);
  };

  // Auto-execute approved tasks
  const handleAutoExecute = async () => {
    setIsAutoExecuting(true);
    const approvedTasks = tasks.filter(t => t.status === 'approved');
    
    for (const task of approvedTasks) {
      if (isPaused) break;
      await handleExecute(task.id);
    }
    
    setIsAutoExecuting(false);
  };

  // Approve all safe tasks
  const handleApproveAllSafe = () => {
    const updatedTasks = tasks.map(t => 
      t.status === 'awaiting_approval' && t.riskLevel === 'low' && (t.safetyScore || 1) >= 0.8
        ? { ...t, status: 'approved' as const }
        : t
    );
    onTaskUpdate(updatedTasks);
    toast.success('All safe tasks approved');
  };

  const toggleExpand = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const canUserApprove = (task: EnhancedTask): boolean => {
    if (!task.approverRole) return true;
    return userRole === task.approverRole || userRole === 'admin' || userRole === 'developer';
  };

  const TypeIcon = (type: string) => typeIcons[type as keyof typeof typeIcons] || CheckCircle2;

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Enhanced Task Pipeline
          </CardTitle>
          <div className="flex items-center gap-2">
            {isAutoExecuting && (
              <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)}>
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
            )}
            <Badge variant="outline" className={failedCount > 0 ? 'border-red-500/50' : ''}>
              {completedCount}/{tasks.length} Complete
              {failedCount > 0 && ` • ${failedCount} Failed`}
            </Badge>
          </div>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
        
        {/* Stats */}
        <div className="flex gap-2 mt-3">
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {completedCount} Done
          </Badge>
          {awaitingApproval.length > 0 && (
            <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {awaitingApproval.length} Pending
            </Badge>
          )}
          {failedCount > 0 && (
            <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
              <XCircle className="h-3 w-3 mr-1" />
              {failedCount} Failed
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3">
            {tasks.map((task) => {
              const StatusIcon = statusConfig[task.status]?.icon || Clock;
              const TaskTypeIcon = TypeIcon(task.type);
              const isSkipped = shouldSkipTask(task) && task.status === 'pending';
              
              return (
                <Collapsible 
                  key={task.id} 
                  open={expandedTasks.has(task.id)}
                  onOpenChange={() => toggleExpand(task.id)}
                >
                  <div className={`rounded-lg border p-3 transition-all ${
                    task.status === 'awaiting_approval' ? 'border-yellow-500/50 bg-yellow-500/5' :
                    task.status === 'executing' ? 'border-blue-500/50 bg-blue-500/5' :
                    task.status === 'failed' ? 'border-red-500/50 bg-red-500/5' :
                    task.status === 'completed' ? 'border-green-500/50 bg-green-500/5' :
                    isSkipped ? 'border-muted bg-muted/50 opacity-60' :
                    'border-border'
                  }`}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-6">
                            #{task.order + 1}
                          </span>
                          <StatusIcon className={`h-4 w-4 ${statusConfig[task.status]?.color}`} />
                          <span className="font-medium text-sm truncate max-w-[200px]">
                            {task.description}
                          </span>
                          {isSkipped && (
                            <Badge variant="outline" className="text-xs">
                              <Link className="h-3 w-3 mr-1" />
                              Blocked by #{task.dependencies[0]}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {task.safetyScore !== undefined && (
                            <Badge 
                              variant="outline" 
                              className={task.safetyScore >= 0.8 ? 'text-green-600' : task.safetyScore >= 0.5 ? 'text-yellow-600' : 'text-red-600'}
                            >
                              {task.safetyScore >= 0.8 ? <ShieldCheck className="h-3 w-3 mr-1" /> : <ShieldAlert className="h-3 w-3 mr-1" />}
                              {Math.round(task.safetyScore * 100)}%
                            </Badge>
                          )}
                          <Badge variant="outline" className={riskColors[task.riskLevel]}>
                            {task.riskLevel}
                          </Badge>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {task.type}
                          </Badge>
                          {task.dependencies.length > 0 && (
                            <Link className="h-3 w-3 text-muted-foreground" />
                          )}
                          {expandedTasks.has(task.id) ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-3 pt-3 border-t space-y-3">
                      {/* Dependencies */}
                      {task.dependencies.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Depends on: </span>
                          {task.dependencies.map(d => `Task #${d + 1}`).join(', ')}
                        </div>
                      )}

                      {/* Safety Flags */}
                      {task.safetyFlags && task.safetyFlags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {task.safetyFlags.map((flag, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-yellow-500/10 text-yellow-700">
                              {flag.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Approver Role */}
                      {task.approverRole && task.status === 'awaiting_approval' && (
                        <div className="flex items-center gap-2 text-xs">
                          <Users className="h-3 w-3" />
                          <span>Requires approval from: <strong className="capitalize">{task.approverRole}</strong></span>
                          {!task.notificationSent && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 text-xs"
                              onClick={() => onNotifyApprover(task)}
                            >
                              <Bell className="h-3 w-3 mr-1" />
                              Notify
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Error Message */}
                      {task.errorMessage && (
                        <div className="p-2 bg-red-500/10 rounded text-red-600 text-sm">
                          {task.errorMessage}
                        </div>
                      )}

                      {/* Execution Result */}
                      {task.executionResult && (
                        <div className="p-2 bg-green-500/10 rounded text-green-600 text-sm">
                          Completed successfully
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {task.status === 'pending' && !isSkipped && (
                          <Button size="sm" variant="outline" onClick={() => handleSafetyCheck(task.id)}>
                            <Shield className="h-4 w-4 mr-1" />
                            Run Safety Check
                          </Button>
                        )}

                        {task.status === 'awaiting_approval' && canUserApprove(task) && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => handleApprove(task.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleReject(task.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}

                        {task.status === 'approved' && (
                          <Button size="sm" onClick={() => handleExecute(task.id)}>
                            <Play className="h-4 w-4 mr-1" />
                            Execute
                          </Button>
                        )}

                        {task.status === 'failed' && (task.retryCount || 0) < (task.maxRetries || 3) && (
                          <Button size="sm" variant="outline" onClick={() => handleRetry(task.id)}>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Retry ({(task.retryCount || 0) + 1}/{task.maxRetries || 3})
                          </Button>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Footer Actions */}
      <CardFooter className="pt-0 flex gap-2 flex-wrap">
        {awaitingApproval.length > 1 && (
          <Button onClick={handleApproveAllSafe} variant="outline" className="flex-1">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Approve All Safe Tasks
          </Button>
        )}
        {tasks.some(t => t.status === 'approved') && !isAutoExecuting && (
          <Button onClick={handleAutoExecute} className="flex-1">
            <Zap className="h-4 w-4 mr-2" />
            Execute All Approved
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
