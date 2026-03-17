"use client";

import { MessageSquare, Plus,Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface Message {
  id: string;
  body: string;
  senderType: "pro" | "client" | "trade";
  senderUserId: string;
  createdAt: string;
  read: boolean;
}

interface MessageThread {
  id: string;
  subject: string;
  participants: string[];
  isPortalThread: boolean;
  updatedAt: string;
  messages: Message[];
}

interface ClaimMessagesPanelProps {
  claimId: string;
}

export function ClaimMessagesPanel({ claimId }: ClaimMessagesPanelProps) {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewThread, setShowNewThread] = useState(false);

  useEffect(() => {
    fetchThreads();
  }, [claimId]);

  const fetchThreads = async () => {
    try {
      const response = await fetch(`/api/claims/${claimId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setThreads(data.threads || []);
      }
    } catch (error) {
      logger.error("Failed to fetch threads:", error);
      toast.error("Error", {
        description: "Failed to load messages",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchThreadMessages = async (threadId: string) => {
    try {
      const response = await fetch(`/api/claims/${claimId}/messages/${threadId}`);
      if (response.ok) {
        const data = await response.json();
        setThreadMessages(data.messages || []);
      }
    } catch (error) {
      logger.error("Failed to fetch thread messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!messageBody.trim()) {
      toast.error("Message required", {
        description: "Please enter a message",
      });
      return;
    }

    if (!selectedThread && !newSubject.trim()) {
      toast.error("Subject required", {
        description: "Please enter a subject for new threads",
      });
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/claims/${claimId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: selectedThread?.id,
          subject: newSubject,
          body: messageBody,
          isPortalThread: true,
        }),
      });

      if (response.ok) {
        toast.success("Message sent", {
        description: "Your message has been sent successfully",
      });
        setMessageBody("");
        setNewSubject("");
        setShowNewThread(false);
        fetchThreads();
        if (selectedThread) {
          fetchThreadMessages(selectedThread.id);
        }
      } else {
        const data = await response.json();
        toast.error("Failed to send", {
        description: data.error || "Could not send message",
      });
      }
    } catch (error) {
      logger.error("Failed to send message:", error);
      toast.error("Error", {
        description: "Failed to send message",
      });
    } finally {
      setSending(false);
    }
  };

  const selectThread = (thread: MessageThread) => {
    setSelectedThread(thread);
    fetchThreadMessages(thread.id);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-1/3 rounded bg-slate-200" />
          <div className="h-4 w-1/2 rounded bg-slate-200" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Messages
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Communicate with homeowner and trade partners
          </p>
        </div>

        <Dialog open={showNewThread} onOpenChange={setShowNewThread}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Thread
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Conversation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Subject</label>
                <Input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Enter subject..."
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Message</label>
                <Textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Type your message..."
                  rows={4}
                />
              </div>
              <Button onClick={sendMessage} disabled={sending} className="w-full">
                <Send className="mr-2 h-4 w-4" />
                {sending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Thread List */}
      {threads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-6 py-8 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-slate-400" />
          <h4 className="mt-3 text-sm font-semibold text-slate-900">No messages yet</h4>
          <p className="mt-1 text-sm text-slate-500">
            Start a conversation with the homeowner or contractors
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Threads Sidebar */}
          <div className="space-y-2 lg:col-span-1">
            {threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => selectThread(thread)}
                className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                  selectedThread?.id === thread.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <h4 className="line-clamp-1 font-semibold text-slate-900">{thread.subject}</h4>
                  {thread.isPortalThread && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Portal
                    </Badge>
                  )}
                </div>
                {thread.messages.length > 0 && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {thread.messages[0].body}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {new Date(thread.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {/* Thread Messages */}
          <div className="lg:col-span-2">
            {selectedThread ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  {selectedThread.subject}
                </h3>

                <div className="mb-4 max-h-96 space-y-3 overflow-y-auto">
                  {threadMessages.length === 0 ? (
                    <p className="text-center text-sm text-slate-500">No messages yet</p>
                  ) : (
                    threadMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`rounded-lg p-3 ${
                          msg.senderType === "pro" ? "ml-auto bg-blue-100" : "mr-auto bg-slate-100"
                        } max-w-[80%]`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {msg.senderType === "pro"
                              ? "You"
                              : msg.senderType === "client"
                                ? "Homeowner"
                                : "Contractor"}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-900">{msg.body}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Type your reply..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} disabled={sending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-8">
                <p className="text-sm text-slate-500">Select a thread to view messages</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
