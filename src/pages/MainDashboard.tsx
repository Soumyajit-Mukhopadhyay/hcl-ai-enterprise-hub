import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Calendar, 
  FileText, 
  Settings, 
  Code, 
  Users, 
  BarChart3,
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Briefcase,
  GitBranch,
  Brain,
  Shield,
  LogOut
} from 'lucide-react';

interface QuickAction {
  icon: React.ReactNode;
  title: string;
  description: string;
  route: string;
  roles: string[];
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

const quickActions: QuickAction[] = [
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: 'AI Assistant',
    description: 'Chat with your intelligent assistant',
    route: '/assistant',
    roles: ['employee', 'hr', 'developer', 'it'],
  },
  {
    icon: <Calendar className="h-6 w-6" />,
    title: 'Calendar',
    description: 'View and manage your schedule',
    route: '/calendar',
    roles: ['employee', 'hr', 'developer', 'it'],
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: 'Tickets',
    description: 'Submit and track support tickets',
    route: '/tickets',
    roles: ['employee', 'hr', 'developer', 'it'],
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Analytics',
    description: 'View performance metrics',
    route: '/dashboard',
    roles: ['employee', 'hr', 'developer', 'it'],
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'HR Portal',
    description: 'Manage HR operations',
    route: '/hr-portal',
    roles: ['hr'],
    badge: 'HR Only',
    badgeVariant: 'secondary',
  },
  {
    icon: <Code className="h-6 w-6" />,
    title: 'Developer Console',
    description: 'Code review, AI training & tools',
    route: '/dev-console',
    roles: ['developer'],
    badge: 'Dev Only',
    badgeVariant: 'secondary',
  },
  {
    icon: <Settings className="h-6 w-6" />,
    title: 'Settings',
    description: 'Configure your preferences',
    route: '/settings',
    roles: ['employee', 'hr', 'developer', 'it'],
  },
];

const recentActivities = [
  { icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, text: 'Leave request approved', time: '2 hours ago' },
  { icon: <MessageSquare className="h-4 w-4 text-blue-500" />, text: 'AI Assistant session completed', time: '4 hours ago' },
  { icon: <FileText className="h-4 w-4 text-yellow-500" />, text: 'New ticket assigned to you', time: '1 day ago' },
  { icon: <AlertTriangle className="h-4 w-4 text-orange-500" />, text: 'System maintenance scheduled', time: '2 days ago' },
];

export default function MainDashboard() {
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();

  const filteredActions = quickActions.filter(action => action.roles.includes(role || 'employee'));

  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      employee: 'Employee',
      hr: 'HR Manager',
      developer: 'Developer',
      it: 'IT Administrator'
    };
    return roleNames[role] || role;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                HCL AI Platform
              </span>
            </div>
          </div>
          
          <nav className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/assistant')}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Assistant
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
            {role === 'developer' && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/dev-console')}
                className="gap-2"
              >
                <Code className="h-4 w-4" />
                Dev Console
              </Button>
            )}
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {getGreeting()}, {user?.email?.split('@')[0] || 'User'}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="gap-1">
              <Briefcase className="h-3 w-3" />
              {getRoleDisplayName(role || 'employee')}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">AI Conversations</p>
                  <p className="text-2xl font-bold">24</p>
                </div>
                <MessageSquare className="h-8 w-8 text-primary/60" />
              </div>
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> +12% this week
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tasks Completed</p>
                  <p className="text-2xl font-bold">18</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500/60" />
              </div>
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> 95% success rate
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approvals</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500/60" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Requires your attention</p>
            </CardContent>
          </Card>
          
          {role === 'developer' && (
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Code Changes</p>
                    <p className="text-2xl font-bold">7</p>
                  </div>
                  <GitBranch className="h-8 w-8 text-purple-500/60" />
                </div>
                <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                  <Shield className="h-3 w-3" /> All verified safe
                </p>
              </CardContent>
            </Card>
          )}
          
          {role !== 'developer' && (
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Leave Balance</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500/60" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Days remaining</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredActions.map((action, index) => (
                <Card 
                  key={index}
                  className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group"
                  onClick={() => navigate(action.route)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {action.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{action.title}</h3>
                          {action.badge && (
                            <Badge variant={action.badgeVariant} className="text-xs">
                              {action.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <Card>
              <CardContent className="p-4">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                        <div className="mt-0.5">{activity.icon}</div>
                        <div className="flex-1">
                          <p className="text-sm">{activity.text}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* AI Assistant CTA */}
            <Card className="mt-4 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Brain className="h-6 w-6 text-primary" />
                  <h3 className="font-semibold">Need Help?</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Ask your AI Assistant to handle multiple tasks at once with our advanced multi-tasking system.
                </p>
                <Button 
                  className="w-full gap-2" 
                  onClick={() => navigate('/assistant')}
                >
                  <MessageSquare className="h-4 w-4" />
                  Start Conversation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
