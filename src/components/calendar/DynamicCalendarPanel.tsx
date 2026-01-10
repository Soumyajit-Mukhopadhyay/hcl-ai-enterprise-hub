import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ExternalLink, 
  Check, 
  X, 
  User, 
  Video,
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

export function DynamicCalendarPanel() {
  const { user, role } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (user) {
      fetchMeetings();

      // Subscribe to realtime updates
      const channel = supabase
        .channel('meetings-dynamic')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => {
          fetchMeetings();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
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

      // Fetch profile info
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
      await supabase
        .from('meetings')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', meetingId);

      toast.success('Meeting approved');
      
      // Create notification for requester
      const meeting = meetings.find(m => m.id === meetingId);
      if (meeting) {
        await supabase.from('notifications').insert({
          user_id: meeting.requester_id,
          title: 'Meeting Approved',
          message: `Your meeting "${meeting.title}" has been approved`,
          type: 'success'
        });
      }
    } catch (error) {
      toast.error('Failed to approve meeting');
    }
  };

  const handleReject = async (meetingId: string) => {
    try {
      await supabase
        .from('meetings')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', meetingId);

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
      details: meeting.description || `Meeting with ${meeting.attendee?.full_name || 'attendee'}`,
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
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pending</Badge>;
    }
  };

  // Get dates with events for calendar highlighting
  const datesWithEvents = meetings
    .filter(m => m.status === 'approved' || m.status === 'pending')
    .map(m => parseISO(m.scheduled_date));

  // Filter meetings for selected date
  const selectedDateMeetings = selectedDate 
    ? meetings.filter(m => isSameDay(parseISO(m.scheduled_date), selectedDate))
    : [];

  const pendingMeetings = meetings.filter(m => m.status === 'pending' && m.attendee_id === user?.id);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini Calendar */}
        <div className="rounded-lg border border-border p-2">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="p-0 pointer-events-auto"
            modifiers={{
              hasEvent: datesWithEvents,
            }}
            modifiersStyles={{
              hasEvent: {
                fontWeight: 'bold',
                backgroundColor: 'hsl(var(--primary) / 0.1)',
                borderRadius: '50%',
              }
            }}
          />
        </div>

        {/* Selected Date Events */}
        {selectedDate && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">
                {format(selectedDate, 'MMMM d, yyyy')}
              </h4>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                    <Plus className="h-3 w-3" />
                    Add Event
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3">
                  <p className="text-sm text-muted-foreground mb-2">
                    Ask the AI Assistant to schedule a meeting:
                  </p>
                  <p className="text-xs bg-muted p-2 rounded italic">
                    "Schedule a meeting with [name] on {format(selectedDate, 'MMM d')} at 2pm"
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            
            <ScrollArea className="max-h-[150px]">
              {selectedDateMeetings.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No events on this day
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedDateMeetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className="p-2 rounded-lg bg-muted/50 border border-border text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate flex-1">{meeting.title}</span>
                        {getStatusBadge(meeting.status)}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {meeting.scheduled_time.slice(0, 5)}
                        <span>•</span>
                        <span>{meeting.duration_minutes} min</span>
                      </div>
                      {meeting.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2 h-7 text-xs gap-1"
                          onClick={() => window.open(generateGoogleCalendarLink(meeting), '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Add to Google Calendar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Pending Approvals */}
        {pendingMeetings.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="h-3 w-3 text-yellow-500" />
              Pending Approval ({pendingMeetings.length})
            </h4>
            <ScrollArea className="max-h-[150px]">
              <div className="space-y-2">
                {pendingMeetings.map((meeting) => (
                  <div key={meeting.id} className="p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{meeting.title}</span>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-green-600 hover:bg-green-500/10"
                          onClick={() => handleApprove(meeting.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:bg-destructive/10"
                          onClick={() => handleReject(meeting.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {meeting.requester?.full_name} • {getDateLabel(meeting.scheduled_date)}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
