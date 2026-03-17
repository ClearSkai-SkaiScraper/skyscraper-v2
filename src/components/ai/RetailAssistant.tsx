"use client";

import { Loader2, Send, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { logger } from "@/lib/logger";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function RetailAssistant({ jobId }: { jobId?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your Retail Job Assistant. Ask me anything about estimates, material pricing, scheduling, or customer communication for out-of-pocket and financed jobs.",
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
      const response = await fetch("/api/ai/retail-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          jobId,
          history: messages.slice(-5),
        }),
      });

      if (!response.ok) throw new Error("Failed to get assistant response");

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      logger.error("Retail Assistant error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[500px] flex-col rounded-xl border border-amber-200/50 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:border-amber-800/50 dark:from-amber-950/30 dark:to-orange-950/30">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-amber-200/50 p-4 dark:border-amber-700/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">Retail Job Assistant</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">AI-powered retail support</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.role === "user"
                  ? "bg-amber-500 text-white dark:bg-amber-600"
                  : "border border-amber-200/50 bg-white/80 text-slate-700 dark:border-amber-700/50 dark:bg-slate-800/50 dark:text-slate-200"
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
              <p className="mt-1 text-[10px] opacity-60">{msg.timestamp.toLocaleTimeString()}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-amber-200/50 bg-white/80 px-4 py-2.5 dark:border-amber-700/50 dark:bg-slate-800/50">
              <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-amber-200/50 p-3 dark:border-amber-700/50"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about pricing, scheduling, materials..."
            className="flex-1 rounded-xl border border-amber-300/50 bg-white/90 px-4 py-2.5 text-sm text-slate-700 placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 dark:border-amber-700/50 dark:bg-slate-800/70 dark:text-slate-200 dark:placeholder-slate-400"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-white transition hover:from-amber-600 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            title="Send message"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
