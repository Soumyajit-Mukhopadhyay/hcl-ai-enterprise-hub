import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const trainingTypes = [
  { value: 'technical', label: 'Technical Skills' },
  { value: 'soft_skills', label: 'Soft Skills' },
  { value: 'certification', label: 'Certification' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'compliance', label: 'Compliance' },
];

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function TrainingWorkflow() {
  const { user } = useAuth();
  const [trainingName, setTrainingName] = useState('');
  const [trainingType, setTrainingType] = useState('');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);

  const submitRequest = async () => {
    if (!user || !trainingName || !trainingType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('training_requests').insert({
        user_id: user.id,
        training_name: trainingName,
        training_type: trainingType,
        priority,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Training request submitted for approval');
      setTrainingName('');
      setTrainingType('');
      setPriority('medium');
    } catch (error) {
      console.error('Error submitting training request:', error);
      toast.error('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-secondary" />
          Request Training
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Training/Course Name"
          value={trainingName}
          onChange={(e) => setTrainingName(e.target.value)}
          className="h-8 text-xs"
        />

        <Select value={trainingType} onValueChange={setTrainingType}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Training Type" />
          </SelectTrigger>
          <SelectContent>
            {trainingTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {priorities.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button 
          onClick={submitRequest} 
          disabled={loading || !trainingName || !trainingType}
          className="w-full h-8 text-xs"
          size="sm"
        >
          {loading ? 'Submitting...' : 'Request Training'}
        </Button>
      </CardContent>
    </Card>
  );
}
