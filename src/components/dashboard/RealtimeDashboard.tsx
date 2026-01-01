import { useState, useEffect } from 'react';
import { 
  Users, MessageSquare, CheckCircle, Clock, TrendingUp, 
  AlertTriangle, Activity, Zap, BarChart3, PieChart 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Simulated real-time data
const generateRealtimeData = () => ({
  activeUsers: Math.floor(2200 + Math.random() * 300),
  queriesPerHour: Math.floor(150 + Math.random() * 50),
  avgResponseTime: (0.8 + Math.random() * 0.6).toFixed(2),
  actionSuccessRate: (94 + Math.random() * 5).toFixed(1),
  pendingApprovals: Math.floor(5 + Math.random() * 10),
  ticketsResolved: Math.floor(45 + Math.random() * 20),
});

const queryTrendData = [
  { time: '00:00', queries: 45, actions: 12 },
  { time: '04:00', queries: 23, actions: 5 },
  { time: '08:00', queries: 156, actions: 34 },
  { time: '12:00', queries: 234, actions: 56 },
  { time: '16:00', queries: 189, actions: 42 },
  { time: '20:00', queries: 98, actions: 23 },
  { time: 'Now', queries: 167, actions: 38 },
];

const domainDistribution = [
  { name: 'HR Ops', value: 45, color: 'hsl(var(--primary))' },
  { name: 'IT Desk', value: 30, color: 'hsl(var(--secondary))' },
  { name: 'Dev Hub', value: 15, color: 'hsl(var(--accent))' },
  { name: 'General', value: 10, color: 'hsl(var(--muted))' },
];

const riskDistribution = [
  { level: 'Low', count: 156, color: 'hsl(var(--success))' },
  { level: 'Medium', count: 42, color: 'hsl(var(--warning))' },
  { level: 'High', count: 8, color: 'hsl(var(--destructive))' },
];

const topQueries = [
  { query: 'Leave balance inquiry', count: 234 },
  { query: 'Password reset', count: 189 },
  { query: 'Revenue FY25', count: 156 },
  { query: 'Meeting scheduling', count: 134 },
  { query: 'Payslip download', count: 98 },
];

export function RealtimeDashboard() {
  const [stats, setStats] = useState(generateRealtimeData());
  const [pulseKey, setPulseKey] = useState(0);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(generateRealtimeData());
      setPulseKey(prev => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Live Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard 
          key={`users-${pulseKey}`}
          title="Active Users" 
          value={stats.activeUsers.toLocaleString()} 
          icon={Users} 
          trend={+2.4}
          color="primary"
        />
        <StatCard 
          key={`queries-${pulseKey}`}
          title="Queries/Hour" 
          value={stats.queriesPerHour.toString()} 
          icon={MessageSquare}
          trend={+5.2}
          color="secondary"
        />
        <StatCard 
          key={`response-${pulseKey}`}
          title="Avg Response" 
          value={`${stats.avgResponseTime}s`} 
          icon={Zap}
          trend={-12.5}
          color="success"
        />
        <StatCard 
          key={`success-${pulseKey}`}
          title="Success Rate" 
          value={`${stats.actionSuccessRate}%`} 
          icon={CheckCircle}
          color="success"
        />
        <StatCard 
          key={`pending-${pulseKey}`}
          title="Pending Approvals" 
          value={stats.pendingApprovals.toString()} 
          icon={Clock}
          color="warning"
        />
        <StatCard 
          key={`resolved-${pulseKey}`}
          title="Tickets Resolved" 
          value={stats.ticketsResolved.toString()} 
          icon={Activity}
          trend={+8.3}
          color="primary"
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Query Trend Chart */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Query & Action Trend (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={queryTrendData}>
                <defs>
                  <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Area type="monotone" dataKey="queries" stroke="hsl(var(--primary))" fill="url(#colorQueries)" strokeWidth={2} />
                <Area type="monotone" dataKey="actions" stroke="hsl(var(--secondary))" fill="url(#colorActions)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Domain Distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="w-4 h-4 text-secondary" />
              Query Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPie>
                <Pie
                  data={domainDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {domainDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
              </RechartsPie>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Risk Distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {riskDistribution.map(risk => (
              <div key={risk.level} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{risk.level} Risk</span>
                  <span className="font-medium">{risk.count}</span>
                </div>
                <Progress 
                  value={(risk.count / 206) * 100} 
                  className="h-2"
                  style={{ '--progress-color': risk.color } as React.CSSProperties}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Queries */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Top Queries Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topQueries} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="query" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = 'primary' 
}: { 
  title: string; 
  value: string; 
  icon: React.ElementType; 
  trend?: number;
  color?: 'primary' | 'secondary' | 'success' | 'warning';
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  };

  return (
    <Card className="glass-card animate-pulse-subtle">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
          {trend !== undefined && (
            <span className={`text-xs font-medium ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}
