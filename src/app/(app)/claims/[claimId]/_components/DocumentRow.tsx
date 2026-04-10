"use client";

import { Download, Eye, FileText, Trash2 } from "lucide-react";

interface DocumentRowProps {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  uploadedBy?: string;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
}

export default function DocumentRow({
  id,
  name,
  type,
  size,
  uploadedAt,
  uploadedBy,
  onDelete,
  onView,
}: DocumentRowProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getFileIcon = (fileType: string) => {
    // Could expand this to show different icons per file type
    return <FileText className="h-5 w-5 text-blue-400" />;
  };

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-xl dark:hover:border-white/20 dark:hover:bg-white/10">
      {/* File Icon */}
      <div className="flex-shrink-0">{getFileIcon(type)}</div>

      {/* File Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-white/90">{name}</p>
        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-white/50">
          <span>{type.toUpperCase()}</span>
          <span>•</span>
          <span>{formatFileSize(size)}</span>
          <span>•</span>
          <span>{uploadedAt.toLocaleDateString()}</span>
          {uploadedBy && (
            <>
              <span>•</span>
              <span>by {uploadedBy}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        {onView && (
          <button
            onClick={() => onView(id)}
            className="rounded-lg bg-slate-100 p-2 transition-colors hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20"
            title="View"
          >
            <Eye className="h-4 w-4 text-slate-700 dark:text-white" />
          </button>
        )}
        <button
          className="rounded-lg bg-slate-100 p-2 transition-colors hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20"
          title="Download"
        >
          <Download className="h-4 w-4 text-slate-700 dark:text-white" />
        </button>
        {onDelete && (
          <button
            onClick={() => onDelete(id)}
            className="rounded-lg bg-red-500/20 p-2 transition-colors hover:bg-red-500/30"
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-red-400" />
          </button>
        )}
      </div>
    </div>
  );
}
