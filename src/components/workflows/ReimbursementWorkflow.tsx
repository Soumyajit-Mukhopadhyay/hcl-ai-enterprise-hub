import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const categories = [
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food & Meals' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'training', label: 'Training & Courses' },
  { value: 'medical', label: 'Medical' },
  { value: 'other', label: 'Other' },
];

export function ReimbursementWorkflow() {
  const { user } = useAuth();
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const submitReimbursement = async () => {
    if (!user || !category || !amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('reimbursement_requests').insert({
        user_id: user.id,
        category,
        amount: parseFloat(amount),
        description,
        status: 'pending',
      });

      if (error) throw error;

      // Create notification for HR
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Reimbursement Submitted',
        message: `Your ${category} reimbursement of ₹${amount} has been submitted for approval.`,
        type: 'info',
      });

      toast.success('Reimbursement request submitted');
      setCategory('');
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error('Error submitting reimbursement:', error);
      toast.error('Failed to submit reimbursement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Receipt className="w-4 h-4 text-[hsl(var(--warning))]" />
          Submit Reimbursement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="Amount (₹)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-8 text-xs"
        />

        <Textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="text-xs min-h-[60px]"
        />

        <Button 
          onClick={submitReimbursement} 
          disabled={loading || !category || !amount}
          className="w-full h-8 text-xs"
          size="sm"
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </CardContent>
    </Card>
  );
}
