import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest,
  Play,
  Pause,
  RotateCcw,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileCode,
  FolderGit2,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw
} from 'lucide-react';

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  staged: string[];
  untracked: string[];
  hasChanges: boolean;
}

interface ExecutionLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

export function GitHubIntegrationPanel() {
  const [isConnected, setIsConnected] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gitStatus, setGitStatus] = useState<GitStatus>({
    branch: 'main',
    ahead: 2,
    behind: 0,
    modified: ['src/pages/Index.tsx', 'src/App.tsx'],
    staged: [],
    untracked: ['src/components/new-feature.tsx'],
    hasChanges: true
  });
  const [logs, setLogs] = useState<ExecutionLog[]>([
    { id: '1', timestamp: new Date(Date.now() - 60000), type: 'info', message: 'Starting fix loop...' },
    { id: '2', timestamp: new Date(Date.now() - 55000), type: 'info', message: 'Running type check...' },
    { id: '3', timestamp: new Date(Date.now() - 50000), type: 'error', message: 'Found 3 type errors' },
    { id: '4', timestamp: new Date(Date.now() - 45000), type: 'info', message: 'AI analyzing errors...' },
    { id: '5', timestamp: new Date(Date.now() - 30000), type: 'success', message: 'Applied 2 fixes' },
    { id: '6', timestamp: new Date(Date.now() - 20000), type: 'info', message: 'Running type check...' },
    { id: '7', timestamp: new Date(Date.now() - 10000), type: 'success', message: 'All checks passed!' },
  ]);
  const [commitMessage, setCommitMessage] = useState('');

  const addLog = (type: ExecutionLog['type'], message: string) => {
    setLogs(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: new Date(),
      type,
      message
    }]);
  };

  const handleStartFixLoop = () => {
    setIsRunning(true);
    setIsPaused(false);
    addLog('info', 'Starting AI fix loop...');
    
    // Simulate fix loop
    setTimeout(() => addLog('info', 'Running type check...'), 1000);
    setTimeout(() => addLog('warning', 'Found 2 type errors'), 2000);
    setTimeout(() => addLog('info', 'AI analyzing errors...'), 3000);
    setTimeout(() => addLog('success', 'Proposed fix for src/App.tsx'), 4000);
    setTimeout(() => {
      addLog('success', 'All checks passed!');
      setIsRunning(false);
    }, 6000);
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    addLog('info', isPaused ? 'Resumed fix loop' : 'Paused fix loop');
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    addLog('warning', 'Fix loop stopped by user');
  };

  const handlePull = () => {
    addLog('info', 'Pulling latest changes...');
    setTimeout(() => {
      addLog('success', 'Already up to date');
      setGitStatus(prev => ({ ...prev, behind: 0 }));
    }, 1500);
  };

  const handlePush = () => {
    addLog('info', 'Pushing changes...');
    setTimeout(() => {
      addLog('success', 'Pushed 2 commits');
      setGitStatus(prev => ({ ...prev, ahead: 0 }));
    }, 2000);
  };

  const handleCommit = () => {
    if (!commitMessage.trim()) return;
    addLog('info', `Creating commit: "${commitMessage}"`);
    setTimeout(() => {
      addLog('success', 'Commit created successfully');
      setGitStatus(prev => ({
        ...prev,
        modified: [],
        staged: [],
        ahead: prev.ahead + 1
      }));
      setCommitMessage('');
    }, 1000);
  };

  const getLogIcon = (type: ExecutionLog['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderGit2 className="h-5 w-5 text-primary" />
              GitHub Integration
            </CardTitle>
            <Badge 
              variant={isConnected ? "default" : "destructive"}
              className={isConnected ? "bg-green-500" : ""}
            >
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <CardDescription>
            Real-time code sync with GitHub repository
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-lg bg-muted">
              <GitBranch className="h-5 w-5 mx-auto text-purple-500 mb-1" />
              <p className="text-sm font-medium">{gitStatus.branch}</p>
              <p className="text-xs text-muted-foreground">Branch</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <ArrowUpCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
              <p className="text-sm font-medium">{gitStatus.ahead}</p>
              <p className="text-xs text-muted-foreground">Ahead</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <ArrowDownCircle className="h-5 w-5 mx-auto text-orange-500 mb-1" />
              <p className="text-sm font-medium">{gitStatus.behind}</p>
              <p className="text-xs text-muted-foreground">Behind</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <FileCode className="h-5 w-5 mx-auto text-blue-500 mb-1" />
              <p className="text-sm font-medium">{gitStatus.modified.length}</p>
              <p className="text-xs text-muted-foreground">Modified</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Fix Loop Control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            AI Fix Loop
          </CardTitle>
          <CardDescription>
            Automatic error detection and fixing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {!isRunning ? (
              <Button onClick={handleStartFixLoop} className="gap-2">
                <Play className="h-4 w-4" />
                Start Fix Loop
              </Button>
            ) : (
              <>
                <Button onClick={handlePauseResume} variant="outline" className="gap-2">
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button onClick={handleStop} variant="destructive" className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Stop
                </Button>
              </>
            )}
            <Button variant="outline" onClick={handlePull} className="gap-2">
              <ArrowDownCircle className="h-4 w-4" />
              Pull
            </Button>
            <Button variant="outline" onClick={handlePush} className="gap-2" disabled={gitStatus.ahead === 0}>
              <ArrowUpCircle className="h-4 w-4" />
              Push
            </Button>
          </div>

          {isRunning && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <RefreshCw className="h-4 w-4 text-primary animate-spin" />
              <span className="text-sm font-medium">
                {isPaused ? 'Fix loop paused...' : 'Running AI fix loop...'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Changes and Logs */}
      <Card>
        <Tabs defaultValue="logs">
          <CardHeader className="pb-0">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="logs" className="gap-2">
                <Terminal className="h-4 w-4" />
                Execution Logs
              </TabsTrigger>
              <TabsTrigger value="changes" className="gap-2">
                <FileCode className="h-4 w-4" />
                File Changes
              </TabsTrigger>
              <TabsTrigger value="commit" className="gap-2">
                <GitCommit className="h-4 w-4" />
                Commit
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <CardContent className="pt-4">
            <TabsContent value="logs" className="m-0">
              <ScrollArea className="h-[300px] rounded-lg border bg-muted/50 p-3">
                <div className="space-y-2 font-mono text-xs">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-start gap-2">
                      <span className="text-muted-foreground shrink-0">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      {getLogIcon(log.type)}
                      <span className={
                        log.type === 'error' ? 'text-red-500' :
                        log.type === 'success' ? 'text-green-500' :
                        log.type === 'warning' ? 'text-yellow-500' :
                        'text-foreground'
                      }>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="changes" className="m-0">
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {gitStatus.modified.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-yellow-600 flex items-center gap-2">
                        <FileCode className="h-4 w-4" />
                        Modified ({gitStatus.modified.length})
                      </h4>
                      <div className="space-y-1">
                        {gitStatus.modified.map(file => (
                          <div key={file} className="text-sm text-muted-foreground pl-6">
                            {file}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {gitStatus.staged.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-green-600 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Staged ({gitStatus.staged.length})
                      </h4>
                      <div className="space-y-1">
                        {gitStatus.staged.map(file => (
                          <div key={file} className="text-sm text-muted-foreground pl-6">
                            {file}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {gitStatus.untracked.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Untracked ({gitStatus.untracked.length})
                      </h4>
                      <div className="space-y-1">
                        {gitStatus.untracked.map(file => (
                          <div key={file} className="text-sm text-muted-foreground pl-6">
                            {file}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!gitStatus.hasChanges && (
                    <p className="text-center text-muted-foreground py-8">
                      No changes in working directory
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="commit" className="m-0 space-y-4">
              <div>
                <Label htmlFor="commit-msg">Commit Message</Label>
                <Input
                  id="commit-msg"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="feat: add new feature..."
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleCommit} 
                  disabled={!commitMessage.trim() || !gitStatus.hasChanges}
                  className="gap-2"
                >
                  <GitCommit className="h-4 w-4" />
                  Commit All
                </Button>
                <Button variant="outline" disabled={!gitStatus.hasChanges} className="gap-2">
                  <GitPullRequest className="h-4 w-4" />
                  Create PR
                </Button>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* CLI Instructions */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            CLI Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-xs space-y-1 text-muted-foreground">
            <p>$ cd cli && npm install</p>
            <p>$ npm run build && npm link</p>
            <p>$ hcl-dev fix --watch</p>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            The CLI tool provides real GitHub integration with automatic error fixing, 
            push/pull, and continuous monitoring.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
