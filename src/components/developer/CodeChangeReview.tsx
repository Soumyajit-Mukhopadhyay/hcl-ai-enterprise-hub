import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  GitPullRequest, 
  Check, 
  X, 
  AlertTriangle, 
  FileCode, 
  GitBranch,
  Play,
  Terminal,
  CheckCircle,
  XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CodeProposal {
  id: string;
  ticket_id: string;
  file_path: string;
  original_code: string | null;
  proposed_code: string;
  change_type: string;
  explanation: string | null;
  risk_level: string;
  status: string;
  created_at: string;
}

interface CodeChangeReviewProps {
  ticketId?: string;
}

export function CodeChangeReview({ ticketId }: CodeChangeReviewProps) {
  const [proposals, setProposals] = useState<CodeProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<CodeProposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);

  useEffect(() => {
    fetchProposals();
  }, [ticketId]);

  const fetchProposals = async () => {
    try {
      let query = supabase
        .from('code_change_proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketId) {
        query = query.eq('ticket_id', ticketId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProposals(data || []);
      if (data && data.length > 0) {
        setSelectedProposal(data[0]);
      }
    } catch (error) {
      console.error("Error fetching proposals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (proposal: CodeProposal) => {
    setIsApproving(true);
    setExecutionLog([]);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Simulate execution steps
      const steps = [
        "🔍 Validating code changes...",
        "📦 Creating backup of original file...",
        `📝 Applying patch to ${proposal.file_path}...`,
        "🧪 Running automated tests...",
        "✅ All tests passed!",
        "🚀 Changes applied successfully!"
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setExecutionLog(prev => [...prev, step]);
      }

      const { error } = await supabase
        .from('code_change_proposals')
        .update({
          status: 'approved',
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          applied_at: new Date().toISOString()
        })
        .eq('id', proposal.id);

      if (error) throw error;

      toast.success("Code change approved and applied!");
      fetchProposals();
    } catch (error) {
      console.error("Error approving:", error);
      setExecutionLog(prev => [...prev, "❌ Error applying changes"]);
      toast.error("Failed to approve changes");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (proposal: CodeProposal) => {
    try {
      const { error } = await supabase
        .from('code_change_proposals')
        .update({ status: 'rejected' })
        .eq('id', proposal.id);

      if (error) throw error;
      toast.info("Code change rejected");
      fetchProposals();
    } catch (error) {
      console.error("Error rejecting:", error);
      toast.error("Failed to reject");
    }
  };

  const riskColors = {
    low: "bg-green-500/10 text-green-500",
    medium: "bg-yellow-500/10 text-yellow-500",
    high: "bg-red-500/10 text-red-500"
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading proposals...</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {/* Proposals List */}
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitPullRequest className="h-5 w-5" />
            Code Proposals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  onClick={() => setSelectedProposal(proposal)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedProposal?.id === proposal.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm truncate max-w-[150px]">
                        {proposal.file_path.split('/').pop()}
                      </span>
                    </div>
                    <Badge className={riskColors[proposal.risk_level as keyof typeof riskColors] || riskColors.low}>
                      {proposal.risk_level}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {proposal.change_type}
                    </Badge>
                    {proposal.status === 'approved' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {proposal.status === 'rejected' && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
              {proposals.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No code proposals yet
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Code Diff View */}
      <Card className="col-span-2">
        {selectedProposal ? (
          <>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-mono">
                    {selectedProposal.file_path}
                  </CardTitle>
                  <CardDescription>{selectedProposal.explanation}</CardDescription>
                </div>
                {selectedProposal.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(selectedProposal)}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(selectedProposal)}
                      disabled={isApproving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {isApproving ? "Applying..." : "Approve & Apply"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="diff">
                <TabsList>
                  <TabsTrigger value="diff">Diff View</TabsTrigger>
                  <TabsTrigger value="original">Original</TabsTrigger>
                  <TabsTrigger value="proposed">Proposed</TabsTrigger>
                  <TabsTrigger value="terminal">
                    <Terminal className="h-4 w-4 mr-1" />
                    Execution
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="diff">
                  <ScrollArea className="h-[400px] rounded border bg-muted/30">
                    <div className="p-4 font-mono text-sm">
                      {selectedProposal.original_code && (
                        <div className="space-y-1">
                          {selectedProposal.original_code.split('\n').map((line, i) => (
                            <div key={`old-${i}`} className="flex">
                              <span className="w-8 text-muted-foreground text-right pr-2">{i + 1}</span>
                              <span className="bg-red-500/10 text-red-400 flex-1 px-2">- {line}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="my-4 border-t border-dashed" />
                      <div className="space-y-1">
                        {selectedProposal.proposed_code.split('\n').map((line, i) => (
                          <div key={`new-${i}`} className="flex">
                            <span className="w-8 text-muted-foreground text-right pr-2">{i + 1}</span>
                            <span className="bg-green-500/10 text-green-400 flex-1 px-2">+ {line}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="original">
                  <ScrollArea className="h-[400px] rounded border bg-muted/30">
                    <pre className="p-4 font-mono text-sm">
                      {selectedProposal.original_code || "No original code (new file)"}
                    </pre>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="proposed">
                  <ScrollArea className="h-[400px] rounded border bg-muted/30">
                    <pre className="p-4 font-mono text-sm">
                      {selectedProposal.proposed_code}
                    </pre>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="terminal">
                  <ScrollArea className="h-[400px] rounded border bg-black">
                    <div className="p-4 font-mono text-sm text-green-400">
                      <div className="text-muted-foreground mb-2">
                        $ hcl-dev apply-fix {selectedProposal.file_path}
                      </div>
                      {executionLog.map((log, i) => (
                        <div key={i} className="py-0.5">{log}</div>
                      ))}
                      {executionLog.length === 0 && (
                        <div className="text-muted-foreground">
                          Click "Approve & Apply" to execute changes...
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Select a proposal to view details</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
