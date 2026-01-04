import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Rocket, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const environments = [
  { value: 'development', label: 'Development' },
  { value: 'staging', label: 'Staging' },
  { value: 'production', label: 'Production' },
];

interface DeploymentRequest {
  id: string;
  service_name: string;
  environment: string;
  status: string;
  created_at: string;
}

export function DeploymentWorkflow() {
  const { user } = useAuth();
  const [serviceName, setServiceName] = useState('');
  const [environment, setEnvironment] = useState('staging');
  const [version, setVersion] = useState('');
  const [loading, setLoading] = useState(false);
  const [deployments, setDeployments] = useState<DeploymentRequest[]>([]);

  useEffect(() => {
    fetchDeployments();
  }, []);

  const fetchDeployments = async () => {
    const { data } = await supabase
      .from('deployment_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (data) setDeployments(data);
  };

  const submitDeployment = async () => {
    if (!user || !serviceName || !environment) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Production deployments require extra approval
    if (environment === 'production') {
      toast.warning('Production deployments require senior developer approval');
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('deployment_requests').insert({
        requester_id: user.id,
        service_name: serviceName,
        environment,
        version: version || 'latest',
        status: 'pending',
      });

      if (error) throw error;

      toast.success(`Deployment request for ${serviceName} submitted`);
      setServiceName('');
      setVersion('');
      fetchDeployments();
    } catch (error) {
      console.error('Error submitting deployment:', error);
      toast.error('Failed to submit deployment request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'deployed':
        return <Badge className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] text-[10px]"><CheckCircle className="w-3 h-3 mr-1" />Deployed</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive text-[10px]"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] text-[10px]"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Rocket className="w-4 h-4 text-primary" />
          Deployment Request
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Service Name"
          value={serviceName}
          onChange={(e) => setServiceName(e.target.value)}
          className="h-8 text-xs"
        />

        <div className="flex gap-2">
          <Select value={environment} onValueChange={setEnvironment}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Environment" />
            </SelectTrigger>
            <SelectContent>
              {environments.map((e) => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="h-8 text-xs w-24"
          />
        </div>

        <Button 
          onClick={submitDeployment} 
          disabled={loading || !serviceName}
          className="w-full h-8 text-xs"
          size="sm"
        >
          {loading ? 'Submitting...' : 'Request Deployment'}
        </Button>

        {deployments.length > 0 && (
          <div className="pt-2 border-t border-border space-y-2">
            <p className="text-xs text-muted-foreground">Recent Deployments</p>
            {deployments.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium">{d.service_name}</span>
                  <span className="text-muted-foreground ml-1">→ {d.environment}</span>
                </div>
                {getStatusBadge(d.status)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
