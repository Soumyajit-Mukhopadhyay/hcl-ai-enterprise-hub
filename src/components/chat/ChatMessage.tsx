import { User, Bot, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CitationList } from './CitationCard';
import { ActionCard } from './ActionCard';
import { JSONSchemaCard } from './JSONSchemaCard';
import type { Message, Citation } from '@/types/agent';

interface ChatMessageProps {
  message: Message;
  onCitationClick?: (citation: Citation) => void;
  onActionConfirm?: () => void;
  onActionReject?: () => void;
}

function getJSONSchemaType(data: any): 'bug_ticket' | 'code_fix' | 'action' | 'generic' {
  if (data.action === 'create_dev_ticket' || data.ticket_id || data.severity) return 'bug_ticket';
  if (data.action === 'propose_code_change' || data.file || data.proposed_code) return 'code_fix';
  if (data.action) return 'action';
  return 'generic';
}

function getJSONSchemaTitle(data: any): string {
  if (data.action === 'create_dev_ticket') return `Bug Ticket: ${data.ticket_id || 'NEW'}`;
  if (data.action === 'propose_code_change') return `Code Fix: ${data.file || 'Proposed Change'}`;
  if (data.action === 'analyze_multi_task') return `Multi-Task Analysis (${data.summary?.total || 0} tasks)`;
  if (data.action) return `Action: ${data.action}`;
  if (data.title) return data.title;
  return 'AI Response Data';
}

export function ChatMessage({ 
  message, 
  onCitationClick,
  onActionConfirm,
  onActionReject 
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Clean content - remove JSON code blocks for display since we show them separately
  const displayContent = message.jsonSchemas && message.jsonSchemas.length > 0
    ? message.content.replace(/```json\n[\s\S]*?\n```/g, '').trim()
    : message.content;

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
        "max-w-[85%] space-y-3",
        isUser && "items-end"
      )}>
        {displayContent && (
          <div
            className={cn(
              "p-4 shadow-sm",
              isUser ? "chat-bubble-user" : "chat-bubble-assistant"
            )}
          >
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {displayContent}
              {message.isStreaming && (
                <span className="inline-flex ml-1 typing-indicator">
                  <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
                  <span className="w-1.5 h-1.5 bg-current rounded-full mx-0.5"></span>
                  <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
                </span>
              )}
            </p>
          </div>
        )}

        {/* JSON Schema Cards - Display structured AI outputs */}
        {isAssistant && message.jsonSchemas && message.jsonSchemas.length > 0 && (
          <div className="space-y-2">
            {message.jsonSchemas.map((schema, idx) => (
              <JSONSchemaCard
                key={idx}
                data={schema}
                title={getJSONSchemaTitle(schema)}
                type={getJSONSchemaType(schema)}
                collapsible={message.jsonSchemas!.length > 1}
              />
            ))}
          </div>
        )}

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
