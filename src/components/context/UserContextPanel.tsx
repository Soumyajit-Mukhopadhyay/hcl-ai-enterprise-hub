import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, MapPin, Building2, Calendar, Briefcase, Code, Monitor, TreePalm, HeartPulse, Clock } from 'lucide-react';

export function UserContextPanel() {
  const { profile, role, leaveBalance } = useAuth();

  if (!profile) {
    return null;
  }

  const getRoleIcon = () => {
    switch (role) {
      case 'hr': return <Briefcase className="h-4 w-4" />;
      case 'developer': return <Code className="h-4 w-4" />;
      case 'it': return <Monitor className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'hr': return 'HR Manager';
      case 'developer': return 'Developer';
      case 'it': return 'IT Support';
      default: return 'Employee';
    }
  };

  const initials = profile.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const leaveItems = leaveBalance ? [
    { label: 'Annual', value: leaveBalance.annual_leave, max: 20, icon: <TreePalm className="h-3 w-3" />, color: 'bg-primary' },
    { label: 'Casual', value: leaveBalance.casual_leave, max: 12, icon: <Calendar className="h-3 w-3" />, color: 'bg-secondary' },
    { label: 'Sick', value: leaveBalance.sick_leave, max: 10, icon: <HeartPulse className="h-3 w-3" />, color: 'bg-warning' },
  ] : [];

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <Card className="glass-card">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{profile.full_name}</h3>
              <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-primary/10 text-primary border-primary/30 flex items-center gap-1">
              {getRoleIcon()}
              {getRoleLabel()}
            </Badge>
            {profile.department && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {profile.department}
              </Badge>
            )}
            <Badge variant="outline" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {profile.location}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Leave Balance Card (for employees) */}
      {(role === 'employee' || role === 'hr') && leaveBalance && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Leave Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaveItems.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      {item.icon}
                      {item.label}
                    </span>
                    <span className="font-medium">{item.value} / {item.max} days</span>
                  </div>
                  <Progress 
                    value={(item.value / item.max) * 100} 
                    className="h-1.5"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role-specific quick info */}
      {role === 'hr' && (
        <Card className="glass-card border-warning/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-warning mb-2">
              <Briefcase className="h-4 w-4" />
              <span className="font-medium text-sm">HR Manager View</span>
            </div>
            <p className="text-xs text-muted-foreground">
              You have access to approve leave requests, schedule meetings, and manage employee records.
            </p>
          </CardContent>
        </Card>
      )}

      {role === 'developer' && (
        <Card className="glass-card border-secondary/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-secondary mb-2">
              <Code className="h-4 w-4" />
              <span className="font-medium text-sm">Developer View</span>
            </div>
            <p className="text-xs text-muted-foreground">
              You can approve code changes, debug issues, and access the full codebase through AI assistance.
            </p>
          </CardContent>
        </Card>
      )}

      {role === 'it' && (
        <Card className="glass-card border-hcl-teal/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-hcl-teal mb-2">
              <Monitor className="h-4 w-4" />
              <span className="font-medium text-sm">IT Support View</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Handle IT tickets, infrastructure issues, and provide technical support to employees.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
