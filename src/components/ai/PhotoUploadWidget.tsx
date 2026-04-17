"use client";
import { Image as ImageIcon,UploadCloud, X } from 'lucide-react';
import React, { useCallback, useState } from 'react';

interface PhotoUploadWidgetProps {
  onImagesChange?: (files: File[]) => void;
}

export default function PhotoUploadWidget({ onImagesChange }: PhotoUploadWidgetProps) {
  const [files, setFiles] = useState<File[]>([]);

  const handleFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter(f => f.type.startsWith('image/'));
    const next = [...files, ...arr].slice(0, 12); // cap
    setFiles(next);
    onImagesChange?.(next);
  }, [files, onImagesChange]);

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-[color:var(--muted)]">Upload Property Photos / Screenshots</label>
      <div
        className="cursor-pointer rounded border border-dashed border-[color:var(--border)] bg-[var(--surface-2)] p-6 text-center hover:bg-[var(--surface-1)]"
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.multiple = true;
          input.onchange = () => handleFiles(input.files);
          input.click();
        }}
      >
        <UploadCloud className="mx-auto mb-2 h-8 w-8 text-[color:var(--muted)]" />
        <p className="text-xs text-[color:var(--muted)]">Drag & drop or click to select (PNG/JPG). Up to 12 images.</p>
        <p className="mt-2 text-[11px] text-[color:var(--muted)]">No photos? Visit Maps → take satellite screenshots → upload here.</p>
      </div>
      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {files.map(f => {
            const url = URL.createObjectURL(f);
            return (
              // eslint-disable-next-line react/jsx-no-comment-textnodes
              <div key={f.name + f.lastModified} className="group relative overflow-hidden rounded border border-[color:var(--border)] bg-[var(--surface-1)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={f.name} className="h-28 w-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => {
                    const next = files.filter(x => x !== f);
                    setFiles(next); onImagesChange?.(next);
                    URL.revokeObjectURL(url);
                  }}
                  className="bg-[var(--surface-2)]/80 absolute right-1 top-1 rounded p-1 text-[color:var(--muted)] hover:text-[color:var(--text)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          {files.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-6 text-xs text-[color:var(--muted)]">
              <ImageIcon className="mb-2 h-5 w-5" />
              <span>No images yet.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
