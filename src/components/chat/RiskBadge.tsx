import { cn } from '@/lib/utils';
import { Shield, AlertTriangle, XCircle } from 'lucide-react';
import type { RiskLevel } from '@/types/agent';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskBadge({ level, score, showScore = false, size = 'md' }: RiskBadgeProps) {
  const config = {
    low: {
      label: 'Low Risk',
      icon: Shield,
      className: 'risk-badge-low',
    },
    medium: {
      label: 'Medium Risk',
      icon: AlertTriangle,
      className: 'risk-badge-medium',
    },
    high: {
      label: 'High Risk',
      icon: XCircle,
      className: 'risk-badge-high',
    },
  };

  const { label, icon: Icon, className } = config[level];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        className,
        sizeClasses[size]
      )}
    >
      <Icon className={iconSizes[size]} />
      <span>{label}</span>
      {showScore && score !== undefined && (
        <span className="opacity-70">({score})</span>
      )}
    </span>
  );
}
