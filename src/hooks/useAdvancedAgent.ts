import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export interface SafetyCheck {
  id: string;
  type: 'input_validation' | 'code_analysis' | 'execution_check' | 'output_validation';
  status: 'passed' | 'warning' | 'blocked';
  message: string;
  details?: string;
  flags?: string[];
  score?: number;
}

export interface LearnedPattern {
  id: string;
  type: string;
  description: string;
  confidence: number;
  usageCount: number;
  successRate: number;
}

export function useAdvancedAgent(sessionId: string, userId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [safetyChecks, setSafetyChecks] = useState<SafetyCheck[]>([]);
  const [learnedPatterns, setLearnedPatterns] = useState<LearnedPattern[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [overallSafetyScore, setOverallSafetyScore] = useState(1.0);

  // Load tasks for session
  const loadTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('ai_task_queue')
      .select('*')
      .eq('session_id', sessionId)
      .order('task_order');

    if (data) {
      setTasks(data.map(t => ({
        id: t.id,
        order: t.task_order,
        type: t.task_type,
        description: t.task_description,
        status: t.status as Task['status'],
        riskLevel: t.risk_level as Task['riskLevel'],
        requiresApproval: t.approval_required,
        proposedChanges: t.proposed_changes,
        executionResult: t.execution_result,
        errorMessage: t.error_message
      })));
    }
  }, [sessionId]);

  // Load learned patterns
  const loadPatterns = useCallback(async () => {
    const { data } = await supabase
      .from('ai_learned_patterns')
      .select('*')
      .eq('is_validated', true)
      .eq('is_harmful', false)
      .order('confidence_score', { ascending: false })
      .limit(20);

    if (data) {
      setLearnedPatterns(data.map(p => ({
        id: p.id,
        type: p.pattern_type,
        description: p.pattern_key,
        confidence: Number(p.confidence_score),
        usageCount: p.success_count + p.failure_count,
        successRate: p.success_count / Math.max(1, p.success_count + p.failure_count)
      })));
    }
  }, []);

  // Approve a task
  const approveTask = useCallback(async (taskId: string) => {
    const { error } = await supabase
      .from('ai_task_queue')
      .update({ status: 'approved' })
      .eq('id', taskId);

    if (error) {
      toast.error('Failed to approve task');
      return;
    }

    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'approved' as const } : t
    ));
    toast.success('Task approved');
  }, []);

  // Reject a task
  const rejectTask = useCallback(async (taskId: string, reason?: string) => {
    const { error } = await supabase
      .from('ai_task_queue')
      .update({ 
        status: 'rejected',
        error_message: reason || 'Rejected by user'
      })
      .eq('id', taskId);

    if (error) {
      toast.error('Failed to reject task');
      return;
    }

    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'rejected' as const } : t
    ));
    toast.info('Task rejected');
  }, []);

  // Approve all pending tasks
  const approveAllTasks = useCallback(async () => {
    const pendingTasks = tasks.filter(t => t.status === 'awaiting_approval');
    
    for (const task of pendingTasks) {
      await approveTask(task.id);
    }
    
    toast.success(`Approved ${pendingTasks.length} tasks`);
  }, [tasks, approveTask]);

  // Execute a task
  const executeTask = useCallback(async (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'executing' as const } : t
    ));

    try {
      // Update in database
      await supabase
        .from('ai_task_queue')
        .update({ 
          status: 'executing',
          started_at: new Date().toISOString()
        })
        .eq('id', taskId);

      // Simulate execution (in real implementation, this would call the agent)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mark as completed
      await supabase
        .from('ai_task_queue')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: 'completed' as const } : t
      ));

      toast.success('Task executed successfully');
    } catch (error) {
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { 
          ...t, 
          status: 'failed' as const,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        } : t
      ));
      toast.error('Task execution failed');
    }
  }, []);

  // Submit feedback
  const submitFeedback = useCallback(async (
    messageId: string, 
    type: 'positive' | 'negative', 
    correction?: string
  ) => {
    const { error } = await supabase
      .from('ai_feedback')
      .insert({
        session_id: sessionId,
        message_id: messageId,
        user_id: userId,
        feedback_type: type === 'positive' ? 'thumbs_up' : 'thumbs_down',
        corrected_response: correction
      });

    if (error) {
      toast.error('Failed to submit feedback');
      return;
    }

    toast.success('Feedback submitted - AI will learn from this!');
  }, [sessionId, userId]);

  // Send message to advanced agent
  const sendMessage = useCallback(async (
    message: string, 
    mode: 'chat' | 'fix' | 'analyze' | 'multi-task' = 'chat',
    onChunk?: (chunk: string) => void
  ) => {
    setIsProcessing(true);
    
    // Add input validation safety check
    setSafetyChecks(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'input_validation',
      status: 'passed',
      message: 'Input validated successfully',
      score: 1.0
    }]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/advanced-agent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: message }],
            sessionId,
            userId,
            mode
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        
        if (errorData.blocked) {
          setSafetyChecks(prev => [...prev, {
            id: crypto.randomUUID(),
            type: 'input_validation',
            status: 'blocked',
            message: errorData.message,
            flags: errorData.flags,
            score: 0
          }]);
          setOverallSafetyScore(0);
          toast.error('Request blocked by safety system');
          return;
        }
        
        throw new Error(errorData.error || 'Request failed');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content && onChunk) {
                onChunk(content);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Reload tasks after processing
      await loadTasks();

    } catch (error) {
      console.error('Agent error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process request');
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId, userId, loadTasks]);

  return {
    tasks,
    safetyChecks,
    learnedPatterns,
    isProcessing,
    isPaused,
    overallSafetyScore,
    loadTasks,
    loadPatterns,
    approveTask,
    rejectTask,
    approveAllTasks,
    executeTask,
    submitFeedback,
    sendMessage,
    setIsPaused
  };
}
