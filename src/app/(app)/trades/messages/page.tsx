/**
 * Trades Messages Page
 * Direct messaging between contractors AND with connected clients
 */

"use client";

import { Archive, MessageSquare, MoreVertical, Plus, Trash2, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ComponentProps, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { ConnectionInviteBanner } from "@/components/messages/ConnectionInviteBanner";
import MessageInput from "@/components/messages/MessageInput";
import MessageThreadList from "@/components/messages/MessageThreadList";
import MessageView from "@/components/messages/MessageView";
import PresenceBadge from "@/components/presence/PresenceBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface ThreadParticipant {
  id: string;
  name?: string;
  email?: string;
}

interface ConnectedClient {
  id: string;
  userId?: string;
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

/** API response shape for portal thread */
interface PortalThreadResponse {
  id: string;
  participantName?: string;
  subject?: string;
  title?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  updatedAt?: string;
  participants?: ThreadParticipant[];
  clientId?: string;
  participantAvatar?: string | null;
}

/** API response shape for trades message */
interface TradesMessageResponse {
  id: string;
  subject?: string;
  message?: string;
  createdAt?: string;
  fromProfile?: { id: string };
  toProfile?: { id: string };
}

/** API response shape for portal message */
interface PortalMessageResponse {
  id: string;
  body?: string;
  content?: string;
  senderUserId?: string;
  senderType?: string;
  createdAt?: string;
  read?: boolean;
  attachments?: string[];
}

interface Thread {
  id: string;
  title: string;
  lastMessage?: string;
  lastMessageAt?: string;
  updatedAt?: string;
  participants?: ThreadParticipant[];
  fromProfile?: { id: string };
  toProfile?: { id: string };
  isPortalThread?: boolean;
  clientId?: string;
  participantName?: string;
  participantAvatar?: string | null;
}

interface Message {
  id: string;
  body: string;
  senderUserId: string;
  senderType: string;
  createdAt: Date;
  read: boolean;
  attachments?: string[];
}

export default function TradesMessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [connectedClients, setConnectedClients] = useState<ConnectedClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newMessageBody, setNewMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Thread | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const pollThreadsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollMsgsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);

  // Track scroll position — only auto-scroll if user is near the bottom
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 120;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  // Auto-scroll only when near bottom or when a NEW message arrives
  useEffect(() => {
    if (!messagesEndRef.current) return;
    const latestId = messages[messages.length - 1]?.id || null;
    const isNewMessage = latestId && latestId !== lastMessageIdRef.current;
    if (isNearBottomRef.current || isNewMessage) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    lastMessageIdRef.current = latestId;
  }, [messages]);

  useEffect(() => {
    void fetchThreads();
    void fetchConnectedClients();
    // Fetch current user's ID so message alignment works
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.userId) setCurrentUserId(d.userId);
      })
      .catch(() => {});
    // Poll threads every 8 seconds
    pollThreadsRef.current = setInterval(() => fetchThreads(true), 8000);
    return () => {
      if (pollThreadsRef.current) clearInterval(pollThreadsRef.current);
      if (pollMsgsRef.current) clearInterval(pollMsgsRef.current);
    };
  }, []);

  const fetchConnectedClients = async () => {
    try {
      const res = await fetch("/api/clients/connections");
      if (res.ok) {
        const data = await res.json();
        // Show ALL org clients in the dropdown — any client record in the org
        // is a valid messaging target regardless of connection status
        setConnectedClients(data.clients || []);
      }
    } catch (error) {
      logger.error("Failed to fetch connected clients:", error);
    }
  };

  const fetchThreads = async (silent = false) => {
    try {
      // Fetch from BOTH messaging systems:
      // 1. MessageThread/Message (client-portal threads) via /api/messages/threads
      // 2. TradesMessage (pro-to-pro messages) via /api/trades/messages
      const [threadsRes, tradesRes] = await Promise.all([
        fetch("/api/messages/threads"),
        fetch("/api/trades/messages"),
      ]);

      let allThreads: Thread[] = [];

      // Client-portal threads (MessageThread model)
      if (threadsRes.ok) {
        const threadsData = await threadsRes.json();
        const portalThreads = (threadsData.threads || []).map((t: PortalThreadResponse) => ({
          id: t.id,
          title: t.participantName || t.subject || t.title || "Client Message",
          lastMessage: t.lastMessage || "",
          lastMessageAt: t.lastMessageAt || t.updatedAt,
          updatedAt: t.updatedAt || new Date().toISOString(),
          participants: t.participants || [],
          fromProfile: null,
          toProfile: null,
          isPortalThread: true,
          clientId: t.clientId,
          participantName: t.participantName || t.subject || "Client",
          participantAvatar: t.participantAvatar || null,
        }));
        allThreads = [...allThreads, ...portalThreads];
      }

      // Pro-to-pro trades messages (TradesMessage model)
      if (tradesRes.ok) {
        const tradesData = await tradesRes.json();
        const tradeThreads = (tradesData || []).map((msg: TradesMessageResponse) => ({
          id: msg.id,
          title: msg.subject || "Message",
          lastMessage: msg.message,
          lastMessageAt: msg.createdAt,
          updatedAt: msg.createdAt || new Date().toISOString(),
          participants: [msg.fromProfile || msg.toProfile],
          fromProfile: msg.fromProfile,
          toProfile: msg.toProfile,
          isPortalThread: false,
        }));
        allThreads = [...allThreads, ...tradeThreads];
      }

      // Sort by most recent first
      allThreads.sort(
        (a, b) =>
          new Date(b.lastMessageAt || b.updatedAt || 0).getTime() -
          new Date(a.lastMessageAt || a.updatedAt || 0).getTime()
      );

      setThreads(allThreads);
    } catch (error) {
      if (!silent) logger.error("Failed to fetch threads:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSelectThread = async (threadId: string) => {
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;

    setSelectedThread(thread);

    // Start polling for messages
    if (pollMsgsRef.current) clearInterval(pollMsgsRef.current);

    const loadMessages = async () => {
      // For portal threads, fetch messages from the MessageThread/Message system
      if (thread.isPortalThread) {
        try {
          const res = await fetch(`/api/messages/${threadId}`);
          if (res.ok) {
            const data = await res.json();
            const msgArray = Array.isArray(data.messages) ? data.messages : [];
            setMessages(
              msgArray.map((m: PortalMessageResponse) => ({
                id: m.id,
                body: m.body || m.content || "",
                senderUserId: m.senderUserId || "",
                senderType: m.senderType || "client",
                createdAt: new Date(m.createdAt || new Date().toISOString()),
                read: m.read ?? true,
                attachments: m.attachments || [],
              }))
            );
          }
        } catch (error) {
          logger.error("Failed to fetch portal thread messages:", error);
        }
      } else {
        // Legacy TradesMessage — single message per record
        setMessages([
          {
            id: thread.id,
            body: thread.lastMessage || "",
            senderUserId: "",
            senderType: "pro",
            createdAt: new Date(thread.lastMessageAt || new Date().toISOString()),
            read: true,
          },
        ]);
      }
    };

    await loadMessages();
    // Poll for new messages every 4 seconds
    pollMsgsRef.current = setInterval(loadMessages, 4000);
  };

  const handleSendNewMessage = async () => {
    if (!selectedClientId || !newMessageBody.trim()) {
      setSendError("Please select a client and enter a message");
      toast.error("Please select a client and enter a message");
      return;
    }

    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/messages/pro-to-client/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          subject: "New Message",
          body: newMessageBody,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success("Message sent successfully!");
        setShowNewMessageModal(false);
        setSelectedClientId("");
        setNewMessageBody("");
        setSendError(null);
        // Refresh threads, then auto-select the new one
        await fetchThreads();
        if (result.threadId) {
          // Small delay to let state update from fetchThreads
          setTimeout(() => handleSelectThread(result.threadId), 200);
        }
      } else {
        let errorMsg = "Failed to send message";
        try {
          const errBody = await res.json();
          errorMsg = errBody.error || errorMsg;
        } catch {
          // Response wasn't JSON
        }
        setSendError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      const msg = error?.message || "Network error — please try again";
      logger.error("Failed to send message:", error);
      setSendError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteThread = async () => {
    if (!deleteTarget) return;
    try {
      const endpoint = deleteTarget.isPortalThread
        ? `/api/messages/${deleteTarget.id}`
        : `/api/trades/messages?id=${deleteTarget.id}`;
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        toast.success("Conversation deleted");
        setThreads((prev) => prev.filter((t) => t.id !== deleteTarget.id));
        if (selectedThread?.id === deleteTarget.id) {
          setSelectedThread(null);
          setMessages([]);
        }
      } else {
        toast.error("Failed to delete conversation");
      }
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  const handleArchiveThread = async () => {
    if (!deleteTarget) return;
    try {
      // For portal threads, use PATCH archive
      if (deleteTarget.isPortalThread) {
        const res = await fetch(`/api/messages/${deleteTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "archive" }),
        });
        if (res.ok) {
          toast.success("Conversation archived");
          setThreads((prev) => prev.filter((t) => t.id !== deleteTarget.id));
          if (selectedThread?.id === deleteTarget.id) {
            setSelectedThread(null);
            setMessages([]);
          }
          return;
        }
      }
      // For trades messages or fallback — just hide from local state
      toast.success("Conversation archived");
      setThreads((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      if (selectedThread?.id === deleteTarget.id) {
        setSelectedThread(null);
        setMessages([]);
      }
    } catch {
      toast.error("Failed to archive conversation");
    }
  };

  const handleSendMessage = async (body: string) => {
    if (!selectedThread) return;

    try {
      if (selectedThread.isPortalThread) {
        // Portal threads — send via the portal message endpoint
        const res = await fetch(`/api/messages/${selectedThread.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: body }),
        });
        if (res.ok) {
          // Immediately reload messages for this thread
          const msgRes = await fetch(`/api/messages/${selectedThread.id}`);
          if (msgRes.ok) {
            const data = await msgRes.json();
            const msgArray = Array.isArray(data.messages) ? data.messages : [];
            setMessages(
              msgArray.map((m: PortalMessageResponse) => ({
                id: m.id,
                body: m.body || m.content || "",
                senderUserId: m.senderUserId || "",
                senderType: m.senderType || "client",
                createdAt: new Date(m.createdAt || new Date().toISOString()),
                read: m.read ?? true,
                attachments: m.attachments || [],
              }))
            );
          }
          void fetchThreads();
        }
      } else {
        // Legacy trades messages
        const res = await fetch("/api/trades/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toProfileId: selectedThread.fromProfile?.id || selectedThread.toProfile?.id,
            subject: selectedThread.title,
            message: body,
          }),
        });
        if (res.ok) {
          void fetchThreads();
        }
      }
    } catch (error) {
      logger.error("Failed to send message:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-slate-500">Loading messages...</p>
      </div>
    );
  }

  return (
    <PageContainer maxWidth="7xl">
      {/* Header */}
      <PageHero
        title="Messages"
        subtitle="Connect with clients and contractors in your network"
        icon={<MessageSquare className="h-5 w-5" />}
        section="trades"
        actions={
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => {
              setSendError(null);
              setShowNewMessageModal(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New Message
          </Button>
        }
      />

      {/* Connected Clients Quick Access */}
      {connectedClients.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Connected Clients ({connectedClients.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {connectedClients.slice(0, 5).map((client: ConnectedClient) => (
              <Button
                key={client.id}
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedClientId(client.id);
                  setShowNewMessageModal(true);
                }}
              >
                <PresenceBadge userId={client.userId} size="sm" className="mr-1" />
                {client.name || client.email || "Client"}
              </Button>
            ))}
            {connectedClients.length > 5 && (
              <Button variant="ghost" size="sm" onClick={() => setShowNewMessageModal(true)}>
                +{connectedClients.length - 5} more
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Messages Area */}
      <Card className="overflow-hidden">
        <div className="grid h-[calc(100vh-320px)] min-h-[500px] grid-cols-1 md:grid-cols-3">
          {/* Thread List */}
          <div className="border-r border-slate-200 dark:border-slate-700">
            {threads.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <MessageSquare className="mb-4 h-12 w-12 text-slate-300" />
                <h3 className="text-lg font-medium">No conversations yet</h3>
                <p className="text-sm text-slate-500">
                  {connectedClients.length > 0
                    ? "Click a client above or 'New Message' to start messaging"
                    : "Connect with clients to start messaging"}
                </p>
              </div>
            ) : (
              <MessageThreadList
                threads={threads as unknown as ComponentProps<typeof MessageThreadList>["threads"]}
                selectedThreadId={selectedThread?.id || undefined}
                onSelectThread={handleSelectThread}
              />
            )}
          </div>

          {/* Message View */}
          <div className="col-span-2 flex flex-col">
            {selectedThread ? (
              <>
                {/* Contact profile header — Facebook Messenger style */}
                <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30 px-4 py-3 dark:border-slate-700 dark:from-slate-800 dark:to-slate-800">
                  <div className="flex items-center gap-3">
                    {selectedThread.participantAvatar ? (
                      <Image
                        src={selectedThread.participantAvatar}
                        alt={selectedThread.participantName || selectedThread.title || ""}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full object-cover shadow-md"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white shadow-md">
                        {(selectedThread.participantName || selectedThread.title || "C")[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {selectedThread.participantName || selectedThread.title || "Client"}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <PresenceBadge
                          userId={selectedThread.clientId || selectedThread.participants?.[0]?.id}
                          showLabel
                          showStatus
                          size="sm"
                        />
                      </div>
                    </div>
                    {/* Quick action buttons */}
                    <div className="flex items-center gap-1">
                      {selectedThread.clientId && (
                        <Link
                          href="/contacts"
                          className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-700"
                          title="View Contact"
                        >
                          <Users className="h-4 w-4" />
                        </Link>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                            title="More actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setDeleteTarget(selectedThread);
                              setShowDeleteDialog(true);
                            }}
                            className="gap-2 text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Conversation
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setDeleteTarget(selectedThread);
                              void handleArchiveThread();
                            }}
                            className="gap-2"
                          >
                            <Archive className="h-4 w-4" />
                            Archive Conversation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto p-4"
                >
                  {selectedThread?.id && <ConnectionInviteBanner threadId={selectedThread.id} />}
                  <MessageView
                    messages={messages}
                    currentUserId={currentUserId}
                    currentUserType="pro"
                  />
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t border-slate-200 p-4 dark:border-slate-700">
                  <MessageInput
                    threadId={selectedThread?.id ?? ""}
                    onMessageSent={() => handleSelectThread(selectedThread?.id ?? "")}
                  />
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500">
                Select a conversation to view messages
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* New Message Modal — Modern Design */}
      <Dialog open={showNewMessageModal} onOpenChange={setShowNewMessageModal}>
        <DialogContent className="max-w-lg overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-xl">
          <DialogHeader className="border-b border-slate-100 px-6 py-4">
            <DialogTitle className="text-lg font-semibold text-slate-800">New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 px-6 py-5">
            {/* Client selector */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                To
              </label>
              {connectedClients.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                  No connected clients yet. Invite clients from your dashboard.
                </div>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {connectedClients.map((client: ConnectedClient) => {
                    const displayName =
                      client.name ||
                      [client.firstName, client.lastName].filter(Boolean).join(" ") ||
                      client.email ||
                      "Unnamed Client";
                    const initials = displayName
                      .split(" ")
                      .map((w: string) => w[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    const isSelected = selectedClientId === client.id;

                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => setSelectedClientId(client.id)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                          isSelected ? "bg-sky-50 ring-2 ring-sky-400" : "hover:bg-white"
                        }`}
                      >
                        {client.avatarUrl ? (
                          <Image
                            src={client.avatarUrl}
                            alt={displayName}
                            width={36}
                            height={36}
                            className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500 text-xs font-bold text-white ring-2 ring-white">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {displayName}
                          </p>
                          {client.email && client.name && (
                            <p className="truncate text-xs text-slate-400">{client.email}</p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500">
                            <svg
                              className="h-3 w-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Message input — bubble-style */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Message
              </label>
              <div className="rounded-2xl border border-slate-200 bg-white p-1 shadow-sm transition-all focus-within:border-sky-300 focus-within:ring-2 focus-within:ring-sky-100">
                <Textarea
                  value={newMessageBody}
                  onChange={(e) => setNewMessageBody(e.target.value)}
                  placeholder="Type your message…"
                  rows={4}
                  className="resize-none border-0 bg-transparent px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
          </div>

          {/* Inline error banner */}
          {sendError && (
            <div className="mx-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <span>{sendError}</span>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <Button
              variant="ghost"
              className="text-slate-500 hover:text-slate-700"
              onClick={() => {
                setShowNewMessageModal(false);
                setSelectedClientId("");
                setNewMessageBody("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendNewMessage}
              disabled={sending || !selectedClientId || !newMessageBody.trim()}
              className="rounded-full bg-sky-500 px-6 text-white shadow-md hover:bg-sky-600 disabled:opacity-50"
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Sending…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Send Message
                </span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete / Archive Confirmation */}
      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete this conversation?"
        description="This will permanently remove the conversation and all messages. You can archive it instead to keep a record."
        itemLabel={deleteTarget?.title || "Conversation"}
        showArchive={true}
        onConfirmDelete={handleDeleteThread}
        onConfirmArchive={handleArchiveThread}
      />
    </PageContainer>
  );
}
