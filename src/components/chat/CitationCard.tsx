import { FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Citation } from '@/types/agent';

interface CitationCardProps {
  citation: Citation;
  onClick?: () => void;
}

export function CitationCard({ citation, onClick }: CitationCardProps) {
  return (
    <Card 
      className="p-3 hover:shadow-md transition-shadow cursor-pointer group bg-muted/50 border-muted"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <FileText className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-primary">
              {citation.docId}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary/20 text-secondary-foreground font-medium">
              Page {citation.pageNum}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 italic">
            "{citation.snippet}"
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

interface CitationListProps {
  citations: Citation[];
  onCitationClick?: (citation: Citation) => void;
}

export function CitationList({ citations, onCitationClick }: CitationListProps) {
  if (!citations.length) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <FileText className="w-3.5 h-3.5" />
        <span>Sources ({citations.length})</span>
      </div>
      <div className="space-y-2">
        {citations.map((citation, index) => (
          <CitationCard
            key={`${citation.docId}-${citation.pageNum}-${index}`}
            citation={citation}
            onClick={() => onCitationClick?.(citation)}
          />
        ))}
      </div>
    </div>
  );
}
