import { Users, Monitor, Code, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DomainTabsProps {
  activeDomain: string;
  onDomainChange: (domain: string) => void;
}

const domains = [
  { 
    id: 'general', 
    label: 'All', 
    icon: Sparkles, 
    description: 'General enterprise queries',
    color: 'from-primary to-secondary'
  },
  { 
    id: 'hr', 
    label: 'HR Ops', 
    icon: Users, 
    description: 'Leave, payroll, policies',
    color: 'from-primary to-primary/60'
  },
  { 
    id: 'it', 
    label: 'IT Desk', 
    icon: Monitor, 
    description: 'Support, access, hardware',
    color: 'from-secondary to-secondary/60'
  },
  { 
    id: 'dev', 
    label: 'Dev Hub', 
    icon: Code, 
    description: 'Code, docs, APIs',
    color: 'from-accent to-accent/60'
  },
];

export function DomainTabs({ activeDomain, onDomainChange }: DomainTabsProps) {
  return (
    <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
      {domains.map(domain => {
        const Icon = domain.icon;
        const isActive = activeDomain === domain.id;
        
        return (
          <button
            key={domain.id}
            onClick={() => onDomainChange(domain.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
              isActive
                ? `bg-gradient-to-r ${domain.color} text-white shadow-md`
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium">{domain.label}</span>
          </button>
        );
      })}
    </div>
  );
}
