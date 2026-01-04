import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  SkipForward
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface Task {
  id: string;
  order: number;
  type: string;
  description: string;
  status: 'pending' | 'awaiting_approval' | 'approved' | 'executing' | 'completed' | 'failed' | 'rejected';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  proposedChanges?: any;
  executionResult?: any;
  errorMessage?: string;
  dependencies?: number[];
}

interface TaskDecompositionPanelProps {
  tasks: Task[];
  onApprove: (taskId: string) => void;
  onReject: (taskId: string) => void;
  onApproveAll: () => void;
  onExecute: (taskId: string) => void;
  onPause: () => void;
  isPaused: boolean;
  isExecuting: boolean;
}

const statusIcons = {
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  awaiting_approval: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  approved: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  executing: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  rejected: <XCircle className="h-4 w-4 text-orange-500" />
};

const riskColors = {
  low: 'bg-green-500/10 text-green-600 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-600 border-red-500/20'
};

export function TaskDecompositionPanel({
  tasks,
  onApprove,
  onReject,
  onApproveAll,
  onExecute,
  onPause,
  isPaused,
  isExecuting
}: TaskDecompositionPanelProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
  const awaitingApproval = tasks.filter(t => t.status === 'awaiting_approval');

  const toggleExpand = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Task Execution Pipeline
          </CardTitle>
          <div className="flex items-center gap-2">
            {isExecuting && (
              <Button variant="outline" size="sm" onClick={onPause}>
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
            )}
            <Badge variant="outline">
              {completedCount}/{tasks.length} Complete
            </Badge>
          </div>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      
      <CardContent className="space-y-3">
        {tasks.map((task, index) => (
          <Collapsible 
            key={task.id} 
            open={expandedTasks.has(task.id)}
            onOpenChange={() => toggleExpand(task.id)}
          >
            <div className={`rounded-lg border p-3 transition-colors ${
              task.status === 'awaiting_approval' ? 'border-yellow-500/50 bg-yellow-500/5' :
              task.status === 'executing' ? 'border-blue-500/50 bg-blue-500/5' :
              task.status === 'failed' ? 'border-red-500/50 bg-red-500/5' :
              task.status === 'completed' ? 'border-green-500/50 bg-green-500/5' :
              'border-border'
            }`}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      #{task.order + 1}
                    </span>
                    {statusIcons[task.status]}
                    <span className="font-medium text-sm">{task.description}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={riskColors[task.riskLevel]}>
                      {task.riskLevel}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {task.type}
                    </Badge>
                    {expandedTasks.has(task.id) ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-3 pt-3 border-t">
                {task.proposedChanges && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-2">Proposed Changes:</p>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40">
                      {JSON.stringify(task.proposedChanges, null, 2)}
                    </pre>
                  </div>
                )}
                
                {task.errorMessage && (
                  <div className="mb-3 p-2 bg-red-500/10 rounded text-red-600 text-sm">
                    {task.errorMessage}
                  </div>
                )}
                
                {task.executionResult && (
                  <div className="mb-3 p-2 bg-green-500/10 rounded text-green-600 text-sm">
                    Execution successful
                  </div>
                )}
                
                {task.status === 'awaiting_approval' && (
                  <div className="flex gap-2 mt-2">
                    <Button 
                      size="sm" 
                      onClick={() => onApprove(task.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => onReject(task.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
                
                {task.status === 'approved' && !isExecuting && (
                  <Button 
                    size="sm" 
                    onClick={() => onExecute(task.id)}
                    className="mt-2"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Execute
                  </Button>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </CardContent>
      
      {awaitingApproval.length > 1 && (
        <CardFooter className="pt-0">
          <Button onClick={onApproveAll} className="w-full" variant="outline">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Approve All {awaitingApproval.length} Tasks
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
