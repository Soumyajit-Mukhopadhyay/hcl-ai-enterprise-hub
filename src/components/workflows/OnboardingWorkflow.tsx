import { useState } from 'react';
import { UserPlus, CheckCircle, Clock, AlertCircle, FileCheck, Laptop, Building, User, ChevronRight, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface OnboardingTask {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  dueDate: string;
  assignee: string;
  category: 'document' | 'it' | 'hr' | 'facilities';
}

interface NewHire {
  id: string;
  name: string;
  role: string;
  department: string;
  startDate: string;
  manager: string;
  location: string;
  progress: number;
  status: 'pre-onboarding' | 'day-1' | 'week-1' | 'completed';
  tasks: OnboardingTask[];
}

const mockNewHires: NewHire[] = [
  {
    id: 'NH001',
    name: 'Sarah Johnson',
    role: 'Senior Software Engineer',
    department: 'Engineering',
    startDate: '2026-01-15',
    manager: 'John Smith',
    location: 'London',
    progress: 65,
    status: 'pre-onboarding',
    tasks: [
      { id: 'T1', name: 'Background Verification', description: 'Complete BGV check', status: 'completed', dueDate: '2026-01-10', assignee: 'HR Team', category: 'hr' },
      { id: 'T2', name: 'Document Collection', description: 'Collect ID, address proof, education certificates', status: 'completed', dueDate: '2026-01-12', assignee: 'HR Team', category: 'document' },
      { id: 'T3', name: 'Laptop Provisioning', description: 'MacBook Pro 16" with dev tools', status: 'in-progress', dueDate: '2026-01-14', assignee: 'IT Team', category: 'it' },
      { id: 'T4', name: 'System Access', description: 'Create AD account, email, Jira, GitHub access', status: 'pending', dueDate: '2026-01-14', assignee: 'IT Team', category: 'it' },
      { id: 'T5', name: 'Desk Allocation', description: 'Assign desk in Building C, Floor 3', status: 'pending', dueDate: '2026-01-14', assignee: 'Facilities', category: 'facilities' },
      { id: 'T6', name: 'Welcome Kit', description: 'Prepare welcome kit and ID card', status: 'pending', dueDate: '2026-01-15', assignee: 'HR Team', category: 'hr' },
    ],
  },
  {
    id: 'NH002',
    name: 'Michael Chen',
    role: 'Product Manager',
    department: 'Product',
    startDate: '2026-01-20',
    manager: 'Emily Davis',
    location: 'San Francisco',
    progress: 30,
    status: 'pre-onboarding',
    tasks: [
      { id: 'T1', name: 'Background Verification', description: 'Complete BGV check', status: 'completed', dueDate: '2026-01-15', assignee: 'HR Team', category: 'hr' },
      { id: 'T2', name: 'Document Collection', description: 'Collect ID, address proof, education certificates', status: 'in-progress', dueDate: '2026-01-17', assignee: 'HR Team', category: 'document' },
      { id: 'T3', name: 'Laptop Provisioning', description: 'MacBook Pro 14"', status: 'pending', dueDate: '2026-01-19', assignee: 'IT Team', category: 'it' },
    ],
  },
];

interface OnboardingWorkflowProps {
  onStartOnboarding?: (data: any) => void;
}

export function OnboardingWorkflow({ onStartOnboarding }: OnboardingWorkflowProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedHire, setSelectedHire] = useState<string | null>('NH001');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    department: 'engineering',
    startDate: '',
    manager: '',
    location: 'london',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartOnboarding?.(formData);
    setShowForm(false);
    setFormData({ name: '', email: '', role: '', department: 'engineering', startDate: '', manager: '', location: 'london' });
  };

  const getTaskIcon = (category: string) => {
    switch (category) {
      case 'document': return <FileCheck className="w-4 h-4" />;
      case 'it': return <Laptop className="w-4 h-4" />;
      case 'hr': return <User className="w-4 h-4" />;
      case 'facilities': return <Building className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'in-progress': return <Clock className="w-4 h-4 text-warning animate-pulse" />;
      default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const selectedHireData = mockNewHires.find(h => h.id === selectedHire);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Pending Onboarding</span>
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">5</div>
            <div className="text-xs text-muted-foreground mt-1">Next 30 days</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">In Progress</span>
              <Clock className="w-4 h-4 text-warning" />
            </div>
            <div className="text-2xl font-bold">3</div>
            <div className="text-xs text-muted-foreground mt-1">Active onboardings</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Completed This Month</span>
              <CheckCircle className="w-4 h-4 text-success" />
            </div>
            <div className="text-2xl font-bold">12</div>
            <div className="text-xs text-muted-foreground mt-1">January 2026</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Avg. Completion Time</span>
              <Building className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">4.2</div>
            <div className="text-xs text-muted-foreground mt-1">Days</div>
          </CardContent>
        </Card>
      </div>

      {/* New Hire Button */}
      <Button onClick={() => setShowForm(!showForm)} className="w-full gap-2">
        <Plus className="w-4 h-4" />
        Initiate New Onboarding
      </Button>

      {/* New Hire Form */}
      {showForm && (
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              New Employee Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.doe@hcltech.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Software Engineer"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="hr">Human Resources</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select value={formData.location} onValueChange={(v) => setFormData({ ...formData, location: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="london">London</SelectItem>
                      <SelectItem value="noida">Noida</SelectItem>
                      <SelectItem value="chennai">Chennai</SelectItem>
                      <SelectItem value="san-francisco">San Francisco</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reporting Manager</Label>
                <Input
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  placeholder="Manager's email"
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Start Onboarding</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Ongoing Onboardings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Ongoing Onboardings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockNewHires.map((hire) => (
                <div
                  key={hire.id}
                  onClick={() => setSelectedHire(hire.id)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all",
                    selectedHire === hire.id
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-muted/50 hover:bg-muted/70"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                      {hire.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-medium">{hire.name}</div>
                      <div className="text-xs text-muted-foreground">{hire.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium">{hire.progress}%</div>
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${hire.progress}%` }}
                        />
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Task Details */}
        {selectedHireData && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                Tasks for {selectedHireData.name}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Joining: {selectedHireData.startDate} • {selectedHireData.location}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedHireData.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg",
                      "bg-muted/50 hover:bg-muted/70 transition-colors"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        task.status === 'completed' ? "bg-success/10 text-success" :
                        task.status === 'in-progress' ? "bg-warning/10 text-warning" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {getTaskIcon(task.category)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{task.name}</div>
                        <div className="text-xs text-muted-foreground">{task.assignee}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        task.status === 'completed' ? 'default' :
                        task.status === 'in-progress' ? 'secondary' :
                        'outline'
                      } className="capitalize text-xs">
                        {task.status.replace('-', ' ')}
                      </Badge>
                      {getStatusIcon(task.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
