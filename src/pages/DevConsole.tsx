import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Bug, 
  Code, 
  GitPullRequest, 
  Brain, 
  Wrench,
  Shield,
  Activity,
  BarChart3,
  FolderGit2,
  Sparkles,
  Mic
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { BugReportPanel, TicketStatusCard } from '@/components/tickets/BugReportPanel';
import { CodeChangeReview } from '@/components/developer/CodeChangeReview';
import { SelfLearningPanel } from '@/components/ai/SelfLearningPanel';
import { CapabilityRequestPanel } from '@/components/ai/CapabilityRequestPanel';
import { SafetyGuardrailsPanel } from '@/components/ai/SafetyGuardrailsPanel';
import { GitHubIntegrationPanel } from '@/components/developer/GitHubIntegrationPanel';
import { AIAnalyticsDashboard } from '@/components/dashboard/AIAnalyticsDashboard';
import { InnovativeFeaturesPanel } from '@/components/ai/InnovativeFeaturesPanel';
import { supabase } from '@/integrations/supabase/client';

const DevConsolePage = () => {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState({
    openTickets: 0,
    pendingProposals: 0,
    learningSessions: 0,
    capabilityRequests: 0
  });

  useEffect(() => {
    if (role !== 'developer') {
      navigate('/');
      return;
    }
    fetchData();
  }, [role]);

  const fetchData = async () => {
    // Fetch tickets
    const { data: ticketData } = await supabase
      .from('dev_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (ticketData) setTickets(ticketData);

    // Fetch stats
    const [ticketCount, proposalCount, learningCount, capabilityCount] = await Promise.all([
      supabase.from('dev_tickets').select('id', { count: 'exact' }).eq('status', 'open'),
      supabase.from('code_change_proposals').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('ai_learning_sessions').select('id', { count: 'exact' }).eq('is_approved', false),
      supabase.from('ai_capability_requests').select('id', { count: 'exact' }).eq('status', 'pending')
    ]);

    setStats({
      openTickets: ticketCount.count || 0,
      pendingProposals: proposalCount.count || 0,
      learningSessions: learningCount.count || 0,
      capabilityRequests: capabilityCount.count || 0
    });
  };

  const handleTicketCreated = () => {
    fetchData();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Developer Console</h1>
            <p className="text-xs text-muted-foreground">AI-Powered Development Tools</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-500/10 text-green-500">
            <Activity className="h-3 w-3 mr-1" />
            System Online
          </Badge>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-red-500" />
            <span className="text-sm">{stats.openTickets} Open Tickets</span>
          </div>
          <div className="flex items-center gap-2">
            <GitPullRequest className="h-4 w-4 text-purple-500" />
            <span className="text-sm">{stats.pendingProposals} Pending Reviews</span>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-blue-500" />
            <span className="text-sm">{stats.learningSessions} Learning Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">{stats.capabilityRequests} Capability Requests</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="grid grid-cols-8 w-full max-w-4xl">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="innovative" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Features
            </TabsTrigger>
            <TabsTrigger value="github" className="gap-2">
              <FolderGit2 className="h-4 w-4" />
              GitHub
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-2">
              <Bug className="h-4 w-4" />
              Tickets
            </TabsTrigger>
            <TabsTrigger value="code-review" className="gap-2">
              <GitPullRequest className="h-4 w-4" />
              Code
            </TabsTrigger>
            <TabsTrigger value="ai-training" className="gap-2">
              <Brain className="h-4 w-4" />
              Training
            </TabsTrigger>
            <TabsTrigger value="capabilities" className="gap-2">
              <Wrench className="h-4 w-4" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="safety" className="gap-2">
              <Shield className="h-4 w-4" />
              Safety
            </TabsTrigger>
          </TabsList>

          {/* Analytics Dashboard */}
          <TabsContent value="analytics">
            <AIAnalyticsDashboard />
          </TabsContent>

          {/* Innovative Features */}
          <TabsContent value="innovative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InnovativeFeaturesPanel />
            </div>
          </TabsContent>

          {/* GitHub Integration */}
          <TabsContent value="github">
            <GitHubIntegrationPanel />
          </TabsContent>

          {/* Bug Tickets */}
          <TabsContent value="tickets" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <BugReportPanel onTicketCreated={handleTicketCreated} />
              </div>
              <div className="col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Tickets</CardTitle>
                    <CardDescription>Latest bug reports and their status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-3">
                        {tickets.map((ticket) => (
                          <TicketStatusCard key={ticket.id} ticket={ticket} />
                        ))}
                        {tickets.length === 0 && (
                          <p className="text-center py-8 text-muted-foreground">
                            No tickets yet. Create one using the form.
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Code Review */}
          <TabsContent value="code-review">
            <CodeChangeReview />
          </TabsContent>

          {/* AI Training */}
          <TabsContent value="ai-training">
            <SelfLearningPanel />
          </TabsContent>

          {/* Capabilities */}
          <TabsContent value="capabilities">
            <CapabilityRequestPanel />
          </TabsContent>

          {/* Safety */}
          <TabsContent value="safety">
            <SafetyGuardrailsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DevConsolePage;
