import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Wrench,
  CheckCircle2,
  Clock,
  BarChart3,
  Shield,
  Zap
} from 'lucide-react';

interface Tool {
  name: string;
  description: string;
  category: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  usageCount: number;
  successRate: number;
  isEnabled: boolean;
}

interface ToolRegistryPanelProps {
  tools: Tool[];
  activeTool?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  file: <Wrench className="h-4 w-4" />,
  code: <Zap className="h-4 w-4" />,
  git: <CheckCircle2 className="h-4 w-4" />,
  analysis: <BarChart3 className="h-4 w-4" />,
  execution: <Clock className="h-4 w-4" />,
  search: <Shield className="h-4 w-4" />
};

const riskColors = {
  low: 'bg-green-500/10 text-green-600',
  medium: 'bg-yellow-500/10 text-yellow-600',
  high: 'bg-red-500/10 text-red-600'
};

export function ToolRegistryPanel({ tools, activeTool }: ToolRegistryPanelProps) {
  const groupedTools = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = [];
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Available Tools
          </CardTitle>
          <Badge variant="outline">{tools.length} tools</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {Object.entries(groupedTools).map(([category, categoryTools]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-2">
              {categoryIcons[category] || <Wrench className="h-4 w-4" />}
              <span className="text-sm font-medium capitalize">{category}</span>
              <Badge variant="secondary" className="text-xs">
                {categoryTools.length}
              </Badge>
            </div>
            
            <div className="grid gap-2 ml-6">
              {categoryTools.map((tool) => (
                <div 
                  key={tool.name}
                  className={`p-2 rounded-lg border text-sm transition-colors ${
                    activeTool === tool.name 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  } ${!tool.isEnabled ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{tool.name}</span>
                      {tool.requiresApproval && (
                        <Badge variant="outline" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          approval
                        </Badge>
                      )}
                    </div>
                    <Badge className={`text-xs ${riskColors[tool.riskLevel]}`}>
                      {tool.riskLevel}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    {tool.description}
                  </p>
                  
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {tool.usageCount} uses
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Success</span>
                        <span>{Math.round(tool.successRate * 100)}%</span>
                      </div>
                      <Progress value={tool.successRate * 100} className="h-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
