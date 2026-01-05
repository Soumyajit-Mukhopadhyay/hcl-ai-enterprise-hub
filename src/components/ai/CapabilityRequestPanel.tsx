import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Wrench, 
  Plus, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Code,
  Zap,
  Shield
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

  useEffect(() => {
    fetchRequests();
  }, []);

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
      
      // Update request status
      const { error } = await supabase
        .from('ai_capability_requests')
        .update({
          status: 'approved',
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      // Register the new tool
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
            risk_level: 'medium'
          });
      }

      toast.success(`Capability "${request.capability_name}" approved and added!`);
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

  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-500",
    approved: "bg-green-500/10 text-green-500",
    rejected: "bg-red-500/10 text-red-500"
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            AI Capability Requests
          </CardTitle>
          <CardDescription>
            When AI lacks ability, it proposes new capabilities here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedRequest?.id === request.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="font-medium">{request.capability_name}</span>
                    </div>
                    <Badge className={statusColors[request.status as keyof typeof statusColors] || statusColors.pending}>
                      {request.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {request.description}
                  </p>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {request.capability_type}
                  </Badge>
                </div>
              ))}
              
              {requests.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No capability requests</p>
                  <p className="text-sm">AI will request new abilities when needed</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Request Details */}
      <Card>
        {selectedRequest ? (
          <>
            <CardHeader>
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
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Trigger Context */}
              {selectedRequest.trigger_context && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Trigger Context</h4>
                  <div className="p-3 bg-muted/50 rounded text-sm">
                    {selectedRequest.trigger_context}
                  </div>
                </div>
              )}

              {/* Proposed Tool Schema */}
              {selectedRequest.proposed_tool_schema && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Proposed Tool Schema</h4>
                  <ScrollArea className="h-[150px] rounded border bg-muted/30">
                    <pre className="p-3 text-xs font-mono">
                      {JSON.stringify(selectedRequest.proposed_tool_schema, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {/* Safety Analysis */}
              {selectedRequest.safety_analysis && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    Safety Analysis
                  </h4>
                  <div className="p-3 bg-muted/50 rounded">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Risk Level:</span>
                        <Badge className="ml-2" variant="outline">
                          {selectedRequest.safety_analysis.risk_level || 'low'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Safe:</span>
                        <Badge 
                          className={`ml-2 ${
                            selectedRequest.safety_analysis.is_safe 
                              ? 'bg-green-500/10 text-green-500' 
                              : 'bg-red-500/10 text-red-500'
                          }`}
                        >
                          {selectedRequest.safety_analysis.is_safe ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                    {selectedRequest.safety_analysis.concerns && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        {selectedRequest.safety_analysis.concerns}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Implementation Details */}
              {selectedRequest.proposed_implementation && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Proposed Implementation</h4>
                  <ScrollArea className="h-[150px] rounded border bg-muted/30">
                    <pre className="p-3 text-xs font-mono">
                      {JSON.stringify(selectedRequest.proposed_implementation, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Select a request to view details</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
