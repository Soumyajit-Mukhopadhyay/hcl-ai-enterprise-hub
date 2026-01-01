import { 
  Calendar, 
  FileText, 
  UserPlus, 
  HelpCircle, 
  Laptop, 
  Key,
  ClipboardList,
  BookOpen
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  prompt: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'leave',
    label: 'Apply Leave',
    description: 'Request time off',
    icon: Calendar,
    prompt: 'I want to apply for leave',
  },
  {
    id: 'payslip',
    label: 'View Payslip',
    description: 'Download latest payslip',
    icon: FileText,
    prompt: 'Show me my payslip for this month',
  },
  {
    id: 'onboard',
    label: 'Onboard New Hire',
    description: 'Start onboarding process',
    icon: UserPlus,
    prompt: 'I need to onboard a new employee',
  },
  {
    id: 'ticket',
    label: 'Create Ticket',
    description: 'HR or IT support',
    icon: HelpCircle,
    prompt: 'Create a new support ticket',
  },
  {
    id: 'reset',
    label: 'Reset Password',
    description: 'IT access reset',
    icon: Key,
    prompt: 'I need to reset my password',
  },
  {
    id: 'laptop',
    label: 'IT Issue',
    description: 'Report tech problem',
    icon: Laptop,
    prompt: 'My laptop is running slow',
  },
  {
    id: 'policy',
    label: 'Policy Query',
    description: 'Ask about policies',
    icon: ClipboardList,
    prompt: 'What is the maternity leave policy?',
  },
  {
    id: 'learning',
    label: 'Learning Path',
    description: 'Career development',
    icon: BookOpen,
    prompt: 'I want to become a Product Manager',
  },
];

interface QuickActionsProps {
  onActionClick: (prompt: string) => void;
}

export function QuickActions({ onActionClick }: QuickActionsProps) {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                onClick={() => onActionClick(action.prompt)}
                className="h-auto p-3 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                  <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium">{action.label}</p>
                  <p className="text-[10px] text-muted-foreground">{action.description}</p>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
