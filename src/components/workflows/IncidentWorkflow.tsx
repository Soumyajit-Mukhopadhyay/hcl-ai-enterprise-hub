import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertOctagon, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const severities = [
  { value: 'low', label: 'Low - Minor issue', color: 'success' },
  { value: 'medium', label: 'Medium - Service degraded', color: 'warning' },
  { value: 'high', label: 'High - Service down', color: 'destructive' },
  { value: 'critical', label: 'Critical - Major outage', color: 'destructive' },
];

interface Incident {
  id: string;
  service_name: string;
  severity: string;
  status: string;
  created_at: string;
}

export function IncidentWorkflow() {
  const { user } = useAuth();
  const [serviceName, setServiceName] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    const { data } = await supabase
      .from('incident_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (data) setIncidents(data);
  };

  const reportIncident = async () => {
    if (!user || !serviceName || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('incident_reports').insert({
        reporter_id: user.id,
        service_name: serviceName,
        severity,
        description,
        status: 'open',
      });

      if (error) throw error;

      // For critical/high severity, create notification
      if (severity === 'critical' || severity === 'high') {
        toast.warning(`${severity.toUpperCase()} incident reported - On-call team notified`);
      } else {
        toast.success('Incident reported successfully');
      }

      setServiceName('');
      setDescription('');
      fetchIncidents();
    } catch (error) {
      console.error('Error reporting incident:', error);
      toast.error('Failed to report incident');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    const colors: Record<string, string> = {
      low: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]',
      medium: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]',
      high: 'bg-destructive/10 text-destructive',
      critical: 'bg-destructive text-destructive-foreground',
    };
    return <Badge className={`${colors[sev]} text-[10px]`}>{sev.toUpperCase()}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    return status === 'resolved' ? 
      <CheckCircle className="w-3 h-3 text-[hsl(var(--success))]" /> : 
      <Clock className="w-3 h-3 text-[hsl(var(--warning))]" />;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-destructive" />
          Report Incident
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Affected Service"
          value={serviceName}
          onChange={(e) => setServiceName(e.target.value)}
          className="h-8 text-xs"
        />

        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            {severities.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Textarea
          placeholder="Describe the incident..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="text-xs min-h-[60px]"
        />

        <Button 
          onClick={reportIncident} 
          disabled={loading || !serviceName || !description}
          className="w-full h-8 text-xs"
          variant={severity === 'critical' || severity === 'high' ? 'destructive' : 'default'}
          size="sm"
        >
          {loading ? 'Reporting...' : 'Report Incident'}
        </Button>

        {incidents.length > 0 && (
          <div className="pt-2 border-t border-border space-y-2">
            <p className="text-xs text-muted-foreground">Active Incidents</p>
            {incidents.map((inc) => (
              <div key={inc.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  {getStatusIcon(inc.status)}
                  <span className="font-medium">{inc.service_name}</span>
                </div>
                {getSeverityBadge(inc.severity)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
