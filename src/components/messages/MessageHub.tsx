/**
 * MessageHub — Unified messaging shell (Sprint 6)
 *
 * Drop-in replacement that wraps the split-pane thread-list / message-view
 * pattern used on /messages and /trades/messages into one component with
 * category tabs.
 *
 * Usage:
 *   <MessageHub userId={userId} orgId={orgId} />
 *   <MessageHub userId={userId} orgId={orgId} defaultTab="clients" />
 */

"use client";

import { Archive, MessageSquare, Plus, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import NewMessageModal from "./NewMessageModal";

// ── Types ───────────────────────────────────────────────────────────
export type ThreadCategory = "all" | "team" | "clients" | "trades" | "archived";

interface Thread {
  id: string;
  subject?: string;
  title?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  updatedAt?: string;
  participantName?: string;
  participantAvatar?: string | null;
  unreadCount?: number;
  isArchived?: boolean;
  threadType?: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName?: string;
  createdAt: string;
  attachments?: { url: string; name: string }[];
}

interface MessageHubProps {
  userId: string;
  orgId: string;
  defaultTab?: ThreadCategory;
  /** Show tab bar? Set false for single-context embeds like claims */
  showTabs?: boolean;
  /** Pre-filter to a specific claim or project */
  contextId?: string;
  contextType?: "claim" | "project";
}

// ── Inline Composer ─────────────────────────────────────────────────
function MessageComposer({
  onSend,
  disabled,
}: {
  onSend: (content: string) => Promise<void>;
  disabled: boolean;
}) {
  const [content, setContent] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || disabled) return;
    await onSend(content);
    setContent("");
  };
  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type a message…"
        className="min-h-[60px] flex-1 resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <Button type="submit" disabled={disabled || !content.trim()}>
        Send
      </Button>
    </form>
  );
}

// ── Component ───────────────────────────────────────────────────────
export default function MessageHub({
  userId,
  orgId,
  defaultTab = "all",
  showTabs = true,
  contextId,
  contextType,
}: MessageHubProps) {
  const [activeTab, setActiveTab] = useState<ThreadCategory>(defaultTab);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Fetch threads ─────────────────────────────────────────────────
  const fetchThreads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all" && activeTab !== "archived") params.set("type", activeTab);
      if (activeTab === "archived") params.set("archived", "true");
      if (contextId && contextType) {
        params.set("contextId", contextId);
        params.set("contextType", contextType);
      }

      const res = await fetch(`/api/messages/threads?${params}`);
      if (!res.ok) throw new Error("Failed to fetch threads");
      const data = await res.json();
      const threadList: Thread[] = data.threads ?? data ?? [];
      setThreads(threadList);
      setTotalUnread(threadList.reduce((sum: number, t: Thread) => sum + (t.unreadCount ?? 0), 0));
    } catch (err) {
      logger.error("MessageHub: fetch threads failed", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, contextId, contextType]);

  // ── Fetch messages for selected thread ────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!selectedThread) return;
    try {
      const res = await fetch(`/api/messages/${selectedThread.id}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      // Normalize field names: API returns senderUserId/body, component expects senderId/content
      const rawMessages = data.messages ?? data.Message ?? data ?? [];
      const normalized = (Array.isArray(rawMessages) ? rawMessages : []).map((m: any) => ({
        ...m,
        senderId: m.senderId || m.senderUserId || "",
        content: m.content || m.body || "",
      }));
      setMessages(normalized);
    } catch (err) {
      logger.error("MessageHub: fetch messages failed", err);
    }
  }, [selectedThread]);

  // ── Send message ──────────────────────────────────────────────────
  const handleSend = useCallback(
    async (content: string) => {
      if (!selectedThread || !content.trim()) return;
      setIsSending(true);
      try {
        const res = await fetch(`/api/messages/${selectedThread.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim(), senderId: userId }),
        });
        if (!res.ok) throw new Error("Send failed");
        await fetchMessages();
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } catch {
        toast.error("Failed to send message");
      } finally {
        setIsSending(false);
      }
    },
    [selectedThread, userId, fetchMessages]
  );

  // ── Archive thread ────────────────────────────────────────────────
  const handleArchive = useCallback(
    async (threadId: string) => {
      try {
        await fetch(`/api/messages/${threadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "archive" }),
        });
        toast.success("Thread archived");
        if (selectedThread?.id === threadId) setSelectedThread(null);
        await fetchThreads();
      } catch {
        toast.error("Failed to archive thread");
      }
    },
    [selectedThread, fetchThreads]
  );

  // ── Polling ───────────────────────────────────────────────────────
  useEffect(() => {
    fetchThreads();
    pollRef.current = setInterval(fetchThreads, 8_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchThreads]);

  useEffect(() => {
    if (selectedThread) {
      fetchMessages();
      msgPollRef.current = setInterval(fetchMessages, 4_000);
    }
    return () => {
      if (msgPollRef.current) clearInterval(msgPollRef.current);
    };
  }, [selectedThread, fetchMessages]);

  // ── Tab counts ────────────────────────────────────────────────────
  const TABS: { value: ThreadCategory; label: string; icon: React.ReactNode }[] = [
    { value: "all", label: "All", icon: <MessageSquare className="h-4 w-4" /> },
    { value: "team", label: "Team", icon: <Users className="h-4 w-4" /> },
    { value: "clients", label: "Clients", icon: <Users className="h-4 w-4" /> },
    { value: "trades", label: "Trades", icon: <Users className="h-4 w-4" /> },
    { value: "archived", label: "Archived", icon: <Archive className="h-4 w-4" /> },
  ];

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        {showTabs && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ThreadCategory)}>
            <TabsList>
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-1.5"
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        <div className="flex items-center gap-2">
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalUnread} unread
            </Badge>
          )}
          <Button size="sm" onClick={() => setShowNewMessage(true)}>
            <Plus className="mr-1 h-4 w-4" /> New Message
          </Button>
        </div>
      </div>

      {/* Split pane */}
      <div className="grid min-h-[600px] grid-cols-1 gap-4 md:grid-cols-[340px_1fr]">
        {/* Thread list */}
        <Card className="overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading threads…
            </div>
          ) : threads.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8 opacity-40" />
              No conversations yet
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {threads.map((t) => {
                const isSelected = selectedThread?.id === t.id;
                const displayName = t.participantName ?? t.subject ?? t.title ?? "Conversation";
                const initial = (displayName || "C")[0].toUpperCase();
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedThread(t)}
                    className={`group w-full p-4 text-left transition-all ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-base font-bold text-white">
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate font-semibold text-slate-900 group-hover:text-blue-600 dark:text-white">
                            {displayName}
                          </h3>
                          <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">
                            {t.lastMessageAt || t.updatedAt
                              ? formatDistanceToNow(
                                  new Date(t.lastMessageAt || t.updatedAt || ""),
                                  { addSuffix: true }
                                )
                              : ""}
                          </span>
                        </div>
                        {t.lastMessage && (
                          <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                            {t.lastMessage}
                          </p>
                        )}
                        {(t.unreadCount ?? 0) > 0 && (
                          <Badge variant="destructive" className="mt-1 text-xs">
                            {t.unreadCount} new
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Message view */}
        <Card className="flex flex-col overflow-hidden">
          {selectedThread ? (
            <>
              {/* Thread header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <h3 className="font-semibold">
                    {selectedThread.subject ?? selectedThread.title ?? "Conversation"}
                  </h3>
                  <p className="text-xs text-muted-foreground">{selectedThread.participantName}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleArchive(selectedThread.id)}
                  title="Archive"
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <p className="text-center text-sm text-slate-500">No messages yet</p>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.senderId === userId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              isOwn
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                            }`}
                          >
                            {msg.senderName && !isOwn && (
                              <p className="mb-1 text-xs font-medium opacity-70">
                                {msg.senderName}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                            <p
                              className={`mt-1 text-xs ${isOwn ? "text-blue-200" : "text-slate-400"}`}
                            >
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div className="border-t p-3">
                <MessageComposer onSend={handleSend} disabled={isSending} />
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <MessageSquare className="h-12 w-12 opacity-30" />
              <p className="text-sm">Select a conversation to start messaging</p>
            </div>
          )}
        </Card>
      </div>

      {/* New message modal */}
      <NewMessageModal
        open={showNewMessage}
        onOpenChange={setShowNewMessage}
        orgId={orgId}
        onSuccess={async () => {
          setShowNewMessage(false);
          await fetchThreads();
        }}
      />
    </div>
  );
}
