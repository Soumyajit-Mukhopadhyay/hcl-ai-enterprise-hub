import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Ticket, 
  Users, 
  Code, 
  GitPullRequest,
  Brain,
  Settings,
  ChevronRight,
  Lock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const iconMap: Record<string, any> = {
  LayoutDashboard,
  MessageSquare,
  Ticket,
  Users,
  Code,
  GitPullRequest,
  Brain,
  Settings
};

interface NavItem {
  route_path: string;
  route_name: string;
  required_roles: string[];
  description: string | null;
  icon_name: string | null;
  display_order: number;
}

interface RoleBasedNavProps {
  userRole: string;
  onNavigationAttempt?: (path: string, allowed: boolean) => void;
}

export function RoleBasedNav({ userRole, onNavigationAttempt }: RoleBasedNavProps) {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchNavItems();
  }, []);

  const fetchNavItems = async () => {
    const { data, error } = await supabase
      .from('navigation_config')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!error && data) {
      setNavItems(data);
    }
  };

  const handleNavClick = (item: NavItem) => {
    const hasAccess = item.required_roles.includes(userRole);
    
    onNavigationAttempt?.(item.route_path, hasAccess);
    
    if (hasAccess) {
      navigate(item.route_path);
    } else {
      toast.error(`Access denied. "${item.route_name}" requires ${item.required_roles.join(' or ')} role.`);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon_name || 'LayoutDashboard'] || LayoutDashboard;
          const hasAccess = item.required_roles.includes(userRole);
          
          return (
            <Button
              key={item.route_path}
              variant={isActive(item.route_path) ? "secondary" : "ghost"}
              className={`w-full justify-start gap-3 ${
                !hasAccess ? 'opacity-50' : ''
              }`}
              onClick={() => handleNavClick(item)}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{item.route_name}</span>
              {!hasAccess && <Lock className="h-3 w-3 text-muted-foreground" />}
              {isActive(item.route_path) && <ChevronRight className="h-4 w-4" />}
            </Button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// Hook for AI to check navigation access
export function useNavigationAccess() {
  const checkAccess = async (userRole: string, targetPath: string): Promise<{
    allowed: boolean;
    reason: string;
    requiredRoles: string[];
  }> => {
    const { data } = await supabase
      .from('navigation_config')
      .select('required_roles, route_name')
      .eq('route_path', targetPath)
      .single();

    if (!data) {
      return {
        allowed: false,
        reason: "This page does not exist in the system.",
        requiredRoles: []
      };
    }

    const allowed = data.required_roles.includes(userRole);
    
    return {
      allowed,
      reason: allowed 
        ? `You have access to ${data.route_name}` 
        : `You don't have access to ${data.route_name}. This feature is only available for ${data.required_roles.join(', ')} roles.`,
      requiredRoles: data.required_roles
    };
  };

  return { checkAccess };
}
