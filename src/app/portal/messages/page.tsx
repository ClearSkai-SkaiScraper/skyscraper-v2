"use client";

import { useAuth } from "@clerk/nextjs";
import {
  Archive,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageCircle,
  MessageSquare,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import MessageInput from "@/components/messages/MessageInput";
import NewClientMessageModal from "@/components/messages/NewClientMessageModal";
import PortalPageHero from "@/components/portal/portal-page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

/**
 * Messages Page - Client Portal
 * Real messaging interface with contractors
 */
export default function ClientMessagesPage() {
  const { userId } = useAuth();
  const searchParams = useSearchParams();
  const contractorParam = searchParams?.get("contractor");
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState<string | null>(null);
  const [pendingContractor, setPendingContractor] = useState<string | null>(
    contractorParam ?? null
  );
  const pollThreadsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollMsgsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);

  // Track scroll position — only auto-scroll when user is near bottom
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 120;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  // Smart auto-scroll: only when near bottom or new message arrives
  useEffect(() => {
    if (!messages.length || !messagesEndRef.current) return;
    const latestId = messages[messages.length - 1]?.id;
    const isNew = latestId && latestId !== lastMessageIdRef.current;
    if (isNew) lastMessageIdRef.current = latestId;
    if (isNearBottomRef.current || isNew) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    void fetchThreads();
    // Poll threads every 8 seconds
    pollThreadsRef.current = setInterval(() => fetchThreads(true), 8000);
    return () => {
      if (pollThreadsRef.current) clearInterval(pollThreadsRef.current);
      if (pollMsgsRef.current) clearInterval(pollMsgsRef.current);
    };
  }, []);

  // Handle contractor param - auto-open new message modal or find existing thread
  useEffect(() => {
    if (pendingContractor && !loading && threads.length >= 0) {
      // Check if there's an existing thread with this contractor
      const existingThread = threads.find(
        (t: any) => t.tradePartnerId === pendingContractor || t.proId === pendingContractor
      );
      if (existingThread) {
        void fetchThread(existingThread.id);
      } else {
        // Open new message modal with contractor pre-selected
        setShowNewMessageModal(true);
      }
      setPendingContractor(null);
    }
  }, [loading, threads, pendingContractor]);

  const fetchThreads = async (silent = false) => {
    try {
      const res = await fetch("/api/messages/threads?role=client");
      if (!res.ok) {
        throw new Error(`Failed to fetch threads: ${res.status}`);
      }
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (error) {
      if (!silent) logger.error("Failed to fetch threads:", error);
      if (!silent) setThreads([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchThread = async (threadId: string, silent = false) => {
    try {
      const res = await fetch(`/api/portal/messages/${threadId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch thread: ${res.status}`);
      }
      const data = await res.json();
      setSelectedThread(data);
      setMessages(data.messages || []);
    } catch (error) {
      if (!silent) logger.error("Failed to fetch thread:", error);
      if (!silent) setSelectedThread(null);
      if (!silent) setMessages([]);
    }
  };

  const handleSelectThread = (threadId: string) => {
    void fetchThread(threadId);
    // Poll messages every 4 seconds
    if (pollMsgsRef.current) clearInterval(pollMsgsRef.current);
    pollMsgsRef.current = setInterval(() => fetchThread(threadId, true), 4000);
  };

  const handleMessageSent = () => {
    if (selectedThread) {
      void fetchThread(selectedThread.id);
      void fetchThreads();
    }
  };

  const handleArchiveThread = async (threadId: string) => {
    try {
      const res = await fetch(`/api/messages/${threadId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Conversation archived successfully");
        setSelectedThread(null);
        setMessages([]);
        setShowArchiveConfirm(null);
        void fetchThreads();
      } else {
        toast.error("Failed to archive conversation");
      }
    } catch (error) {
      logger.error("Archive thread error:", error);
      toast.error("Failed to archive conversation");
    }
  };

  // Format time ago
  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-slate-500">Loading your conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <PortalPageHero
        title="Messages"
        subtitle="Stay connected with your contractors. Get updates on your projects, ask questions, and coordinate seamlessly."
        icon={MessageCircle}
        badge="Direct Communication"
        gradient="purple"
        stats={[
          { label: "Conversations", value: threads.length },
          { label: "Unread", value: threads.filter((t: any) => t.unreadCount > 0).length },
        ]}
        action={
          <Button
            size="lg"
            className="w-fit bg-white text-purple-700 shadow-lg hover:bg-purple-50"
            onClick={() => setShowNewMessageModal(true)}
          >
            <Plus className="mr-2 h-5 w-5" />
            New Message
          </Button>
        }
      />

      {/* Empty State for No Conversations — keep 1 demo message */}
      {threads.length === 0 && (
        <div className="space-y-6">
          {/* Demo welcome message */}
          <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-6 shadow-sm dark:border-purple-800 dark:from-purple-900/20 dark:to-indigo-900/20">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-sm font-bold text-white">
                S
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    SkaiScrape Team
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Welcome
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  👋 Welcome to ClearSkai Messages! Once you connect with a contractor, your
                  conversations will appear here. You can send project updates, ask questions, and
                  coordinate directly — all in one place.
                </p>
                <p className="mt-1 text-xs text-slate-400">Just now</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30">
              <MessageSquare className="h-10 w-10 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">
              Start a Conversation
            </h3>
            <p className="mb-6 text-slate-600 dark:text-slate-400">
              Connect with contractors to start messaging. Find professionals who can help with your
              project!
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700">
                <Link href="/portal/find-a-pro">
                  <Plus className="mr-2 h-5 w-5" />
                  Find Contractors
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/portal/my-jobs">View My Projects</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Interface */}
      {threads.length > 0 && (
        <div className="grid h-[calc(100vh-380px)] min-h-[500px] grid-cols-1 gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-3">
          {/* Thread List — hidden on mobile when a thread is selected */}
          <div
            className={`overflow-y-auto border-r border-slate-200 dark:border-slate-700 ${selectedThread ? "hidden lg:block" : ""}`}
          >
            <div className="border-b border-slate-100 p-4 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-white">Conversations</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {threads.map((thread: any) => (
                <button
                  key={thread.id}
                  onClick={() => handleSelectThread(thread.id)}
                  className={`w-full p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    selectedThread?.id === thread.id ? "bg-purple-50 dark:bg-purple-900/20" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {thread.participantAvatar ? (
                      <Image
                        src={thread.participantAvatar}
                        alt={thread.participantName || ""}
                        width={48}
                        height={48}
                        className="h-12 w-12 shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-lg font-bold text-white">
                        {(thread.participantName || "C")[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-slate-900 dark:text-white">
                          {thread.participantName}
                        </span>
                        {thread.verified && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                        )}
                      </div>
                      {thread.trade && (
                        <span className="text-xs text-slate-500">{thread.trade}</span>
                      )}
                      <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-400">
                        {thread.lastMessage}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-400">
                          {formatTimeAgo(thread.lastMessageAt)}
                        </span>
                        {thread.unreadCount > 0 && (
                          <Badge className="bg-purple-600 px-1.5 py-0 text-xs text-white">
                            {thread.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Message View — hidden on mobile when no thread is selected */}
          <div className={`col-span-2 flex flex-col ${!selectedThread ? "hidden lg:flex" : ""}`}>
            {selectedThread ? (
              <>
                {/* Thread Header */}
                <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <button
                    onClick={() => setSelectedThread(null)}
                    className="mr-1 rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 lg:hidden"
                    aria-label="Back to conversations"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <Link
                    href={
                      selectedThread.tradePartnerId
                        ? `/portal/profiles/${selectedThread.tradePartnerId}`
                        : "#"
                    }
                    className="shrink-0"
                  >
                    {selectedThread.participantAvatar ? (
                      <Image
                        src={selectedThread.participantAvatar}
                        alt={selectedThread.participantName || ""}
                        width={44}
                        height={44}
                        className="h-11 w-11 rounded-full object-cover shadow-sm ring-2 ring-white transition-opacity hover:opacity-80"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-lg font-bold text-white transition-opacity hover:opacity-80">
                        {(selectedThread.participantName || "C")[0]}
                      </div>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={
                          selectedThread.tradePartnerId
                            ? `/portal/profiles/${selectedThread.tradePartnerId}`
                            : "#"
                        }
                        className="font-semibold hover:text-purple-600 hover:underline"
                      >
                        {selectedThread.participantName}
                      </Link>
                      {selectedThread.verified && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                      )}
                      {selectedThread.rating && (
                        <div className="flex items-center gap-1 text-sm text-amber-500">
                          <Star className="h-3 w-3 fill-current" />
                          {selectedThread.rating}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      {selectedThread.trade && <span>{selectedThread.trade}</span>}
                      {selectedThread.tradePartnerId && (
                        <Link
                          href={`/portal/profiles/${selectedThread.tradePartnerId}`}
                          className="inline-flex items-center gap-1 text-xs text-purple-500 hover:text-purple-700"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Profile
                        </Link>
                      )}
                    </div>
                  </div>
                  {/* Archive / Delete */}
                  <div className="relative ml-auto shrink-0">
                    {showArchiveConfirm === selectedThread.id ? (
                      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 dark:border-red-800 dark:bg-red-900/20">
                        <span className="text-xs text-red-600 dark:text-red-400">
                          Archive this conversation?
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleArchiveThread(selectedThread.id)}
                        >
                          <Archive className="mr-1 h-3 w-3" />
                          Archive
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setShowArchiveConfirm(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-500"
                        title="Archive conversation"
                        onClick={() => setShowArchiveConfirm(selectedThread.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 space-y-4 overflow-y-auto p-4"
                >
                  {messages.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                          msg.isOwn
                            ? "rounded-br-sm bg-purple-600 text-white"
                            : "rounded-bl-sm bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p
                          className={`mt-1 text-xs ${msg.isOwn ? "text-purple-200" : "text-slate-400"}`}
                        >
                          {formatTimeAgo(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t border-slate-100 p-4 dark:border-slate-800">
                  <MessageInput threadId={selectedThread.id} onMessageSent={handleMessageSent} />
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 p-6">
                  <MessageSquare className="h-12 w-12 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Select a conversation
                  </h3>
                  <p className="text-slate-500">
                    Choose a conversation from the list to view messages
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <NewClientMessageModal
        isOpen={showNewMessageModal}
        onClose={() => setShowNewMessageModal(false)}
        onSuccess={() => {
          setShowNewMessageModal(false);
          void fetchThreads();
        }}
        defaultProId={contractorParam}
      />
    </div>
  );
}
