import { useState } from 'react';
import { 
  Home, 
  Users, 
  Laptop, 
  Code, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Brain,
  FileText,
  Shield,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Dashboard', icon: Home, description: 'Overview & Analytics' },
  { id: 'hr-ops', label: 'HR Operations', icon: Users, description: 'Leave, Policies, Onboarding' },
  { id: 'it-desk', label: 'IT Service Desk', icon: Laptop, description: 'Tech Support & Access' },
  { id: 'dev-support', label: 'Developer Hub', icon: Code, description: 'Code & Documentation' },
  { id: 'knowledge', label: 'Knowledge Base', icon: FileText, description: 'Documents & Reports' },
  { id: 'glassbox', label: 'Glass Box', icon: Brain, description: 'Agent Reasoning View' },
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar flex flex-col border-r border-sidebar-border transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="animate-fade-in">
              <h1 className="font-bold text-lg text-sidebar-foreground">HCL Agent</h1>
              <p className="text-xs text-sidebar-foreground/60">Enterprise Assistant</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <Tooltip key={item.id} delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "w-full justify-start gap-3 h-12 px-3 transition-all duration-200",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                    isCollapsed && "justify-center px-0"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isActive && "bg-gradient-primary text-white shadow-md"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {!isCollapsed && (
                    <div className="flex flex-col items-start animate-fade-in">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-[10px] text-sidebar-foreground/50">{item.description}</span>
                    </div>
                  )}
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" className="flex flex-col">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-10 text-sidebar-foreground/70 hover:text-sidebar-foreground",
                isCollapsed && "justify-center px-0"
              )}
            >
              <Shield className="w-4 h-4" />
              {!isCollapsed && <span className="text-sm">Security</span>}
            </Button>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">Security</TooltipContent>}
        </Tooltip>

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-10 text-sidebar-foreground/70 hover:text-sidebar-foreground",
                isCollapsed && "justify-center px-0"
              )}
            >
              <Settings className="w-4 h-4" />
              {!isCollapsed && <span className="text-sm">Settings</span>}
            </Button>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">Settings</TooltipContent>}
        </Tooltip>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full h-10 text-sidebar-foreground/50 hover:text-sidebar-foreground"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
    </aside>
  );
}
