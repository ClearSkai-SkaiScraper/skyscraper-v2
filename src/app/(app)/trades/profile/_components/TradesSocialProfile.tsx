/**
 * Trades Social Profile Component
 * Beautiful social-like profile with photos, videos, reviews, testimonials
 * Used for both "My Network" (editable) and public view (read-only)
 */

"use client";

import {
  Briefcase,
  Camera,
  CheckCircle2,
  Edit,
  ExternalLink,
  Globe,
  Heart,
  Image as ImageIcon,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Plus,
  Send,
  Share2,
  Star,
  Upload,
  Users,
  Users2,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import PresenceBadge from "@/components/presence/PresenceBadge";
import StatusEditor from "@/components/presence/StatusEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StandardButton } from "@/components/ui/StandardButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TRADE_CATEGORIES, TRADE_TYPES, TradeCategory } from "@/lib/config/trade-types";
import { logger } from "@/lib/logger";

import ConnectButton from "./ConnectButton";
import ConnectionsWidget from "./ConnectionsWidget";
import CoverPhotoEditor from "./CoverPhotoEditor";
import EnhancedAboutTab from "./EnhancedAboutTab";
import EnhancedPhotosTab from "./EnhancedPhotosTab";
import EnhancedReviewsTab from "./EnhancedReviewsTab";
import EnhancedVideosTab from "./EnhancedVideosTab";
import FeaturedJobsSection from "./FeaturedJobsSection";
import RecentActivityFeed from "./RecentActivityFeed";

interface TradesSocialProfileProps {
  member: any;
  isOwnProfile: boolean;
  editEmployeeHref?: string | null;
}

interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  likes: number;
  comments: number;
  createdAt: string;
  type: string;
  visibility?: "public" | "connections" | "private";
}

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  category?: string;
  imageUrls: string[];
  videoUrl?: string;
  beforeImage?: string;
  afterImage?: string;
  createdAt: string;
}

interface Review {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  content: string | null;
  createdAt: string;
  isVerified: boolean;
}

interface Connection {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  status: "pending" | "active" | "connected" | "invited";
  createdAt: string;
  type: "client" | "trade";
  isRegistered?: boolean;
}

// Connections Tab Component - Shows client connections for this trade professional
function ConnectionsTab({ isOwnProfile, memberId }: { isOwnProfile: boolean; memberId: string }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingConnections, setPendingConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConnections() {
      try {
        // Fetch client connections (homeowners connected with this pro)
        const res = await fetch("/api/clients/connections");
        if (res.ok) {
          const data = await res.json();
          const clients = data.clients || [];

          // Map clients to connection format
          const mapped: Connection[] = clients.map((c: any) => ({
            id: c.id,
            name: c.name || "Unknown",
            email: c.email,
            avatar: null,
            status: c.connection?.status || "connected",
            createdAt: c.connection?.connectedAt || c.createdAt,
            type: "client" as const,
            isRegistered: c.isRegistered,
          }));

          setConnections(mapped.filter((c) => c.status === "connected"));
          setPendingConnections(
            mapped.filter((c) => c.status === "invited" || c.status === "pending")
          );
        }
      } catch (error) {
        logger.error("Failed to fetch connections:", error);
      } finally {
        setLoading(false);
      }
    }
    void fetchConnections();
  }, [memberId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Connection Requests */}
      {isOwnProfile && pendingConnections.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Users className="h-5 w-5 text-amber-500" />
              Pending Requests
              <Badge variant="secondary" className="ml-2">
                {pendingConnections.length}
              </Badge>
            </h3>
            <div className="space-y-3">
              {pendingConnections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
                      {connection.avatar ? (
                        <img
                          src={connection.avatar}
                          alt={connection.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                          {connection.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{connection.name}</p>
                      <p className="text-sm text-slate-500">
                        Requested {new Date(connection.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/trades/messages?client=${connection.id}`}>
                        <MessageCircle className="mr-1 h-4 w-4" />
                        Message
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/connections/accept", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ connectionId: connection.id }),
                          });
                          if (res.ok) {
                            toast.success(`Connected with ${connection.name}!`);
                            // Move from pending to active
                            setPendingConnections((prev) =>
                              prev.filter((c) => c.id !== connection.id)
                            );
                            setConnections((prev) => [
                              ...prev,
                              { ...connection, status: "connected" as const },
                            ]);
                          } else {
                            const err = await res.json();
                            toast.error(err.error || "Failed to accept connection");
                          }
                        } catch (error) {
                          logger.error("Failed to accept connection:", error);
                          toast.error("Failed to accept connection");
                        }
                      }}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Connections */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Users className="h-5 w-5 text-blue-600" />
            Connected Clients
            <Badge variant="secondary" className="ml-2">
              {connections.length}
            </Badge>
          </h3>

          {connections.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600">
                      {connection.avatar ? (
                        <img
                          src={connection.avatar}
                          alt={connection.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                          {connection.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{connection.name}</p>
                      <p className="text-xs text-slate-500">
                        Connected since {new Date(connection.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/trades/messages?client=${connection.id}`}>
                      <MessageCircle className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Users className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p className="text-slate-500">No connected clients yet</p>
              <p className="mt-1 text-sm text-slate-400">
                Clients can connect with you through your public profile
              </p>
              {isOwnProfile && (
                <Button variant="outline" className="mt-4" asChild>
                  <Link href="/network/trades">View Network</Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Activity Notifications Widget - Facebook-like notification center
interface ActivityItem {
  id: string;
  type: "connection_request" | "job_invite" | "review" | "message" | "project_update";
  title: string;
  message: string;
  fromName: string;
  fromAvatar?: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
  metadata?: {
    requestId?: string;
    jobId?: string;
  };
}

function ActivityNotificationsWidget() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      try {
        // Fetch from unified notifications endpoint
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          // Transform notifications to activity format
          const mapped: ActivityItem[] = (data.notifications || []).map((n: any) => ({
            id: n.id,
            type:
              n.type === "warning"
                ? "job_invite"
                : n.type === "success"
                  ? "project_update"
                  : "message",
            title: n.title,
            message: n.message,
            fromName: "System",
            createdAt: n.createdAt,
            read: n.read,
            actionUrl: n.link,
          }));
          setActivities(mapped);
        }

        // Also fetch pending connection requests
        const connRes = await fetch("/api/trades/connections?status=pending");
        if (connRes.ok) {
          const connData = await connRes.json();
          const requests = (connData.connections || []).map((c: any) => ({
            id: `conn-${c.id}`,
            type: "connection_request" as const,
            title: "Connection Request",
            message: `${c.connectedMember?.firstName || "Someone"} wants to connect`,
            fromName:
              `${c.connectedMember?.firstName || ""} ${c.connectedMember?.lastName || ""}`.trim() ||
              "Unknown",
            fromAvatar: c.connectedMember?.avatar,
            createdAt: c.createdAt || new Date().toISOString(),
            read: false,
            metadata: { requestId: c.id },
          }));
          setActivities((prev) => [...requests, ...prev]);
        }
      } catch (error) {
        logger.error("Failed to fetch activities:", error);
      } finally {
        setLoading(false);
      }
    }
    void fetchActivities();
  }, []);

  const handleAcceptConnection = async (requestId: string) => {
    try {
      const res = await fetch(`/api/trades/connections/${requestId}/accept`, {
        method: "POST",
      });
      if (res.ok) {
        setActivities((prev) => prev.filter((a) => a.metadata?.requestId !== requestId));
      }
    } catch (error) {
      logger.error("Failed to accept connection:", error);
    }
  };

  const handleDeclineConnection = async (requestId: string) => {
    try {
      const res = await fetch(`/api/trades/connections/${requestId}/decline`, {
        method: "POST",
      });
      if (res.ok) {
        setActivities((prev) => prev.filter((a) => a.metadata?.requestId !== requestId));
      }
    } catch (error) {
      logger.error("Failed to decline connection:", error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return null; // Don't show anything if no activities
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Heart className="h-5 w-5 text-red-500" />
          Activity
          {activities.filter((a) => !a.read).length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {activities.filter((a) => !a.read).length} new
            </Badge>
          )}
        </h3>
        <div className="space-y-3">
          {activities.slice(0, 5).map((activity) => (
            <div
              key={activity.id}
              className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                activity.read ? "bg-slate-50" : "bg-blue-50"
              }`}
            >
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                {activity.fromAvatar ? (
                  <img
                    src={activity.fromAvatar}
                    alt={activity.fromName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                    {activity.fromName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{activity.fromName}</span>{" "}
                  <span className="text-slate-600">{activity.message}</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(activity.createdAt).toLocaleDateString()}
                </p>

                {/* Action buttons for connection requests */}
                {activity.type === "connection_request" && activity.metadata?.requestId && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleAcceptConnection(activity.metadata!.requestId!)}
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeclineConnection(activity.metadata!.requestId!)}
                    >
                      Decline
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/trades/messages`}>
                        <MessageCircle className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                )}

                {/* Link for other activity types */}
                {activity.type !== "connection_request" && activity.actionUrl && (
                  <Link
                    href={activity.actionUrl}
                    className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                  >
                    View details →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
        {activities.length > 5 && (
          <Link
            href="/dashboard/trades/connections"
            className="mt-4 block text-center text-sm text-blue-600 hover:underline"
          >
            View all activity ({activities.length})
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export default function TradesSocialProfile({
  member,
  isOwnProfile,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  editEmployeeHref,
}: TradesSocialProfileProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(member?.avatar || null);
  const [coverUrl, setCoverUrl] = useState<string | null>(member?.coverPhoto || null);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [showCoverEditor, setShowCoverEditor] = useState(false);

  // Specialties state
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);
  const [showSpecialtiesEditor, setShowSpecialtiesEditor] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>(member?.specialties || []);
  const [savingSpecialties, setSavingSpecialties] = useState(false);
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TradeCategory | "All">("All");
  const MAX_SPECIALTIES = 10;

  // Post composer state
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImages, setPostImages] = useState<string[]>([]);
  const [postingInProgress, setPostingInProgress] = useState(false);
  const [postVisibility, setPostVisibility] = useState<"public" | "connections" | "private">(
    "public"
  );

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const postImageInputRef = useRef<HTMLInputElement>(null);

  // Handle creating a new post
  const handleCreatePost = async () => {
    if (!postContent.trim()) {
      toast.error("Please write something to share");
      return;
    }

    setPostingInProgress(true);
    try {
      const res = await fetch("/api/trades/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "update",
          title: postContent.substring(0, 50),
          content: postContent,
          images: postImages,
          visibility: postVisibility,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create post");
      }

      const { post } = await res.json();

      // Add new post to the top of the feed
      setPosts((prev) => [
        {
          id: post.id,
          content: post.content,
          mediaUrls: post.images || [],
          likes: 0,
          comments: 0,
          createdAt: post.createdAt,
          type: post.type,
        },
        ...prev,
      ]);

      // Reset composer
      setPostContent("");
      setPostImages([]);
      setPostVisibility("public");
      setShowPostComposer(false);
      toast.success("Post shared successfully!");
    } catch (error) {
      logger.error("Create post error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create post");
    } finally {
      setPostingInProgress(false);
    }
  };

  // Handle post image upload
  const handlePostImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Images must be less than 5MB");
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload/portfolio", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const { url } = await res.json();
        setPostImages((prev) => [...prev, url]);
      } catch (_error) {
        toast.error("Failed to upload image");
      }
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading("avatar");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload failed");
      }

      const { url } = await res.json();
      setAvatarUrl(url);

      // Update profile with new avatar
      const updateRes = await fetch("/api/trades/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "update_avatar",
          data: { avatar: url },
        }),
      });

      if (!updateRes.ok) {
        const errorData = await updateRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save avatar");
      }

      toast.success("Profile photo updated!");
    } catch (error) {
      logger.error("Avatar upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload photo");
    } finally {
      setUploading(null);
    }
  };

  // Handle cover photo upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("Cover image must be less than 10MB");
      return;
    }

    setUploading("cover");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/cover", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload failed");
      }

      const { url } = await res.json();
      setCoverUrl(url);

      // Update member cover photo
      const updateRes = await fetch("/api/trades/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "update_cover",
          data: { coverPhoto: url },
        }),
      });

      if (!updateRes.ok) {
        const errorData = await updateRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save cover photo");
      }

      toast.success("Cover photo updated!");
    } catch (error) {
      logger.error("Cover upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload cover photo");
    } finally {
      setUploading(null);
    }
  };

  const emailFallback = typeof member?.email === "string" ? member.email : "";
  const emailLocalPart = emailFallback.includes("@") ? emailFallback.split("@")[0] : emailFallback;
  const firstName = typeof member?.firstName === "string" ? member.firstName : "";
  const lastName = typeof member?.lastName === "string" ? member.lastName : "";
  const displayName =
    `${firstName} ${lastName}`.trim() || member?.companyName || emailLocalPart || "Trades Member";
  const initials = (firstName?.[0] || "") + (lastName?.[0] || "") || emailLocalPart?.[0] || "T";

  const onboardingStep = typeof member?.onboardingStep === "string" ? member.onboardingStep : "";
  const needsOnboarding = isOwnProfile && onboardingStep && onboardingStep !== "complete";
  const onboardingHref =
    onboardingStep === "link_company"
      ? "/trades/onboarding/link-company"
      : onboardingStep === "pending_admin"
        ? "/trades/onboarding/waiting"
        : "/trades/onboarding";

  // Fetch posts, portfolio, and reviews
  useEffect(() => {
    async function fetchData() {
      if (!member?.company?.id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch posts
        const postsRes = await fetch(`/api/trades/posts?companyId=${member.company.id}`);
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setPosts(postsData.posts || []);
        }

        // Fetch portfolio
        const portfolioRes = await fetch(`/api/trades/portfolio?companyId=${member.company.id}`);
        if (portfolioRes.ok) {
          const portfolioData = await portfolioRes.json();
          setPortfolio(portfolioData.items || []);
        }

        // Fetch reviews
        const reviewsRes = await fetch(`/api/trades/reviews?companyId=${member.company.id}`);
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          setReviews(reviewsData.reviews || []);
        }
      } catch (error) {
        logger.error("Failed to fetch profile data:", error);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [member?.company?.id]);

  // Calculate average rating
  const averageRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  // Get all photos from portfolio + profile photos (avatar, cover)
  const profilePhotos: string[] = [
    ...(avatarUrl ? [avatarUrl] : []),
    ...(coverUrl ? [coverUrl] : []),
  ];
  const portfolioPhotos = portfolio.flatMap((p) => p.imageUrls);
  const allPhotos = [...profilePhotos, ...portfolioPhotos];
  const allVideos = portfolio.filter((p) => p.videoUrl);

  if (!member) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/50 to-amber-50/30">
      {/* Hidden file inputs */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarUpload}
        aria-label="Upload avatar image"
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverUpload}
        aria-label="Upload cover image"
      />

      {/* Cover Photo — bigger hero banner like LinkedIn */}
      <div className="relative h-56 overflow-hidden rounded-t-xl bg-gradient-to-r from-[#117CFF] via-[#0098FF] to-[#00C2FF] md:h-72">
        {coverUrl && <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
        {isOwnProfile && (
          <div className="absolute right-4 top-4 flex gap-2">
            {/* Upload New Cover Button */}
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={uploading === "cover"}
              className="rounded-lg bg-black/40 px-3 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-50"
            >
              {uploading === "cover" ? (
                <>Uploading...</>
              ) : (
                <>
                  <Upload className="mr-2 inline h-4 w-4" />
                  {coverUrl ? "Change" : "Upload Cover"}
                </>
              )}
            </button>
            {/* Edit Existing Cover Button (only if cover exists) */}
            {coverUrl && (
              <button
                onClick={() => setShowCoverEditor(true)}
                disabled={uploading === "cover"}
                className="rounded-lg bg-black/40 px-3 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-50"
              >
                <Edit className="mr-2 inline h-4 w-4" />
                Edit Position
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cover Photo Editor Modal */}
      {showCoverEditor && coverUrl && (
        <CoverPhotoEditor
          imageUrl={coverUrl}
          onSave={async (uploadedUrl) => {
            setUploading("cover");
            try {
              // The CoverPhotoEditor already uploads the cropped image
              // uploadedUrl is the final URL from the upload API
              setCoverUrl(uploadedUrl);

              // Update profile with the new cover photo URL
              await fetch("/api/trades/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  step: "update_cover",
                  data: { coverPhoto: uploadedUrl },
                }),
              });

              toast.success("Cover photo updated!");
              setShowCoverEditor(false);
            } catch (_error) {
              toast.error("Failed to update cover photo");
            } finally {
              setUploading(null);
            }
          }}
          onCancel={() => setShowCoverEditor(false)}
        />
      )}

      {/* Specialties Editor Modal */}
      {showSpecialtiesEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Edit Services & Specialties</h3>
                <p className="text-sm text-slate-500">
                  {specialties.length}/{MAX_SPECIALTIES} selected
                </p>
              </div>
              <button
                onClick={() => setShowSpecialtiesEditor(false)}
                className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close specialties editor"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Selected Specialties */}
            {specialties.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium uppercase text-slate-500">
                  Selected Services:
                </p>
                <div className="flex flex-wrap gap-2">
                  {specialties.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                    >
                      {s}
                      <button
                        onClick={() => setSpecialties(specialties.filter((sp) => sp !== s))}
                        className="ml-1 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800"
                        title={`Remove ${s}`}
                        aria-label={`Remove ${s}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Search and Category Filter */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="Search services..."
                value={specialtySearch}
                onChange={(e) => setSpecialtySearch(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-800"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as TradeCategory | "All")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-800"
                title="Filter by category"
                aria-label="Filter by category"
              >
                <option value="All">All Categories</option>
                {TRADE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Add Custom Specialty */}
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                placeholder="Add custom specialty..."
                value={customSpecialty}
                onChange={(e) => setCustomSpecialty(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-800"
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    customSpecialty.trim() &&
                    specialties.length < MAX_SPECIALTIES
                  ) {
                    if (!specialties.includes(customSpecialty.trim())) {
                      setSpecialties([...specialties, customSpecialty.trim()]);
                    }
                    setCustomSpecialty("");
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (customSpecialty.trim() && specialties.length < MAX_SPECIALTIES) {
                    if (!specialties.includes(customSpecialty.trim())) {
                      setSpecialties([...specialties, customSpecialty.trim()]);
                    }
                    setCustomSpecialty("");
                  }
                }}
                disabled={!customSpecialty.trim() || specialties.length >= MAX_SPECIALTIES}
                className="shrink-0"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>

            {/* Trade Types Grid */}
            <div className="mb-6 max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-3">
                {TRADE_TYPES.filter((trade) => {
                  const matchesSearch =
                    !specialtySearch ||
                    trade.label.toLowerCase().includes(specialtySearch.toLowerCase()) ||
                    trade.category.toLowerCase().includes(specialtySearch.toLowerCase());
                  const matchesCategory =
                    selectedCategory === "All" || trade.category === selectedCategory;
                  return matchesSearch && matchesCategory;
                }).map((trade) => (
                  <label
                    key={trade.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition-colors ${
                      specialties.includes(trade.value)
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30"
                        : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    } ${specialties.length >= MAX_SPECIALTIES && !specialties.includes(trade.value) ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={specialties.includes(trade.value)}
                      disabled={
                        specialties.length >= MAX_SPECIALTIES && !specialties.includes(trade.value)
                      }
                      onChange={(e) => {
                        if (e.target.checked && specialties.length < MAX_SPECIALTIES) {
                          setSpecialties([...specialties, trade.value]);
                        } else if (!e.target.checked) {
                          setSpecialties(specialties.filter((s) => s !== trade.value));
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="truncate">{trade.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {specialties.length >= MAX_SPECIALTIES && (
              <p className="mb-4 text-sm text-amber-600">
                Maximum {MAX_SPECIALTIES} services reached. Remove one to add more.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSpecialtiesEditor(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  setSavingSpecialties(true);
                  try {
                    const res = await fetch("/api/trades/onboarding", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        step: "update_specialties",
                        data: { specialties },
                      }),
                    });
                    if (!res.ok) throw new Error("Failed to save");
                    toast.success("Services updated!");
                    setShowSpecialtiesEditor(false);
                  } catch (_error) {
                    toast.error("Failed to save services");
                  } finally {
                    setSavingSpecialties(false);
                  }
                }}
                disabled={savingSpecialties}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {savingSpecialties ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 pb-12">
        {/* Profile Header — LinkedIn / Facebook style */}
        <div className="-mt-10 mb-6 md:-mt-12">
          {/* Top row: Avatar + Name block */}
          <div className="flex flex-col items-center gap-4 rounded-b-2xl bg-white px-4 pb-4 pt-8 shadow-sm dark:bg-slate-900 sm:flex-row sm:items-end sm:gap-5">
            {/* Avatar */}
            <div className="relative z-10 shrink-0">
              <div className="h-36 w-36 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl md:h-44 md:w-44">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
                    {initials}
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploading === "avatar"}
                  className="absolute -bottom-2 -right-2 rounded-full bg-white p-2 shadow-lg transition hover:scale-110 disabled:opacity-50"
                >
                  {uploading === "avatar" ? (
                    <Upload className="h-4 w-4 animate-pulse text-blue-600" />
                  ) : (
                    <Camera className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              )}
            </div>

            {/* Name + Title + Meta — grows to fill space */}
            <div className="relative z-10 min-w-0 flex-1 pb-2">
              <h1 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl lg:text-4xl">
                {displayName}
              </h1>
              {(member.company?.name || member.companyName) && (
                <p className="mt-1 text-base font-semibold text-blue-700 sm:text-lg">
                  {member.companyName || member.company?.name}
                  {member.jobTitle && (
                    <span className="font-normal text-slate-400"> · {member.jobTitle}</span>
                  )}
                </p>
              )}
              {!member.company?.name && !member.companyName && member.jobTitle && (
                <p className="mt-1 text-lg font-medium text-slate-600">{member.jobTitle}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-500">
                {member.tradeType && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4 text-blue-500" />
                    {member.tradeType}
                  </span>
                )}
                {(member.city || member.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-red-400" />
                    {[member.city, member.state].filter(Boolean).join(", ")}
                  </span>
                )}
                {member.verifiedAt && (
                  <Badge className="bg-blue-100 text-blue-700">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                )}
                {/* Presence indicator */}
                <PresenceBadge userId={member.userId || member.id} showLabel size="sm" />
              </div>
              {/* Custom status / Status editor */}
              {isOwnProfile ? (
                <div className="mt-2">
                  <StatusEditor userType="pro" compact />
                </div>
              ) : (
                member.customStatus && (
                  <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                    {member.statusEmoji && <span>{member.statusEmoji}</span>}
                    <span>{member.customStatus}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Action buttons row — below the header like LinkedIn */}
          <div className="mt-4 flex flex-wrap gap-2 pl-0 lg:pl-[196px]">
            {isOwnProfile ? (
              <>
                <Link href="/trades/profile/edit">
                  <StandardButton variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </StandardButton>
                </Link>
                <Link href="/trades/company">
                  <Button variant="outline" className="gap-2">
                    <Briefcase className="mr-2 h-4 w-4" />
                    Company Page
                  </Button>
                </Link>
                <Link href="/trades/jobs">
                  <Button className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
                    <Briefcase className="mr-2 h-4 w-4" />
                    Job Board
                  </Button>
                </Link>
                <Link href={`/trades/profiles/${member.id}/public`} target="_blank">
                  <Button variant="outline" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Public Profile
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={async () => {
                    const url = `${window.location.origin}/trades/profiles/${member.id}/public`;
                    try {
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(url);
                        toast.success("Profile link copied to clipboard!");
                      } else {
                        const textArea = document.createElement("textarea");
                        textArea.value = url;
                        textArea.style.position = "fixed";
                        textArea.style.left = "-9999px";
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand("copy");
                        document.body.removeChild(textArea);
                        toast.success("Profile link copied to clipboard!");
                      }
                    } catch (err) {
                      logger.error("Failed to copy:", err);
                      window.prompt("Copy this link:", url);
                    }
                  }}
                  title="Copy profile link"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <ConnectButton userId={member.userId || member.id} />
                <StandardButton>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Message
                </StandardButton>
                <Button variant="outline" size="icon">
                  <Heart className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Specialties — below buttons */}
          {specialties && specialties.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 pl-0 lg:pl-[196px]">
              {isOwnProfile ? (
                <>
                  {(showAllSpecialties ? specialties : specialties.slice(0, 5)).map((s: string) => (
                    <Badge key={s} variant="secondary" className="bg-amber-100 text-amber-800">
                      {s}
                    </Badge>
                  ))}
                  {!showAllSpecialties && specialties.length > 5 && (
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-slate-100"
                      onClick={() => setShowAllSpecialties(true)}
                    >
                      +{specialties.length - 5} more
                    </Badge>
                  )}
                  {showAllSpecialties && specialties.length > 5 && (
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-slate-100"
                      onClick={() => setShowAllSpecialties(false)}
                    >
                      Show less
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="cursor-pointer border-dashed hover:bg-slate-100"
                    onClick={() => setShowSpecialtiesEditor(true)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Badge>
                </>
              ) : (
                <>
                  {(showAllSpecialties ? specialties : specialties.slice(0, 5)).map((s: string) => (
                    <Badge key={s} variant="secondary" className="bg-amber-100 text-amber-800">
                      {s}
                    </Badge>
                  ))}
                  {!showAllSpecialties && specialties.length > 5 && (
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-slate-100"
                      onClick={() => setShowAllSpecialties(true)}
                    >
                      +{specialties.length - 5} more
                    </Badge>
                  )}
                  {showAllSpecialties && specialties.length > 5 && (
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-slate-100"
                      onClick={() => setShowAllSpecialties(false)}
                    >
                      Show less
                    </Badge>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {needsOnboarding && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold text-blue-900">Complete your profile</p>
                <p className="text-sm text-blue-700">
                  Add more details to make your profile stand out to potential clients.
                </p>
              </div>
              <Link href={onboardingHref}>
                <StandardButton size="sm">Continue Setup</StandardButton>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats Bar — LinkedIn style highlights strip */}
        <Card className="mb-6 overflow-hidden">
          <CardContent className="grid grid-cols-3 divide-x divide-slate-100 p-0 md:grid-cols-5">
            <div className="flex flex-col items-center py-4">
              <div className="text-2xl font-bold text-blue-600">{member.yearsExperience || 0}</div>
              <div className="text-xs font-medium text-slate-500">Years Exp</div>
            </div>
            <div className="flex flex-col items-center py-4">
              <div className="flex items-center gap-1 text-2xl font-bold text-amber-500">
                {averageRating > 0 ? averageRating.toFixed(1) : "—"}
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              </div>
              <div className="text-xs font-medium text-slate-500">{reviews.length} Reviews</div>
            </div>
            <div className="flex flex-col items-center py-4">
              <div className="text-2xl font-bold text-slate-900">{allPhotos.length}</div>
              <div className="text-xs font-medium text-slate-500">Photos</div>
            </div>
            <div className="flex flex-col items-center py-4">
              <div className="text-2xl font-bold text-slate-900">{portfolio.length}</div>
              <div className="text-xs font-medium text-slate-500">Projects</div>
            </div>
            <div className="flex flex-col items-center py-4">
              <div className="text-2xl font-bold text-slate-900">{posts.length}</div>
              <div className="text-xs font-medium text-slate-500">Updates</div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content — two-column grid with activity sidebar */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          {/* Left column: Tabs */}
          <div>
            {/* Main Content Tabs — LinkedIn-style navigation */}
            <Tabs defaultValue="feed" className="space-y-6">
              <TabsList className="w-full justify-start gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700">
                <TabsTrigger
                  value="feed"
                  className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  <MessageCircle className="h-4 w-4" />
                  Feed
                </TabsTrigger>
                <TabsTrigger
                  value="photos"
                  className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  <ImageIcon className="h-4 w-4" />
                  Photos
                </TabsTrigger>
                <TabsTrigger
                  value="videos"
                  className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  <Video className="h-4 w-4" />
                  Videos
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  <Star className="h-4 w-4" />
                  Reviews
                </TabsTrigger>
                <TabsTrigger
                  value="connections"
                  className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  <Users className="h-4 w-4" />
                  Connections
                </TabsTrigger>
                <TabsTrigger
                  value="about"
                  className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  <Briefcase className="h-4 w-4" />
                  About
                </TabsTrigger>
              </TabsList>

              {/* Feed Tab */}
              <TabsContent value="feed" className="space-y-6">
                {/* Create Post - Inline Composer */}
                {isOwnProfile && (
                  <Card>
                    <CardContent className="p-4">
                      {!showPostComposer ? (
                        <div
                          onClick={() => setShowPostComposer(true)}
                          className="flex cursor-pointer items-center gap-4 rounded-lg border border-dashed border-slate-200 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/50"
                        >
                          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt="You"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                                {initials}
                              </div>
                            )}
                          </div>
                          <span className="text-slate-500">
                            Share a project update, job photo, or video...
                          </span>
                          <div className="ml-auto flex gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Camera className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Video className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt="You"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                                  {initials}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <Textarea
                                placeholder="Share a project update, completed job, or industry news..."
                                value={postContent}
                                onChange={(e) => setPostContent(e.target.value)}
                                className="min-h-[100px] resize-none border-0 bg-transparent p-0 text-base focus-visible:ring-0"
                                autoFocus
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setShowPostComposer(false);
                                setPostContent("");
                                setPostImages([]);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Image Previews */}
                          {postImages.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {postImages.map((img, idx) => (
                                <div key={idx} className="relative">
                                  <img
                                    src={img}
                                    alt=""
                                    className="h-20 w-20 rounded-lg object-cover"
                                  />
                                  <button
                                    onClick={() =>
                                      setPostImages((prev) => prev.filter((_, i) => i !== idx))
                                    }
                                    className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                                    aria-label={`Remove image ${idx + 1}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between border-t pt-3">
                            <div className="flex gap-2">
                              <input
                                ref={postImageInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handlePostImageUpload}
                                aria-label="Upload post images"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => postImageInputRef.current?.click()}
                                className="gap-2"
                              >
                                <Camera className="h-4 w-4" />
                                Photo
                              </Button>
                              <Button variant="ghost" size="sm" className="gap-2">
                                <Video className="h-4 w-4" />
                                Video
                              </Button>
                              {/* Visibility Selector */}
                              <select
                                value={postVisibility}
                                onChange={(e) =>
                                  setPostVisibility(
                                    e.target.value as "public" | "connections" | "private"
                                  )
                                }
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                aria-label="Post visibility"
                              >
                                <option value="public">🌍 Public</option>
                                <option value="connections">👥 Connections</option>
                                <option value="private">🔒 Company Only</option>
                              </select>
                            </div>
                            <StandardButton
                              onClick={handleCreatePost}
                              disabled={!postContent.trim() || postingInProgress}
                              className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
                            >
                              {postingInProgress ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Post
                            </StandardButton>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Activity Notifications Section - like Facebook */}
                {isOwnProfile && <ActivityNotificationsWidget />}

                {/* Featured Jobs Section */}
                <FeaturedJobsSection
                  userId={member.userId || member.id}
                  isOwnProfile={isOwnProfile}
                />

                {/* Connections Widget */}
                {isOwnProfile && (
                  <ConnectionsWidget
                    userId={member.userId || member.id}
                    isOwnProfile={isOwnProfile}
                  />
                )}

                {/* Posts Feed */}
                {posts.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <MessageCircle className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                      <h3 className="mb-2 text-lg font-semibold text-slate-900">No updates yet</h3>
                      <p className="mb-4 text-slate-600">
                        {isOwnProfile
                          ? "Share your first job update, project completion, or company news!"
                          : "This contractor hasn't posted any updates yet."}
                      </p>
                      {isOwnProfile && (
                        <StandardButton
                          onClick={() => setShowPostComposer(true)}
                          className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create Your First Post
                        </StandardButton>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <Card key={post.id}>
                        <CardContent className="p-4">
                          <div className="mb-3 flex items-center gap-3">
                            <div className="h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
                              {member.avatar ? (
                                <img
                                  src={member.avatar}
                                  alt={displayName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                                  {initials}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{displayName}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                {post.visibility === "connections" && (
                                  <span className="flex items-center gap-0.5 text-blue-600">
                                    <Users2 className="h-3 w-3" /> Connections
                                  </span>
                                )}
                                {post.visibility === "private" && (
                                  <span className="flex items-center gap-0.5 text-amber-600">
                                    <Lock className="h-3 w-3" /> Company Only
                                  </span>
                                )}
                                {(post.visibility === "public" || !post.visibility) && (
                                  <span className="flex items-center gap-0.5 text-green-600">
                                    <Globe className="h-3 w-3" /> Public
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="mb-4 text-slate-700">{post.content}</p>
                          {post.mediaUrls && post.mediaUrls.length > 0 && (
                            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {post.mediaUrls.slice(0, 6).map((url, i) => (
                                <div key={i} className="aspect-square overflow-hidden rounded-lg">
                                  <img
                                    src={url}
                                    alt={`Media ${i + 1}`}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-4 border-t pt-3 text-sm text-slate-500">
                            <button className="flex items-center gap-1 hover:text-red-500">
                              <Heart className="h-4 w-4" />
                              {post.likes}
                            </button>
                            <button className="flex items-center gap-1 hover:text-blue-500">
                              <MessageCircle className="h-4 w-4" />
                              {post.comments}
                            </button>
                            <button className="flex items-center gap-1 hover:text-green-500">
                              <Share2 className="h-4 w-4" />
                              Share
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Photos Tab - Enhanced */}
              <TabsContent value="photos" className="space-y-6">
                <EnhancedPhotosTab
                  photos={[
                    // Profile & cover photos with proper categories
                    ...(avatarUrl
                      ? [
                          {
                            id: "profile-avatar",
                            url: avatarUrl,
                            title: "Profile Photo",
                            category: "Profile Photo",
                            createdAt: new Date().toISOString(),
                          },
                        ]
                      : []),
                    ...(coverUrl
                      ? [
                          {
                            id: "profile-cover",
                            url: coverUrl,
                            title: "Cover Photo",
                            category: "Cover Photo",
                            createdAt: new Date().toISOString(),
                          },
                        ]
                      : []),
                    // Portfolio photos
                    ...portfolioPhotos.map((url, i) => {
                      const parentProject =
                        portfolio.find((p) => p.imageUrls.includes(url)) || portfolio[0];
                      return {
                        id: `photo-${i}`,
                        url,
                        title: parentProject?.title,
                        category: parentProject?.category || "Job Photos",
                        createdAt: new Date().toISOString(),
                      };
                    }),
                  ]}
                  portfolio={portfolio}
                  isOwnProfile={isOwnProfile}
                />
              </TabsContent>

              {/* Videos Tab - Enhanced */}
              <TabsContent value="videos" className="space-y-6">
                <EnhancedVideosTab
                  userId=""
                  videos={allVideos.map((project, i) => ({
                    id: project.id || `video-${i}`,
                    url: project.videoUrl!,
                    title: project.title,
                    description: project.description || undefined,
                    thumbnail: project.imageUrls?.[0],
                    duration: undefined,
                    views: 0,
                    createdAt: new Date().toISOString(),
                  }))}
                  isOwnProfile={isOwnProfile}
                />
              </TabsContent>

              {/* Reviews Tab - Enhanced */}
              <TabsContent value="reviews" className="space-y-6">
                <EnhancedReviewsTab
                  userId={member.userId || member.id}
                  reviews={reviews.map((review) => ({
                    id: review.id,
                    authorName: review.authorName,
                    authorAvatar: undefined,
                    rating: review.rating,
                    title: review.title || undefined,
                    content: review.content || undefined,
                    photos: [],
                    isVerified: review.isVerified,
                    helpful: 0,
                    createdAt: String(review.createdAt),
                  }))}
                  averageRating={averageRating}
                  isOwnProfile={isOwnProfile}
                />
              </TabsContent>

              {/* Connections Tab */}
              <TabsContent value="connections" className="space-y-6">
                <ConnectionsTab isOwnProfile={isOwnProfile} memberId={member.id} />
              </TabsContent>

              {/* About Tab - Enhanced */}
              <TabsContent value="about" className="space-y-6">
                <EnhancedAboutTab member={member} isOwnProfile={isOwnProfile} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right column: Activity Feed Sidebar */}
          {isOwnProfile && (
            <aside className="hidden lg:block">
              <RecentActivityFeed />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
