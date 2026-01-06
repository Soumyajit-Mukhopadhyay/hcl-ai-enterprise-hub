import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wrench, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Code,
  Zap,
  Shield,
  Copy,
  Edit,
  Eye,
  FileCode,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CapabilityRequest {
  id: string;
  capability_name: string;
  capability_type: string;
  description: string;
  trigger_context: string | null;
  proposed_implementation: any;
  proposed_tool_schema: any;
  safety_analysis: any;
  status: string;
  created_at: string;
}

export function CapabilityRequestPanel() {
  const [requests, setRequests] = useState<CapabilityRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CapabilityRequest | null>(null);
  const [editedCode, setEditedCode] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("schema");

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (selectedRequest?.proposed_implementation?.code) {
      setEditedCode(selectedRequest.proposed_implementation.code);
    }
  }, [selectedRequest]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_capability_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (request: CapabilityRequest) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ai_capability_requests')
        .update({
          status: 'approved',
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          proposed_implementation: {
            ...request.proposed_implementation,
            code: editedCode || request.proposed_implementation?.code,
            approved_code: editedCode || request.proposed_implementation?.code
          }
        })
        .eq('id', request.id);

      if (error) throw error;

      if (request.proposed_tool_schema) {
        await supabase
          .from('ai_tool_registry')
          .insert({
            tool_name: request.capability_name,
            tool_description: request.description,
            tool_category: request.capability_type,
            parameters_schema: request.proposed_tool_schema,
            is_enabled: true,
            required_approval: true,
            risk_level: request.safety_analysis?.risk_level || 'medium'
          });
      }

      if (editedCode || request.proposed_implementation?.code) {
        await supabase
          .from('code_change_proposals')
          .insert({
            file_path: `supabase/functions/advanced-agent/tools/${request.capability_name.toLowerCase().replace(/\s+/g, '_')}.ts`,
            proposed_code: editedCode || request.proposed_implementation?.code,
            change_type: 'new_tool',
            explanation: `AI-generated tool: ${request.description}`,
            proposed_by: 'ai_self_improvement',
            status: 'approved',
            approved_by: userData.user?.id,
            approved_at: new Date().toISOString(),
            risk_level: request.safety_analysis?.risk_level || 'medium'
          });
      }

      toast.success(`Capability "${request.capability_name}" approved! Tool registered.`);
      setIsEditing(false);
      fetchRequests();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to approve");
    }
  };

  const handleReject = async (request: CapabilityRequest) => {
    try {
      const { error } = await supabase
        .from('ai_capability_requests')
        .update({ status: 'rejected' })
        .eq('id', request.id);

      if (error) throw error;
      toast.info("Capability request rejected");
      fetchRequests();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const copyCode = () => {
    const code = editedCode || selectedRequest?.proposed_implementation?.code;
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success("Code copied to clipboard");
    }
  };

  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-500",
    approved: "bg-green-500/10 text-green-500",
    rejected: "bg-red-500/10 text-red-500"
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            AI Self-Improvement Requests
          </CardTitle>
          <CardDescription>
            AI proposes new capabilities with generated code for your review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[550px]">
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedRequest?.id === request.id 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-medium">{request.capability_name}</span>
                    </div>
                    <Badge className={statusColors[request.status as keyof typeof statusColors] || statusColors.pending}>
                      {request.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {request.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {request.capability_type}
                    </Badge>
                    {request.proposed_implementation?.code && (
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500">
                        <FileCode className="h-3 w-3 mr-1" />
                        Has Code
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              
              {requests.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No capability requests</p>
                  <p className="text-sm">Ask AI to do something beyond its abilities</p>
                  <p className="text-xs mt-2 text-primary">AI will propose new tools automatically</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        {selectedRequest ? (
          <>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    {selectedRequest.capability_name}
                  </CardTitle>
                  <CardDescription>{selectedRequest.description}</CardDescription>
                </div>
                {selectedRequest.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(selectedRequest)}
                      className="text-destructive"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(selectedRequest)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve & Deploy
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="schema" className="flex-1">
                    <Zap className="h-4 w-4 mr-1" />
                    Schema
                  </TabsTrigger>
                  <TabsTrigger value="code" className="flex-1">
                    <Code className="h-4 w-4 mr-1" />
                    Generated Code
                  </TabsTrigger>
                  <TabsTrigger value="safety" className="flex-1">
                    <Shield className="h-4 w-4 mr-1" />
                    Safety
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="schema" className="mt-3">
                  {selectedRequest.trigger_context && (
                    <div className="space-y-2 mb-4">
                      <h4 className="font-medium text-sm">Why AI requested this</h4>
                      <div className="p-3 bg-muted/50 rounded text-sm">
                        {selectedRequest.trigger_context}
                      </div>
                    </div>
                  )}

                  {selectedRequest.proposed_tool_schema && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Tool Definition</h4>
                      <ScrollArea className="h-[250px] rounded border bg-muted/30">
                        <pre className="p-3 text-xs font-mono">
                          {JSON.stringify(selectedRequest.proposed_tool_schema, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="code" className="mt-3">
                  {selectedRequest.proposed_implementation?.code ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <FileCode className="h-4 w-4" />
                          AI-Generated Implementation
                        </h4>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={copyCode}>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsEditing(!isEditing)}
                          >
                            {isEditing ? <Eye className="h-4 w-4 mr-1" /> : <Edit className="h-4 w-4 mr-1" />}
                            {isEditing ? 'Preview' : 'Edit'}
                          </Button>
                        </div>
                      </div>
                      
                      {isEditing ? (
                        <Textarea
                          value={editedCode}
                          onChange={(e) => setEditedCode(e.target.value)}
                          className="font-mono text-xs h-[350px]"
                        />
                      ) : (
                        <ScrollArea className="h-[350px] rounded border bg-zinc-950">
                          <pre className="p-3 text-xs font-mono text-green-400 whitespace-pre-wrap">
                            {editedCode || selectedRequest.proposed_implementation.code}
                          </pre>
                        </ScrollArea>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        Review and optionally edit the code before approving.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No generated code available</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="safety" className="mt-3">
                  {selectedRequest.safety_analysis && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-muted/30 border">
                          <p className="text-sm text-muted-foreground mb-1">Risk Level</p>
                          <Badge className={
                            selectedRequest.safety_analysis.risk_level === 'low' 
                              ? 'bg-green-500/10 text-green-500' 
                              : selectedRequest.safety_analysis.risk_level === 'medium'
                                ? 'bg-yellow-500/10 text-yellow-500'
                                : 'bg-red-500/10 text-red-500'
                          }>
                            {selectedRequest.safety_analysis.risk_level || 'unknown'}
                          </Badge>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/30 border">
                          <p className="text-sm text-muted-foreground mb-1">Safe to Deploy</p>
                          <Badge className={
                            selectedRequest.safety_analysis.is_safe 
                              ? 'bg-green-500/10 text-green-500' 
                              : 'bg-red-500/10 text-red-500'
                          }>
                            {selectedRequest.safety_analysis.is_safe ? 'Yes ✓' : 'No ✗'}
                          </Badge>
                        </div>
                      </div>

                      {selectedRequest.safety_analysis.code_analysis && (
                        <div className="p-4 rounded-lg bg-muted/30 border">
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Code Security Analysis
                          </h4>
                          {selectedRequest.safety_analysis.code_analysis.issues?.length > 0 ? (
                            <div className="space-y-2">
                              {selectedRequest.safety_analysis.code_analysis.issues.map((issue: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-yellow-500">
                                  <AlertTriangle className="h-4 w-4" />
                                  {issue}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-green-500 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              No security issues detected
                            </p>
                          )}
                        </div>
                      )}

                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-xs text-muted-foreground">
                          <strong className="text-foreground">Note:</strong> Always review generated code 
                          carefully before approving.
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Select a request to review</p>
              <p className="text-sm">Review AI-generated code and approve new capabilities</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}