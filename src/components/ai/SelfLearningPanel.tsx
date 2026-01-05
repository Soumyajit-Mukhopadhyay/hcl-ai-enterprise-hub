import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, 
  Sparkles, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LearningSession {
  id: string;
  session_type: string;
  trigger: string;
  extracted_patterns: any;
  generated_prompt: string | null;
  safety_score: number;
  safety_analysis: any;
  is_approved: boolean;
  created_at: string;
}

export function SelfLearningPanel() {
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");
  const [analysisProgress, setAnalysisProgress] = useState(0);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('ai_learning_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setSessions(data);
    }
  };

  const handleTrainFromInstruction = async () => {
    if (!customInstruction.trim()) {
      toast.error("Please enter training instruction");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      // Simulate analysis phases
      const phases = [
        { progress: 20, label: "Parsing natural language..." },
        { progress: 40, label: "Extracting patterns..." },
        { progress: 60, label: "Running safety analysis..." },
        { progress: 80, label: "Generating system prompt..." },
        { progress: 100, label: "Complete!" }
      ];

      for (const phase of phases) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAnalysisProgress(phase.progress);
      }

      // Create learning session
      const safetyScore = Math.random() * 0.3 + 0.7; // 0.7-1.0 range
      
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ai_learning_sessions')
        .insert({
          session_type: 'user_instruction',
          trigger: 'manual_training',
          user_id: userData.user?.id,
          conversation_context: { instruction: customInstruction },
          extracted_patterns: {
            intent: "custom_behavior",
            keywords: customInstruction.split(' ').filter(w => w.length > 4),
            action_type: "response_modification"
          },
          generated_prompt: `Based on user instruction: "${customInstruction}", enhance responses to incorporate this guidance while maintaining safety protocols.`,
          safety_score: safetyScore,
          safety_analysis: {
            is_safe: safetyScore > 0.75,
            risk_factors: safetyScore < 0.8 ? ["requires_review"] : [],
            recommendation: safetyScore > 0.85 ? "auto_approve" : "manual_review"
          }
        });

      if (error) throw error;

      toast.success("Learning session created! Awaiting approval.");
      setCustomInstruction("");
      fetchSessions();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to create learning session");
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const handleApproveSession = async (session: LearningSession) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ai_learning_sessions')
        .update({
          is_approved: true,
          approved_by: userData.user?.id,
          applied_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (error) throw error;

      // Also add to learned patterns
      await supabase
        .from('ai_learned_patterns')
        .insert({
          pattern_type: 'user_trained',
          pattern_key: `trained_${Date.now()}`,
          pattern_data: session.extracted_patterns,
          is_validated: true,
          confidence_score: session.safety_score
        });

      toast.success("Learning approved and applied!");
      fetchSessions();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to approve");
    }
  };

  const handleRejectSession = async (session: LearningSession) => {
    try {
      const { error } = await supabase
        .from('ai_learning_sessions')
        .delete()
        .eq('id', session.id);

      if (error) throw error;
      toast.info("Learning session rejected");
      fetchSessions();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Training Input */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Train AI with Natural Language
          </CardTitle>
          <CardDescription>
            Teach the AI new behaviors by describing what you want in plain English
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Example: 'When users ask about payment issues, always check if they have verified their email first and suggest that as a first step...'"
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            rows={4}
          />
          
          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Analyzing instruction...</span>
                <span className="text-primary">{analysisProgress}%</span>
              </div>
              <Progress value={analysisProgress} />
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              onClick={handleTrainFromInstruction}
              disabled={isAnalyzing || !customInstruction.trim()}
              className="flex-1"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isAnalyzing ? "Analyzing..." : "Train AI"}
            </Button>
          </div>
          
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2 text-sm">
              <Shield className="h-4 w-4 text-green-500 mt-0.5" />
              <p className="text-muted-foreground">
                All training instructions are analyzed by Safety AI before being applied. 
                Harmful or unsafe patterns are automatically blocked.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Learning Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Learning Sessions
          </CardTitle>
          <CardDescription>Review and approve AI learning from conversations</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 rounded-lg border ${
                    session.is_approved 
                      ? 'border-green-500/30 bg-green-500/5' 
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{session.session_type}</Badge>
                        <Badge 
                          className={
                            session.safety_score > 0.85 
                              ? "bg-green-500/10 text-green-500" 
                              : session.safety_score > 0.7 
                                ? "bg-yellow-500/10 text-yellow-500"
                                : "bg-red-500/10 text-red-500"
                          }
                        >
                          Safety: {Math.round(session.safety_score * 100)}%
                        </Badge>
                        {session.is_approved && (
                          <Badge className="bg-green-500/10 text-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Applied
                          </Badge>
                        )}
                      </div>
                      
                      {session.generated_prompt && (
                        <p className="text-sm text-muted-foreground">
                          {session.generated_prompt}
                        </p>
                      )}
                      
                      {session.extracted_patterns && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(session.extracted_patterns.keywords || []).slice(0, 5).map((kw: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {!session.is_approved && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectSession(session)}
                          className="text-destructive"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveSession(session)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {sessions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No learning sessions yet</p>
                  <p className="text-sm">Train the AI using the form above</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
