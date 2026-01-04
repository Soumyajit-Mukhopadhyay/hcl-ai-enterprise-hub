import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const resourceTypes = [
  { value: 'repository', label: 'Git Repository' },
  { value: 'database', label: 'Database' },
  { value: 'server', label: 'Server/VM' },
  { value: 'api', label: 'API/Service' },
  { value: 'dashboard', label: 'Dashboard/Tool' },
];

const accessLevels = [
  { value: 'read', label: 'Read Only' },
  { value: 'write', label: 'Read/Write' },
  { value: 'admin', label: 'Admin' },
];

export function AccessRequestWorkflow() {
  const { user } = useAuth();
  const [resourceType, setResourceType] = useState('');
  const [resourceName, setResourceName] = useState('');
  const [accessLevel, setAccessLevel] = useState('read');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const submitRequest = async () => {
    if (!user || !resourceType || !resourceName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('access_requests').insert({
        requester_id: user.id,
        resource_type: resourceType,
        resource_name: resourceName,
        access_level: accessLevel,
        reason,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Access request submitted for approval');
      setResourceType('');
      setResourceName('');
      setReason('');
    } catch (error) {
      console.error('Error submitting access request:', error);
      toast.error('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[hsl(var(--warning))]" />
          Request Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={resourceType} onValueChange={setResourceType}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Resource Type" />
          </SelectTrigger>
          <SelectContent>
            {resourceTypes.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Resource Name (e.g., repo-name)"
          value={resourceName}
          onChange={(e) => setResourceName(e.target.value)}
          className="h-8 text-xs"
        />

        <Select value={accessLevel} onValueChange={setAccessLevel}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Access Level" />
          </SelectTrigger>
          <SelectContent>
            {accessLevels.map((a) => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Textarea
          placeholder="Reason for access"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="text-xs min-h-[60px]"
        />

        <Button 
          onClick={submitRequest} 
          disabled={loading || !resourceType || !resourceName}
          className="w-full h-8 text-xs"
          size="sm"
        >
          {loading ? 'Submitting...' : 'Request Access'}
        </Button>
      </CardContent>
    </Card>
  );
}
