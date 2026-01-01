import { useState } from 'react';
import { DollarSign, Download, FileText, TrendingUp, TrendingDown, Calendar, ChevronDown, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PayslipData {
  month: string;
  year: number;
  basic: number;
  hra: number;
  allowances: number;
  deductions: number;
  tax: number;
  netPay: number;
  status: 'paid' | 'pending';
  paidDate?: string;
}

const mockPayslips: PayslipData[] = [
  {
    month: 'December',
    year: 2025,
    basic: 85000,
    hra: 34000,
    allowances: 15000,
    deductions: 8500,
    tax: 22500,
    netPay: 103000,
    status: 'paid',
    paidDate: '2025-12-31',
  },
  {
    month: 'November',
    year: 2025,
    basic: 85000,
    hra: 34000,
    allowances: 15000,
    deductions: 8500,
    tax: 22500,
    netPay: 103000,
    status: 'paid',
    paidDate: '2025-11-30',
  },
  {
    month: 'October',
    year: 2025,
    basic: 85000,
    hra: 34000,
    allowances: 12000,
    deductions: 8500,
    tax: 22000,
    netPay: 100500,
    status: 'paid',
    paidDate: '2025-10-31',
  },
];

const taxDeclarations = [
  { section: '80C', limit: 150000, declared: 125000, description: 'PPF, ELSS, LIC, etc.' },
  { section: '80D', limit: 50000, declared: 25000, description: 'Health Insurance' },
  { section: 'HRA', limit: 408000, declared: 408000, description: 'House Rent Allowance' },
  { section: '80E', limit: 0, declared: 0, description: 'Education Loan Interest' },
];

interface PayrollWorkflowProps {
  onDownloadPayslip?: (month: string, year: number) => void;
}

export function PayrollWorkflow({ onDownloadPayslip }: PayrollWorkflowProps) {
  const [selectedYear, setSelectedYear] = useState('2025');
  const [expandedPayslip, setExpandedPayslip] = useState<string | null>('December-2025');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const currentPayslip = mockPayslips[0];
  const previousPayslip = mockPayslips[1];
  const netPayChange = ((currentPayslip.netPay - previousPayslip.netPay) / previousPayslip.netPay) * 100;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Current Month</span>
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{formatCurrency(currentPayslip.netPay)}</div>
            <div className="flex items-center gap-1 mt-1">
              {netPayChange >= 0 ? (
                <TrendingUp className="w-3 h-3 text-success" />
              ) : (
                <TrendingDown className="w-3 h-3 text-destructive" />
              )}
              <span className={cn("text-xs", netPayChange >= 0 ? "text-success" : "text-destructive")}>
                {netPayChange >= 0 ? '+' : ''}{netPayChange.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">YTD Earnings</span>
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <div className="text-2xl font-bold">{formatCurrency(1236000)}</div>
            <div className="text-xs text-muted-foreground mt-1">12 months</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Tax Paid</span>
              <FileText className="w-4 h-4 text-warning" />
            </div>
            <div className="text-2xl font-bold">{formatCurrency(270000)}</div>
            <div className="text-xs text-muted-foreground mt-1">FY 2025-26</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Tax Saved</span>
              <Calendar className="w-4 h-4 text-success" />
            </div>
            <div className="text-2xl font-bold">{formatCurrency(46800)}</div>
            <div className="text-xs text-muted-foreground mt-1">Via declarations</div>
          </CardContent>
        </Card>
      </div>

      {/* Payslip History */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Payslip History
          </CardTitle>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockPayslips.map((payslip) => {
              const key = `${payslip.month}-${payslip.year}`;
              const isExpanded = expandedPayslip === key;
              
              return (
                <div key={key} className="border border-border rounded-lg overflow-hidden">
                  <div
                    className={cn(
                      "flex items-center justify-between p-4 cursor-pointer",
                      "hover:bg-muted/50 transition-colors"
                    )}
                    onClick={() => setExpandedPayslip(isExpanded ? null : key)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{payslip.month} {payslip.year}</div>
                        <div className="text-xs text-muted-foreground">
                          Paid on {payslip.paidDate}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(payslip.netPay)}</div>
                        <Badge variant="default" className="text-xs">Paid</Badge>
                      </div>
                      <ChevronDown className={cn(
                        "w-5 h-5 text-muted-foreground transition-transform",
                        isExpanded && "transform rotate-180"
                      )} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border p-4 bg-muted/30">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Basic</div>
                          <div className="font-medium">{formatCurrency(payslip.basic)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">HRA</div>
                          <div className="font-medium">{formatCurrency(payslip.hra)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Allowances</div>
                          <div className="font-medium">{formatCurrency(payslip.allowances)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground text-destructive">Deductions</div>
                          <div className="font-medium text-destructive">-{formatCurrency(payslip.deductions)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground text-warning">Tax</div>
                          <div className="font-medium text-warning">-{formatCurrency(payslip.tax)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground text-success">Net Pay</div>
                          <div className="font-bold text-success">{formatCurrency(payslip.netPay)}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => onDownloadPayslip?.(payslip.month, payslip.year)}>
                          <Download className="w-4 h-4" />
                          Download PDF
                        </Button>
                        <Button size="sm" variant="ghost" className="gap-2">
                          <Eye className="w-4 h-4" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tax Declarations */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Tax Declarations (FY 2025-26)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {taxDeclarations.map((dec) => (
              <div key={dec.section} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Section {dec.section}</span>
                    <span className="text-xs text-muted-foreground ml-2">{dec.description}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{formatCurrency(dec.declared)}</span>
                    {dec.limit > 0 && (
                      <span className="text-muted-foreground"> / {formatCurrency(dec.limit)}</span>
                    )}
                  </div>
                </div>
                {dec.limit > 0 && (
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min((dec.declared / dec.limit) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
