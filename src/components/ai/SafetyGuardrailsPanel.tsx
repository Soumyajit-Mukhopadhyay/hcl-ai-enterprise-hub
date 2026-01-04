import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Lock
} from 'lucide-react';

interface SafetyCheck {
  id: string;
  type: 'input_validation' | 'code_analysis' | 'execution_check' | 'output_validation';
  status: 'passed' | 'warning' | 'blocked';
  message: string;
  details?: string;
  flags?: string[];
  score?: number;
}

interface SafetyGuardrailsPanelProps {
  checks: SafetyCheck[];
  overallScore: number;
  isAnalyzing: boolean;
}

const checkTypeLabels = {
  input_validation: 'Input Validation',
  code_analysis: 'Code Analysis',
  execution_check: 'Execution Check',
  output_validation: 'Output Validation'
};

const statusConfig = {
  passed: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-green-600',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20'
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-yellow-600',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20'
  },
  blocked: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20'
  }
};

export function SafetyGuardrailsPanel({ 
  checks, 
  overallScore, 
  isAnalyzing 
}: SafetyGuardrailsPanelProps) {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 0.8) return <ShieldCheck className="h-6 w-6 text-green-600" />;
    if (score >= 0.5) return <ShieldAlert className="h-6 w-6 text-yellow-600" />;
    return <ShieldX className="h-6 w-6 text-red-600" />;
  };

  const blockedChecks = checks.filter(c => c.status === 'blocked');
  const warningChecks = checks.filter(c => c.status === 'warning');
  const passedChecks = checks.filter(c => c.status === 'passed');

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Safety Guardrails
          </CardTitle>
          <div className="flex items-center gap-2">
            {getScoreIcon(overallScore)}
            <span className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
              {Math.round(overallScore * 100)}%
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Summary badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {passedChecks.length} Passed
          </Badge>
          {warningChecks.length > 0 && (
            <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {warningChecks.length} Warnings
            </Badge>
          )}
          {blockedChecks.length > 0 && (
            <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
              <XCircle className="h-3 w-3 mr-1" />
              {blockedChecks.length} Blocked
            </Badge>
          )}
        </div>

        {/* Individual checks */}
        <div className="space-y-2">
          {checks.map((check) => {
            const config = statusConfig[check.status];
            return (
              <div 
                key={check.id}
                className={`rounded-lg border p-3 ${config.bg} ${config.border}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <span className={config.color}>{config.icon}</span>
                    <div>
                      <p className={`font-medium text-sm ${config.color}`}>
                        {checkTypeLabels[check.type]}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {check.message}
                      </p>
                      {check.details && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {check.details}
                        </p>
                      )}
                      {check.flags && check.flags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {check.flags.map((flag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {flag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {check.score !== undefined && (
                    <Badge variant="outline" className={config.color}>
                      {Math.round(check.score * 100)}%
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Protection status */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Lock className="h-4 w-4 text-primary" />
            <span className="font-medium">Active Protections:</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Prompt Injection Detection
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Harmful Code Blocking
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Data Exfiltration Prevention
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Privilege Escalation Guard
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
