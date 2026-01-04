import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  FileCode,
  GitCompare,
  Shield
} from 'lucide-react';

export interface CodeChange {
  id: string;
  filePath: string;
  originalCode: string;
  proposedCode: string;
  changeReason: string;
  riskLevel: 'low' | 'medium' | 'high';
  safetyScore: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface ApprovalWorkflowPanelProps {
  changes: CodeChange[];
  onApprove: (changeId: string) => void;
  onReject: (changeId: string, reason?: string) => void;
  onApproveAll: () => void;
  onRejectAll: () => void;
}

export function ApprovalWorkflowPanel({
  changes,
  onApprove,
  onReject,
  onApproveAll,
  onRejectAll
}: ApprovalWorkflowPanelProps) {
  const [selectedChange, setSelectedChange] = useState<string | null>(
    changes.length > 0 ? changes[0].id : null
  );
  const [showDiff, setShowDiff] = useState(true);

  const currentChange = changes.find(c => c.id === selectedChange);
  const pendingCount = changes.filter(c => c.status === 'pending').length;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'high': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return '';
    }
  };

  const renderDiff = (original: string, proposed: string) => {
    const originalLines = original.split('\n');
    const proposedLines = proposed.split('\n');
    
    return (
      <div className="font-mono text-xs">
        {showDiff ? (
          <div className="space-y-0.5">
            {originalLines.map((line, i) => (
              <div key={`old-${i}`} className="bg-red-500/10 text-red-600 px-2 py-0.5">
                - {line}
              </div>
            ))}
            {proposedLines.map((line, i) => (
              <div key={`new-${i}`} className="bg-green-500/10 text-green-600 px-2 py-0.5">
                + {line}
              </div>
            ))}
          </div>
        ) : (
          <pre className="bg-muted p-3 rounded overflow-x-auto">
            {proposed}
          </pre>
        )}
      </div>
    );
  };

  return (
    <Card className="border-primary/20 h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            Code Review & Approval
          </CardTitle>
          <Badge variant="outline">
            {pendingCount} pending review
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex gap-4 min-h-0">
        {/* File list */}
        <div className="w-1/3 border-r pr-4">
          <p className="text-sm font-medium mb-2">Changed Files</p>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {changes.map((change) => (
                <button
                  key={change.id}
                  onClick={() => setSelectedChange(change.id)}
                  className={`w-full text-left p-2 rounded-lg border transition-colors ${
                    selectedChange === change.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-transparent hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate flex-1">
                      {change.filePath.split('/').pop()}
                    </span>
                    {change.status === 'pending' && (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    {change.status === 'approved' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {change.status === 'rejected' && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {change.filePath}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Change details */}
        <div className="flex-1 min-w-0">
          {currentChange ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium">{currentChange.filePath}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentChange.changeReason}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getRiskColor(currentChange.riskLevel)}>
                    {currentChange.riskLevel} risk
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {Math.round(currentChange.safetyScore * 100)}%
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDiff(!showDiff)}
                  >
                    {showDiff ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="changes" className="flex-1">
                <TabsList>
                  <TabsTrigger value="changes">Changes</TabsTrigger>
                  <TabsTrigger value="original">Original</TabsTrigger>
                  <TabsTrigger value="proposed">Proposed</TabsTrigger>
                </TabsList>
                
                <TabsContent value="changes" className="mt-2">
                  <ScrollArea className="h-[200px] border rounded-lg">
                    {renderDiff(currentChange.originalCode, currentChange.proposedCode)}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="original" className="mt-2">
                  <ScrollArea className="h-[200px] border rounded-lg">
                    <pre className="p-3 text-xs font-mono">
                      {currentChange.originalCode || '(New file)'}
                    </pre>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="proposed" className="mt-2">
                  <ScrollArea className="h-[200px] border rounded-lg">
                    <pre className="p-3 text-xs font-mono">
                      {currentChange.proposedCode}
                    </pre>
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              {currentChange.status === 'pending' && (
                <div className="flex gap-2 mt-4">
                  <Button 
                    onClick={() => onApprove(currentChange.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve Change
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => onReject(currentChange.id)}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select a file to review changes
            </div>
          )}
        </div>
      </CardContent>
      
      {pendingCount > 1 && (
        <CardFooter className="border-t pt-4">
          <div className="flex gap-2 w-full">
            <Button 
              onClick={onApproveAll} 
              className="flex-1"
              variant="outline"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve All ({pendingCount})
            </Button>
            <Button 
              onClick={onRejectAll}
              variant="outline"
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject All
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
