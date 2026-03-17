"use client";

import { Upload, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface AvatarUploaderProps {
  currentPhotoUrl?: string | null;
  onUploadComplete: (url: string) => void;
  userId: string;
}

export function AvatarUploader({ currentPhotoUrl, onUploadComplete, userId }: AvatarUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file type", {
        description: "Please upload an image file",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Please upload an image smaller than 5MB",
      });
      return;
    }

    setUploading(true);

    try {
      // Create preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to storage (Supabase/Firebase)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);

      const uploadResponse = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Failed to upload photo");
      }

      const { url } = await uploadResponse.json();

      // Update user profile with new photo URL
      const response = await fetch("/api/profile/upload-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: url }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      setPreviewUrl(url);
      onUploadComplete(url);
      toast.success("Success", {
        description: "Profile photo updated successfully",
      });
    } catch (error) {
      logger.error("Upload error:", error);
      toast.error("Upload failed", {
        description: "Failed to upload photo. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className="h-32 w-32">
        <AvatarImage src={previewUrl || undefined} alt="Profile" />
        <AvatarFallback>
          <User className="h-16 w-16" />
        </AvatarFallback>
      </Avatar>

      <div className="relative">
        <input
          type="file"
          id="avatar-upload"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
          aria-label="Upload profile photo"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => document.getElementById("avatar-upload")?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "Uploading..." : "Upload Photo"}
        </Button>
      </div>

      <p className="max-w-xs text-center text-xs text-muted-foreground">
        Recommended: Square image, at least 256x256px. Max file size: 5MB.
      </p>
    </div>
  );
}
