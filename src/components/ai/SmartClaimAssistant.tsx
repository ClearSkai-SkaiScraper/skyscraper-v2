"use client";

import { Loader2, Send, Sparkles } from "lucide-react";
import { useState } from "react";

import { logger } from "@/lib/logger";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function SmartClaimAssistant({ claimId }: { claimId?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI claim assistant. Ask me anything about supplements, weather verification, or claim strategy.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/claim-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          claimId,
          history: messages.slice(-5), // Send last 5 messages for context
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to get assistant response");
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      logger.error("Assistant error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: error?.message || "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[600px] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200/30 p-6 dark:border-slate-700/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">Smart Claim Assistant</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">AI-powered claim support</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-sky-500 text-white dark:bg-sky-600"
                  : "border border-slate-200/30 bg-slate-100/50 text-slate-700 dark:border-slate-700/50 dark:bg-slate-700/30 dark:text-slate-200"
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
              <p className="mt-1 text-xs opacity-60">{msg.timestamp.toLocaleTimeString()}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/30 bg-slate-100/50 px-4 py-3 dark:border-slate-700/50 dark:bg-slate-700/30">
              <Loader2 className="h-4 w-4 animate-spin text-sky-600 dark:text-sky-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200/30 p-4 dark:border-slate-700/50"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about supplements, weather data, or claim strategy..."
            className="flex-1 rounded-xl border border-slate-300/40 bg-white/80 px-4 py-3 text-sm text-slate-700 placeholder-slate-500 backdrop-blur-lg focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:placeholder-slate-400 dark:focus:border-sky-500 dark:focus:ring-sky-500/20"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message to AI assistant"
            title="Send message"
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500 text-white transition-all hover:bg-sky-600 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-700"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
