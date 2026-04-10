// src/app/client/[slug]/profile/page.tsx
"use client";

import {
  Camera,
  Edit,
  Home,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Share2,
  User,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";

interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal?: string;
  propertyPhotoUrl?: string;
  avatarUrl?: string;
  preferredContact?: string;
  category?: string;
  createdAt: string;
}

export default function ClientProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "avatar");
      const res = await fetch("/api/portal/upload-photo", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.url) {
        setProfile((prev) => (prev ? { ...prev, avatarUrl: data.url } : prev));
        toast.success("Avatar updated!");
      }
    } catch {
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/client-portal/${slug}/profile`);
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
          setFormData(data.profile);
        }
      }
    } catch (error) {
      logger.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/client-portal/${slug}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const data = await res.json();
        toast.success("Profile saved successfully!");
        setProfile({ ...profile, ...formData } as ProfileData);
        setIsEditing(false);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save profile");
      }
    } catch (error) {
      logger.error("Failed to save profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(profile || {});
    setIsEditing(false);
  };

  const getShareableLink = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/client/${slug}`;
    }
    return "";
  };

  const copyShareableLink = () => {
    void navigator.clipboard.writeText(getShareableLink());
    toast.success("Profile link copied to clipboard!");
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openShareableLink = () => {
    window.open(getShareableLink(), "_blank");
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile && !isEditing) {
    return (
      <div className="space-y-6 p-6">
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <User className="mx-auto h-12 w-12 text-amber-600" />
              <h2 className="mt-4 text-xl font-semibold text-amber-900 dark:text-amber-100">
                Complete Your Profile
              </h2>
              <p className="mt-2 text-amber-700 dark:text-amber-300">
                Set up your profile to get the most out of your client portal
              </p>
              <Button className="mt-4" onClick={() => setIsEditing(true)}>
                Get Started
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with My Profile Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your account information</p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={copyShareableLink}>
                <Share2 className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName || ""}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName || ""}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 555-5555"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="preferredContact">Preferred Contact Method</Label>
                <Select
                  value={formData.preferredContact || "email"}
                  onValueChange={(val) => setFormData({ ...formData, preferredContact: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="text">Text Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-6">
              {/* Avatar with upload */}
              <div className="group relative flex-shrink-0">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  // eslint-disable-next-line @next/next/no-img-element
                  onChange={handleAvatarUpload}
                />
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={`${profile.firstName} ${profile.lastName}`}
                    className="h-24 w-24 rounded-full border-4 border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
                    {profile?.firstName?.charAt(0)?.toUpperCase()}
                    {profile?.lastName?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Upload avatar"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </button>
              </div>

              {/* Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">
                    {profile?.firstName} {profile?.lastName}
                  </h3>
                  {profile?.preferredContact && (
                    <Badge variant="secondary" className="mt-1">
                      Prefers {profile.preferredContact}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile?.email}</span>
                  </div>
                  {profile?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{profile.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Property Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state || ""}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="AZ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal">ZIP Code</Label>
                  <Input
                    id="postal"
                    value={formData.postal || ""}
                    onChange={(e) => setFormData({ ...formData, postal: e.target.value })}
                    placeholder="85001"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Client Category</Label>
                <Select
                  value={formData.category || "Homeowner"}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Homeowner">Homeowner</SelectItem>
                    <SelectItem value="Business Owner">Business Owner</SelectItem>
                    <SelectItem value="Property Manager">Property Manager</SelectItem>
                    <SelectItem value="Realtor">Realtor</SelectItem>
                    <SelectItem value="Landlord">Landlord</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {profile?.address || profile?.city ? (
                <>
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{profile?.address}</p>
                      <p className="text-sm text-muted-foreground">
                        {profile?.city}, {profile?.state} {profile?.postal}
                      </p>
                    </div>
                  </div>
                  {profile?.category && (
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="font-medium">{profile.category}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800">
                  <Home className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No property information added yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setIsEditing(true)}
                  >
                    Add Property
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network ID</span>
              <span className="font-mono">{slug}</span>
            </div>
            {profile?.createdAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member Since</span>
                <span>{new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Portal Link</span>
              <button onClick={copyShareableLink} className="text-blue-600 hover:underline">
                Copy Link
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
