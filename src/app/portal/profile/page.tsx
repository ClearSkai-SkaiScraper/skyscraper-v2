/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-explicit-any */
/**
 * Client Profile Page - Social-Style Layout
 * Beautiful Facebook/LinkedIn-style profile with cover photo, avatar, bio,
 * property photos, and profile completion tracking.
 * Includes inline onboarding for incomplete profiles.
 */

"use client";

import { useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Camera,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FolderOpen,
  Globe,
  Heart,
  Home,
  ImageIcon,
  Link2 as LinkIcon,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Save,
  Shield,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import PresenceBadge from "@/components/presence/PresenceBadge";
import StatusEditor from "@/components/presence/StatusEditor";
import ProfileStrengthBanner from "@/components/ProfileStrengthBanner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";
import { calculateClientStrength } from "@/lib/profile-strength";

const CLIENT_CATEGORIES = [
  { value: "Homeowner", label: "Homeowner", icon: Home },
  { value: "Business Owner", label: "Business Owner", icon: Building2 },
  { value: "Property Manager", label: "Property Manager", icon: Building2 },
  { value: "Landlord", label: "Landlord", icon: Building2 },
  { value: "Realtor", label: "Realtor", icon: Building2 },
  { value: "Broker", label: "Broker", icon: Building2 },
];

const PHOTO_FOLDERS = [
  { value: "property", label: "Property", icon: "🏠", color: "blue" },
  { value: "damage", label: "Damage", icon: "⚠️", color: "red" },
  { value: "before", label: "Before", icon: "📸", color: "amber" },
  { value: "after", label: "After", icon: "✅", color: "green" },
  { value: "documents", label: "Documents", icon: "📄", color: "purple" },
] as const;

type PhotoFolder = (typeof PHOTO_FOLDERS)[number]["value"];

interface PropertyPhoto {
  id: string;
  folder: string;
  url: string;
  caption: string | null;
  createdAt: string;
}

// ─── Photo Gallery Component ────────────────────────────────────────────
function PropertyPhotoGallery() {
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [folders, setFolders] = useState<Record<string, PropertyPhoto[]>>({});
  const [activeFolder, setActiveFolder] = useState<PhotoFolder | "all">("all");
  const [uploading, setUploading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<PropertyPhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/property-photos");
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.photos || []);
        setFolders(data.folders || {});
      }
    } catch (err) {
      logger.error("Failed to load photos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  async function handleUpload(files: FileList) {
    if (!files.length) return;
    setUploading(true);
    const folder = activeFolder === "all" ? "property" : activeFolder;

    let successCount = 0;
    for (const file of Array.from(files)) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 25MB)`);
        continue;
      }
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);
        const res = await fetch("/api/portal/property-photos", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          successCount++;
        } else {
          const data = await res.json();
          toast.error(data.error || `Failed to upload ${file.name}`);
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} photo${successCount > 1 ? "s" : ""} uploaded!`);
      await loadPhotos();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(photoId: string) {
    try {
      const res = await fetch(`/api/portal/property-photos?id=${photoId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Photo removed");
        await loadPhotos();
      } else {
        toast.error("Failed to remove photo");
      }
    } catch {
      toast.error("Failed to remove photo");
    }
  }

  const displayPhotos = activeFolder === "all" ? photos : folders[activeFolder] || [];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-2 text-sm text-slate-500">Loading photos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5 text-blue-600" />
            My Photos
            {photos.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {photos.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {uploading ? (
              <>
                <Upload className="mr-1 h-3.5 w-3.5 animate-pulse" />
                Uploading...
              </>
            ) : (
              <>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Photos
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            aria-label="Upload property photos"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {/* Folder Tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFolder("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              activeFolder === "all"
                ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            📁 All ({photos.length})
          </button>
          {PHOTO_FOLDERS.map((f) => {
            const count = folders[f.value]?.length || 0;
            return (
              <button
                key={f.value}
                onClick={() => setActiveFolder(f.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  activeFolder === f.value
                    ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {f.icon} {f.label} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>

        {/* Photo Grid */}
        {displayPhotos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {displayPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border bg-slate-100 transition-all hover:shadow-lg"
                onClick={() => setLightboxPhoto(photo)}
              >
                <Image
                  src={photo.url}
                  alt={photo.caption || "Property photo"}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex w-full items-center justify-between p-2">
                    <Badge variant="secondary" className="bg-white/90 text-[10px] text-slate-700">
                      {PHOTO_FOLDERS.find((f) => f.value === photo.folder)?.icon}{" "}
                      {PHOTO_FOLDERS.find((f) => f.value === photo.folder)?.label || photo.folder}
                    </Badge>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(photo.id);
                      }}
                      className="rounded-full bg-red-500/80 p-1.5 text-white transition hover:bg-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {photo.caption}
                  </div>
                )}
              </div>
            ))}
            {/* Upload More Card */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition-all hover:border-blue-400 hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
            >
              <Plus className="mb-1 h-6 w-6 text-slate-400" />
              <span className="text-xs text-slate-500">Add More</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-12 transition-all hover:border-blue-400 hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
          >
            {uploading ? (
              <div className="animate-pulse text-slate-500">Uploading...</div>
            ) : (
              <>
                <FolderOpen className="mb-3 h-10 w-10 text-slate-300" />
                <p className="mb-1 font-medium text-slate-600">No photos yet</p>
                <p className="text-sm text-slate-400">
                  Upload photos of your property, damage, before &amp; after shots
                </p>
              </>
            )}
          </button>
        )}

        {/* Lightbox Modal */}
        {lightboxPhoto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setLightboxPhoto(null)}
          >
            <div
              className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setLightboxPhoto(null)}
                className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="relative aspect-video w-full min-w-[300px] md:min-w-[600px]">
                <Image
                  src={lightboxPhoto.url}
                  alt={lightboxPhoto.caption || "Property photo"}
                  fill
                  className="object-contain"
                />
              </div>
              {lightboxPhoto.caption && (
                <div className="border-t p-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {lightboxPhoto.caption}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between border-t bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                <Badge variant="outline">
                  {PHOTO_FOLDERS.find((f) => f.value === lightboxPhoto.folder)?.icon}{" "}
                  {PHOTO_FOLDERS.find((f) => f.value === lightboxPhoto.folder)?.label ||
                    lightboxPhoto.folder}
                </Badge>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    void handleDelete(lightboxPhoto.id);
                    setLightboxPhoto(null);
                  }}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Connections Section Component
function ConnectionsSection() {
  const [connections, setConnections] = useState<any[]>([]);
  const [pendingConnections, setPendingConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadConnections();
  }, []);

  async function loadConnections() {
    try {
      const res = await fetch("/api/portal/connections");
      if (res.ok) {
        const data = await res.json();
        const all = data.connections || [];
        // Split by status — "accepted" or "connected" are active, "pending" is pending
        setConnections(
          all.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c: any) => c.connectionStatus === "accepted" || c.connectionStatus === "connected"
          )
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setPendingConnections(all.filter((c: any) => c.connectionStatus === "pending"));
      }
    } catch (error) {
      logger.error("Failed to load connections:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-2 text-slate-500">Loading connections...</p>
        </CardContent>
      </Card>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const hasAny = connections.length > 0 || pendingConnections.length > 0;

  return (
    <div className="space-y-6">
      {/* Pending Connection Requests */}
      {pendingConnections.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Users className="h-5 w-5" />
              Pending Requests ({pendingConnections.length})
            </CardTitle>
            <CardDescription>Connection requests awaiting response</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingConnections.map((conn: any) => (
                <div
                  key={conn.id}
                  className="flex items-center gap-4 rounded-lg border bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-bold text-white">
                    {conn.name?.[0] || "P"}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{conn.name || "Pro"}</h4>
                    <p className="text-sm text-slate-500">Sent connection request</p>
                  </div>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700">
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-green-600" />
            My Connections
          </CardTitle>
          <CardDescription>Pros you&apos;re connected with</CardDescription>
        </CardHeader>
        <CardContent>
          {connections.length > 0 ? (
            <div className="space-y-3">
              {connections.map((conn: any) => (
                <div
                  key={conn.id}
                  className="flex items-center gap-4 rounded-lg border p-4 transition-all hover:border-blue-200 hover:bg-blue-50/50 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
                >
                  {conn.logo ? (
                    <Image
                      src={conn.logo}
                      alt={conn.name || "Pro"}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 font-bold text-white">
                      {conn.name?.[0] || "P"}
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold">{conn.name || "Pro"}</h4>
                    {conn.companyName && conn.companyName !== conn.name && (
                      <p className="text-xs text-slate-500">{conn.companyName}</p>
                    )}
                    <p className="text-sm text-slate-500">{conn.location || "Location unknown"}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Connected</Badge>
                  <Link href={`/portal/messages?to=${conn.proUserId}`}>
                    <Button size="sm" variant="outline">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Message
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-slate-200 p-12 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h3 className="mb-2 text-lg font-semibold">No Connections Yet</h3>
              <p className="mb-4 text-slate-500">
                Find and connect with pros in your area to get started
              </p>
              <Button asChild>
                <Link href="/portal/find-a-pro">
                  <Users className="mr-2 h-4 w-4" />
                  Find Pros
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ProfileData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  bio: string;
  category: string;
  companyName?: string | null;
  avatarUrl: string | null;
  coverPhotoUrl: string | null;
  propertyPhotoUrl: string | null;
  onboardingComplete: boolean;
}

export default function ClientProfilePage() {
  const { user, isLoaded } = useUser();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Activity stats fetched from API
  const [activityStats, setActivityStats] = useState({
    activeProjects: 0,
    savedContractors: 0,
    claims: 0,
    messages: 0,
  });

  // Connected company info (from linked Trades account)
  const [linkedCompany, setLinkedCompany] = useState<{
    id: string;
    name: string;
    slug?: string | null;
    logo?: string | null;
    trade?: string | null;
    role?: string | null;
  } | null>(null);

  const [profile, setProfile] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    bio: "",
    category: "Homeowner",
    companyName: null,
    avatarUrl: null,
    coverPhotoUrl: null,
    propertyPhotoUrl: null,
    onboardingComplete: false,
  });

  // Calculate profile completion using single source of truth
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { percent: profileCompletion, missing: profileMissing } = calculateClientStrength({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    zip: profile.zip,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    propertyPhotoUrl: profile.propertyPhotoUrl,
  });
  const isProfileIncomplete = profileCompletion < 60;

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const res = await fetch("/api/portal/profile");
        if (res.ok) {
          const data = await res.json();
          const p = data.profile || data;
          setProfile({
            id: p.id,
            firstName: p.firstName || user?.firstName || "",
            lastName: p.lastName || user?.lastName || "",
            email: p.email || user?.primaryEmailAddress?.emailAddress || "",
            phone: p.phone || "",
            address: p.address || "",
            city: p.city || "",
            state: p.state || "",
            zip: p.postal || p.zip || "",
            bio: p.bio || "",
            category: p.category || "Homeowner",
            companyName: p.companyName || null,
            avatarUrl: p.avatarUrl || user?.imageUrl || null,
            coverPhotoUrl: p.coverPhotoUrl || null,
            propertyPhotoUrl: p.propertyPhotoUrl || null,
            onboardingComplete: p.onboardingComplete ?? false,
          });
        } else {
          // Use Clerk data if API fails
          setProfile((prev) => ({
            ...prev,
            firstName: user?.firstName || "",
            lastName: user?.lastName || "",
            email: user?.primaryEmailAddress?.emailAddress || "",
            avatarUrl: user?.imageUrl || null,
          }));
        }
      } catch (error) {
        logger.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    }

    if (isLoaded && user) {
      void loadProfile();
    } else if (isLoaded && !user) {
      setLoading(false);
    }
  }, [isLoaded, user]);

  // Fetch activity stats
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/portal/stats");
        if (res.ok) {
          const data = await res.json();
          setActivityStats({
            activeProjects: data.activeProjects ?? 0,
            savedContractors: data.savedContractors ?? 0,
            claims: data.claims ?? 0,
            messages: data.messages ?? 0,
          });
        }
      } catch (error) {
        console.warn("[Portal Profile] Failed to load stats:", error);
      }
    }
    if (isLoaded && user) void loadStats();
  }, [isLoaded, user]);

  const handleChange = (field: keyof ProfileData, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  // Fetch linked company
  useEffect(() => {
    async function loadLinkedCompany() {
      try {
        const res = await fetch("/api/portal/linked-company");
        if (res.ok) {
          const data = await res.json();
          if (data.company) setLinkedCompany(data.company);
        }
      } catch (error) {
        console.warn("[Portal Profile] Failed to load linked company:", error);
      }
    }
    if (isLoaded && user) void loadLinkedCompany();
  }, [isLoaded, user]);
  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        companyName: profile.companyName || null,
        category: profile.category || "Homeowner",
        phone: profile.phone,
        bio: profile.bio,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        postal: profile.zip,
        preferredContact: "email",
      };

      const res = await fetch("/api/portal/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details?.[0]?.message || "Failed to save profile");
      }

      // Map response back to local state shape (postal → zip)
      // IMPORTANT: Use ?? (not ||) for photo URLs so we don't drop falsy-but-valid values
      // and always preserve local photo state since profile POST doesn't touch photo fields
      if (data.profile) {
        setProfile((prev) => ({
          ...prev,
          firstName: data.profile.firstName || prev.firstName,
          lastName: data.profile.lastName || prev.lastName,
          companyName: data.profile.companyName || prev.companyName,
          category: data.profile.category || prev.category,
          phone: data.profile.phone || prev.phone,
          bio: data.profile.bio || prev.bio,
          address: data.profile.address || prev.address,
          city: data.profile.city || prev.city,
          state: data.profile.state || prev.state,
          zip: data.profile.postal || prev.zip,
          avatarUrl: data.profile.avatarUrl ?? prev.avatarUrl,
          coverPhotoUrl: data.profile.coverPhotoUrl ?? prev.coverPhotoUrl,
          propertyPhotoUrl: data.profile.propertyPhotoUrl ?? prev.propertyPhotoUrl,
          onboardingComplete: true,
        }));
      }

      setIsEditing(false);
      toast.success("Profile saved successfully!");
    } catch (error) {
      logger.error("Failed to save profile:", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(type: "avatar" | "cover", file: File) {
    const setUploading = type === "avatar" ? setUploadingAvatar : setUploadingCover;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/portal/upload-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setProfile((prev) => ({
        ...prev,
        ...(type === "avatar" ? { avatarUrl: data.url } : { coverPhotoUrl: data.url }),
      }));

      toast.success(`${type === "avatar" ? "Profile" : "Cover"} photo uploaded!`);
    } catch (error) {
      logger.error("Upload failed:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  const displayName = `${profile.firstName} ${profile.lastName}`.trim() || "Client";
  const initials =
    (profile.firstName?.[0] || "") + (profile.lastName?.[0] || "") ||
    profile.email?.[0]?.toUpperCase() ||
    "C";
  const locationString =
    [profile.city, profile.state].filter(Boolean).join(", ") || "Location not set";

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-slate-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-green-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hidden file inputs */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Upload avatar photo"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handlePhotoUpload("avatar", file);
        }}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Upload cover photo"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handlePhotoUpload("cover", file);
        }}
      />

      {/* Cover Photo */}
      <div className="relative h-48 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 md:h-64">
        {profile.coverPhotoUrl && (
          <Image
            src={profile.coverPhotoUrl}
            alt="Cover"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1200px"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <button
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadingCover}
          className="absolute right-4 top-4 rounded-lg bg-black/40 px-3 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-50"
        >
          {uploadingCover ? (
            "Uploading..."
          ) : (
            <>
              <Camera className="mr-2 inline h-4 w-4" />
              Edit Cover
            </>
          )}
        </button>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-12 pt-6">
        {/* Profile Header */}
        <div className="-mt-12 mb-6 flex flex-col gap-4 md:-mt-16 md:flex-row md:items-end md:gap-6">
          {/* Avatar */}
          <div className="relative z-10">
            <div className="relative h-28 w-28 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-2xl sm:h-32 sm:w-32 lg:h-40 lg:w-40">
              {profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt={displayName} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                  {initials}
                </div>
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-2 -right-2 rounded-full bg-white p-2 shadow-lg transition hover:scale-110 disabled:opacity-50"
            >
              {uploadingAvatar ? (
                <Upload className="h-4 w-4 animate-pulse text-blue-600" />
              ) : (
                <Camera className="h-4 w-4 text-slate-600" />
              )}
            </button>
          </div>

          {/* Name & Info - with background for readability */}
          <div className="flex-1 rounded-2xl bg-white/90 p-4 shadow-lg backdrop-blur-sm dark:bg-slate-800/90 md:pt-6">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                {displayName}
              </h1>
              {profile.onboardingComplete && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Verified
                </Badge>
              )}
              {user?.id && <PresenceBadge userId={user.id} showLabel size="sm" />}
            </div>

            {/* Custom Status */}
            {user?.id && (
              <div className="mb-3">
                <StatusEditor compact userType="client" />
              </div>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400">
              {profile.category && (
                <span className="flex items-center gap-1">
                  <Home className="h-4 w-4 text-emerald-500" />
                  {profile.category}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-red-500" />
                {locationString}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar — separate from profile info */}
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-sm dark:bg-slate-800/80 dark:ring-slate-700/60">
          <Button
            onClick={() => setIsEditing(!isEditing)}
            size="sm"
            variant={isEditing ? "default" : "outline"}
          >
            <Edit3 className="mr-1 h-4 w-4" />
            {isEditing ? "Cancel Edit" : "Edit Profile"}
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/portal/messages">
              <MessageCircle className="mr-1 h-4 w-4" />
              Messages
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/portal/network">
              <Globe className="mr-1 h-4 w-4" />
              Community
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/portal/contractors">
              <Users className="mr-1 h-4 w-4" />
              My Pros
            </Link>
          </Button>
          {linkedCompany && (
            <Button size="sm" variant="outline" asChild>
              <Link href="/trades/company">
                <Building2 className="mr-1 h-4 w-4" />
                {linkedCompany.name}
              </Link>
            </Button>
          )}
        </div>

        {/* Profile Completion Banner */}
        {isProfileIncomplete && !isEditing && (
          <div className="mb-6">
            <ProfileStrengthBanner
              percent={profileCompletion}
              missing={
                [
                  !profile.firstName && "First name",
                  !profile.lastName && "Last name",
                  !profile.phone && "Phone",
                  !profile.address && "Address",
                  !profile.city && "City",
                  !profile.state && "State",
                  !profile.zip && "Zip",
                  !profile.bio && "Bio",
                  !profile.avatarUrl && "Profile photo",
                  !profile.propertyPhotoUrl && "Property photo",
                ].filter(Boolean) as string[]
              }
              editHref="#"
              variant="client"
            />
          </div>
        )}

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Column - About & Stats */}
          <div className="space-y-6">
            {/* Stats Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">My Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link
                  href="/portal/my-jobs"
                  className="flex items-center justify-between transition-colors hover:text-blue-600"
                >
                  <span className="flex items-center gap-2 text-slate-600">
                    <Briefcase className="h-4 w-4" />
                    Active Projects
                  </span>
                  <span className="font-semibold">{activityStats.activeProjects}</span>
                </Link>
                <Link
                  href="/portal/contractors"
                  className="flex items-center justify-between transition-colors hover:text-blue-600"
                >
                  <span className="flex items-center gap-2 text-slate-600">
                    <Heart className="h-4 w-4" />
                    Saved Contractors
                  </span>
                  <span className="font-semibold">{activityStats.savedContractors}</span>
                </Link>
                <Link
                  href="/portal/claims"
                  className="flex items-center justify-between transition-colors hover:text-blue-600"
                >
                  <span className="flex items-center gap-2 text-slate-600">
                    <Shield className="h-4 w-4" />
                    Claims
                  </span>
                  <span className="font-semibold">{activityStats.claims}</span>
                </Link>
                <Link
                  href="/portal/messages"
                  className="flex items-center justify-between transition-colors hover:text-blue-600"
                >
                  <span className="flex items-center gap-2 text-slate-600">
                    <MessageCircle className="h-4 w-4" />
                    Messages
                  </span>
                  <span className="font-semibold">{activityStats.messages}</span>
                </Link>
              </CardContent>
            </Card>

            {/* Contact Info Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Contact Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">{profile.email}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">{profile.phone}</span>
                  </div>
                )}
                {profile.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">
                      {profile.address}
                      {profile.city && `, ${profile.city}`}
                      {profile.state && `, ${profile.state}`}
                      {profile.zip && ` ${profile.zip}`}
                    </span>
                  </div>
                )}
                {!profile.phone && !profile.address && (
                  <p className="text-sm text-slate-500">No contact info added yet</p>
                )}
              </CardContent>
            </Card>

            {/* Property Photos Gallery */}
            <PropertyPhotoGallery />
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-2">
            {isEditing ? (
              /* Edit Form */
              <Card>
                <CardHeader>
                  <CardTitle>Edit Profile</CardTitle>
                  <CardDescription>Update your information and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Name */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={profile.firstName}
                        onChange={(e) => handleChange("firstName", e.target.value)}
                        placeholder="Your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profile.lastName}
                        onChange={(e) => handleChange("lastName", e.target.value)}
                        placeholder="Your last name"
                      />
                    </div>
                  </div>

                  {/* Category & Phone */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="category">I am a...</Label>
                      <Select
                        value={profile.category}
                        onValueChange={(val) => handleChange("category", val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLIENT_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={profile.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        placeholder="(555) 555-5555"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      value={profile.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      placeholder="123 Main St"
                    />
                  </div>

                  {/* City, State, Zip */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={profile.city}
                        onChange={(e) => handleChange("city", e.target.value)}
                        placeholder="Phoenix"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Select value={profile.state} onValueChange={(v) => handleChange("state", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "AL",
                            "AK",
                            "AZ",
                            "AR",
                            "CA",
                            "CO",
                            "CT",
                            "DE",
                            "FL",
                            "GA",
                            "HI",
                            "ID",
                            "IL",
                            "IN",
                            "IA",
                            "KS",
                            "KY",
                            "LA",
                            "ME",
                            "MD",
                            "MA",
                            "MI",
                            "MN",
                            "MS",
                            "MO",
                            "MT",
                            "NE",
                            "NV",
                            "NH",
                            "NJ",
                            "NM",
                            "NY",
                            "NC",
                            "ND",
                            "OH",
                            "OK",
                            "OR",
                            "PA",
                            "RI",
                            "SC",
                            "SD",
                            "TN",
                            "TX",
                            "UT",
                            "VT",
                            "VA",
                            "WA",
                            "WV",
                            "WI",
                            "WY",
                            "DC",
                          ].map((st) => (
                            <SelectItem key={st} value={st}>
                              {st}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input
                        id="zip"
                        value={profile.zip}
                        onChange={(e) => handleChange("zip", e.target.value)}
                        placeholder="85001"
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label htmlFor="bio">About Me</Label>
                    <Textarea
                      id="bio"
                      value={profile.bio}
                      onChange={(e) => handleChange("bio", e.target.value)}
                      placeholder="Tell contractors about yourself and the kind of work you typically need..."
                      rows={4}
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3">
                    <Button onClick={handleSave} disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Saving..." : "Save Profile"}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Profile View */
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6 flex w-full overflow-x-auto sm:grid sm:grid-cols-3 md:grid-cols-5">
                  <TabsTrigger value="overview" className="flex-shrink-0">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="flex-shrink-0">
                    Projects
                  </TabsTrigger>
                  <TabsTrigger value="connections" className="flex-shrink-0">
                    Connections
                  </TabsTrigger>
                  <TabsTrigger value="network" className="flex-shrink-0">
                    Network
                  </TabsTrigger>
                  <TabsTrigger value="contractors" className="flex-shrink-0">
                    Saved Pros
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  {/* About Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle>About</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {profile.bio ? (
                        <p className="leading-relaxed text-slate-700">{profile.bio}</p>
                      ) : (
                        <div className="rounded-lg border-2 border-dashed border-slate-200 p-6 text-center">
                          <User className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                          <p className="text-slate-500">No bio added yet</p>
                          <Button
                            variant="link"
                            onClick={() => setIsEditing(true)}
                            className="mt-2"
                          >
                            Add your bio
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Linked Company Card */}
                  {linkedCompany && (
                    <Card className="mt-6 border-blue-200/60 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Building2 className="h-5 w-5 text-blue-600" />
                          Linked Company
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md">
                            {linkedCompany.logo ? (
                              <Image
                                src={linkedCompany.logo}
                                alt={linkedCompany.name}
                                width={56}
                                height={56}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Building2 className="h-6 w-6 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900">{linkedCompany.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              {linkedCompany.trade && <span>{linkedCompany.trade}</span>}
                              {linkedCompany.role && (
                                <>
                                  <span>·</span>
                                  <span className="capitalize">{linkedCompany.role}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link href="/trades/company">
                              <ExternalLink className="mr-1 h-3.5 w-3.5" />
                              View Company
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Activity Highlights */}
                  <Card className="mt-6">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <TrendingUp className="h-5 w-5 text-emerald-500" />
                        Activity Highlights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <Link
                          href="/portal/my-jobs"
                          className="group rounded-xl border bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-blue-800/50 dark:from-blue-950/40 dark:to-blue-900/20"
                        >
                          <Briefcase className="mx-auto mb-1 h-5 w-5 text-blue-600" />
                          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                            {activityStats.activeProjects}
                          </p>
                          <p className="text-xs text-slate-500 group-hover:text-blue-600">
                            Projects
                          </p>
                        </Link>
                        <Link
                          href="/portal/contractors"
                          className="group rounded-xl border bg-gradient-to-br from-pink-50 to-pink-100/50 p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-pink-800/50 dark:from-pink-950/40 dark:to-pink-900/20"
                        >
                          <Heart className="mx-auto mb-1 h-5 w-5 text-pink-600" />
                          <p className="text-2xl font-bold text-pink-700 dark:text-pink-400">
                            {activityStats.savedContractors}
                          </p>
                          <p className="text-xs text-slate-500 group-hover:text-pink-600">
                            Saved Pros
                          </p>
                        </Link>
                        <Link
                          href="/portal/claims"
                          className="group rounded-xl border bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-amber-800/50 dark:from-amber-950/40 dark:to-amber-900/20"
                        >
                          <Shield className="mx-auto mb-1 h-5 w-5 text-amber-600" />
                          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                            {activityStats.claims}
                          </p>
                          <p className="text-xs text-slate-500 group-hover:text-amber-600">
                            Claims
                          </p>
                        </Link>
                        <Link
                          href="/portal/messages"
                          className="group rounded-xl border bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-800/50 dark:from-emerald-950/40 dark:to-emerald-900/20"
                        >
                          <MessageCircle className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
                          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                            {activityStats.messages}
                          </p>
                          <p className="text-xs text-slate-500 group-hover:text-emerald-600">
                            Messages
                          </p>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Start Tips */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        Get Started
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <Link href="/portal/find-a-pro" className="group">
                          <div className="rounded-lg border p-4 transition-all hover:border-blue-300 hover:bg-blue-50 dark:hover:border-blue-700 dark:hover:bg-blue-950/30">
                            <Users className="mb-2 h-6 w-6 text-blue-600" />
                            <h4 className="font-semibold dark:text-white">Find Contractors</h4>
                            <p className="text-sm text-slate-500">
                              Browse verified pros in your area
                            </p>
                          </div>
                        </Link>
                        <Link href="/portal/projects/new" className="group">
                          <div className="rounded-lg border p-4 transition-all hover:border-green-300 hover:bg-green-50 dark:hover:border-green-700 dark:hover:bg-green-950/30">
                            <Plus className="mb-2 h-6 w-6 text-green-600" />
                            <h4 className="font-semibold dark:text-white">Post a Project</h4>
                            <p className="text-sm text-slate-500">Get bids from contractors</p>
                          </div>
                        </Link>
                        <Link href="/portal/network" className="group">
                          <div className="rounded-lg border p-4 transition-all hover:border-purple-300 hover:bg-purple-50 dark:hover:border-purple-700 dark:hover:bg-purple-950/30">
                            <Globe className="mb-2 h-6 w-6 text-purple-600" />
                            <h4 className="font-semibold dark:text-white">Community Hub</h4>
                            <p className="text-sm text-slate-500">Connect with other homeowners</p>
                          </div>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="projects">
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Briefcase className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                      <h3 className="mb-2 text-lg font-semibold">No Projects Yet</h3>
                      <p className="mb-4 text-slate-500">
                        Post a project to start receiving bids from contractors
                      </p>
                      <Button asChild>
                        <Link href="/portal/projects/new">
                          <Plus className="mr-2 h-4 w-4" />
                          Post New Project
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="connections">
                  <ConnectionsSection />
                </TabsContent>

                <TabsContent value="network">
                  {/* Community Hub Preview — links to the full /portal/network page */}
                  <Card className="border-purple-200/60 bg-gradient-to-br from-purple-50/40 to-indigo-50/30 dark:border-purple-800/40 dark:from-purple-950/30 dark:to-indigo-950/20">
                    <CardContent className="p-8 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                        <Globe className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
                        Community Hub
                      </h3>
                      <p className="mx-auto mb-6 max-w-md text-slate-600 dark:text-slate-400">
                        Connect with other homeowners, share reviews, discover trending contractors,
                        and join community groups — all in one place.
                      </p>
                      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-xl bg-white/80 p-3 shadow-sm dark:bg-slate-800/80">
                          <MessageCircle className="mx-auto mb-1 h-5 w-5 text-purple-600" />
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Feed &amp; Posts
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/80 p-3 shadow-sm dark:bg-slate-800/80">
                          <TrendingUp className="mx-auto mb-1 h-5 w-5 text-indigo-600" />
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Trending Pros
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/80 p-3 shadow-sm dark:bg-slate-800/80">
                          <Users className="mx-auto mb-1 h-5 w-5 text-blue-600" />
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Invitations
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/80 p-3 shadow-sm dark:bg-slate-800/80">
                          <Star className="mx-auto mb-1 h-5 w-5 text-amber-600" />
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Groups
                          </p>
                        </div>
                      </div>
                      <Button
                        asChild
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                      >
                        <Link href="/portal/network">
                          <Globe className="mr-2 h-4 w-4" />
                          Open Community Hub
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="contractors">
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Heart className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                      <h3 className="mb-2 text-lg font-semibold">No Saved Contractors</h3>
                      <p className="mb-4 text-slate-500">
                        Browse contractors and save your favorites for easy access
                      </p>
                      <Button asChild>
                        <Link href="/portal/find-a-pro">
                          <Users className="mr-2 h-4 w-4" />
                          Find Contractors
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
