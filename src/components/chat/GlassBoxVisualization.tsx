import { useEffect, useState } from 'react';
import { Brain, CheckCircle, Loader2, AlertCircle, ArrowRight, Zap, Shield, Database, Search, FileCheck, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AgentNode, AgentNodeStatus } from '@/types/agent';

interface GlassBoxVisualizationProps {
  nodes: AgentNode[];
  isProcessing: boolean;
}

const nodeIcons: Record<string, React.ElementType> = {
  intent: Brain,
  auth: Shield,
  retrieve: Database,
  planner: Zap,
  tool: Search,
  validator: FileCheck,
  summarizer: MessageSquare,
};

const nodeColors: Record<AgentNodeStatus, string> = {
  pending: 'border-muted-foreground/30 bg-muted/30',
  active: 'border-primary bg-primary/10 shadow-glow',
  complete: 'border-success bg-success/10',
  error: 'border-destructive bg-destructive/10',
};

const iconColors: Record<AgentNodeStatus, string> = {
  pending: 'text-muted-foreground',
  active: 'text-primary animate-pulse',
  complete: 'text-success',
  error: 'text-destructive',
};

export function GlassBoxVisualization({ nodes, isProcessing }: GlassBoxVisualizationProps) {
  const [animatedNodes, setAnimatedNodes] = useState<AgentNode[]>(nodes);

  useEffect(() => {
    setAnimatedNodes(nodes);
  }, [nodes]);

  const getNodeIcon = (node: AgentNode) => {
    const IconComponent = nodeIcons[node.id] || Brain;
    return IconComponent;
  };

  const getStatusIndicator = (status: AgentNodeStatus) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'active':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  const activeNodeIndex = animatedNodes.findIndex(n => n.status === 'active');
  const progress = animatedNodes.filter(n => n.status === 'complete').length / animatedNodes.length * 100;

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Glass Box: Agent Reasoning
          </CardTitle>
          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-primary">
              <Loader2 className="w-3 h-3 animate-spin" />
              Processing
            </div>
          )}
        </div>
        {/* Progress Bar */}
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Node Flow */}
        <div className="relative">
          {animatedNodes.map((node, index) => {
            const Icon = getNodeIcon(node);
            const isLast = index === animatedNodes.length - 1;
            
            return (
              <div key={node.id} className="relative">
                {/* Connection Line */}
                {!isLast && (
                  <div className="absolute left-5 top-12 w-0.5 h-8 bg-gradient-to-b from-border to-transparent" />
                )}
                
                <div
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border-2 transition-all duration-300 mb-2",
                    nodeColors[node.status],
                    node.status === 'active' && "scale-[1.02]"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    node.status === 'active' ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Icon className={cn("w-5 h-5", iconColors[node.status])} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{node.name}</span>
                      {getStatusIndicator(node.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{node.description}</p>
                    
                    {/* Timing info */}
                    {node.status === 'complete' && node.startTime && node.endTime && (
                      <div className="text-xs text-success mt-1">
                        ✓ {(node.endTime.getTime() - node.startTime.getTime())}ms
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary when complete */}
        {!isProcessing && animatedNodes.every(n => n.status === 'complete') && (
          <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/30">
            <div className="flex items-center gap-2 text-success text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              All reasoning steps completed
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
