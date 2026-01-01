import { useState } from 'react';
import { Check, X, ChevronDown, ChevronUp, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RiskBadge } from './RiskBadge';
import { cn } from '@/lib/utils';
import type { ActionSchema } from '@/types/agent';

interface ActionCardProps {
  action: ActionSchema;
  onConfirm?: () => void;
  onReject?: () => void;
  isExecuting?: boolean;
  isComplete?: boolean;
}

export function ActionCard({ 
  action, 
  onConfirm, 
  onReject,
  isExecuting = false,
  isComplete = false 
}: ActionCardProps) {
  const [showJson, setShowJson] = useState(true);

  const canAutoExecute = action.riskLevel === 'low';
  const needsApproval = action.riskLevel === 'medium';
  const isBlocked = action.riskLevel === 'high';

  const getActionTitle = () => {
    switch (action.actionType) {
      case 'schedule_meeting':
        return 'Schedule Meeting';
      case 'leave_request':
        return 'Process Leave Request';
      case 'fetch_payslip':
        return 'Fetch Payslip';
      case 'create_ticket':
        return 'Create HR Ticket';
      case 'onboard':
        return 'Onboard Employee';
      default:
        return action.actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  return (
    <Card className={cn(
      "border-2 transition-all duration-300",
      isComplete && "border-success/50 bg-success/5",
      isExecuting && "border-primary/50 bg-primary/5",
      isBlocked && "border-destructive/50 bg-destructive/5"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              canAutoExecute && "bg-success/10 text-success",
              needsApproval && "bg-warning/10 text-warning",
              isBlocked && "bg-destructive/10 text-destructive"
            )}>
              <Play className="w-4 h-4" />
            </div>
            {getActionTitle()}
          </CardTitle>
          <RiskBadge level={action.riskLevel} score={action.riskScore} showScore />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Tool:</span>{' '}
          <code className="px-1.5 py-0.5 bg-muted rounded text-foreground">
            {action.tool}
          </code>
        </div>

        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowJson(!showJson)}
            className="text-xs px-0 h-auto text-muted-foreground hover:text-foreground"
          >
            {showJson ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {showJson ? 'Hide' : 'Show'} JSON Payload
          </Button>

          {showJson && (
            <pre className="mt-2 p-3 bg-sidebar text-sidebar-foreground rounded-lg text-xs overflow-auto max-h-48 font-mono">
              {JSON.stringify(action.parameters, null, 2)}
            </pre>
          )}
        </div>

        {isBlocked && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-xs text-destructive font-medium">
              ⚠️ This action is blocked due to high risk. Please contact HR/Admin for manual escalation.
            </p>
          </div>
        )}

        {needsApproval && !isComplete && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-xs text-warning font-medium">
              ⏳ This action requires approval before execution.
            </p>
          </div>
        )}

        {canAutoExecute && !isComplete && !isExecuting && (
          <div className="p-3 rounded-lg bg-success/10 border border-success/20">
            <p className="text-xs text-success font-medium">
              ✓ Low risk - Ready for automatic execution
            </p>
          </div>
        )}

        {isComplete && (
          <div className="p-3 rounded-lg bg-success/10 border border-success/20">
            <p className="text-xs text-success font-medium">
              ✓ Action executed successfully
            </p>
          </div>
        )}
      </CardContent>

      {!isBlocked && !isComplete && (
        <CardFooter className="gap-2 pt-2">
          <Button
            onClick={onConfirm}
            disabled={isExecuting}
            className="flex-1 bg-gradient-primary hover:opacity-90"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {canAutoExecute ? 'Execute' : 'Approve & Execute'}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onReject}
            disabled={isExecuting}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
