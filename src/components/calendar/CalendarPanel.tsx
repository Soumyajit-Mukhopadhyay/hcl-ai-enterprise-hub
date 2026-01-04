import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, ExternalLink, Check, X, User, Video } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, addDays } from 'date-fns';
import { toast } from 'sonner';

interface Meeting {
  id: string;
  requester_id: string;
  attendee_id: string;
  title: string;
  description: string | null;
  reason: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  google_calendar_link: string | null;
  requester?: { full_name: string; email: string };
  attendee?: { full_name: string; email: string };
}

export function CalendarPanel() {
  const { user, role } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeetings();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('meetings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => {
        fetchMeetings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchMeetings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .or(`requester_id.eq.${user.id},attendee_id.eq.${user.id}`)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      // Fetch profile info for each meeting
      const meetingsWithProfiles = await Promise.all(
        (data || []).map(async (meeting) => {
          const [requesterRes, attendeeRes] = await Promise.all([
            supabase.from('profiles').select('full_name, email').eq('user_id', meeting.requester_id).single(),
            supabase.from('profiles').select('full_name, email').eq('user_id', meeting.attendee_id).single(),
          ]);
          return {
            ...meeting,
            requester: requesterRes.data,
            attendee: attendeeRes.data,
          };
        })
      );

      setMeetings(meetingsWithProfiles);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (meetingId: string) => {
    try {
      const { error } = await supabase
        .from('meetings')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', meetingId);

      if (error) throw error;
      toast.success('Meeting approved');
    } catch (error) {
      toast.error('Failed to approve meeting');
    }
  };

  const handleReject = async (meetingId: string) => {
    try {
      const { error } = await supabase
        .from('meetings')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', meetingId);

      if (error) throw error;
      toast.success('Meeting rejected');
    } catch (error) {
      toast.error('Failed to reject meeting');
    }
  };

  const generateGoogleCalendarLink = (meeting: Meeting) => {
    const startDate = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`);
    const endDate = new Date(startDate.getTime() + meeting.duration_minutes * 60000);
    
    const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: meeting.title,
      dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
      details: meeting.description || '',
      sf: 'true',
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success/10 text-success border-success/30">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Rejected</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-warning/10 text-warning border-warning/30">Pending</Badge>;
    }
  };

  const pendingMeetings = meetings.filter(m => m.status === 'pending' && m.attendee_id === user?.id);
  const upcomingMeetings = meetings.filter(m => m.status === 'approved');
  const myRequests = meetings.filter(m => m.requester_id === user?.id);

  return (
    <div className="space-y-4">
      {/* Pending Approvals (for HR/attendees) */}
      {pendingMeetings.length > 0 && (
        <Card className="glass-card border-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-3">
                {pendingMeetings.map((meeting) => (
                  <div key={meeting.id} className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{meeting.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {meeting.requester?.full_name || 'Unknown'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-success hover:bg-success/10"
                          onClick={() => handleApprove(meeting.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleReject(meeting.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {getDateLabel(meeting.scheduled_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {meeting.scheduled_time.slice(0, 5)}
                      </span>
                      <span>{meeting.duration_minutes} min</span>
                    </div>
                    {meeting.reason && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Reason: {meeting.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Meetings */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            Upcoming Meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[300px]">
            {upcomingMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming meetings
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{meeting.title}</p>
                        <p className="text-xs text-muted-foreground">
                          with {meeting.requester_id === user?.id ? meeting.attendee?.full_name : meeting.requester?.full_name}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => window.open(generateGoogleCalendarLink(meeting), '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Add to Calendar
                      </Button>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {getDateLabel(meeting.scheduled_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {meeting.scheduled_time.slice(0, 5)}
                      </span>
                      <span>{meeting.duration_minutes} min</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* My Meeting Requests */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-secondary" />
            My Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[200px]">
            {myRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No meeting requests
              </p>
            ) : (
              <div className="space-y-2">
                {myRequests.map((meeting) => (
                  <div key={meeting.id} className="p-2 rounded-lg bg-muted/30 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {getDateLabel(meeting.scheduled_date)} at {meeting.scheduled_time.slice(0, 5)}
                      </p>
                    </div>
                    {getStatusBadge(meeting.status)}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
