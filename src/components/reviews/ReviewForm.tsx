"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { StarRating } from "./StarRating";

interface ReviewFormProps {
  contractorId: string;
  publicLeadId?: string | null;
  onSuccess?: () => void;
}

export function ReviewForm({ contractorId, publicLeadId, onSuccess }: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 5) {
      setError("Maximum 5 photos allowed");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // For now, using placeholder - replace with actual upload logic
        // (e.g., upload to Supabase Storage, S3, etc.)
        return URL.createObjectURL(file);
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setPhotos([...photos, ...uploadedUrls]);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      setError("Failed to upload photos");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    if (content.trim().length < 10) {
      setError("Review must be at least 10 characters");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/reviews/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorProfileId: contractorId,
          rating,
          content: content.trim(),
          photos,
          publicLeadId: publicLeadId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      // Success
      setRating(0);
      setContent("");
      setPhotos([]);

      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Write a Review</h3>

      {/* Rating */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Your Rating *</label>
        <StarRating value={rating} onChange={setRating} size="lg" showValue />
      </div>

      {/* Content */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Your Review *</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your experience with this contractor..."
          rows={5}
          className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          minLength={10}
        />
        <div className="mt-1 text-sm text-gray-500">
          Minimum 10 characters ({content.length}/10)
        </div>
      </div>

      {/* Photo Upload */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Photos (Optional)</label>
        <div className="flex items-start gap-4">
          {photos.length < 5 && (
            <label className="cursor-pointer">
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 transition hover:border-blue-500">
                {uploading ? (
                  <div className="animate-spin text-blue-500">⟳</div>
                ) : (
                  <span className="text-2xl text-gray-400">+</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}

          {photos.map((photo, idx) => (
            <div key={idx} className="relative h-20 w-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt={`Upload ${idx + 1}`}
                className="h-full w-full rounded-lg border object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="mt-1 text-sm text-gray-500">{photos.length}/5 photos</div>
      </div>

      {/* Verified Badge Info */}
      {publicLeadId && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="text-sm text-green-800">
            ✓ This review will be marked as <strong>verified</strong> because it&apos;s linked to
            your project.
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || rating === 0 || content.trim().length < 10}
        className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {submitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
