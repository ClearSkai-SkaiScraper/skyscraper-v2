"use client";
import { useState } from "react";

import { logger } from "@/lib/logger";
import { btn, card, glow } from "@/lib/theme";

type Message = {
  id: string;
  body: string;
  role: "INTERNAL" | "ADJUSTER" | "CLIENT";
  createdAt: Date;
  user?: {
    email?: string | null;
  };
};

export default function ClaimMessages({ claimId }: { claimId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      // TODO: Implement POST /api/claims/[id]/messages
      const mock: Message = {
        id: Math.random().toString(36),
        body: newMessage,
        role: "INTERNAL",
        createdAt: new Date(),
      };
      setMessages([...messages, mock]);
      setNewMessage("");
    } catch (err) {
      logger.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const roleColors: Record<string, string> = {
    INTERNAL: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    ADJUSTER: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    CLIENT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  return (
    <div className={`${card} ${glow}`}>
      <h3 className="mb-4 text-lg font-semibold text-[color:var(--text)]">
        Messages
      </h3>

      {/* Messages Thread */}
      <div className="mb-4 max-h-96 space-y-3 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm italic text-[color:var(--muted)]">
            No messages yet. Start a conversation with the adjuster or client.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-lg bg-[var(--surface-2)] p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    roleColors[msg.role] || roleColors.INTERNAL
                  }`}
                >
                  {msg.role}
                </span>
                {msg.user?.email && (
                  <span className="text-xs text-[color:var(--muted)]">
                    {msg.user.email}
                  </span>
                )}
                <span className="ml-auto text-xs text-[color:var(--muted)]">
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="whitespace-pre-wrap text-sm text-[color:var(--text)]">
                {msg.body}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message Input */}
      <div className="flex gap-2">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          rows={3}
          className="flex-1 rounded-lg border border-[color:var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text)] placeholder-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !newMessage.trim()}
          className={btn}
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
