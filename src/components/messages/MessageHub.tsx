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

import MessageInput from "./MessageInput";
import MessageThreadList from "./MessageThreadList";
import MessageView from "./MessageView";
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
      setMessages(data.messages ?? data ?? []);
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
    [selectedThread, userId, fetchMessages],
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
    [selectedThread, fetchThreads],
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
                <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5">
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
            <MessageThreadList
              threads={threads.map((t) => ({
                id: t.id,
                subject: t.subject ?? t.title ?? "No subject",
                preview: t.lastMessage ?? "",
                participantName: t.participantName ?? "Unknown",
                participantAvatar: t.participantAvatar ?? undefined,
                updatedAt: t.lastMessageAt ?? t.updatedAt ?? "",
                unreadCount: t.unreadCount ?? 0,
                isSelected: selectedThread?.id === t.id,
              }))}
              onSelect={(id: string) => {
                const thread = threads.find((t) => t.id === id) ?? null;
                setSelectedThread(thread);
              }}
              onArchive={handleArchive}
            />
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
                  <p className="text-xs text-muted-foreground">
                    {selectedThread.participantName}
                  </p>
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
                <MessageView messages={messages} currentUserId={userId} />
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div className="border-t p-3">
                <MessageInput onSend={handleSend} disabled={isSending} placeholder="Type a message…" />
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
      {showNewMessage && (
        <NewMessageModal
          orgId={orgId}
          onClose={() => setShowNewMessage(false)}
          onCreated={async () => {
            setShowNewMessage(false);
            await fetchThreads();
          }}
        />
      )}
    </div>
  );
}
