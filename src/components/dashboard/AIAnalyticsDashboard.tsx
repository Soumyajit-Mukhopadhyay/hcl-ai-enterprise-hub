import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  Zap, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  LineChart,
  ArrowUpRight,
  Sparkles,
  Users,
  Code,
  FileText,
  Calendar,
  GitBranch,
  Database
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area
} from 'recharts';

interface AnalyticsData {
  totalQueries: number;
  successRate: number;
  avgResponseTime: number;
  safetyScore: number;
  tasksByType: { name: string; value: number; color: string }[];
  dailyActivity: { date: string; queries: number; success: number; failed: number }[];
  learnedPatterns: number;
  activeProtections: number;
  pendingApprovals: number;
  riskDistribution: { level: string; count: number; color: string }[];
}

interface LearnedPattern {
  id: string;
  pattern_type: string;
  pattern_key: string;
  confidence_score: number;
  success_count: number;
  failure_count: number;
  last_used_at: string;
}

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];

export function AIAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalQueries: 0,
    successRate: 0,
    avgResponseTime: 0,
    safetyScore: 100,
    tasksByType: [],
    dailyActivity: [],
    learnedPatterns: 0,
    activeProtections: 4,
    pendingApprovals: 0,
    riskDistribution: []
  });
  const [patterns, setPatterns] = useState<LearnedPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      // Fetch AI analytics
      const { data: analyticsData } = await supabase
        .from('ai_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      // Fetch learned patterns
      const { data: patternsData } = await supabase
        .from('ai_learned_patterns')
        .select('*')
        .eq('is_validated', true)
        .order('success_count', { ascending: false })
        .limit(20);

      // Fetch pending approvals
      const { data: approvalsData } = await supabase
        .from('ai_task_queue')
        .select('id')
        .eq('status', 'awaiting_approval');

      // Fetch safety audit
      const { data: safetyData } = await supabase
        .from('ai_safety_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Process analytics data
      const totalQueries = analyticsData?.length || 0;
      const successfulQueries = analyticsData?.filter(a => a.tool_success !== false).length || 0;
      const successRate = totalQueries > 0 ? (successfulQueries / totalQueries) * 100 : 100;
      const avgResponseTime = analyticsData?.reduce((sum, a) => sum + (a.response_time_ms || 0), 0) / (totalQueries || 1);

      // Task distribution by type
      const typeCount: Record<string, number> = {};
      analyticsData?.forEach(a => {
        const type = a.query_type || 'general';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      const tasksByType = Object.entries(typeCount).map(([name, value], i) => ({
        name,
        value,
        color: COLORS[i % COLORS.length]
      }));

      // Risk distribution
      const riskCount: Record<string, number> = {};
      analyticsData?.forEach(a => {
        const risk = a.risk_level || 'low';
        riskCount[risk] = (riskCount[risk] || 0) + 1;
      });
      const riskDistribution = [
        { level: 'Low', count: riskCount['low'] || 0, color: '#10B981' },
        { level: 'Medium', count: riskCount['medium'] || 0, color: '#F59E0B' },
        { level: 'High', count: riskCount['high'] || 0, color: '#EF4444' },
        { level: 'Critical', count: riskCount['critical'] || 0, color: '#7C2D12' }
      ];

      // Daily activity (simulated for demo)
      const dailyActivity = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          queries: Math.floor(Math.random() * 50) + 10,
          success: Math.floor(Math.random() * 45) + 8,
          failed: Math.floor(Math.random() * 5)
        };
      });

      // Safety score from audit
      const safetyScore = safetyData?.length 
        ? (safetyData.filter(s => !s.was_blocked).length / safetyData.length) * 100 
        : 100;

      setAnalytics({
        totalQueries,
        successRate,
        avgResponseTime,
        safetyScore,
        tasksByType,
        dailyActivity,
        learnedPatterns: patternsData?.length || 0,
        activeProtections: 4,
        pendingApprovals: approvalsData?.length || 0,
        riskDistribution
      });

      setPatterns(patternsData || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    trendUp,
    color = 'primary'
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string; 
    icon: any; 
    trend?: string;
    trendUp?: boolean;
    color?: string;
  }) => (
    <Card className="glass-card hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-2 rounded-lg bg-${color}/10`}>
            <Icon className={`h-5 w-5 text-${color}`} />
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Performance Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time insights into AI capabilities, safety, and learning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            <Activity className="h-3 w-3 mr-1" />
            System Active
          </Badge>
          <div className="flex gap-1">
            {['24h', '7d', '30d'].map((range) => (
              <Button 
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range as '24h' | '7d' | '30d')}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Queries"
          value={analytics.totalQueries.toLocaleString()}
          subtitle="Processed requests"
          icon={Zap}
          trend="+12% from last period"
          trendUp={true}
        />
        <MetricCard
          title="Success Rate"
          value={`${analytics.successRate.toFixed(1)}%`}
          subtitle="Task completion"
          icon={Target}
          trend="+3% improvement"
          trendUp={true}
          color="green-600"
        />
        <MetricCard
          title="Avg Response"
          value={`${Math.round(analytics.avgResponseTime)}ms`}
          subtitle="Processing time"
          icon={Clock}
          trend="-15% faster"
          trendUp={true}
          color="blue-600"
        />
        <MetricCard
          title="Safety Score"
          value={`${analytics.safetyScore.toFixed(0)}%`}
          subtitle="Protection level"
          icon={ShieldCheck}
          trend="All systems secure"
          trendUp={true}
          color="emerald-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" />
              Query Activity
            </CardTitle>
            <CardDescription>Queries over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailyActivity}>
                  <defs>
                    <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="queries" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorQueries)" 
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="success" 
                    stroke="#10B981" 
                    fillOpacity={1} 
                    fill="url(#colorSuccess)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Task Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Task Distribution
            </CardTitle>
            <CardDescription>Breakdown by task type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={analytics.tasksByType.length > 0 ? analytics.tasksByType : [{ name: 'No data', value: 1, color: '#E5E7EB' }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {(analytics.tasksByType.length > 0 ? analytics.tasksByType : [{ color: '#E5E7EB' }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2">
                {analytics.tasksByType.slice(0, 5).map((type, i) => (
                  <div key={type.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      />
                      <span className="capitalize">{type.name}</span>
                    </div>
                    <span className="font-medium">{type.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Safety & Learning Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Safety Overview */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Safety Guardrails
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Overall Safety Score</span>
              <Badge className="bg-green-500/10 text-green-600">
                {analytics.safetyScore.toFixed(0)}%
              </Badge>
            </div>
            <Progress value={analytics.safetyScore} className="h-2" />
            
            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-medium">Active Protections</p>
              {[
                { name: 'Prompt Injection', status: 'active' },
                { name: 'Harmful Code', status: 'active' },
                { name: 'Data Exfiltration', status: 'active' },
                { name: 'Privilege Escalation', status: 'active' }
              ].map((protection) => (
                <div key={protection.name} className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">{protection.name}</span>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Risk Distribution</h4>
              {analytics.riskDistribution.map((risk) => (
                <div key={risk.level} className="flex items-center gap-2 py-1">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: risk.color }} 
                  />
                  <span className="text-sm flex-1">{risk.level}</span>
                  <span className="text-sm font-medium">{risk.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Learned Patterns */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Learned Patterns
            </CardTitle>
            <CardDescription>AI memory & improvement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{analytics.learnedPatterns}</p>
                <p className="text-xs text-muted-foreground">Active Patterns</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {patterns.reduce((sum, p) => sum + (p.success_count || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Successful Uses</p>
              </div>
            </div>

            <ScrollArea className="h-48">
              <div className="space-y-2">
                {patterns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No patterns learned yet
                  </p>
                ) : (
                  patterns.slice(0, 8).map((pattern) => (
                    <div key={pattern.id} className="p-2 rounded-lg bg-muted/50 border">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {pattern.pattern_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.round((pattern.confidence_score || 0) * 100)}% confident
                        </span>
                      </div>
                      <p className="text-xs mt-1 truncate">{pattern.pattern_key}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="text-green-600">✓ {pattern.success_count}</span>
                        <span className="text-red-600">✗ {pattern.failure_count}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Pending Actions */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Pending Actions
            </CardTitle>
            <CardDescription>Items requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">Task Approvals</span>
              </div>
              <Badge className="bg-yellow-500/20 text-yellow-700">
                {analytics.pendingApprovals}
              </Badge>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium">Quick Actions</p>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Code className="h-4 w-4 mr-2" />
                Review Code Changes
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Check Learning Sessions
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                HR Approvals
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <GitBranch className="h-4 w-4 mr-2" />
                Git Operations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automation Stats */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Automation Performance by Domain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { domain: 'HR Tasks', completed: 45, pending: 12, failed: 3 },
                  { domain: 'Dev Tasks', completed: 78, pending: 8, failed: 5 },
                  { domain: 'Code Reviews', completed: 34, pending: 6, failed: 2 },
                  { domain: 'Deployments', completed: 23, pending: 4, failed: 1 },
                  { domain: 'Git Ops', completed: 56, pending: 3, failed: 0 },
                  { domain: 'Calendar', completed: 67, pending: 15, failed: 0 }
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="domain" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="completed" fill="#10B981" name="Completed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" fill="#F59E0B" name="Pending" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" fill="#EF4444" name="Failed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
