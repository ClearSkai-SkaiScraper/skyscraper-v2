"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, CheckCircle2, Clock, MessageCircle, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ConnectionInviteBanner } from "@/components/messages/ConnectionInviteBanner";
import { MessageAttachments } from "@/components/messages/MessageAttachments";
import MessageInput from "@/components/messages/MessageInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { logger } from "@/lib/logger";

/**
 * Single Thread View - Client Portal
 * Direct link to a specific message thread from Activity Feed
 */
export default function ThreadDetailPage() {
  const { userId } = useAuth();
  const params = useParams();
  const threadId = Array.isArray(params?.threadId) ? params.threadId[0] : params?.threadId;

  const [thread, setThread] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(threadId || null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchThreads();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (threadId) {
      fetchThread(threadId);

      // Poll for new messages every 4 seconds
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        fetchThread(threadId, true);
      }, 4000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [threadId]);

  const fetchThreads = async () => {
    try {
      const res = await fetch("/api/messages/threads");
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads || []);
      }
    } catch (error) {
      logger.error("Failed to fetch threads:", error);
    }
  };

  const fetchThread = async (id: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/portal/messages/${id}`);
      if (res.ok) {
        const data = await res.json();
        setThread(data);
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setSelectedThreadId(id);
      }
    } catch (error) {
      if (!silent) logger.error("Failed to fetch thread:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleMessageSent = () => {
    if (selectedThreadId) {
      fetchThread(selectedThreadId);
      fetchThreads();
    }
  };

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
      <div className="space-y-8">
        {/* Back Button */}
        <Link
          href="/portal/feed"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Activity Feed
        </Link>

        {/* Loading State */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
          <div className="h-[500px] p-4">
            <div className="space-y-4">
              <Skeleton className="ml-auto h-20 w-3/4 rounded-xl" />
              <Skeleton className="h-20 w-3/4 rounded-xl" />
              <Skeleton className="ml-auto h-16 w-2/3 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <Link
          href="/portal/feed"
          className="inline-flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Activity Feed
        </Link>
        <Link href="/portal/messages">
          <Button variant="outline" size="sm">
            <MessageSquare className="mr-2 h-4 w-4" />
            All Messages
          </Button>
        </Link>
      </div>

      {/* Thread Header */}
      {thread && (
        <div className="rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 dark:border-purple-800 dark:from-purple-900/20 dark:to-indigo-900/20">
          <div className="flex items-center gap-4">
            <Link
              href={thread.tradePartnerId ? `/portal/profiles/${thread.tradePartnerId}` : "#"}
              className="shrink-0"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-xl font-bold text-white transition-opacity hover:opacity-80">
                {(thread.participantName || "C")[0]}
              </div>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={thread.tradePartnerId ? `/portal/profiles/${thread.tradePartnerId}` : "#"}
                  className="text-xl font-bold text-slate-900 hover:text-purple-600 hover:underline dark:text-white"
                >
                  {thread.participantName || "Contractor"}
                </Link>
                {thread.verified && <CheckCircle2 className="h-5 w-5 text-blue-500" />}
              </div>
              {thread.trade && (
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  {thread.trade}
                </p>
              )}
              {!thread.trade && thread.projectName && (
                <p className="text-sm text-slate-600 dark:text-slate-400">{thread.projectName}</p>
              )}
              {thread.tradePartnerId && (
                <Link
                  href={`/portal/profiles/${thread.tradePartnerId}`}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-purple-500 hover:text-purple-700"
                >
                  View Full Profile →
                </Link>
              )}
            </div>
            {thread.unreadCount > 0 && (
              <Badge className="bg-purple-600">{thread.unreadCount} new</Badge>
            )}
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
        {/* Connection Banner */}
        {selectedThreadId && <ConnectionInviteBanner threadId={selectedThreadId} />}
        {/* Messages List */}
        <div className="h-[calc(100vh-400px)] min-h-[400px] overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <MessageCircle className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                No messages yet
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Start the conversation by sending a message below.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message: any) => {
                const isOwn = message.senderId === userId;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        isOwn
                          ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white"
                          : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      {message.attachments && message.attachments.length > 0 && (
                        <MessageAttachments attachments={message.attachments} />
                      )}
                      <div
                        className={`mt-2 flex items-center gap-2 text-xs ${
                          isOwn ? "text-purple-200" : "text-slate-500"
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(message.createdAt)}
                        {isOwn && message.read && (
                          <CheckCircle2 className="h-3 w-3 text-green-400" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          {selectedThreadId ? (
            <MessageInput threadId={selectedThreadId} onMessageSent={handleMessageSent} />
          ) : (
            <div className="text-center text-sm text-slate-500">
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </div>

      {/* Other Threads (Quick Switch) */}
      {threads.length > 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-3 font-medium text-slate-900 dark:text-white">Other Conversations</h3>
          <div className="flex flex-wrap gap-2">
            {threads
              .filter((t: any) => t.id !== selectedThreadId)
              .slice(0, 5)
              .map((t: any) => (
                <Link key={t.id} href={`/portal/messages/${t.id}`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-600">
                      {(t.participantName || "C")[0]}
                    </div>
                    {t.participantName || "Conversation"}
                    {t.unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                        {t.unreadCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
