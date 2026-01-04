import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Brain,
  TrendingUp,
  AlertCircle,
  Sparkles,
  BarChart3
} from 'lucide-react';

interface LearnedPattern {
  id: string;
  type: string;
  description: string;
  confidence: number;
  usageCount: number;
  successRate: number;
}

interface FeedbackLearningPanelProps {
  patterns: LearnedPattern[];
  onFeedback: (messageId: string, type: 'positive' | 'negative', correction?: string) => void;
  currentMessageId?: string;
  learningEnabled: boolean;
  onToggleLearning: (enabled: boolean) => void;
}

export function FeedbackLearningPanel({
  patterns,
  onFeedback,
  currentMessageId,
  learningEnabled,
  onToggleLearning
}: FeedbackLearningPanelProps) {
  const [showCorrection, setShowCorrection] = useState(false);
  const [correction, setCorrection] = useState('');

  const handleNegativeFeedback = () => {
    if (showCorrection && correction && currentMessageId) {
      onFeedback(currentMessageId, 'negative', correction);
      setCorrection('');
      setShowCorrection(false);
    } else {
      setShowCorrection(true);
    }
  };

  const topPatterns = patterns
    .filter(p => p.confidence > 0.7)
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 5);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Learning & Feedback
          </CardTitle>
          <Button
            variant={learningEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleLearning(!learningEnabled)}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            {learningEnabled ? 'Learning On' : 'Learning Off'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Feedback */}
        {currentMessageId && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Was this response helpful?</p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onFeedback(currentMessageId, 'positive')}
                className="flex-1"
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Yes
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleNegativeFeedback}
                className="flex-1"
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                No
              </Button>
            </div>
            
            {showCorrection && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  What would have been a better response?
                </p>
                <Textarea
                  value={correction}
                  onChange={(e) => setCorrection(e.target.value)}
                  placeholder="Describe the expected response..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleNegativeFeedback}>
                    Submit Feedback
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setShowCorrection(false);
                      setCorrection('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Learned Patterns */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Top Learned Patterns
            </p>
            <Badge variant="outline">{patterns.length} total</Badge>
          </div>
          
          <div className="space-y-2">
            {topPatterns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No patterns learned yet. Keep using the AI to build patterns!
              </p>
            ) : (
              topPatterns.map((pattern) => (
                <div 
                  key={pattern.id}
                  className="p-2 border rounded-lg text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{pattern.type}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {Math.round(pattern.confidence * 100)}% confident
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {pattern.usageCount} uses
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    {pattern.description}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    <BarChart3 className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {Math.round(pattern.successRate * 100)}% success rate
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Safety Notice */}
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-yellow-600">Safe Learning Enabled</p>
              <p className="text-muted-foreground mt-1">
                All learned patterns are validated for safety before being applied. 
                Harmful patterns are automatically blocked and reported.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
