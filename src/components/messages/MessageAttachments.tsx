"use client";

/**
 * MessageAttachments — Inline display of message file attachments.
 * Renders thumbnails for images and download links for other files.
 */

import { Download, File, FileText } from "lucide-react";

interface MessageAttachmentsProps {
  attachments: string[];
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  if (!attachments || attachments.length === 0) return null;

  const getFileType = (url: string): "image" | "pdf" | "other" => {
    const lower = url.toLowerCase();
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/)) return "image";
    if (lower.match(/\.pdf(\?|$)/)) return "pdf";
    return "other";
  };

  const getFilename = (url: string): string => {
    try {
      const path = new URL(url).pathname;
      const segments = path.split("/");
      return decodeURIComponent(segments[segments.length - 1] || "attachment");
    } catch {
      return "attachment";
    }
  };

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((url, i) => {
        const type = getFileType(url);
        const name = getFilename(url);

        if (type === "image") {
          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-lg border border-slate-200 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={name}
                className="h-24 w-32 object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                <Download className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </a>
          );
        }

        return (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            {type === "pdf" ? (
              <FileText className="h-4 w-4 text-red-500" />
            ) : (
              <File className="h-4 w-4 text-blue-500" />
            )}
            <span className="max-w-[120px] truncate text-slate-700 dark:text-slate-300">
              {name}
            </span>
            <Download className="h-3 w-3 text-slate-400" />
          </a>
        );
      })}
    </div>
  );
}
