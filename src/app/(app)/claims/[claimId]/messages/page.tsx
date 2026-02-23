// src/app/(app)/claims/[claimId]/messages/page.tsx
"use client";

import { Loader2, MessageCircle, Send } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { logger } from "@/lib/logger";
import { inputBase, textareaBase } from "@/lib/ui/inputStyles";

import SectionCard from "../_components/SectionCard";

interface Message {
  id: string;
  body: string;
  senderName: string;
  createdAt: string;
}

interface MessageThread {
  id: string;
  subject: string;
  updatedAt: string;
  messages: Message[];
}

export default function MessagesPage() {
  const params = useParams();
  const claimIdParam = params?.claimId;
  const claimId = Array.isArray(claimIdParam) ? claimIdParam[0] : claimIdParam;
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  if (!claimId) return null;

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/claims/${claimId}/messages`);
      const data = await res.json();
      if (data.threads) {
        setThreads(data.threads);
      }
    } catch (error) {
      logger.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject || "New Message",
          body: message,
          isPortalThread: true,
        }),
      });

      if (res.ok) {
        setMessage("");
        setSubject("");
        await fetchMessages();
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch (error) {
      logger.error("Send error:", error);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const allMessages = threads.flatMap((thread) => thread.messages);

  return (
    <SectionCard title="Messages">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Messages List */}
          {allMessages.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <MessageCircle className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="mb-2 text-slate-700 dark:text-slate-300">No messages yet</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Messages sent here sync with your client portal
              </p>
            </div>
          ) : (
            <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              {allMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {msg.senderName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{msg.body}</p>
                </div>
              ))}
              <div ref={messageEndRef} />
            </div>
          )}

          {/* Message Input */}
          <div className="space-y-2">
            {threads.length === 0 && (
              <input
                type="text"
                placeholder="Subject (optional)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputBase + " px-4 py-3 text-sm"}
              />
            )}
            <div className="flex gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows={3}
                className={textareaBase + " flex-1 px-4 py-3 text-sm"}
              />
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="flex h-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
