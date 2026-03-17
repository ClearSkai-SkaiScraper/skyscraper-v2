/**
 * Client Job Request Page
 * Allows clients to post what they're looking for with photos, summary,
 * and preferences for who they want to work with.
 */

"use client";

import { useUser } from "@clerk/nextjs";
import {
  Briefcase,
  Camera,
  CheckCircle,
  DollarSign,
  Heart,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Send,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { logger } from "@/lib/logger";

const TRADE_CATEGORIES = [
  { value: "roofing", label: "Roofing" },
  { value: "plumbing", label: "Plumbing" },
  { value: "hvac", label: "HVAC" },
  { value: "electrical", label: "Electrical" },
  { value: "general_contractor", label: "General Contractor" },
  { value: "painting", label: "Painting" },
  { value: "flooring", label: "Flooring" },
  { value: "pool_contractor", label: "Pool Contractor" },
  { value: "pool_service", label: "Pool Service" },
  { value: "smart_home", label: "Smart Home Installation" },
  { value: "home_automation", label: "Home Automation" },
  { value: "security_systems", label: "Security Systems" },
  { value: "solar", label: "Solar Installation" },
  { value: "biohazard_cleanup", label: "Biohazard Cleanup" },
  { value: "mold_remediation", label: "Mold Remediation" },
  { value: "restoration", label: "Water/Fire Restoration" },
  { value: "landscaping", label: "Landscaping" },
  { value: "fencing", label: "Fencing" },
  { value: "concrete", label: "Concrete & Masonry" },
  { value: "handyman", label: "Handyman Services" },
];

const URGENCY_OPTIONS = [
  { value: "emergency", label: "🚨 Emergency - Same Day", color: "red" },
  { value: "urgent", label: "⚡ Urgent - 1-2 Days", color: "orange" },
  { value: "high", label: "📌 High Priority - 3-7 Days", color: "yellow" },
  { value: "normal", label: "📅 Normal - 1-2 Weeks", color: "blue" },
  { value: "flexible", label: "🌿 Flexible Timeline", color: "green" },
];

const LOOKING_FOR_OPTIONS = [
  "Free Estimates",
  "24/7 Emergency Service",
  "Financing Available",
  "Warranty Included",
  "Licensed & Insured",
  "BBB Accredited",
  "Eco-Friendly Options",
  "Veteran Owned",
  "Family Owned",
  "Same Day Service",
  "Virtual Consultations",
  "Senior Discounts",
];

const REQUIREMENTS_OPTIONS = [
  "Must be licensed",
  "Insurance required",
  "Background check verified",
  "Local company preferred",
  "References required",
  "Written warranty",
  "Permit handling included",
  "Clean-up included",
];

export default function PostJobRequestPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    summary: "",
    category: "",
    urgency: "normal",
    budget: "",
    budgetMin: "",
    budgetMax: "",
    timeline: "",
    city: "",
    state: "",
    zip: "",
    serviceArea: "",
    propertyAddress: "",
    lookingFor: [] as string[],
    requirements: [] as string[],
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleOption = (field: "lookingFor" | "requirements", option: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(option)
        ? prev[field].filter((o) => o !== option)
        : [...prev[field], option],
    }));
  };

  const handlePhotoUpload = async (files: FileList | null, isCover = false) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Max 5MB.`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "property");

        const res = await fetch("/api/portal/upload-photo", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const data = await res.json();

        if (isCover) {
          setCoverPhoto(data.url);
        } else {
          setPhotos((prev) => [...prev, data.url]);
        }
      }
      toast.success("Photos uploaded!");
    } catch (error) {
      logger.error("Upload error:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.category) {
      toast.error("Please fill in title, description, and category");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/portal/job-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          propertyPhotos: photos,
          coverPhoto,
        }),
      });

      if (!res.ok) throw new Error("Failed to create job request");

      const data = await res.json();
      toast.success("Job request posted! Contractors can now respond.");
      router.push("/portal/my-jobs");
    } catch (error) {
      logger.error("Submit error:", error);
      toast.error("Failed to post job request");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Post a Job Request</h1>
        <p className="mt-2 text-gray-600">
          Tell contractors what you&apos;re looking for and let them come to you
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Cover Photo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Cover Photo
            </CardTitle>
            <CardDescription>Add a main photo that represents your project</CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              aria-label="Upload cover photo"
              className="hidden"
              onChange={(e) => handlePhotoUpload(e.target.files, true)}
            />
            {coverPhoto ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                <Image src={coverPhoto} alt="Cover" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverPhoto(null)}
                  aria-label="Remove cover photo"
                  className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-500 hover:bg-blue-50"
              >
                <ImagePlus className="h-12 w-12 text-gray-400" />
                <span className="mt-2 text-sm text-gray-500">Click to add cover photo</span>
              </button>
            )}
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Roof Repair After Storm Damage"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="summary">Quick Summary</Label>
              <Input
                id="summary"
                placeholder="Brief one-line summary of what you need"
                value={formData.summary}
                onChange={(e) => handleInputChange("summary", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="description">Full Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your project in detail. What happened? What do you need done? Any special requirements?"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={5}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="category">Trade Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => handleInputChange("category", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a trade" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="urgency">Urgency Level</Label>
                <Select
                  value={formData.urgency}
                  onValueChange={(v) => handleInputChange("urgency", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {URGENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Project Photos
            </CardTitle>
            <CardDescription>
              Upload photos of the area or damage to help contractors understand the scope
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              aria-label="Upload project photos"
              className="hidden"
              onChange={(e) => handlePhotoUpload(e.target.files)}
            />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {photos.map((photo, idx) => (
                <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg">
                  <Image src={photo} alt={`Photo ${idx + 1}`} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                ) : (
                  <>
                    <Plus className="h-8 w-8 text-gray-400" />
                    <span className="mt-1 text-xs text-gray-500">Add Photo</span>
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Budget & Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Budget & Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="budget">Budget Range</Label>
              <Input
                id="budget"
                placeholder="e.g., $5,000 - $10,000 or Flexible"
                value={formData.budget}
                onChange={(e) => handleInputChange("budget", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="timeline">Preferred Timeline</Label>
              <Input
                id="timeline"
                placeholder="e.g., ASAP, Within 2 weeks, Before summer"
                value={formData.timeline}
                onChange={(e) => handleInputChange("timeline", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="propertyAddress">Property Address</Label>
              <Input
                id="propertyAddress"
                placeholder="123 Main St"
                value={formData.propertyAddress}
                onChange={(e) => handleInputChange("propertyAddress", e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Phoenix"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="AZ"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  placeholder="85001"
                  value={formData.zip}
                  onChange={(e) => handleInputChange("zip", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What You're Looking For */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              What You&apos;re Looking For
            </CardTitle>
            <CardDescription>
              Select the features that matter most to you in a contractor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {LOOKING_FOR_OPTIONS.map((option) => (
                <Badge
                  key={option}
                  variant={formData.lookingFor.includes(option) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleOption("lookingFor", option)}
                >
                  {formData.lookingFor.includes(option) && <CheckCircle className="mr-1 h-3 w-3" />}
                  {option}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Requirements
            </CardTitle>
            <CardDescription>Set mandatory requirements for contractors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {REQUIREMENTS_OPTIONS.map((option) => (
                <Badge
                  key={option}
                  variant={formData.requirements.includes(option) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleOption("requirements", option)}
                >
                  {formData.requirements.includes(option) && (
                    <CheckCircle className="mr-1 h-3 w-3" />
                  )}
                  {option}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="min-w-[150px]">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Post Job Request
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
