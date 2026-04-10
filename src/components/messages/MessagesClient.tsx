"use client";

import { FilePenLine, Loader2, MessageSquare, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import MessageInput from "@/components/messages/MessageInput";
import MessageThreadList from "@/components/messages/MessageThreadList";
import MessageView from "@/components/messages/MessageView";
import NewMessageModal from "@/components/messages/NewMessageModal";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface MessagesClientProps {
  userId: string;
  orgId: string;
}

export default function MessagesClient({ userId, orgId }: MessagesClientProps) {
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [draftPreset, setDraftPreset] = useState<{
    subject?: string;
    body?: string;
    recipientType?: "contact" | "pro";
  } | null>(null);

  // Refs for polling
  const selectedThreadRef = useRef<any>(null);
  const pollThreadsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollMessagesRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scroll tracking — only auto-scroll if user is already at the bottom
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // Keep ref in sync
  useEffect(() => {
    selectedThreadRef.current = selectedThread;
  }, [selectedThread]);

  useEffect(() => {
    void fetchThreads();

    // Poll threads list every 8 seconds for new conversations
    pollThreadsRef.current = setInterval(() => {
      void fetchThreads(true);
    }, 8000);

    return () => {
      if (pollThreadsRef.current) clearInterval(pollThreadsRef.current);
      if (pollMessagesRef.current) clearInterval(pollMessagesRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const fetchThreads = async (silent = false) => {
    try {
      const res = await fetch(`/api/messages/threads?orgId=${orgId}`);
      if (!res.ok) {
        if (!silent) logger.warn("No threads found or API unavailable");
        if (!silent) setThreads([]);
        if (!silent) setLoading(false);
        return;
      }
      const data = await res.json();
      setThreads(data.threads || []);
      if (!silent) setLoading(false);
    } catch (error) {
      if (!silent) logger.error("Failed to fetch threads:", error);
      if (!silent) setThreads([]);
      if (!silent) setLoading(false);
    }
  };

  const fetchThread = async (threadId: string, silent = false) => {
    try {
      if (!silent) setThreadLoading(true);
      // Find the thread from our list to get title/claims info
      const threadMeta = threads.find((t) => t.id === threadId);

      const res = await fetch(`/api/messages/${threadId}`);
      if (!res.ok) throw new Error("Failed to load conversation");
      const data = await res.json();
      // Ensure messages is always an array to prevent t.map errors
      const msgArray = Array.isArray(data.messages) ? data.messages : [];

      if (silent) {
        // During polling: only update if messages actually changed
        // This prevents unnecessary re-renders that reset scroll position
        setMessages((prev) => {
          const prevLastId = prev[prev.length - 1]?.id;
          const newLastId = msgArray[msgArray.length - 1]?.id;
          if (prev.length === msgArray.length && prevLastId === newLastId) {
            return prev; // Same data — keep existing reference, skip re-render
          }
          return msgArray;
        });
        return; // Don't recreate selectedThread object during silent polls
      }

      setSelectedThread({
        id: data.id || threadId,
        title: data.participantName || data.subject || threadMeta?.subject || threadMeta?.title,
        participantName: data.participantName || threadMeta?.participantName || null,
        participantAvatar: data.participantAvatar || threadMeta?.participantAvatar || null,
        claims: threadMeta?.claims,
        messages: msgArray,
      });
      setMessages(msgArray);
    } catch (error) {
      if (!silent) logger.error("Failed to fetch thread:", error);
      if (!silent) setMessages([]);
    } finally {
      if (!silent) setThreadLoading(false);
    }
  };

  const handleSelectThread = (threadId: string) => {
    void fetchThread(threadId);

    // Start polling messages for the selected thread every 4 seconds
    if (pollMessagesRef.current) clearInterval(pollMessagesRef.current);
    pollMessagesRef.current = setInterval(() => {
      void fetchThread(threadId, true);
    }, 4000);
  };

  const handleMessageSent = () => {
    if (selectedThread) {
      // User just sent a message — scroll to bottom to see it
      isNearBottomRef.current = true;
      void fetchThread(selectedThread.id);
      void fetchThreads();
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      const res = await fetch(`/api/messages/${threadId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setThreads((prev) => prev.filter((t) => t.id !== threadId));
        if (selectedThread?.id === threadId) {
          setSelectedThread(null);
          setMessages([]);
        }
        toast.success("Conversation deleted");
      } else {
        toast.error("Failed to delete conversation");
      }
    } catch (error) {
      logger.error("Failed to delete thread:", error);
      toast.error("Failed to delete conversation");
    }
  };

  // Track scroll position — only auto-scroll if already near bottom
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  // Auto-scroll to bottom only when new messages arrive AND user is at bottom
  useEffect(() => {
    if (isNearBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-16rem)] gap-4">
        <div className="w-80 flex-shrink-0 rounded-3xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70">
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-3 animate-pulse rounded-lg border border-slate-200 p-4">
              <div className="mb-2 h-4 w-3/4 rounded bg-slate-200" />
              <div className="h-3 w-full rounded bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="flex flex-1 items-center justify-center rounded-3xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900/70">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-2 text-sm text-slate-500">Loading conversations...</p>
          </div>
        </div>
      </div>
    );
  }

  const displayThreads = threads;

  return (
    <div className="flex h-[calc(100vh-16rem)] flex-col gap-4 lg:flex-row">
      <div className="w-full flex-shrink-0 overflow-y-auto rounded-3xl border border-slate-100 bg-white p-4 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70 lg:w-80">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Conversations</h2>
          {threads.length > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {threads.length}
            </span>
          )}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <Button
            className="gap-2"
            onClick={() => {
              setDraftPreset(null);
              setShowNewMessageModal(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              setDraftPreset({
                subject: "Draft Message",
                body: "",
                recipientType: "contact",
              });
              setShowNewMessageModal(true);
            }}
          >
            <FilePenLine className="h-4 w-4" />
            Draft
          </Button>
        </div>

        {displayThreads.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-50">
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">
              No conversations yet
            </h3>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              Start from a claim, client, or trade partner to begin messaging.
            </p>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowNewMessageModal(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Conversation
            </Button>
          </div>
        ) : (
          <MessageThreadList
            threads={displayThreads}
            selectedThreadId={selectedThread?.id}
            onSelectThread={handleSelectThread}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
        {threadLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Loading conversation...
              </p>
            </div>
          </div>
        ) : selectedThread ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30 px-4 py-3 dark:border-slate-700 dark:from-slate-800 dark:to-slate-800">
              <div className="flex items-center gap-3">
                {selectedThread.participantAvatar ? (
                  <Image
                    src={selectedThread.participantAvatar}
                    alt={selectedThread.participantName || selectedThread.title || ""}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover shadow-md"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-md">
                    {(selectedThread.participantName ||
                      selectedThread.title ||
                      "C")[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {selectedThread.participantName ||
                      selectedThread.title ||
                      selectedThread.claims?.title ||
                      "Conversation"}
                  </h3>
                  {selectedThread.claims && (
                    <p className="text-xs text-slate-500">
                      Claim #{selectedThread.claims.claimNumber}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-red-500"
                onClick={() => handleDeleteThread(selectedThread.id)}
                title="Delete conversation"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto bg-slate-50/50"
            >
              <MessageView messages={messages} currentUserId={userId} currentUserType="pro" />
            </div>

            <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <MessageInput threadId={selectedThread.id} onMessageSent={handleMessageSent} />
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/20 dark:from-slate-950 dark:to-blue-950/20">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg dark:bg-slate-800">
                <MessageSquare className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                Select a conversation
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Choose a conversation from the list to view messages
              </p>
            </div>
          </div>
        )}
      </div>

      <NewMessageModal
        open={showNewMessageModal}
        onOpenChange={setShowNewMessageModal}
        orgId={orgId}
        initialSubject={draftPreset?.subject}
        initialBody={draftPreset?.body}
        initialRecipientType={draftPreset?.recipientType}
        onSuccess={() => {
          void fetchThreads();
        }}
      />
    </div>
  );
}
