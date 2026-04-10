"use client";

import { FolderOpen, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface ImageLibraryImage {
  id: string;
  url: string;
  filename: string;
  category?: string;
}

interface ImageLibraryCardProps {
  onSelectImage: (url: string) => void;
  onSelectAsBackground?: (url: string) => void;
}

export function ImageLibraryCard({ onSelectImage, onSelectAsBackground }: ImageLibraryCardProps) {
  const [images, setImages] = useState<ImageLibraryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch images on mount
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch("/api/branding/image-library");
        if (res.ok) {
          const data = await res.json();
          setImages(data.images || []);
        }
      } catch (error) {
        console.error("Failed to fetch image library:", error);
      } finally {
        setLoading(false);
      }
    };
    void fetchImages();
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "cover-page");

      const res = await fetch("/api/branding/image-library", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const { image } = await res.json();
      setImages((prev) => [image, ...prev]);
      toast.success("Image uploaded to library");
    } catch (__error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDelete = useCallback(async (imageId: string) => {
    if (!confirm("Delete this image from your library?")) return;

    try {
      const res = await fetch(`/api/branding/image-library?id=${imageId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
        toast.success("Image deleted");
      }
    } catch (__error) {
      toast.error("Failed to delete image");
    }
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Image Library
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : images.length === 0 ? (
          <div className="py-4 text-center">
            <p className="mb-2 text-sm text-slate-500">No images in library yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Plus className="mr-2 h-4 w-4" />
              Upload First Image
            </Button>
          </div>
        ) : (
          <>
            <Label className="text-xs text-slate-500">
              Click an image to add to canvas, or right-click for options
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {images.slice(0, 9).map((img) => (
                <div key={img.id} className="group relative">
                  <div
                    className="aspect-square cursor-pointer overflow-hidden rounded-lg border bg-slate-100 transition-all hover:ring-2 hover:ring-blue-500 dark:bg-slate-800"
                    onClick={() => onSelectImage(img.url)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (onSelectAsBackground) {
                        onSelectAsBackground(img.url);
                      }
                    }}
                    title={`${img.filename}\nClick: Add to canvas\nRight-click: Set as background`}
                  >
                    <img src={img.url} alt={img.filename} className="h-full w-full object-cover" />
                  </div>
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="absolute -right-1 -top-1 hidden rounded-full bg-red-500 p-1 text-white shadow transition-all hover:bg-red-600 group-hover:block"
                    title="Delete from library"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {images.length > 9 && (
              <p className="text-center text-xs text-slate-500">+{images.length - 9} more images</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
