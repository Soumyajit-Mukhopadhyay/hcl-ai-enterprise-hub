import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const months = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 3 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

interface PayslipData {
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  pf: number;
  tax: number;
  netSalary: number;
}

export function PayslipWorkflow() {
  const { user } = useAuth();
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(currentYear));
  const [loading, setLoading] = useState(false);
  const [payslip, setPayslip] = useState<PayslipData | null>(null);

  const generatePayslip = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Generate mock payslip data
      const basicSalary = 85000;
      const hra = basicSalary * 0.4;
      const specialAllowance = 15000;
      const pf = basicSalary * 0.12;
      const tax = (basicSalary + hra + specialAllowance) * 0.1;
      const netSalary = basicSalary + hra + specialAllowance - pf - tax;

      const payslipData: PayslipData = {
        basicSalary,
        hra,
        specialAllowance,
        pf,
        tax,
        netSalary,
      };

      // Save to database
      await supabase.from('payslip_requests').insert({
        user_id: user.id,
        month: parseInt(month),
        year: parseInt(year),
        payslip_data: payslipData as any,
        status: 'generated',
      });

      setPayslip(payslipData);
      toast.success(`Payslip for ${months[parseInt(month) - 1].label} ${year} generated`);
    } catch (error) {
      console.error('Error generating payslip:', error);
      toast.error('Failed to generate payslip');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Payslip Request
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-8 text-xs w-24">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={generatePayslip} 
          disabled={loading}
          className="w-full h-8 text-xs"
          size="sm"
        >
          {loading ? 'Generating...' : 'Generate Payslip'}
        </Button>

        {payslip && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Basic Salary</span>
              <span>{formatCurrency(payslip.basicSalary)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">HRA</span>
              <span className="text-[hsl(var(--success))]">+{formatCurrency(payslip.hra)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Special Allowance</span>
              <span className="text-[hsl(var(--success))]">+{formatCurrency(payslip.specialAllowance)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">PF Deduction</span>
              <span className="text-destructive">-{formatCurrency(payslip.pf)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tax</span>
              <span className="text-destructive">-{formatCurrency(payslip.tax)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
              <span>Net Salary</span>
              <span className="text-primary">{formatCurrency(payslip.netSalary)}</span>
            </div>
            <Badge variant="outline" className="w-full justify-center gap-1 mt-2">
              <CheckCircle className="w-3 h-3" />
              Generated Successfully
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
