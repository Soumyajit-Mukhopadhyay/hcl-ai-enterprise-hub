import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Sparkles, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { uploadDocument, type UploadedDocument } from '@/lib/documentService';
import { toast } from 'sonner';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  onDocumentUploaded?: (doc: UploadedDocument) => void;
}

export function ChatInput({ onSend, isLoading = false, placeholder, onDocumentUploaded }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage('');
      setAttachedFiles([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const doc = await uploadDocument(file);
        setAttachedFiles(prev => [...prev, file]);
        onDocumentUploaded?.(doc);
        toast.success(`Uploaded: ${file.name}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const suggestions = [
    "What was HCL's revenue in FY25?",
    "Schedule a meeting with HR",
    "Apply for 3 days leave",
    "What are the key risks?",
  ];

  return (
    <div className="space-y-3">
      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {attachedFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-sm">
              {getFileIcon(file.type)}
              <span className="max-w-[150px] truncate">{file.name}</span>
              <button onClick={() => removeFile(index)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Quick suggestions */}
      {!message && attachedFiles.length === 0 && (
        <div className="flex flex-wrap gap-2 px-1 animate-fade-in">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setMessage(suggestion)}
              className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-accent transition-colors text-muted-foreground hover:text-accent-foreground"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input container */}
      <div className="relative glass-panel rounded-2xl p-2 shadow-lg">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.txt"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
          >
            {isUploading ? (
              <Sparkles className="w-5 h-5 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </Button>

          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Ask me anything about HR, IT, or HCLTech..."}
            className="flex-1 min-h-[44px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm py-3 px-2"
            rows={1}
          />

          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || isLoading}
            size="icon"
            className={cn(
              "h-10 w-10 shrink-0 rounded-xl transition-all duration-200",
              message.trim() 
                ? "bg-gradient-primary text-white shadow-md hover:opacity-90" 
                : "bg-muted text-muted-foreground"
            )}
          >
            {isLoading ? (
              <Sparkles className="w-5 h-5 animate-pulse" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
