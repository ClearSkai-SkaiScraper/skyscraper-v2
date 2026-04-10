"use client";

import { User } from "lucide-react";

interface MessageBubbleProps {
  id: string;
  content: string;
  sender: {
    name: string;
    avatar?: string;
    isClient?: boolean;
  };
  sentAt: Date;
  isOwn?: boolean;
}

export default function MessageBubble({ content, sender, sentAt, isOwn }: MessageBubbleProps) {
  return (
    <div className={`flex items-start gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
          sender.isClient ? "bg-blue-100 dark:bg-blue-900/30" : "bg-slate-200 dark:bg-slate-700"
        }`}
      >
        {sender.avatar ? (
          <img src={sender.avatar} alt={sender.name} className="h-8 w-8 rounded-full" />
        ) : (
          <User className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`text-xs font-medium ${isOwn ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"}`}
          >
            {sender.name}
            {sender.isClient && (
              <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                Client
              </span>
            )}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {sentAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <div
          className={`max-w-md rounded-2xl px-4 py-2.5 ${
            isOwn
              ? "bg-blue-600 text-white"
              : "border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          }`}
        >
          <p className="whitespace-pre-wrap text-sm">{content}</p>
        </div>
      </div>
    </div>
  );
}
