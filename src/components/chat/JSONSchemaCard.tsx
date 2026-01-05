import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check,
  FileJson,
  AlertTriangle,
  Bug,
  GitPullRequest,
  Zap
} from "lucide-react";
import { toast } from "sonner";

interface JSONSchemaCardProps {
  data: any;
  title?: string;
  type?: 'bug_ticket' | 'code_fix' | 'action' | 'generic';
  collapsible?: boolean;
}

export function JSONSchemaCard({ 
  data, 
  title = "JSON Data",
  type = 'generic',
  collapsible = true 
}: JSONSchemaCardProps) {
  const [isOpen, setIsOpen] = useState(!collapsible);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'bug_ticket': return <Bug className="h-4 w-4 text-red-500" />;
      case 'code_fix': return <GitPullRequest className="h-4 w-4 text-purple-500" />;
      case 'action': return <Zap className="h-4 w-4 text-yellow-500" />;
      default: return <FileJson className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTypeBadge = () => {
    const colors = {
      bug_ticket: "bg-red-500/10 text-red-500",
      code_fix: "bg-purple-500/10 text-purple-500",
      action: "bg-yellow-500/10 text-yellow-500",
      generic: "bg-blue-500/10 text-blue-500"
    };
    return colors[type];
  };

  const renderValue = (value: any, depth: number = 0): React.ReactNode => {
    if (value === null) return <span className="text-muted-foreground">null</span>;
    if (typeof value === 'boolean') return <span className="text-yellow-500">{value.toString()}</span>;
    if (typeof value === 'number') return <span className="text-green-500">{value}</span>;
    if (typeof value === 'string') {
      // Check for special formatted strings
      if (value.startsWith('DEV-') || value.startsWith('PR-')) {
        return <Badge variant="outline" className="font-mono">{value}</Badge>;
      }
      if (value === 'HIGH' || value === 'CRITICAL') {
        return <Badge className="bg-red-500/10 text-red-500">{value}</Badge>;
      }
      if (value === 'LOW' || value === 'OPEN' || value === 'APPROVED') {
        return <Badge className="bg-green-500/10 text-green-500">{value}</Badge>;
      }
      if (value === 'MEDIUM' || value === 'PENDING') {
        return <Badge className="bg-yellow-500/10 text-yellow-500">{value}</Badge>;
      }
      return <span className="text-primary">"{value}"</span>;
    }
    if (Array.isArray(value)) {
      return (
        <div className="ml-4">
          {'['}
          {value.map((item, i) => (
            <div key={i} className="ml-4">
              {renderValue(item, depth + 1)}
              {i < value.length - 1 && ','}
            </div>
          ))}
          {']'}
        </div>
      );
    }
    if (typeof value === 'object') {
      return (
        <div className="ml-4">
          {'{'}
          {Object.entries(value).map(([key, val], i, arr) => (
            <div key={key} className="ml-4 flex items-start gap-2">
              <span className="text-muted-foreground">"{key}"</span>
              <span>:</span>
              {renderValue(val, depth + 1)}
              {i < arr.length - 1 && ','}
            </div>
          ))}
          {'}'}
        </div>
      );
    }
    return String(value);
  };

  const content = (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getTypeIcon()}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Badge className={getTypeBadge()}>
              {type.replace('_', ' ')}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 w-8 p-0"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-auto max-h-[300px]">
          <div className="font-mono text-sm bg-muted/30 rounded p-3">
            {renderValue(data)}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  if (!collapsible) return content;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2 p-2 h-auto">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {getTypeIcon()}
          <span className="text-sm">{title}</span>
          <Badge className={getTypeBadge()} variant="outline">
            {type.replace('_', ' ')}
          </Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        {content}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Quick action buttons for JSON schema actions
export function JSONActionButtons({ 
  actions,
  onAction 
}: { 
  actions: Array<{ label: string; action: string; variant?: 'default' | 'destructive' | 'outline' }>;
  onAction: (action: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {actions.map((action, i) => (
        <Button
          key={i}
          variant={action.variant || 'outline'}
          size="sm"
          onClick={() => onAction(action.action)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
