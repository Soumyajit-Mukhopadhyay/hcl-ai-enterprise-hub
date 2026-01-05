import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bug, AlertTriangle, CheckCircle, Clock, Code, FileCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BugReportPanelProps {
  onTicketCreated?: (ticketId: string) => void;
}

export function BugReportPanel({ onTicketCreated }: BugReportPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    service: "",
    description: "",
    errorMessage: "",
    severity: "medium"
  });

  const handleSubmit = async () => {
    if (!formData.service || !formData.description) {
      toast.error("Please fill in service and description");
      return;
    }

    setIsSubmitting(true);
    try {
      const ticketId = `DEV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('dev_tickets')
        .insert({
          ticket_id: ticketId,
          reporter_id: userData.user?.id,
          service_name: formData.service,
          severity: formData.severity,
          description: formData.description,
          error_details: formData.errorMessage ? { raw_error: formData.errorMessage } : null
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Bug ticket ${ticketId} created successfully!`);
      onTicketCreated?.(ticketId);
      
      setFormData({ service: "", description: "", errorMessage: "", severity: "medium" });
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error("Failed to create bug ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-destructive/20 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Bug className="h-5 w-5" />
          Report a Bug
        </CardTitle>
        <CardDescription>
          Describe the issue you're experiencing and our AI will analyze it
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Service/Component</label>
            <Input
              placeholder="e.g., payment-service, auth, checkout"
              value={formData.service}
              onChange={(e) => setFormData(prev => ({ ...prev, service: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Severity</label>
            <Select
              value={formData.severity}
              onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-500/10 text-green-500">Low</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">Medium</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-500">High</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="critical">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-red-500/10 text-red-500">Critical</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="Describe what's happening... e.g., 'Payment is failing on checkout with NullPointerException'"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Error Message (Optional)</label>
          <Textarea
            placeholder="Paste the exact error message or stack trace here..."
            value={formData.errorMessage}
            onChange={(e) => setFormData(prev => ({ ...prev, errorMessage: e.target.value }))}
            rows={4}
            className="font-mono text-sm"
          />
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Creating Ticket..." : "Submit Bug Report"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function TicketStatusCard({ ticket }: { ticket: any }) {
  const statusConfig = {
    open: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    analyzing: { icon: Code, color: "text-blue-500", bg: "bg-blue-500/10" },
    fix_proposed: { icon: FileCode, color: "text-purple-500", bg: "bg-purple-500/10" },
    in_progress: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10" },
    resolved: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" }
  };

  const config = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.open;
  const StatusIcon = config.icon;

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">{ticket.ticket_id}</Badge>
              <Badge className={`${config.bg} ${config.color}`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {ticket.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="font-medium">{ticket.service_name}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
          </div>
          <Badge variant={ticket.severity === 'critical' ? 'destructive' : 'secondary'}>
            {ticket.severity}
          </Badge>
        </div>
        
        {ticket.proposed_fix && (
          <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
            <span className="font-medium">AI Analysis: </span>
            {ticket.root_cause || "Analyzing..."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
