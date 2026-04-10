"use client";

import { Camera, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

const CATEGORIES = [
  "Roofing",
  "Solar Installation",
  "HVAC",
  "Electrical",
  "Plumbing",
  "General Contracting",
  "Restoration",
  "Painting",
  "Flooring",
  "Carpentry",
  "Landscaping",
  "Concrete",
  "Before & After",
  "Commercial",
  "Residential",
];

export default function PortfolioUploadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
  });

  const handlePhotosSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 10 photos per upload
    if (photos.length + files.length > 10) {
      toast.error("Maximum 10 photos per project");
      return;
    }

    // Check file sizes
    const oversized = files.filter((f) => f.size > 10 * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error("Each photo must be less than 10MB");
      return;
    }

    // Add to state
    setPhotos([...photos, ...files]);

    // Generate previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (photos.length === 0) {
      toast.error("Please add at least one photo");
      return;
    }

    setLoading(true);

    try {
      // Upload all photos
      const uploadedUrls: string[] = [];
      for (const photo of photos) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", photo);

        const uploadRes = await fetch("/api/upload/portfolio", {
          method: "POST",
          body: formDataUpload,
        });

        if (!uploadRes.ok) throw new Error("Failed to upload photo");
        const { url } = await uploadRes.json();
        uploadedUrls.push(url);
      }

      // Save portfolio item
      const res = await fetch("/api/trades/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          imageUrls: uploadedUrls,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save portfolio item");
      }

      toast.success("✅ Portfolio item added!");
      router.push("/trades/profile");
    } catch (error) {
      logger.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload photos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Add to Portfolio</h1>
          <p className="mt-2 text-gray-600">Showcase your best work with photos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Project Photos</h2>

            {previews.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {previews.map((preview, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-lg">
                    <img
                      src={preview}
                      alt={`Photo ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition group-hover:opacity-100"
                      aria-label="Remove photo"
                      title="Remove photo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 transition hover:border-blue-500 hover:bg-blue-50">
              <Camera className="mb-3 h-12 w-12 text-gray-400" />
              <p className="mb-1 text-sm font-medium text-gray-700">Click to upload photos</p>
              <p className="text-xs text-gray-500">Up to 10 photos, max 10MB each</p>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotosSelect}
              />
            </label>

            <p className="mt-2 text-xs text-gray-500">{photos.length}/10 photos added</p>
          </div>

          {/* Project Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Project Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Complete Roof Replacement - Phoenix, AZ"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  aria-label="Select portfolio category"
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the project, challenges, and results..."
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || photos.length === 0} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Portfolio
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
