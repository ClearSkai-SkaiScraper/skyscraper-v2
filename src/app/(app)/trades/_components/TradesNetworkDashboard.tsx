"use client";

import {
  Briefcase,
  Building2,
  Camera,
  ChevronDown,
  FileText,
  Globe,
  Loader2,
  Lock,
  Maximize2,
  MessageCircle,
  Minimize2,
  MoreHorizontal,
  Repeat2,
  Search,
  Send,
  ShoppingCart,
  Sparkles,
  ThumbsUp,
  TrendingUp,
  UserPlus,
  Users,
  Verified,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import UnifiedNotificationBell from "@/components/notifications/UnifiedNotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

/* ------------------------------------------------------------------ */
/*  Visibility options                                                 */
/* ------------------------------------------------------------------ */
type PostVisibility = "anyone" | "company" | "connections" | "public";

const VISIBILITY_OPTIONS: {
  value: PostVisibility;
  label: string;
  description: string;
  icon: typeof Globe;
}[] = [
  { value: "anyone", label: "Only Me", description: "Only you can see this post", icon: Lock },
  {
    value: "company",
    label: "Company",
    description: "Your company members can see this",
    icon: Building2,
  },
  {
    value: "connections",
    label: "Connections",
    description: "Your company & connections can see this",
    icon: Users,
  },
  {
    value: "public",
    label: "Public",
    description: "Anyone on the platform can see this",
    icon: Globe,
  },
];

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface DashboardProps {
  userProfile: {
    id: string;
    companyId?: string | null;
    companyName: string;
    avatarUrl: string | null;
    coverPhotoUrl?: string | null;
  } | null;
  stats: {
    totalProfiles: number;
    verifiedCompanies: number;
  };
}

interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorLogo: string | null;
  authorTitle: string;
  authorVerified: boolean;
  content: string;
  imageUrl: string | null;
  postType: "update" | "job_post" | "project_showcase" | "article" | "milestone";
  likes: number;
  comments: number;
  shares: number;
  timeAgo: string;
  hasLiked: boolean;
}

interface SuggestedConnection {
  id: string;
  name: string;
  title: string;
  avatar: string | null;
  isVerified: boolean;
  mutualConnections: number;
  specialties: string[];
}

interface TrendingTopic {
  id: string;
  topic: string;
  posts: number;
  category: string;
}

/* ------------------------------------------------------------------ */
/*  Demo Data Removed — Feed loads from API                            */
/* ------------------------------------------------------------------ */
const INITIAL_FEED: FeedPost[] = [];

const INITIAL_CONNECTIONS: SuggestedConnection[] = [];

const INITIAL_TRENDING: TrendingTopic[] = [];

/* ------------------------------------------------------------------ */
/*  Main Dashboard — Full Social Media Hub                             */
/* ------------------------------------------------------------------ */
export default function TradesNetworkDashboard({ userProfile, stats }: DashboardProps) {
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>(INITIAL_FEED);
  const [suggestedConnections, setSuggestedConnections] =
    useState<SuggestedConnection[]>(INITIAL_CONNECTIONS);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>(INITIAL_TRENDING);
  const [feedLoading, setFeedLoading] = useState(true);
  const [connections, setConnections] = useState({ total: 0, pending: 0, accepted: 0 });
  const [isFullView, setIsFullView] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("feed");

  // ── Inline Post Composer State ──
  const [showComposer, setShowComposer] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postType, setPostType] = useState<FeedPost["postType"]>("update");
  const [postVisibility, setPostVisibility] = useState<PostVisibility>("public");
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postAs, setPostAs] = useState<"company" | "personal">(
    userProfile?.companyId ? "company" : "personal"
  );
  const [showPostAsMenu, setShowPostAsMenu] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Determine if user is admin (can post as company)
  const isAdmin = true; // The page.tsx already only shows this for authed users with company access

  // ── Full Search State ──
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SuggestedConnection[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  /* -- Fetch real data on mount ------------------------------ */
  useEffect(() => {
    async function loadData() {
      try {
        // Load connections
        const connRes = await fetch("/api/connections/received");
        if (connRes.ok) {
          const data = await connRes.json();
          const received = data.received || [];
          setConnections({
            total: received.length,
            pending: received.filter(
              (c: { status: string }) => c.status === "pending" || c.status === "PENDING"
            ).length,
            accepted: received.filter(
              (c: { status: string }) =>
                c.status === "accepted" || c.status === "ACCEPTED" || c.status === "connected"
            ).length,
          });
        }

        // Load real feed posts
        const feedRes = await fetch("/api/trades/feed?limit=20");
        if (feedRes.ok) {
          const data = await feedRes.json();
          if (data.posts && data.posts.length > 0) {
            setFeedPosts(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data.posts.map((p: any) => ({
                id: p.id,
                authorId: p.profileId,
                authorName: p.authorName || "Unknown",
                authorLogo: p.authorLogo,
                authorTitle: p.authorTitle || "",
                authorVerified: p.authorVerified || false,
                content: p.content,
                imageUrl: p.images?.[0] || null,
                postType: p.type || "update",
                likes: p.likes || 0,
                comments: p.comments || 0,
                shares: p.shares || 0,
                timeAgo: getTimeAgo(new Date(p.createdAt)),
                hasLiked: false,
              }))
            );
          }
        }
        setFeedLoading(false);

        // Load suggested connections
        try {
          const sugRes = await fetch("/api/trades/suggested-connections?limit=5");
          if (sugRes.ok) {
            const sugData = await sugRes.json();
            if (sugData.connections && sugData.connections.length > 0) {
              setSuggestedConnections(sugData.connections);
            }
          }
        } catch {
          /* silent */
        }

        // Load trending topics
        try {
          const trendRes = await fetch("/api/trades/trending?limit=5");
          if (trendRes.ok) {
            const trendData = await trendRes.json();
            if (trendData.topics && trendData.topics.length > 0) {
              setTrendingTopics(trendData.topics);
            }
          }
        } catch {
          /* silent */
        }
      } catch {
        /* silent */
      }
    }
    void loadData();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setShowSearchResults(true);
    setSearchLoading(true);
    try {
      const res = await fetch(
        `/api/trades/suggested-connections?q=${encodeURIComponent(searchQuery.trim())}&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.connections || []);
      }
    } catch {
      /* silent */
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setShowSearchResults(false);
    setSearchResults([]);
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() || submitting) return;
    setSubmitting(true);
    setPostError(null);
    try {
      const res = await fetch("/api/trades/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: postContent.trim(),
          type: postType,
          visibility: postVisibility,
          postAs: postAs,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Failed to create post" }));
        setPostError(errData.error || `Failed to create post (${res.status})`);
        return;
      }
      const data = await res.json();
      const newPost: FeedPost = {
        id: data.post?.id || Date.now().toString(),
        authorId: userProfile?.id || "",
        authorName:
          postAs === "company"
            ? userProfile?.companyName || "Your Company"
            : data.post?.authorName || "You",
        authorLogo: userProfile?.avatarUrl || null,
        authorTitle: "Professional Contractor",
        authorVerified: true,
        content: postContent.trim(),
        imageUrl: null,
        postType: postType,
        likes: 0,
        comments: 0,
        shares: 0,
        timeAgo: "Just now",
        hasLiked: false,
      };
      setFeedPosts((prev) => [newPost, ...prev]);
      setPostContent("");
      setPostType("update");
      setShowComposer(false);
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Network error — check your connection");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
    // Optimistic update
    setFeedPosts((posts) =>
      posts.map((p) =>
        p.id === postId
          ? { ...p, hasLiked: !p.hasLiked, likes: p.hasLiked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
    // Persist to backend
    try {
      await fetch("/api/trades/feed/engage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, action: "like" }),
      });
    } catch {
      // Revert on error
      setFeedPosts((posts) =>
        posts.map((p) =>
          p.id === postId
            ? { ...p, hasLiked: !p.hasLiked, likes: p.hasLiked ? p.likes - 1 : p.likes + 1 }
            : p
        )
      );
    }
  };

  return (
    <main
      className={`min-h-screen bg-slate-100 dark:bg-slate-950 ${
        isFullView ? "fixed inset-0 z-[100] overflow-y-auto" : ""
      }`}
    >
      {/* ── TOP NAVIGATION BAR ── */}
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          {/* Logo & Title */}
          <Link href="/trades" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <Users className="h-5 w-5 text-white" />
            </div>
            <span className="hidden font-bold text-slate-900 dark:text-white sm:inline">
              Network Hub
            </span>
          </Link>

          {/* Full View Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullView(!isFullView)}
            className="gap-1.5 text-xs text-slate-500 hover:text-slate-700"
            title={isFullView ? "Exit full view" : "Expand to full view"}
          >
            {isFullView ? (
              <>
                <Minimize2 className="h-4 w-4" />
                <span className="hidden sm:inline">Exit Full View</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" />
                <span className="hidden sm:inline">Full View</span>
              </>
            )}
          </Button>

          {/* Search */}
          <div className="flex max-w-md flex-1">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search pros, vendors, jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-9 w-full rounded-full bg-slate-100 pl-9 text-sm dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <Link href="/trades/messages">
              <Button variant="ghost" size="icon" className="relative" aria-label="Messages">
                <MessageCircle className="h-5 w-5" />
              </Button>
            </Link>
            <UnifiedNotificationBell variant="pro" />
            {userProfile && (
              <Link href="/trades/profile">
                <Avatar className="h-8 w-8 cursor-pointer border-2 border-transparent hover:border-blue-500">
                  <AvatarImage src={userProfile.avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-sm text-white">
                    {userProfile.companyName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="grid gap-4 lg:grid-cols-4">
          {/* ─── LEFT SIDEBAR ─── */}
          <div className="hidden space-y-4 lg:block">
            {/* Profile Card */}
            <Card className="overflow-hidden rounded-xl">
              <div className="relative h-20 rounded-t-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700">
                {userProfile?.coverPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={userProfile.coverPhotoUrl}
                    alt="Cover"
                    className="absolute inset-0 h-full w-full rounded-t-xl object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 rounded-t-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700" />
                )}
              </div>
              <CardContent className="relative px-4 pb-4 pt-0">
                <div className="-mt-10">
                  <Avatar className="h-16 w-16 shadow-xl">
                    <AvatarImage src={userProfile?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-xl font-bold text-white">
                      {userProfile?.companyName?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <h3 className="mt-2 font-bold text-slate-900 dark:text-white">
                  {userProfile?.companyName || "Your Company"}
                </h3>
                <p className="text-xs text-slate-500">Professional Contractor</p>

                <div className="mt-3 border-t pt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Profile views</span>
                    <span className="font-semibold text-blue-600">—</span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs">
                    <span className="text-slate-500">Connections</span>
                    <span className="font-semibold text-blue-600">{connections.accepted}</span>
                  </div>
                </div>

                <Link href="/trades/profile" className="mt-3 block">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    View Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardContent className="p-3">
                <div className="space-y-1">
                  <Link
                    href="/trades/jobs"
                    className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Briefcase className="h-4 w-4 text-slate-500" />
                    <span>Job Board</span>
                  </Link>
                  <Link
                    href="/trades/groups"
                    className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Users className="h-4 w-4 text-slate-500" />
                    <span>Groups</span>
                  </Link>
                  <Link
                    href="/vendor-network"
                    className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Building2 className="h-4 w-4 text-slate-500" />
                    <span>Vendor Network</span>
                  </Link>
                  <Link
                    href="/trades/orders"
                    className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ShoppingCart className="h-4 w-4 text-slate-500" />
                    <span>Orders & Materials</span>
                  </Link>
                  <Link
                    href="/trades/portfolio/upload"
                    className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Camera className="h-4 w-4 text-slate-500" />
                    <span>My Portfolio</span>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── MAIN FEED ─── */}
          <div className="space-y-4 lg:col-span-2">
            {/* ── Full Search Results Overlay ── */}
            {showSearchResults && (
              <Card className="border-2 border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Search className="h-5 w-5 text-blue-600" />
                      Search results for &ldquo;{searchQuery}&rdquo;
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClearSearch}
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {searchLoading ? (
                    <div className="flex flex-col items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <p className="mt-2 text-sm text-slate-500">Searching the network…</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="py-8 text-center">
                      <Search className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                      <p className="font-medium text-slate-600">No results found</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Try a different search term or browse the{" "}
                        <Link href="/vendor-network" className="text-blue-600 hover:underline">
                          Vendor Network
                        </Link>
                      </p>
                    </div>
                  ) : (
                    searchResults.map((conn) => (
                      <div
                        key={conn.id}
                        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={conn.avatar || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                            {conn.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="truncate font-semibold">{conn.name}</p>
                            {conn.isVerified && <Verified className="h-3.5 w-3.5 text-blue-500" />}
                          </div>
                          <p className="truncate text-sm text-slate-500">{conn.title}</p>
                          <p className="text-xs text-slate-400">
                            {conn.mutualConnections} mutual connections
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
                          <UserPlus className="h-3.5 w-3.5" />
                          Connect
                        </Button>
                      </div>
                    ))
                  )}
                  {searchResults.length > 0 && (
                    <div className="pt-2 text-center">
                      <Link href={`/vendor-network?q=${encodeURIComponent(searchQuery)}`}>
                        <Button variant="ghost" size="sm" className="text-xs text-blue-600">
                          View all in Vendor Network →
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Create Post Card — Inline Composer */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userProfile?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                      {userProfile?.companyName?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!showComposer ? (
                    <button
                      className="flex h-10 flex-1 cursor-pointer items-center rounded-full bg-slate-100 px-4 text-left text-sm text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                      onClick={() => {
                        setShowComposer(true);
                        setTimeout(() => composerRef.current?.focus(), 100);
                      }}
                    >
                      Share an update, project, or job posting...
                    </button>
                  ) : (
                    <div className="flex-1 space-y-3">
                      {/* Visibility Selector */}
                      <div className="relative">
                        <button
                          onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
                          className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          {(() => {
                            const opt = VISIBILITY_OPTIONS.find((o) => o.value === postVisibility);
                            const Icon = opt?.icon || Globe;
                            return (
                              <>
                                <Icon className="h-3 w-3" />
                                {opt?.label}
                                <ChevronDown className="h-3 w-3" />
                              </>
                            );
                          })()}
                        </button>
                        {showVisibilityMenu && (
                          <div className="absolute left-0 top-8 z-50 w-64 rounded-lg border bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                            {VISIBILITY_OPTIONS.map((opt) => {
                              const Icon = opt.icon;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => {
                                    setPostVisibility(opt.value);
                                    setShowVisibilityMenu(false);
                                  }}
                                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${
                                    postVisibility === opt.value
                                      ? "bg-blue-50 dark:bg-blue-900/20"
                                      : ""
                                  }`}
                                >
                                  <Icon className="h-4 w-4 text-slate-500" />
                                  <div>
                                    <p className="text-sm font-medium">{opt.label}</p>
                                    <p className="text-xs text-slate-400">{opt.description}</p>
                                  </div>
                                  {postVisibility === opt.value && (
                                    <span className="ml-auto text-blue-600">✓</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Post-As Identity Switcher */}
                      {isAdmin && userProfile?.companyId && (
                        <div className="relative">
                          <button
                            onClick={() => setShowPostAsMenu(!showPostAsMenu)}
                            className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
                          >
                            {postAs === "company" ? (
                              <>
                                <Building2 className="h-3 w-3" />
                                Posting as {userProfile.companyName}
                              </>
                            ) : (
                              <>
                                <Users className="h-3 w-3" />
                                Posting as You
                              </>
                            )}
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          {showPostAsMenu && (
                            <div className="absolute left-0 top-8 z-50 w-64 rounded-lg border bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                              <button
                                onClick={() => {
                                  setPostAs("company");
                                  setShowPostAsMenu(false);
                                }}
                                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${postAs === "company" ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={userProfile.avatarUrl || undefined} />
                                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-sm text-white">
                                    {userProfile.companyName?.charAt(0) || "C"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{userProfile.companyName}</p>
                                  <p className="text-xs text-slate-400">
                                    Post as your company page
                                  </p>
                                </div>
                                {postAs === "company" && (
                                  <span className="ml-auto text-blue-600">✓</span>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setPostAs("personal");
                                  setShowPostAsMenu(false);
                                }}
                                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${postAs === "personal" ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-600 text-sm text-white">
                                    You
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">Personal Account</p>
                                  <p className="text-xs text-slate-400">Post as yourself</p>
                                </div>
                                {postAs === "personal" && (
                                  <span className="ml-auto text-blue-600">✓</span>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Post Error Display */}
                      {postError && (
                        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                          <X className="h-4 w-4 shrink-0" />
                          <span>{postError}</span>
                          <button
                            onClick={() => setPostError(null)}
                            className="ml-auto text-red-400 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      {/* Textarea */}
                      <Textarea
                        ref={composerRef}
                        placeholder="Share an update, project showcase, or job posting..."
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                            e.preventDefault();
                            void handleCreatePost();
                          }
                        }}
                        className="min-h-[100px] resize-none"
                      />

                      {/* Post Type Selector */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {(
                            [
                              {
                                type: "update" as const,
                                label: "Update",
                                icon: Sparkles,
                                color: "text-slate-500",
                              },
                              {
                                type: "project_showcase" as const,
                                label: "Project",
                                icon: Camera,
                                color: "text-green-600",
                              },
                              {
                                type: "job_post" as const,
                                label: "Job",
                                icon: Briefcase,
                                color: "text-blue-600",
                              },
                              {
                                type: "article" as const,
                                label: "Article",
                                icon: FileText,
                                color: "text-amber-600",
                              },
                            ] as const
                          ).map(({ type, label, icon: TypeIcon, color }) => (
                            <Button
                              key={type}
                              variant={postType === type ? "default" : "ghost"}
                              size="sm"
                              className={`gap-1.5 text-xs ${postType !== type ? color : ""}`}
                              onClick={() => setPostType(type)}
                            >
                              <TypeIcon className="h-3.5 w-3.5" />
                              {label}
                            </Button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowComposer(false);
                              setPostContent("");
                              setPostType("update");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleCreatePost}
                            disabled={submitting || !postContent.trim()}
                          >
                            {submitting ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="mr-2 h-4 w-4" />
                            )}
                            {submitting ? "Posting…" : "Post"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {!showComposer && (
                  <div className="mt-3 flex justify-around border-t pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-xs text-slate-600"
                      onClick={() => {
                        setPostType("project_showcase");
                        setShowComposer(true);
                        setTimeout(() => composerRef.current?.focus(), 100);
                      }}
                    >
                      <Camera className="h-4 w-4 text-green-600" />
                      Project
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-xs text-slate-600"
                      onClick={() => {
                        setPostType("job_post");
                        setShowComposer(true);
                        setTimeout(() => composerRef.current?.focus(), 100);
                      }}
                    >
                      <Briefcase className="h-4 w-4 text-blue-600" />
                      Job Post
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-xs text-slate-600"
                      onClick={() => {
                        setPostType("article");
                        setShowComposer(true);
                        setTimeout(() => composerRef.current?.focus(), 100);
                      }}
                    >
                      <FileText className="h-4 w-4 text-amber-600" />
                      Article
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feed Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 rounded-xl bg-white p-1 shadow-sm dark:bg-slate-800">
                <TabsTrigger value="feed" className="gap-2 rounded-lg text-xs">
                  <Sparkles className="h-4 w-4" />
                  For You
                </TabsTrigger>
                <TabsTrigger value="following" className="gap-2 rounded-lg text-xs">
                  <Users className="h-4 w-4" />
                  Following
                </TabsTrigger>
                <TabsTrigger value="jobs" className="gap-2 rounded-lg text-xs">
                  <Briefcase className="h-4 w-4" />
                  Jobs
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Feed Posts */}
            <div className="space-y-4">
              {feedLoading ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <p className="mt-3 text-sm text-slate-500">Loading feed…</p>
                  </CardContent>
                </Card>
              ) : feedPosts.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Sparkles className="mb-3 h-10 w-10 text-blue-400" />
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      Your feed is empty
                    </h3>
                    <p className="mt-1 max-w-xs text-sm text-slate-500">
                      Share your first project update, post a job, or connect with other trades
                      professionals to populate your feed.
                    </p>
                    <Button
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setShowComposer(true);
                        setTimeout(() => composerRef.current?.focus(), 100);
                      }}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Create First Post
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                feedPosts.map((post) => (
                  <FeedPostCard key={post.id} post={post} onLike={() => handleLike(post.id)} />
                ))
              )}
            </div>
          </div>

          {/* ─── RIGHT SIDEBAR ─── */}
          <div className="hidden space-y-4 lg:block">
            {/* Pending Connections Alert */}
            {connections.pending > 0 && (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-900/40">
                      <UserPlus className="h-5 w-5 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        {connections.pending} pending
                      </p>
                      <p className="text-xs text-amber-700">Connection requests</p>
                    </div>
                    <Link href="/invitations">
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                        View
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Suggested Connections */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">People you may know</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestedConnections.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">
                    No suggestions yet — grow your network to see matches.
                  </p>
                ) : (
                  suggestedConnections.map((conn) => (
                    <div key={conn.id} className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conn.avatar || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 text-sm text-white">
                          {conn.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-sm font-semibold">{conn.name}</p>
                          {conn.isVerified && <Verified className="h-3.5 w-3.5 text-blue-500" />}
                        </div>
                        <p className="truncate text-xs text-slate-500">{conn.title}</p>
                        <p className="text-xs text-slate-400">
                          {conn.mutualConnections} mutual connections
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="h-8 text-xs">
                        Connect
                      </Button>
                    </div>
                  ))
                )}
                <Link href="/trades">
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    View all recommendations
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Trending */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Trending in Trades
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {trendingTopics.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">
                    No trending topics yet — start posting to spark the conversation.
                  </p>
                ) : (
                  trendingTopics.map((topic) => (
                    <Link
                      key={topic.id}
                      href={`/trades/feed?tag=${topic.topic.slice(1)}`}
                      className="block rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <p className="text-sm font-semibold text-blue-600">{topic.topic}</p>
                      <p className="text-xs text-slate-500">
                        {topic.posts} posts • {topic.category}
                      </p>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Network Stats */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                    <p className="text-2xl font-bold text-blue-600">
                      {(stats?.totalProfiles ?? 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">Professionals</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                    <p className="text-2xl font-bold text-green-600">
                      {stats?.verifiedCompanies ?? 0}
                    </p>
                    <p className="text-xs text-slate-500">Verified</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Footer Links */}
            <div className="text-xs text-slate-400">
              <div className="flex flex-wrap gap-2">
                <Link href="/about" className="hover:underline">
                  About
                </Link>
                <span>•</span>
                <Link href="/help/knowledge-base" className="hover:underline">
                  Help
                </Link>
                <span>•</span>
                <Link href="/legal/privacy" className="hover:underline">
                  Privacy
                </Link>
                <span>•</span>
                <Link href="/legal/terms" className="hover:underline">
                  Terms
                </Link>
              </div>
              <p className="mt-2">© 2026 SkaiScraper Trades Network</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Feed Post Card Component                                           */
/* ------------------------------------------------------------------ */
function FeedPostCard({ post, onLike }: { post: FeedPost; onLike: () => void }) {
  const [showComments, setShowComments] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Post Header */}
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={post.authorLogo || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-lg text-white">
                {post.authorName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/trades/companies/${post.authorId}`}
                  className="font-semibold hover:underline"
                >
                  {post.authorName}
                </Link>
                {post.authorVerified && <Verified className="h-4 w-4 text-blue-500" />}
              </div>
              <p className="text-xs text-slate-500">{post.authorTitle}</p>
              <p className="text-xs text-slate-400">{post.timeAgo}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Post options">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Post Type Badge */}
        {post.postType !== "update" && (
          <div className="mt-3">
            <Badge
              variant="secondary"
              className={
                post.postType === "job_post"
                  ? "bg-blue-100 text-blue-700"
                  : post.postType === "project_showcase"
                    ? "bg-green-100 text-green-700"
                    : post.postType === "milestone"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-purple-100 text-purple-700"
              }
            >
              {post.postType === "job_post" && "🔧 Hiring"}
              {post.postType === "project_showcase" && "📸 Project Showcase"}
              {post.postType === "milestone" && "🏆 Milestone"}
              {post.postType === "article" && "📝 Article"}
            </Badge>
          </div>
        )}

        {/* Post Content */}
        <div className="mt-3">
          <p className="whitespace-pre-line text-sm text-slate-800 dark:text-slate-200">
            {post.content}
          </p>
        </div>

        {/* Post Image */}
        {post.imageUrl && (
          <div className="relative -mx-4 mt-3 aspect-video overflow-hidden">
            <Image src={post.imageUrl} alt="Post image" fill className="object-cover" />
          </div>
        )}

        {/* Engagement Stats */}
        <div className="mt-3 flex items-center justify-between border-b pb-3 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500">
              <ThumbsUp className="h-2.5 w-2.5 text-white" />
            </span>
            <span>{post.likes}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowComments(!showComments)} className="hover:underline">
              {post.comments} comments
            </button>
            <span>{post.shares} shares</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-2 flex justify-around">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            className={`gap-2 text-xs ${post.hasLiked ? "text-blue-600" : "text-slate-600"}`}
          >
            <ThumbsUp className={`h-4 w-4 ${post.hasLiked ? "fill-current" : ""}`} />
            Like
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="gap-2 text-xs text-slate-600"
          >
            <MessageCircle className="h-4 w-4" />
            Comment
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 text-xs text-slate-600">
            <Repeat2 className="h-4 w-4" />
            Repost
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-xs text-slate-600"
            onClick={async () => {
              const postUrl = `${window.location.origin}/trades`;
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: `${post.authorName} on SkaiScraper`,
                    text: post.content.substring(0, 100),
                    url: postUrl,
                  });
                } catch {
                  /* user cancelled */
                }
              } else {
                try {
                  await navigator.clipboard.writeText(postUrl);
                  alert("Link copied to clipboard!");
                } catch {
                  /* fallback */
                }
              }
            }}
          >
            <Send className="h-4 w-4" />
            Share
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-3 border-t pt-3">
            <div className="flex gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-slate-200 text-xs">You</AvatarFallback>
              </Avatar>
              <Input
                placeholder="Add a comment..."
                className="h-8 flex-1 rounded-full bg-slate-100 text-sm"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper Functions                                                   */
/* ------------------------------------------------------------------ */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}
