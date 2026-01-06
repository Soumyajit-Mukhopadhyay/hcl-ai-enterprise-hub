import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mic, 
  MicOff,
  Wand2,
  Lightbulb,
  Sparkles,
  TrendingUp,
  Clock,
  Calendar,
  Zap,
  Brain,
  MessageSquare,
  Target,
  ArrowRight,
  RefreshCw,
  History,
  Star,
  ThumbsUp
} from 'lucide-react';

interface PredictiveAction {
  id: string;
  action: string;
  confidence: number;
  category: string;
  timeEstimate: string;
  impact: 'low' | 'medium' | 'high';
}

interface ContextualSuggestion {
  id: string;
  title: string;
  description: string;
  type: 'optimization' | 'reminder' | 'insight' | 'action';
  priority: number;
}

interface VoiceCommand {
  phrase: string;
  action: string;
  example: string;
}

export function InnovativeFeaturesPanel() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [predictiveActions, setPredictiveActions] = useState<PredictiveAction[]>([
    {
      id: '1',
      action: 'Run daily code review',
      confidence: 92,
      category: 'Development',
      timeEstimate: '~5 min',
      impact: 'medium'
    },
    {
      id: '2',
      action: 'Process pending leave requests',
      confidence: 87,
      category: 'HR',
      timeEstimate: '~3 min',
      impact: 'high'
    },
    {
      id: '3',
      action: 'Sync Git repository',
      confidence: 78,
      category: 'DevOps',
      timeEstimate: '~1 min',
      impact: 'low'
    },
    {
      id: '4',
      action: 'Generate weekly report',
      confidence: 85,
      category: 'Analytics',
      timeEstimate: '~2 min',
      impact: 'medium'
    }
  ]);

  const [suggestions, setSuggestions] = useState<ContextualSuggestion[]>([
    {
      id: '1',
      title: 'Optimize Task Queue',
      description: 'You have 5 similar tasks that could be batched for faster processing',
      type: 'optimization',
      priority: 1
    },
    {
      id: '2',
      title: 'Upcoming Deadline',
      description: 'Code review for PR #234 is due in 2 hours',
      type: 'reminder',
      priority: 2
    },
    {
      id: '3',
      title: 'Performance Insight',
      description: 'Response times improved 23% after last learning session',
      type: 'insight',
      priority: 3
    },
    {
      id: '4',
      title: 'Quick Action Available',
      description: 'Approve all low-risk deployments with one click',
      type: 'action',
      priority: 4
    }
  ]);

  const voiceCommands: VoiceCommand[] = [
    { phrase: 'Hey AI, check my tasks', action: 'list_tasks', example: '"Show me my pending tasks"' },
    { phrase: 'Approve all safe tasks', action: 'bulk_approve', example: '"Approve all low-risk items"' },
    { phrase: 'Run code analysis', action: 'code_analysis', example: '"Analyze the auth module"' },
    { phrase: 'Schedule meeting', action: 'schedule_meeting', example: '"Schedule standup for tomorrow"' },
    { phrase: 'Generate report', action: 'generate_report', example: '"Create weekly summary"' },
    { phrase: 'Search for', action: 'web_search', example: '"Search for React best practices"' }
  ];

  const handleVoiceToggle = () => {
    if (!voiceEnabled) {
      setVoiceEnabled(true);
      // In a real implementation, we'd use Web Speech API here
    } else {
      setVoiceEnabled(false);
      setIsListening(false);
    }
  };

  const startListening = () => {
    if (!voiceEnabled) return;
    setIsListening(true);
    // Simulated voice recognition
    setTimeout(() => {
      setVoiceTranscript('Show me pending approvals');
      setIsListening(false);
    }, 2000);
  };

  const executeAction = (action: PredictiveAction) => {
    console.log('Executing action:', action);
    // Would trigger the AI to execute the predicted action
    setPredictiveActions(prev => prev.filter(a => a.id !== action.id));
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'low': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default: return '';
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'optimization': return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'reminder': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'insight': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'action': return <Target className="h-4 w-4 text-purple-500" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Voice Commands */}
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" />
                Voice Commands
              </CardTitle>
              <CardDescription>Control the AI with your voice</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={voiceEnabled} onCheckedChange={handleVoiceToggle} />
              <span className="text-sm text-muted-foreground">
                {voiceEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant={isListening ? 'destructive' : 'default'}
              size="lg"
              className="rounded-full h-16 w-16"
              onClick={startListening}
              disabled={!voiceEnabled}
            >
              {isListening ? (
                <MicOff className="h-6 w-6 animate-pulse" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>
            <div className="flex-1">
              {isListening ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-8 bg-primary rounded animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-6 bg-primary rounded animate-pulse" style={{ animationDelay: '100ms' }} />
                    <div className="w-2 h-10 bg-primary rounded animate-pulse" style={{ animationDelay: '200ms' }} />
                    <div className="w-2 h-4 bg-primary rounded animate-pulse" style={{ animationDelay: '300ms' }} />
                    <div className="w-2 h-8 bg-primary rounded animate-pulse" style={{ animationDelay: '400ms' }} />
                  </div>
                  <span className="text-sm text-muted-foreground">Listening...</span>
                </div>
              ) : voiceTranscript ? (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-sm font-medium">Recognized:</p>
                  <p className="text-sm text-muted-foreground">{voiceTranscript}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {voiceEnabled ? 'Click the mic to start speaking' : 'Enable voice to use commands'}
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Available Commands</p>
            <div className="grid grid-cols-2 gap-2">
              {voiceCommands.slice(0, 4).map((cmd, i) => (
                <div key={i} className="p-2 rounded-lg bg-muted/30 text-xs">
                  <p className="font-medium">{cmd.phrase}</p>
                  <p className="text-muted-foreground mt-1">{cmd.example}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predictive Actions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Predictive Actions
          </CardTitle>
          <CardDescription>AI suggests your next moves based on patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {predictiveActions.map((action) => (
                <div 
                  key={action.id}
                  className="p-3 rounded-lg border bg-gradient-to-r from-muted/50 to-transparent hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {action.category}
                        </Badge>
                        <Badge className={getImpactColor(action.impact)}>
                          {action.impact} impact
                        </Badge>
                      </div>
                      <p className="font-medium">{action.action}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Brain className="h-3 w-3" />
                          {action.confidence}% confident
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {action.timeEstimate}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => executeAction(action)}>
                      <Zap className="h-4 w-4 mr-1" />
                      Execute
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Contextual Suggestions */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Smart Suggestions
              </CardTitle>
              <CardDescription>Context-aware recommendations</CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <div 
                key={suggestion.id}
                className="p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  {getSuggestionIcon(suggestion.type)}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{suggestion.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {suggestion.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Your AI Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <Star className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">94%</p>
              <p className="text-xs text-muted-foreground">Task Success Rate</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">2.3s</p>
              <p className="text-xs text-muted-foreground">Avg Response Time</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <History className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">127</p>
              <p className="text-xs text-muted-foreground">Tasks Automated</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <ThumbsUp className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-600">89%</p>
              <p className="text-xs text-muted-foreground">Satisfaction Score</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
