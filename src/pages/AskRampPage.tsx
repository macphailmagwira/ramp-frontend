import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '@/types';
import { mockChatMessages, mockChatSuggestions } from '@/data/mock';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Send,
  User,
  Bot,
  FileCode,
  Sparkles,
  Lightbulb,
  Copy,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

export function AskRampPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `Based on the codebase analysis, here's what I found about "${inputValue}":

The main implementation is in \`src/core/service.ts\` (lines 45-89). This module handles the core logic and is used by 3 other services.

**Key points:**
- Uses async/await pattern for database operations
- Implements caching with Redis
- Has 87% test coverage

Would you like me to show you the specific code or explain how it integrates with other parts of the system?`,
      timestamp: new Date(),
      references: [
        { file: 'src/core/service.ts', line: 45, description: 'Main implementation' },
        { file: 'src/core/types.ts', line: 12, description: 'Type definitions' },
        { file: 'tests/core.test.ts', line: 23, description: 'Test cases' },
      ],
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
            Ask Ramp
          </h1>
          <p className="text-sm text-muted-foreground">
            Ask questions about your codebase and get AI-powered answers
          </p>
        </div>
        <Badge variant="secondary" className="bg-ramp-blue/10 text-ramp-blue">
          <Sparkles className="h-3 w-3 mr-1" />
          AI Powered
        </Badge>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {/* Welcome message */}
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ramp-blue/10 mb-6">
                <Bot className="h-8 w-8 text-ramp-blue" />
              </div>
              <h2 className="font-heading text-2xl font-bold mb-2">
                Ask me anything about your code
              </h2>
              <p className="text-muted-foreground mb-8">
                I can help you understand how things work, find specific implementations,
                and explain complex systems.
              </p>

              {/* Suggestions */}
              <div className="grid sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                {mockChatSuggestions.slice(0, 4).map((suggestion, i) => (
                  <button
                    key={i}
                    className="p-3 rounded-xl border border-border bg-card hover:border-ramp-blue/50 hover:bg-ramp-blue/5 transition-all text-left"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <Lightbulb className="h-4 w-4 text-ramp-blue mb-2" />
                    <span className="text-sm">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-4',
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                  message.role === 'user'
                    ? 'bg-muted'
                    : 'bg-ramp-blue/10'
                )}
              >
                {message.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4 text-ramp-blue" />
                )}
              </div>

              {/* Message content */}
              <div
                className={cn(
                  'max-w-[80%]',
                  message.role === 'user' ? 'text-right' : 'text-left'
                )}
              >
                <Card
                  className={cn(
                    'inline-block',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card'
                  )}
                >
                  <CardContent className="p-4">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>

                    {/* References */}
                    {message.references && message.references.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <p className="text-xs font-medium mb-2 opacity-70">
                          Referenced files:
                        </p>
                        <div className="space-y-1">
                          {message.references.map((ref, i) => (
                            <button
                              key={i}
                              className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity"
                            >
                              <FileCode className="h-3 w-3" />
                              <code className="font-mono">
                                {ref.file}:{ref.line}
                              </code>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Timestamp and actions */}
                <div
                  className={cn(
                    'flex items-center gap-2 mt-1',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <span className="text-xs text-muted-foreground">
                    {formatTime(message.timestamp)}
                  </span>
                  {message.role === 'assistant' && (
                    <>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-ramp-blue/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-ramp-blue" />
              </div>
              <Card className="bg-card">
                <CardContent className="p-4">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 rounded-full bg-ramp-blue animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-ramp-blue animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-ramp-blue animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          {/* Quick suggestions */}
          {messages.length > 0 && !isTyping && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              {mockChatSuggestions.slice(0, 3).map((suggestion, i) => (
                <button
                  key={i}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs bg-muted hover:bg-muted/80 transition-colors"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder="Ask anything about your repository..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="pr-12 h-12"
              />
            </div>
            <Button
              className="h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-2">
            Ramp may produce inaccurate information. Always verify critical code changes.
          </p>
        </div>
      </div>
    </div>
  );
}
