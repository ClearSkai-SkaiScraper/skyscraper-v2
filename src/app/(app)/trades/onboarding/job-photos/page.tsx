"use client";

import { Camera, Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";

interface PhotoUpload {
  id: string;
  file: File;
  preview: string;
  caption: string;
}

export default function JobPhotosOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      toast.error("Please upload image files only");
      return;
    }

    if (photos.length + imageFiles.length > 15) {
      toast.error("Maximum 15 photos allowed");
      return;
    }

    const newPhotos: PhotoUpload[] = imageFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      caption: "",
    }));

    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const updateCaption = (id: string, caption: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)));
  };

  const handleSkip = () => {
    router.push("/");
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      toast.error("Please add at least one photo");
      return;
    }

    setLoading(true);
    try {
      // Upload photos to storage
      const uploadedUrls: string[] = [];

      for (const photo of photos) {
        const formData = new FormData();
        formData.append("file", photo.file);
        formData.append("caption", photo.caption);

        const res = await fetch("/api/upload/portfolio", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const { url } = await res.json();
        uploadedUrls.push(url);
      }

      // Save to TradeProfile
      const profileRes = await fetch("/api/trades/profile/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioUrls: uploadedUrls,
          captions: photos.map((p) => p.caption),
        }),
      });

      if (!profileRes.ok) throw new Error("Failed to save portfolio");

      toast.success("Portfolio uploaded successfully!");
      router.push("/trades/profile");
    } catch (error) {
      logger.error("Portfolio upload error:", error);
      toast.error(error.message || "Failed to upload photos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-full bg-blue-600 p-4">
            <Camera className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Showcase Your Work</h1>
          <p className="text-lg text-gray-600">
            Upload photos of your recent projects to attract more clients
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-600"></div>
            <div className="h-1 w-12 rounded-full bg-blue-600"></div>
            <div className="h-2 w-2 rounded-full bg-blue-600"></div>
            <div className="h-1 w-12 rounded-full bg-blue-600"></div>
            <div className="h-2 w-2 rounded-full bg-blue-600"></div>
          </div>
          <p className="mt-2 text-sm text-gray-500">Step 4 of 4: Job Photos (Optional)</p>
        </div>

        {/* Upload Area */}
        <div className="mb-8 rounded-xl bg-white p-8 shadow-lg">
          <div
            className={`relative rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
              dragActive
                ? "border-blue-600 bg-blue-50"
                : "border-gray-300 bg-gray-50 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              multiple
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
            <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-lg font-semibold text-gray-700">
                Drop photos here or{" "}
                <span className="text-blue-600 hover:text-blue-700">browse</span>
              </span>
            </label>
            <p className="mt-2 text-sm text-gray-500">PNG, JPG up to 10MB each (max 15 photos)</p>
          </div>

          {/* Photo Grid */}
          {photos.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Uploaded Photos ({photos.length}/15)
              </h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {photos.map((photo) => (
                  // eslint-disable-next-line react/jsx-no-comment-textnodes
                  <div key={photo.id} className="group relative rounded-lg border bg-white p-2">
                    // eslint-disable-next-line react/jsx-no-comment-textnodes
                    <div className="relative aspect-video overflow-hidden rounded-lg">
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.preview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white opacity-0 shadow-lg transition-opacity hover:bg-red-600 group-hover:opacity-100"
                        aria-label="Remove photo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <Label htmlFor={`caption-${photo.id}`} className="text-xs text-gray-600">
                        Caption (optional)
                      </Label>
                      <Input
                        id={`caption-${photo.id}`}
                        type="text"
                        placeholder="Describe this project..."
                        value={photo.caption}
                        onChange={(e) => updateCaption(photo.id, e.target.value)}
                        className="mt-1 text-sm"
                        maxLength={100}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={handleSkip} disabled={loading}>
            Skip for Now
          </Button>
          <Button onClick={handleSubmit} disabled={loading || photos.length === 0} size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>Complete Profile</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
