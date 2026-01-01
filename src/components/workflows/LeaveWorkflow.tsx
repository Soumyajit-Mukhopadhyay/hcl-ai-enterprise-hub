import { useState } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface LeaveRequest {
  id: string;
  type: 'annual' | 'sick' | 'personal' | 'emergency';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  approver?: string;
}

const mockLeaveBalance = {
  annual: { total: 20, used: 8, pending: 2 },
  sick: { total: 12, used: 3, pending: 0 },
  personal: { total: 5, used: 2, pending: 0 },
  emergency: { total: 3, used: 0, pending: 0 },
};

const mockRecentRequests: LeaveRequest[] = [
  {
    id: 'LR001',
    type: 'annual',
    startDate: '2026-01-15',
    endDate: '2026-01-17',
    days: 3,
    reason: 'Family vacation',
    status: 'approved',
    submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    approver: 'John Manager',
  },
  {
    id: 'LR002',
    type: 'sick',
    startDate: '2026-01-10',
    endDate: '2026-01-10',
    days: 1,
    reason: 'Not feeling well',
    status: 'approved',
    submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'LR003',
    type: 'annual',
    startDate: '2026-02-01',
    endDate: '2026-02-05',
    days: 5,
    reason: 'Extended weekend trip',
    status: 'pending',
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
];

interface LeaveWorkflowProps {
  onSubmit?: (request: Partial<LeaveRequest>) => void;
}

export function LeaveWorkflow({ onSubmit }: LeaveWorkflowProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const days = calculateDays(formData.startDate, formData.endDate);
    onSubmit?.({ ...formData, days, type: formData.type as LeaveRequest['type'] });
    setShowForm(false);
    setFormData({ type: 'annual', startDate: '', endDate: '', reason: '' });
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const diffTime = new Date(end).getTime() - new Date(start).getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      approved: 'default',
      rejected: 'destructive',
      pending: 'secondary',
    };
    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Leave Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(mockLeaveBalance).map(([type, balance]) => (
          <Card key={type} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium capitalize">{type}</span>
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold">{balance.total - balance.used - balance.pending}</span>
                <span className="text-xs text-muted-foreground mb-1">/ {balance.total}</span>
              </div>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="text-success">Used: {balance.used}</span>
                {balance.pending > 0 && (
                  <span className="text-warning">Pending: {balance.pending}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Apply Leave Button */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="w-full gap-2">
          <Calendar className="w-4 h-4" />
          Apply for Leave
        </Button>
      )}

      {/* Leave Application Form */}
      {showForm && (
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              New Leave Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Leave Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual Leave</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="personal">Personal Leave</SelectItem>
                      <SelectItem value="emergency">Emergency Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <div className="text-lg font-semibold">
                    {calculateDays(formData.startDate, formData.endDate) || 0} days
                  </div>
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
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Brief reason for leave..."
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Submit Request</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Recent Requests */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Leave Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockRecentRequests.map((request) => (
              <div
                key={request.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg",
                  "bg-muted/50 hover:bg-muted/70 transition-colors"
                )}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(request.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{request.type} Leave</span>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {request.startDate} to {request.endDate} • {request.days} days
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
