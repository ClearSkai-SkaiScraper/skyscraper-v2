"use client";

import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { clientFetch } from "@/lib/http/clientFetch";
import { logger } from "@/lib/logger";

interface ClaimAIAssistantProps {
  claimId: string;
  claimData?: {
    claimNumber?: string | null;
    insured_name?: string | null;
    carrier?: string | null;
    damageType?: string | null;
  };
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function ClaimAIAssistant({ claimId, claimData }: ClaimAIAssistantProps) {
  const welcomeMessage: Message = {
    role: "assistant",
    content: `Hi! I'm your AI claims advisor for ${claimData?.claimNumber || claimId}. I can help you:

• 🔍 Find missed damage & increase claim value
• 📝 Generate supplements & rebuttal letters
• 🎯 Check what's missing for approval
• ❓ Answer any question about this claim

What would you like help with?`,
    timestamp: new Date(),
  };

  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [_historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch chat history on mount — "senior adjuster" memory
  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await clientFetch<{
          messages?: Array<{ role: string; content: string; createdAt: string }>;
        }>(`/api/claims/${claimId}/chat-history`);

        if (data.messages && data.messages.length > 0) {
          const historicMessages: Message[] = data.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: new Date(m.createdAt),
          }));
          setMessages([welcomeMessage, ...historicMessages]);
        }
      } catch {
        // Silent fail — history is supplementary
      } finally {
        setHistoryLoaded(true);
      }
    }

    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const data = await clientFetch<{
        reply?: string;
        response?: string;
        ok?: boolean;
        error?: string;
      }>(`/api/claims/${claimId}/ai`, {
        method: "POST",
        body: {
          message: userMessage.content,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      // Handle both success and graceful errors (status 200 with ok: false)
      const replyContent =
        data.reply || data.response || "I'm here to help! What would you like to know?";

      const assistantMessage: Message = {
        role: "assistant",
        content: replyContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      logger.error("[AI_ASSISTANT] Error:", {
        status: error.status,
        message: error.message,
        claimId,
      });

      // Only show error for true failures (not graceful 200 responses with error field)
      const errorMessage: Message = {
        role: "assistant",
        content: "I'm having trouble right now. Please try again in a moment.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    "What damage is the adjuster missing?",
    "How do I increase the payout?",
    "Why would this claim get denied?",
    "What's missing for approval?",
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">AI Assistant</h3>
            <p className="text-xs text-white/80">Powered by SkaiScraper Intelligence</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              <p
                className={`mt-1 text-xs ${message.role === "user" ? "text-white/70" : "text-slate-500"}`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {message.role === "user" && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600">
                <span className="text-xs font-semibold text-white">You</span>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
              <Bot className="h-4 w-4 text-blue-600" />
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
                <span className="text-sm text-slate-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length === 1 && (
        <div className="border-t border-slate-200 p-4">
          <p className="mb-2 text-xs font-medium text-slate-600">Quick Actions:</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <button
                key={action}
                onClick={() => setInput(action)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSendMessage();
              }
            }}
            placeholder="Ask me anything about this claim..."
            className="max-h-32 min-h-[44px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
