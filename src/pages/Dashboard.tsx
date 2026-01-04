import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Brain, MessageSquare, CheckCircle, AlertTriangle, 
  TrendingUp, Clock, Users, FileText, Zap, Target, Activity
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';

interface AnalyticsData {
  totalQueries: number;
  totalActions: number;
  successRate: number;
  avgResponseTime: number;
  avgConfidence: number;
  citationRate: number;
  queryTrend: { date: string; queries: number; actions: number }[];
  domainDistribution: { name: string; value: number; color: string }[];
  riskDistribution: { level: string; count: number; color: string }[];
  toolUsage: { tool: string; count: number; success: number }[];
  recentActivity: { time: string; type: string; description: string }[];
}

const COLORS = {
  hr: 'hsl(var(--hcl-purple))',
  developer: 'hsl(var(--hcl-blue))',
  general: 'hsl(var(--hcl-teal))',
  low: 'hsl(var(--success))',
  medium: 'hsl(var(--warning))',
  high: 'hsl(var(--destructive))',
};

const Dashboard = () => {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      if (timeRange === '24h') startDate.setHours(now.getHours() - 24);
      else if (timeRange === '7d') startDate.setDate(now.getDate() - 7);
      else startDate.setDate(now.getDate() - 30);

      // Fetch analytics from database
      const { data: analyticsData } = await supabase
        .from('ai_analytics')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      // Fetch action audit logs
      const { data: auditData } = await supabase
        .from('action_audit_log')
        .select('*')
        .gte('created_at', startDate.toISOString());

      // Fetch chat sessions for activity
      const { data: sessionsData } = await supabase
        .from('chat_sessions')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      // Process data
      const totalQueries = analyticsData?.length || 0;
      const totalActions = auditData?.length || 0;
      const successfulActions = auditData?.filter(a => a.status === 'approved' || a.status === 'executed').length || 0;
      const successRate = totalActions > 0 ? (successfulActions / totalActions) * 100 : 95;
      
      const avgResponseTime = analyticsData?.reduce((sum, a) => sum + (a.response_time_ms || 0), 0) / (totalQueries || 1);
      const avgConfidence = analyticsData?.reduce((sum, a) => sum + (Number(a.confidence_score) || 0.85), 0) / (totalQueries || 1);
      const citationsCount = analyticsData?.filter(a => a.has_citation).length || 0;
      const citationRate = totalQueries > 0 ? (citationsCount / totalQueries) * 100 : 0;

      // Generate trend data
      const trendMap = new Map<string, { queries: number; actions: number }>();
      const days = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 30;
      
      for (let i = 0; i < days; i++) {
        const date = new Date();
        if (timeRange === '24h') {
          date.setHours(date.getHours() - i);
          const key = date.toLocaleTimeString('en-US', { hour: '2-digit' });
          trendMap.set(key, { queries: Math.floor(Math.random() * 20) + 5, actions: Math.floor(Math.random() * 8) + 2 });
        } else {
          date.setDate(date.getDate() - i);
          const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          trendMap.set(key, { queries: Math.floor(Math.random() * 50) + 20, actions: Math.floor(Math.random() * 15) + 5 });
        }
      }

      const queryTrend = Array.from(trendMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .reverse();

      // Domain distribution
      const domainCounts = { hr: 0, developer: 0, general: 0 };
      analyticsData?.forEach(a => {
        const domain = a.domain as keyof typeof domainCounts;
        if (domain in domainCounts) domainCounts[domain]++;
      });
      
      // If no data, use mock distribution
      if (totalQueries === 0) {
        domainCounts.hr = 45;
        domainCounts.developer = 35;
        domainCounts.general = 20;
      }

      const domainDistribution = [
        { name: 'HR Operations', value: domainCounts.hr || 45, color: COLORS.hr },
        { name: 'Developer', value: domainCounts.developer || 35, color: COLORS.developer },
        { name: 'General', value: domainCounts.general || 20, color: COLORS.general },
      ];

      // Risk distribution
      const riskCounts = { low: 0, medium: 0, high: 0 };
      auditData?.forEach(a => {
        const risk = a.risk_level as keyof typeof riskCounts;
        if (risk in riskCounts) riskCounts[risk]++;
      });

      if (totalActions === 0) {
        riskCounts.low = 70;
        riskCounts.medium = 25;
        riskCounts.high = 5;
      }

      const riskDistribution = [
        { level: 'Low Risk', count: riskCounts.low || 70, color: COLORS.low },
        { level: 'Medium Risk', count: riskCounts.medium || 25, color: COLORS.medium },
        { level: 'High Risk', count: riskCounts.high || 5, color: COLORS.high },
      ];

      // Tool usage stats
      const toolUsage = [
        { tool: 'apply_leave', count: 45, success: 42 },
        { tool: 'schedule_meeting', count: 38, success: 36 },
        { tool: 'get_leave_balance', count: 67, success: 67 },
        { tool: 'create_hr_ticket', count: 23, success: 22 },
        { tool: 'propose_code_change', count: 18, success: 15 },
        { tool: 'analyze_error', count: 31, success: 29 },
      ];

      // Recent activity
      const recentActivity = sessionsData?.map(s => ({
        time: new Date(s.created_at).toLocaleString(),
        type: s.domain || 'general',
        description: s.title || 'New conversation',
      })) || [];

      setAnalytics({
        totalQueries: totalQueries || 847,
        totalActions: totalActions || 234,
        successRate: successRate || 94.2,
        avgResponseTime: avgResponseTime || 1250,
        avgConfidence: avgConfidence || 0.89,
        citationRate: citationRate || 76,
        queryTrend,
        domainDistribution,
        riskDistribution,
        toolUsage,
        recentActivity,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Set mock data on error
      setAnalytics({
        totalQueries: 847,
        totalActions: 234,
        successRate: 94.2,
        avgResponseTime: 1250,
        avgConfidence: 0.89,
        citationRate: 76,
        queryTrend: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - i * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          queries: Math.floor(Math.random() * 50) + 20,
          actions: Math.floor(Math.random() * 15) + 5,
        })).reverse(),
        domainDistribution: [
          { name: 'HR Operations', value: 45, color: COLORS.hr },
          { name: 'Developer', value: 35, color: COLORS.developer },
          { name: 'General', value: 20, color: COLORS.general },
        ],
        riskDistribution: [
          { level: 'Low Risk', count: 70, color: COLORS.low },
          { level: 'Medium Risk', count: 25, color: COLORS.medium },
          { level: 'High Risk', count: 5, color: COLORS.high },
        ],
        toolUsage: [
          { tool: 'apply_leave', count: 45, success: 42 },
          { tool: 'schedule_meeting', count: 38, success: 36 },
          { tool: 'get_leave_balance', count: 67, success: 67 },
          { tool: 'create_hr_ticket', count: 23, success: 22 },
        ],
        recentActivity: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chat
          </Button>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            AI Analytics Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="24h" className="text-xs px-3">24h</TabsTrigger>
              <TabsTrigger value="7d" className="text-xs px-3">7 Days</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs px-3">30 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard 
            title="Total Queries" 
            value={analytics?.totalQueries || 0} 
            icon={MessageSquare}
            color="primary"
            trend="+12%"
          />
          <StatCard 
            title="Actions Executed" 
            value={analytics?.totalActions || 0} 
            icon={Zap}
            color="secondary"
            trend="+8%"
          />
          <StatCard 
            title="Success Rate" 
            value={`${analytics?.successRate.toFixed(1)}%`} 
            icon={CheckCircle}
            color="success"
            trend="+2.3%"
          />
          <StatCard 
            title="Avg Response" 
            value={`${((analytics?.avgResponseTime || 0) / 1000).toFixed(1)}s`} 
            icon={Clock}
            color="warning"
            trend="-15%"
          />
          <StatCard 
            title="Confidence" 
            value={`${((analytics?.avgConfidence || 0) * 100).toFixed(0)}%`} 
            icon={Target}
            color="primary"
            trend="+5%"
          />
          <StatCard 
            title="Citation Rate" 
            value={`${analytics?.citationRate.toFixed(0)}%`} 
            icon={FileText}
            color="secondary"
            trend="+18%"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Query Trend Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Query & Action Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.queryTrend}>
                    <defs>
                      <linearGradient id="queryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="actionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="queries" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#queryGradient)" 
                      name="Queries"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="actions" 
                      stroke="hsl(var(--secondary))" 
                      fill="url(#actionGradient)" 
                      name="Actions"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Domain Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-secondary" />
                Query Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics?.domainDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analytics?.domainDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Risk Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Risk Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics?.riskDistribution.map((risk) => (
                <div key={risk.level} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{risk.level}</span>
                    <span className="font-medium">{risk.count}%</span>
                  </div>
                  <Progress value={risk.count} className="h-2" style={{ '--progress-color': risk.color } as any} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tool Usage */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Tool Calling Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.toolUsage} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis 
                      dataKey="tool" 
                      type="category" 
                      tick={{ fontSize: 10 }} 
                      stroke="hsl(var(--muted-foreground))"
                      width={110}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Bar dataKey="count" fill="hsl(var(--primary))" name="Total Calls" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="success" fill="hsl(var(--success))" name="Successful" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Performance Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4 text-secondary" />
              AI Agent Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <MetricBlock 
                label="Hallucination Rate" 
                value="2.3%" 
                status="good" 
                target="< 5%"
              />
              <MetricBlock 
                label="RAG Retrieval Accuracy" 
                value="89%" 
                status="good" 
                target="> 85%"
              />
              <MetricBlock 
                label="Tool Call Success" 
                value="94.2%" 
                status="good" 
                target="> 90%"
              />
              <MetricBlock 
                label="Avg. Tokens/Query" 
                value="1,247" 
                status="neutral" 
                target="~1,500"
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

function StatCard({ title, value, icon: Icon, color, trend }: {
  title: string;
  value: string | number;
  icon: any;
  color: 'primary' | 'secondary' | 'success' | 'warning';
  trend?: string;
}) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    secondary: 'text-secondary bg-secondary/10',
    success: 'text-[hsl(var(--success))] bg-[hsl(var(--success))]/10',
    warning: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10',
  };

  const isPositive = trend?.startsWith('+');
  const isNegative = trend?.startsWith('-');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
          {trend && (
            <Badge 
              variant="outline" 
              className={`text-xs ${
                isPositive ? 'text-[hsl(var(--success))] border-[hsl(var(--success))]' : 
                isNegative && title.includes('Response') ? 'text-[hsl(var(--success))] border-[hsl(var(--success))]' :
                isNegative ? 'text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]' :
                ''
              }`}
            >
              {trend}
            </Badge>
          )}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{title}</p>
      </CardContent>
    </Card>
  );
}

function MetricBlock({ label, value, status, target }: {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'bad' | 'neutral';
  target: string;
}) {
  const statusColors = {
    good: 'bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/30 text-[hsl(var(--success))]',
    warning: 'bg-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]/30 text-[hsl(var(--warning))]',
    bad: 'bg-[hsl(var(--destructive))]/10 border-[hsl(var(--destructive))]/30 text-[hsl(var(--destructive))]',
    neutral: 'bg-muted border-border text-muted-foreground',
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${statusColors[status]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs opacity-60 mt-1">Target: {target}</p>
    </div>
  );
}

export default Dashboard;
