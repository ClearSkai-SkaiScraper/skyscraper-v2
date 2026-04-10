/**
 * Create New Group Page
 */

"use client";

import { Camera, Globe, Loader2, Lock, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const CATEGORIES = [
  "Roofing",
  "Plumbing",
  "Electrical",
  "HVAC",
  "General Contractors",
  "Networking",
  "Business",
  "Training",
  "Other",
];

export default function CreateGroupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    privacy: "public",
    rules: "",
    coverImage: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Group name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/trades/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Group created!");
        router.push(`/trades/groups/${data.group.slug}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create group");
      }
    } catch {
      toast.error("Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/cover", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, coverImage: data.url }));
        toast.success("Cover image uploaded!");
      }
    } catch {
      toast.error("Failed to upload image");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Create a New Group</h1>
          <p className="mt-1 text-slate-600">
            Build a community for trades professionals to connect and share
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Cover Image */}
            <div>
              <Label>Cover Image</Label>
              <div
                className="relative mt-2 h-40 cursor-pointer overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-blue-600"
                onClick={() => document.getElementById("cover-upload")?.click()}
              >
                {formData.coverImage ? (
                  <img
                    src={formData.coverImage}
                    alt="Cover"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center text-white">
                      <Camera className="mx-auto h-8 w-8" />
                      <p className="mt-2 text-sm">Click to upload cover image</p>
                    </div>
                  </div>
                )}
              </div>
              <input
                id="cover-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
                aria-label="Upload group cover image"
              />
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Arizona Roofers Network"
                className="mt-1"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="What's this group about?"
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Privacy */}
            <div>
              <Label>Privacy</Label>
              <div className="mt-2 space-y-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-slate-50">
                  <input
                    type="radio"
                    name="privacy"
                    value="public"
                    checked={formData.privacy === "public"}
                    onChange={(e) => setFormData((prev) => ({ ...prev, privacy: e.target.value }))}
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      <Globe className="h-4 w-4 text-green-600" />
                      Public
                    </div>
                    <p className="text-sm text-slate-500">Anyone can find and join this group</p>
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-slate-50">
                  <input
                    type="radio"
                    name="privacy"
                    value="private"
                    checked={formData.privacy === "private"}
                    onChange={(e) => setFormData((prev) => ({ ...prev, privacy: e.target.value }))}
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      <Lock className="h-4 w-4 text-orange-600" />
                      Private
                    </div>
                    <p className="text-sm text-slate-500">
                      Anyone can find this group, but must request to join
                    </p>
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-slate-50">
                  <input
                    type="radio"
                    name="privacy"
                    value="hidden"
                    checked={formData.privacy === "hidden"}
                    onChange={(e) => setFormData((prev) => ({ ...prev, privacy: e.target.value }))}
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      <Shield className="h-4 w-4 text-red-600" />
                      Hidden
                    </div>
                    <p className="text-sm text-slate-500">
                      Only members can find this group (invite only)
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Rules */}
            <div>
              <Label htmlFor="rules">Group Rules (Optional)</Label>
              <Textarea
                id="rules"
                value={formData.rules}
                onChange={(e) => setFormData((prev) => ({ ...prev, rules: e.target.value }))}
                placeholder="Set expectations for members..."
                className="mt-1"
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Group"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
