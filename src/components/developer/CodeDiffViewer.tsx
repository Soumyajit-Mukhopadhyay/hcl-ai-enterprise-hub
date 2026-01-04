import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, FileCode, GitCompare, Play } from 'lucide-react';

interface CodeChange {
  id: string;
  filePath: string;
  originalCode: string | null;
  proposedCode: string;
  changeReason: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface CodeDiffViewerProps {
  change: CodeChange;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRun?: (id: string) => void;
}

export function CodeDiffViewer({ change, onApprove, onReject, onRun }: CodeDiffViewerProps) {
  const renderDiff = () => {
    if (!change.originalCode) {
      return (
        <div className="space-y-2">
          <Badge className="bg-success/10 text-success border-success/30">New File</Badge>
          <pre className="text-xs font-mono bg-success/5 p-3 rounded-lg border border-success/20 overflow-x-auto">
            {change.proposedCode.split('\n').map((line, i) => (
              <div key={i} className="flex">
                <span className="text-muted-foreground w-8 flex-shrink-0 select-none">{i + 1}</span>
                <span className="text-success">+ {line}</span>
              </div>
            ))}
          </pre>
        </div>
      );
    }

    const originalLines = change.originalCode.split('\n');
    const proposedLines = change.proposedCode.split('\n');

    return (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Badge variant="outline" className="mb-2">Original</Badge>
          <pre className="text-xs font-mono bg-destructive/5 p-3 rounded-lg border border-destructive/20 overflow-x-auto max-h-[300px]">
            {originalLines.map((line, i) => (
              <div key={i} className="flex">
                <span className="text-muted-foreground w-8 flex-shrink-0 select-none">{i + 1}</span>
                <span className="text-destructive/80">- {line}</span>
              </div>
            ))}
          </pre>
        </div>
        <div>
          <Badge variant="outline" className="mb-2">Proposed</Badge>
          <pre className="text-xs font-mono bg-success/5 p-3 rounded-lg border border-success/20 overflow-x-auto max-h-[300px]">
            {proposedLines.map((line, i) => (
              <div key={i} className="flex">
                <span className="text-muted-foreground w-8 flex-shrink-0 select-none">{i + 1}</span>
                <span className="text-success">+ {line}</span>
              </div>
            ))}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileCode className="h-4 w-4 text-secondary" />
              <code className="font-mono text-sm">{change.filePath}</code>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{change.changeReason}</p>
          </div>
          <Badge className={
            change.status === 'approved' ? 'bg-success/10 text-success border-success/30' :
            change.status === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/30' :
            'bg-warning/10 text-warning border-warning/30'
          }>
            {change.status.charAt(0).toUpperCase() + change.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          {renderDiff()}
        </ScrollArea>
        
        {change.status === 'pending' && (
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onApprove(change.id)}
            >
              <Check className="h-4 w-4 mr-1" />
              Approve & Apply
            </Button>
            {onRun && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRun(change.id)}
              >
                <Play className="h-4 w-4 mr-1" />
                Test Run
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(change.id)}
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CodeDiffPanelProps {
  changes: CodeChange[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRun?: (id: string) => void;
}

export function CodeDiffPanel({ changes, onApprove, onReject, onRun }: CodeDiffPanelProps) {
  const pendingChanges = changes.filter(c => c.status === 'pending');

  if (pendingChanges.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8 text-center">
          <GitCompare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No pending code changes</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pendingChanges.map((change) => (
        <CodeDiffViewer
          key={change.id}
          change={change}
          onApprove={onApprove}
          onReject={onReject}
          onRun={onRun}
        />
      ))}
    </div>
  );
}
