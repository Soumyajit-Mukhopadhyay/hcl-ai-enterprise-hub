import { useState } from 'react';
import { Calendar, DollarSign, UserPlus, Ticket, Target } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaveWorkflow } from './LeaveWorkflow';
import { PayrollWorkflow } from './PayrollWorkflow';
import { OnboardingWorkflow } from './OnboardingWorkflow';
import { TicketWorkflow } from './TicketWorkflow';
import { PerformanceWorkflow } from './PerformanceWorkflow';
import { cn } from '@/lib/utils';

interface HRWorkflowPanelProps {
  defaultTab?: string;
  onActionTrigger?: (action: string, data: any) => void;
}

const workflowTabs = [
  { id: 'leave', label: 'Leave', icon: Calendar },
  { id: 'payroll', label: 'Payroll', icon: DollarSign },
  { id: 'onboarding', label: 'Onboarding', icon: UserPlus },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'performance', label: 'Performance', icon: Target },
];

export function HRWorkflowPanel({ defaultTab = 'leave', onActionTrigger }: HRWorkflowPanelProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-border bg-card/50 px-4">
          <TabsList className="h-14 w-full justify-start gap-1 bg-transparent p-0">
            {workflowTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "data-[state=active]:bg-primary/10 data-[state=active]:text-primary",
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary",
                  "rounded-none px-4 py-3 gap-2"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-5xl mx-auto">
            <TabsContent value="leave" className="mt-0">
              <LeaveWorkflow onSubmit={(data) => onActionTrigger?.('leave_request', data)} />
            </TabsContent>

            <TabsContent value="payroll" className="mt-0">
              <PayrollWorkflow onDownloadPayslip={(month, year) => onActionTrigger?.('fetch_payslip', { month, year })} />
            </TabsContent>

            <TabsContent value="onboarding" className="mt-0">
              <OnboardingWorkflow onStartOnboarding={(data) => onActionTrigger?.('onboard', data)} />
            </TabsContent>

            <TabsContent value="tickets" className="mt-0">
              <TicketWorkflow onCreateTicket={(data) => onActionTrigger?.('create_ticket', data)} />
            </TabsContent>

            <TabsContent value="performance" className="mt-0">
              <PerformanceWorkflow />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
