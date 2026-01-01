import { useState } from 'react';
import { MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ChatSession {
  id: string;
  title: string;
  domain: string;
  created_at: string;
  updated_at: string;
}

interface ChatHistorySidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export function ChatHistorySidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}: ChatHistorySidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getDomainColor = (domain: string) => {
    switch (domain) {
      case 'hr': return 'bg-primary/20 text-primary';
      case 'it': return 'bg-secondary/20 text-secondary';
      case 'dev': return 'bg-accent/20 text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className={cn(
      "h-full border-r border-border bg-card/50 backdrop-blur-sm transition-all duration-300 flex flex-col",
      isCollapsed ? "w-12" : "w-64"
    )}>
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        {!isCollapsed && (
          <h3 className="font-semibold text-sm">Chat History</h3>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-2">
        <Button
          onClick={onNewChat}
          variant="outline"
          className={cn(
            "w-full justify-start gap-2 border-dashed",
            isCollapsed && "justify-center px-0"
          )}
        >
          <Plus className="w-4 h-4" />
          {!isCollapsed && <span>New Chat</span>}
        </Button>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sessions.map(session => (
            <div
              key={session.id}
              className={cn(
                "group relative rounded-lg transition-colors cursor-pointer",
                currentSessionId === session.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted"
              )}
            >
              <button
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  "w-full text-left p-2",
                  isCollapsed && "flex justify-center"
                )}
              >
                {isCollapsed ? (
                  <MessageSquare className="w-4 h-4" />
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate flex-1">
                        {session.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] uppercase", getDomainColor(session.domain))}>
                        {session.domain}
                      </span>
                      <span>{formatDate(session.updated_at)}</span>
                    </div>
                  </div>
                )}
              </button>

              {/* Delete Button */}
              {!isCollapsed && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this chat and all its messages. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeleteSession(session.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}

          {sessions.length === 0 && !isCollapsed && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No chat history yet</p>
              <p className="text-xs">Start a new conversation</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
