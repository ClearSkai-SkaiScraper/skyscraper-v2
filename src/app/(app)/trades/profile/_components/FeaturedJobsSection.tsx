/**
 * Featured Jobs Section Component
 * Displays featured work/projects on a trades profile
 */

"use client";

import { formatDistanceToNow } from "date-fns";
import { Award, Calendar, Edit2, Loader2, Plus, Star, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface FeaturedWork {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  projectDate?: string;
  category?: string;
}

interface FeaturedJobsSectionProps {
  userId: string;
  isOwnProfile: boolean;
}

export default function FeaturedJobsSection({ userId, isOwnProfile }: FeaturedJobsSectionProps) {
  const [featuredWork, setFeaturedWork] = useState<FeaturedWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeaturedWork | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeaturedWork | null>(null);

  const fetchFeaturedWork = useCallback(async () => {
    try {
      const res = await fetch(`/api/trades/featured-work?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setFeaturedWork(data.featuredWork || []);
      }
    } catch (error) {
      logger.error("Failed to fetch featured work:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchFeaturedWork();
  }, [fetchFeaturedWork]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/trades/featured-work?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setFeaturedWork((prev) => prev.filter((w) => w.id !== id));
        setDeleteTarget(null);
        toast.success("Removed");
      } else {
        toast.error("Failed to remove");
      }
    } catch {
      toast.error("Failed to remove");
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (featuredWork.length === 0 && !isOwnProfile) {
    return null; // Don't show empty state on others' profiles
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <Award className="h-5 w-5 text-amber-500" />
          Featured Work
        </h3>
        {isOwnProfile && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Featured Work</DialogTitle>
              </DialogHeader>
              <AddFeaturedWorkForm
                onSuccess={() => {
                  setShowAddDialog(false);
                  void fetchFeaturedWork();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {featuredWork.length === 0 ? (
        <div className="p-6 text-center">
          <Star className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">No featured work yet</p>
          <p className="text-xs text-slate-400">Showcase your best projects</p>
        </div>
      ) : (
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredWork.map((work) => (
            <div
              key={work.id}
              className="group relative overflow-hidden rounded-lg border bg-slate-50"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={work.imageUrl}
                  alt={work.title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <h4 className="font-medium text-slate-900">{work.title}</h4>
                {work.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{work.description}</p>
                )}
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  {work.projectDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(work.projectDate), { addSuffix: true })}
                    </span>
                  )}
                  {work.category && (
                    <span className="rounded bg-slate-200 px-1.5 py-0.5">{work.category}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {isOwnProfile && (
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => setSelectedItem(work)}
                    className="rounded-full bg-white p-1.5 shadow hover:bg-slate-100"
                    aria-label="Edit featured work"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(work)}
                    className="rounded-full bg-white p-1.5 shadow hover:bg-red-50"
                    aria-label="Delete featured work"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* View full gallery link */}
      {featuredWork.length > 3 && (
        <div className="border-t p-3 text-center">
          <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
            View all featured work
          </button>
        </div>
      )}

      {/* Edit Dialog */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Featured Work</DialogTitle>
            </DialogHeader>
            <EditFeaturedWorkForm
              item={selectedItem}
              onSuccess={() => {
                setSelectedItem(null);
                void fetchFeaturedWork();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove Featured Work"
        description="Are you sure you want to remove this featured work from your profile?"
        itemLabel={deleteTarget?.title}
        showArchive={false}
        deleteLabel="Remove"
        onConfirmDelete={() => (deleteTarget ? handleDelete(deleteTarget.id) : Promise.resolve())}
      />
    </div>
  );
}

// Add Form Component
function AddFeaturedWorkForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    projectDate: "",
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const data = new FormData();
    data.append("file", file);

    try {
      const res = await fetch("/api/upload/portfolio", {
        method: "POST",
        body: data,
      });

      if (res.ok) {
        const result = await res.json();
        setImageUrl(result.url);
      } else {
        toast.error("Failed to upload image");
      }
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !imageUrl) {
      toast.error("Title and image are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/trades/featured-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, imageUrl }),
      });

      if (res.ok) {
        toast.success("Featured work added!");
        onSuccess();
      } else {
        toast.error("Failed to add featured work");
      }
    } catch {
      toast.error("Failed to add featured work");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Image Upload */}
      <div>
        <Label>Project Photo *</Label>
        <div className="mt-2">
          {imageUrl ? (
            <div className="relative">
              <img src={imageUrl} alt="" className="h-40 w-full rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1"
                aria-label="Remove image"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => document.getElementById("featured-upload")?.click()}
              className="flex h-40 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-400"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              ) : (
                <div className="text-center">
                  <Plus className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-1 text-sm text-slate-500">Click to upload</p>
                </div>
              )}
            </div>
          )}
          <input
            id="featured-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            aria-label="Upload project photo"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="title">Project Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
          placeholder="e.g., Kitchen Remodel - Phoenix"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
          placeholder="Brief description of the project..."
          className="mt-1"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
            placeholder="e.g., Roofing"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="projectDate">Project Date</Label>
          <Input
            id="projectDate"
            type="date"
            value={formData.projectDate}
            onChange={(e) => setFormData((p) => ({ ...p, projectDate: e.target.value }))}
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Featured Work"}
        </Button>
      </div>
    </form>
  );
}

// Edit Form Component
function EditFeaturedWorkForm({ item, onSuccess }: { item: FeaturedWork; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: item.title,
    description: item.description || "",
    category: item.category || "",
    projectDate: item.projectDate ? item.projectDate.split("T")[0] : "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const res = await fetch("/api/trades/featured-work", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, ...formData }),
      });

      if (res.ok) {
        toast.success("Updated!");
        onSuccess();
      } else {
        toast.error("Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Current Image</Label>
        <img src={item.imageUrl} alt="" className="mt-2 h-40 w-full rounded-lg object-cover" />
      </div>

      <div>
        <Label htmlFor="edit-title">Project Title *</Label>
        <Input
          id="edit-title"
          value={formData.title}
          onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="edit-description">Description</Label>
        <Textarea
          id="edit-description"
          value={formData.description}
          onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
          className="mt-1"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-category">Category</Label>
          <Input
            id="edit-category"
            value={formData.category}
            onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="edit-projectDate">Project Date</Label>
          <Input
            id="edit-projectDate"
            type="date"
            value={formData.projectDate}
            onChange={(e) => setFormData((p) => ({ ...p, projectDate: e.target.value }))}
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
