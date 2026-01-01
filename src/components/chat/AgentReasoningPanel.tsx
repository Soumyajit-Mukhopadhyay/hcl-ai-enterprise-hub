import { useState } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Brain, 
  CheckCircle2, 
  Circle, 
  Loader2,
  AlertCircle,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { AgentNode, AgentNodeStatus } from '@/types/agent';

interface AgentReasoningPanelProps {
  nodes: AgentNode[];
  isProcessing: boolean;
}

const defaultNodes: AgentNode[] = [
  { id: 'intent', name: 'Intent Router', description: 'Classifying user intent', status: 'pending' },
  { id: 'auth', name: 'Auth & RBAC', description: 'Verifying permissions', status: 'pending' },
  { id: 'retrieve', name: 'RAG Retrieval', description: 'Searching knowledge base', status: 'pending' },
  { id: 'planner', name: 'Planner', description: 'Planning execution steps', status: 'pending' },
  { id: 'tool', name: 'Tool Selector', description: 'Selecting appropriate tools', status: 'pending' },
  { id: 'validator', name: 'Schema Validator', description: 'Validating JSON schema', status: 'pending' },
  { id: 'executor', name: 'Executor', description: 'Executing action', status: 'pending' },
  { id: 'summarizer', name: 'Summarizer', description: 'Generating response', status: 'pending' },
];

export function AgentReasoningPanel({ nodes = defaultNodes, isProcessing }: AgentReasoningPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const completedNodes = nodes.filter(n => n.status === 'complete').length;
  const progress = (completedNodes / nodes.length) * 100;

  const getStatusIcon = (status: AgentNodeStatus) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'active':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground/30" />;
    }
  };

  const getNodeClass = (status: AgentNodeStatus) => {
    switch (status) {
      case 'complete':
        return 'agent-node-complete';
      case 'active':
        return 'agent-node-active';
      case 'error':
        return 'border-destructive bg-destructive/10';
      default:
        return 'agent-node-pending';
    }
  };

  return (
    <div className={cn(
      "h-full bg-card border-l border-border flex flex-col transition-all duration-300",
      isExpanded ? "w-80" : "w-12"
    )}>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute right-full top-4 z-10 bg-card border border-border rounded-l-lg rounded-r-none h-10 w-6 hover:bg-muted"
      >
        {isExpanded ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </Button>

      {isExpanded ? (
        <>
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-gradient-primary text-white">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Agent Reasoning</h3>
                <p className="text-xs text-muted-foreground">Glass Box View</p>
              </div>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Processing</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
          </div>

          {/* Nodes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {nodes.map((node, index) => (
              <Card
                key={node.id}
                className={cn(
                  "agent-node p-3 animate-slide-right",
                  getNodeClass(node.status)
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(node.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{node.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {node.description}
                    </p>
                  </div>
                  {node.status === 'active' && (
                    <Zap className="w-4 h-4 text-primary animate-pulse" />
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Footer Stats */}
          <div className="p-4 border-t border-border">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-success/10">
                <p className="text-lg font-bold text-success">{completedNodes}</p>
                <p className="text-[10px] text-muted-foreground">Complete</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <p className="text-lg font-bold text-primary">
                  {nodes.filter(n => n.status === 'active').length}
                </p>
                <p className="text-[10px] text-muted-foreground">Active</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <p className="text-lg font-bold text-muted-foreground">
                  {nodes.filter(n => n.status === 'pending').length}
                </p>
                <p className="text-[10px] text-muted-foreground">Pending</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center py-4 gap-2">
          <Brain className="w-5 h-5 text-primary" />
          {isProcessing && (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          )}
        </div>
      )}
    </div>
  );
}
