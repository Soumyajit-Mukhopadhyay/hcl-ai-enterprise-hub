import { User, Bot, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CitationList } from './CitationCard';
import { ActionCard } from './ActionCard';
import type { Message, Citation } from '@/types/agent';

interface ChatMessageProps {
  message: Message;
  onCitationClick?: (citation: Citation) => void;
  onActionConfirm?: () => void;
  onActionReject?: () => void;
}

export function ChatMessage({ 
  message, 
  onCitationClick,
  onActionConfirm,
  onActionReject 
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={cn(
        "flex gap-3 animate-slide-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
        isUser 
          ? "bg-gradient-primary text-white" 
          : "bg-card border border-border"
      )}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <div className="relative">
            <Bot className="w-4 h-4 text-primary" />
            {message.isStreaming && (
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-secondary animate-pulse" />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn(
        "max-w-[80%] space-y-3",
        isUser && "items-end"
      )}>
        <div
          className={cn(
            "p-4 shadow-sm",
            isUser ? "chat-bubble-user" : "chat-bubble-assistant"
          )}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
            {message.isStreaming && (
              <span className="inline-flex ml-1 typing-indicator">
                <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full mx-0.5"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
              </span>
            )}
          </p>
        </div>

        {/* Citations */}
        {isAssistant && message.citations && message.citations.length > 0 && (
          <CitationList 
            citations={message.citations} 
            onCitationClick={onCitationClick} 
          />
        )}

        {/* Action Card */}
        {isAssistant && message.action && (
          <ActionCard
            action={message.action}
            onConfirm={onActionConfirm}
            onReject={onActionReject}
          />
        )}

        {/* Timestamp */}
        <p className={cn(
          "text-[10px] text-muted-foreground px-1",
          isUser && "text-right"
        )}>
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>
    </div>
  );
}
