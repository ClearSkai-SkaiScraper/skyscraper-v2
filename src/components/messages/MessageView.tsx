"use client";

import { formatDistanceToNow } from "date-fns";
import { User } from "lucide-react";

import { MessageAttachments } from "@/components/messages/MessageAttachments";

interface Message {
  id: string;
  body: string;
  senderType: string;
  senderUserId: string;
  createdAt: Date;
  read: boolean;
  attachments?: string[];
}

interface MessageViewProps {
  messages: Message[];
  currentUserId: string;
  currentUserType: "pro" | "client";
}

export default function MessageView({
  messages,
  currentUserId,
  currentUserType,
}: MessageViewProps) {
  // Ensure messages is always an array to prevent t.map errors
  const safeMessages = Array.isArray(messages) ? messages : [];

  if (safeMessages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {safeMessages.map((message) => {
        const isOwnMessage =
          message.senderUserId === currentUserId || message.senderType === currentUserType;
        const messageDate = new Date(message.createdAt);
        const isWorkOrder = message.body.startsWith("[WORK ORDER REQUEST]");

        return (
          <div
            key={message.id}
            className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
          >
            <div className="max-w-[70%]">
              {/* Work Order Badge */}
              {isWorkOrder && (
                <div className={`mb-1 ${isOwnMessage ? "text-right" : "text-left"}`}>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    <span className="text-amber-600">📋</span>
                    Work Order Request
                  </span>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`rounded-2xl px-4 py-2 ${
                  isOwnMessage ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"
                }`}
              >
                <div className="flex items-start gap-2">
                  {!isOwnMessage && (
                    <div className="mt-1 flex-shrink-0">
                      <User className="h-4 w-4 text-slate-500" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    {message.attachments && message.attachments.length > 0 && (
                      <MessageAttachments attachments={message.attachments} />
                    )}
                    <p
                      className={`mt-1 text-xs ${isOwnMessage ? "text-blue-100" : "text-slate-500"}`}
                    >
                      {formatDistanceToNow(messageDate, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
