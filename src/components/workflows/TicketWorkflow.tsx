import { useState } from 'react';
import { Ticket, CheckCircle, Clock, AlertTriangle, MessageSquare, Search, Filter, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: 'it' | 'hr' | 'facilities' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  assignee?: string;
  resolution?: string;
}

const mockTickets: SupportTicket[] = [
  {
    id: 'TKT-001',
    subject: 'VPN connection issues',
    description: 'Unable to connect to VPN from home network',
    category: 'it',
    priority: 'high',
    status: 'in-progress',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    assignee: 'IT Support',
  },
  {
    id: 'TKT-002',
    subject: 'Request for ergonomic chair',
    description: 'Need an ergonomic chair for home office setup',
    category: 'facilities',
    priority: 'low',
    status: 'open',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'TKT-003',
    subject: 'Policy clarification on work from home',
    description: 'Need clarity on the new hybrid work policy',
    category: 'hr',
    priority: 'medium',
    status: 'resolved',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    assignee: 'HR Team',
    resolution: 'Policy document shared via email',
  },
  {
    id: 'TKT-004',
    subject: 'Password reset for Jira',
    description: 'Locked out of Jira account, need password reset',
    category: 'it',
    priority: 'critical',
    status: 'closed',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    assignee: 'IT Support',
    resolution: 'Password reset completed',
  },
];

interface TicketWorkflowProps {
  onCreateTicket?: (data: Partial<SupportTicket>) => void;
}

export function TicketWorkflow({ onCreateTicket }: TicketWorkflowProps) {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'it',
    priority: 'medium',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateTicket?.({
      ...formData,
      category: formData.category as SupportTicket['category'],
      priority: formData.priority as SupportTicket['priority'],
    });
    setShowForm(false);
    setFormData({ subject: '', description: '', category: 'it', priority: 'medium' });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-destructive bg-destructive/10';
      case 'high': return 'text-warning bg-warning/10';
      case 'medium': return 'text-primary bg-primary/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'closed':
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-warning animate-pulse" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-primary" />;
    }
  };

  const filteredTickets = mockTickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    open: mockTickets.filter(t => t.status === 'open').length,
    inProgress: mockTickets.filter(t => t.status === 'in-progress').length,
    resolved: mockTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
    total: mockTickets.length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Open Tickets</span>
              <Ticket className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{stats.open}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">In Progress</span>
              <Clock className="w-4 h-4 text-warning" />
            </div>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Resolved</span>
              <CheckCircle className="w-4 h-4 text-success" />
            </div>
            <div className="text-2xl font-bold">{stats.resolved}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Avg. Resolution</span>
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">4.5h</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create New Ticket
        </Button>
        <div className="flex-1 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets..."
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* New Ticket Form */}
      {showForm && (
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Create Support Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of the issue"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="it">IT Support</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="facilities">Facilities</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of your issue..."
                  rows={4}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Submit Ticket</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Ticket List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Your Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                className={cn(
                  "flex items-start justify-between p-4 rounded-lg",
                  "bg-muted/50 hover:bg-muted/70 transition-colors"
                )}
              >
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(ticket.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{ticket.subject}</span>
                      <Badge variant="outline" className="text-xs">{ticket.id}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{ticket.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="capitalize">{ticket.category}</span>
                      <span>•</span>
                      <span>Created {ticket.createdAt.toLocaleDateString()}</span>
                      {ticket.assignee && (
                        <>
                          <span>•</span>
                          <span>{ticket.assignee}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={cn("capitalize text-xs", getPriorityColor(ticket.priority))}>
                    {ticket.priority}
                  </Badge>
                  <Badge variant={
                    ticket.status === 'closed' || ticket.status === 'resolved' ? 'default' :
                    ticket.status === 'in-progress' ? 'secondary' :
                    'outline'
                  } className="capitalize text-xs">
                    {ticket.status.replace('-', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
