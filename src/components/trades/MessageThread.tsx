"use client";

import { useAuth } from "@clerk/nextjs";
import { Paperclip, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  attachments?: any;
  created_at: string;
}

interface MessageThreadProps {
  threadId: string;
  messages: Message[];
  participants: Array<{ userId: string; role: string }>;
  hasFullAccess?: boolean;
  onMessageSent?: (message: Message) => void;
}

export function MessageThread({
  threadId,
  messages,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  participants,
  hasFullAccess = false,
  onMessageSent,
}: MessageThreadProps) {
  const { userId } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userMessageCount = messages.filter((m) => m.sender_id === userId).length;
  const isFirstMessage = userMessageCount === 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const willCostToken = isFirstMessage && !hasFullAccess;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/trades/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          body: newMessage.trim(),
          attachments: [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          toast.error("You are not a participant in this thread");
        } else {
          toast.error(data.error || "Failed to send message");
        }
        return;
      }

      toast.success("Message sent!");

      setNewMessage("");

      // Callback to update messages list
      if (onMessageSent && data.message) {
        onMessageSent(data.message);
      }
    } catch (err) {
      logger.error("Send message error:", err);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const getInitials = (id: string) => {
    return id.slice(0, 2).toUpperCase();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-lg border">
      {/* Messages Area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_id === userId;
              return (
                <div key={message.id} className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback
                      className={cn(isOwn ? "bg-primary text-primary-foreground" : "bg-muted")}
                    >
                      {getInitials(message.sender_id)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn("flex max-w-[70%] flex-col gap-1", isOwn && "items-end")}>
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2",
                        isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t bg-background p-4">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message... (Shift+Enter for new line)"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="flex-1 resize-none"
            disabled={isSending}
          />
          <div className="flex flex-col gap-2">
            <Button
              size="icon"
              variant="ghost"
              disabled
              className="shrink-0"
              title="Attachments (coming soon)"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={isSending || !newMessage.trim()}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
