import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Calendar, FileText, AlertTriangle, Clock } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  risk_level: string;
  created_at: string;
  requester?: { full_name: string; email: string };
}

interface CodeChangeRequest {
  id: string;
  requester_id: string;
  file_path: string;
  original_code: string | null;
  proposed_code: string;
  change_reason: string;
  status: string;
  created_at: string;
  requester?: { full_name: string; email: string };
}

export function ApprovalPanel() {
  const { user, role } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [codeRequests, setCodeRequests] = useState<CodeChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'hr') {
      fetchLeaveRequests();
    }
    if (role === 'developer') {
      fetchCodeRequests();
    }

    // Subscribe to realtime updates
    const channels = [];
    
    if (role === 'hr') {
      const leaveChannel = supabase
        .channel('leave-requests')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
          fetchLeaveRequests();
        })
        .subscribe();
      channels.push(leaveChannel);
    }

    if (role === 'developer') {
      const codeChannel = supabase
        .channel('code-requests')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'code_change_requests' }, () => {
          fetchCodeRequests();
        })
        .subscribe();
      channels.push(codeChannel);
    }

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [role]);

  const fetchLeaveRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (req) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', req.user_id)
            .single();
          return { ...req, requester: profile };
        })
      );

      setLeaveRequests(requestsWithProfiles);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCodeRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('code_change_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (req) => {
          if (!req.requester_id) return { ...req, requester: null };
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', req.requester_id)
            .single();
          return { ...req, requester: profile };
        })
      );

      setCodeRequests(requestsWithProfiles);
    } catch (error) {
      console.error('Error fetching code requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveApproval = async (requestId: string, approved: boolean) => {
    try {
      const { data: request } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!request) throw new Error('Request not found');

      // Update request status
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      // If approved, update leave balance
      if (approved) {
        const days = differenceInDays(parseISO(request.end_date), parseISO(request.start_date)) + 1;
        const leaveTypeColumn = `${request.leave_type.toLowerCase().replace(' ', '_')}_leave`;
        
        // Get current balance
        const { data: balance } = await supabase
          .from('leave_balance')
          .select('*')
          .eq('user_id', request.user_id)
          .single();

        if (balance && balance[leaveTypeColumn as keyof typeof balance] !== undefined) {
          const currentBalance = balance[leaveTypeColumn as keyof typeof balance] as number;
          await supabase
            .from('leave_balance')
            .update({ [leaveTypeColumn]: currentBalance - days })
            .eq('user_id', request.user_id);
        }
      }

      // Create notification
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: approved ? 'Leave Request Approved' : 'Leave Request Rejected',
        message: `Your leave request from ${request.start_date} to ${request.end_date} has been ${approved ? 'approved' : 'rejected'}.`,
        type: approved ? 'success' : 'error',
      });

      toast.success(approved ? 'Leave request approved' : 'Leave request rejected');
      fetchLeaveRequests();
    } catch (error) {
      toast.error('Failed to process request');
    }
  };

  const handleCodeApproval = async (requestId: string, approved: boolean) => {
    try {
      const { data: request } = await supabase
        .from('code_change_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!request) throw new Error('Request not found');

      const { error } = await supabase
        .from('code_change_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      if (request.requester_id) {
        await supabase.from('notifications').insert({
          user_id: request.requester_id,
          title: approved ? 'Code Change Approved' : 'Code Change Rejected',
          message: `Your code change request for ${request.file_path} has been ${approved ? 'approved' : 'rejected'}.`,
          type: approved ? 'success' : 'error',
        });
      }

      toast.success(approved ? 'Code change approved' : 'Code change rejected');
      fetchCodeRequests();
    } catch (error) {
      toast.error('Failed to process request');
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'high':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30">High Risk</Badge>;
      case 'medium':
        return <Badge className="bg-warning/10 text-warning border-warning/30">Medium Risk</Badge>;
      case 'low':
      default:
        return <Badge className="bg-success/10 text-success border-success/30">Low Risk</Badge>;
    }
  };

  if (role !== 'hr' && role !== 'developer') {
    return null;
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Pending Approvals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={role === 'hr' ? 'leave' : 'code'}>
          {(role === 'hr' || role === 'developer') && (
            <TabsList className="w-full mb-4">
              {role === 'hr' && <TabsTrigger value="leave" className="flex-1">Leave Requests</TabsTrigger>}
              {role === 'developer' && <TabsTrigger value="code" className="flex-1">Code Changes</TabsTrigger>}
            </TabsList>
          )}

          {role === 'hr' && (
            <TabsContent value="leave">
              <ScrollArea className="max-h-[400px]">
                {leaveRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No pending leave requests
                  </p>
                ) : (
                  <div className="space-y-3">
                    {leaveRequests.map((request) => {
                      const days = differenceInDays(parseISO(request.end_date), parseISO(request.start_date)) + 1;
                      return (
                        <div key={request.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-sm">{request.requester?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{request.leave_type} • {days} day{days > 1 ? 's' : ''}</p>
                            </div>
                            {getRiskBadge(request.risk_level)}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(request.start_date), 'MMM d')} - {format(parseISO(request.end_date), 'MMM d, yyyy')}
                          </div>
                          
                          {request.reason && (
                            <p className="text-xs text-muted-foreground mb-3 italic">
                              "{request.reason}"
                            </p>
                          )}
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 h-8"
                              onClick={() => handleLeaveApproval(request.id, true)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8"
                              onClick={() => handleLeaveApproval(request.id, false)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          )}

          {role === 'developer' && (
            <TabsContent value="code">
              <ScrollArea className="max-h-[400px]">
                {codeRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No pending code change requests
                  </p>
                ) : (
                  <div className="space-y-3">
                    {codeRequests.map((request) => (
                      <div key={request.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm font-mono">{request.file_path}</p>
                            <p className="text-xs text-muted-foreground">
                              {request.requester?.full_name || 'AI Assistant'}
                            </p>
                          </div>
                          <Badge className="bg-secondary/10 text-secondary border-secondary/30">
                            <FileText className="h-3 w-3 mr-1" />
                            Code
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-2">
                          {request.change_reason}
                        </p>
                        
                        <div className="bg-background rounded border border-border p-2 mb-3 max-h-[100px] overflow-auto">
                          <pre className="text-xs font-mono text-muted-foreground">
                            {request.proposed_code.slice(0, 200)}
                            {request.proposed_code.length > 200 && '...'}
                          </pre>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 h-8"
                            onClick={() => handleCodeApproval(request.id, true)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Approve & Apply
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8"
                            onClick={() => handleCodeApproval(request.id, false)}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
