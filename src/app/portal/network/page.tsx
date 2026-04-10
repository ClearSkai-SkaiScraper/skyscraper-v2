"use client";

import { useUser } from "@clerk/nextjs";
import {
  AlertCircle,
  Briefcase,
  CheckCircle,
  ChevronDown,
  Filter,
  Globe,
  Hash,
  Heart,
  Image as ImageIcon,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  PenSquare,
  Plus,
  Search,
  Send,
  Share2,
  Star,
  ThumbsUp,
  TrendingUp,
  UserPlus,
  Users,
  Verified,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

/* ------------------------------------------------------------------ */
/*  Visibility options                                                 */
/* ------------------------------------------------------------------ */
type PostVisibility = "anyone" | "connections" | "public";

const VISIBILITY_OPTIONS: {
  value: PostVisibility;
  label: string;
  description: string;
  icon: typeof Globe;
}[] = [
  { value: "anyone", label: "Only Me", description: "Only you can see this post", icon: Lock },
  {
    value: "connections",
    label: "Connections",
    description: "Your connections can see this",
    icon: Users,
  },
  {
    value: "public",
    label: "Public",
    description: "Anyone on the platform can see this",
    icon: Globe,
  },
];

/**
 * 🌐 COMMUNITY HUB - Social Network for Homeowners
 *
 * PRODUCTION-READY: Fetches real data from APIs
 * - Clients can post reviews that appear in the feed
 * - Clients can connect with each other
 * - Browse and search for trusted pros
 * - See what companies are doing great work
 * - Filter by trade, location, ratings
 * - Create community groups
 * - Content moderation for safe community
 */

// Types
interface FeedPost {
  id: string;
  type: "review" | "recommendation" | "question" | "update" | "project_complete";
  author: {
    id: string;
    name: string;
    avatar: string | null;
    location: string | null;
  };
  content: string;
  images?: string[];
  contractor?: {
    id: string;
    slug?: string | null;
    name: string;
    trade: string;
    rating: number;
    verified: boolean;
    logo: string | null;
  };
  rating?: number;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  createdAt: string;
  projectType?: string;
}

interface TrendingPro {
  id: string;
  slug?: string | null;
  name: string;
  trade: string;
  rating: number;
  reviewCount: number;
  recentReviews: number;
  verified: boolean;
  logo: string | null;
  location: string | null;
}

interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  image: string | null;
  category: string;
}

// Trade filter options from config
const TRADE_FILTERS = [
  "All Trades",
  "Roofing",
  "General Contracting",
  "Electrical",
  "Plumbing",
  "HVAC",
  "Painting",
  "Flooring",
  "Landscaping",
  "Smart Home & Technology",
  "Security Systems",
  "Pool Contractor",
  "Pest Control",
];

export default function CommunityHubPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("feed");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [trendingPros, setTrendingPros] = useState<TrendingPro[]>([]);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Profile avatar from DB (uploaded photo) ──
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfileAvatar() {
      try {
        const res = await fetch("/api/portal/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.profile?.avatarUrl) {
            setProfileAvatar(data.profile.avatarUrl);
          }
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_e) {
        // Silently fall back to Clerk avatar
      }
    }
    void fetchProfileAvatar();
  }, []);

  // Resolved avatar: prefer DB uploaded photo, fall back to Clerk
  const resolvedAvatar = profileAvatar || user?.imageUrl || undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tradeFilter, setTradeFilter] = useState("All Trades");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contentWarning, setContentWarning] = useState<string | null>(null);

  // ── Search state ──
  const [showSearchResults, setShowSearchResults] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [postVisibility, setPostVisibility] = useState<PostVisibility>("public");
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

  // @mention state for tagging pros
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState<
    Array<{ id: string; name: string; trade?: string; avatar?: string | null }>
  >([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const mentionAnchorRef = useRef<number>(0);

  const searchMentions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setMentionSuggestions([]);
      return;
    }
    setMentionLoading(true);
    try {
      const res = await fetch(
        `/api/portal/community/trending?search=${encodeURIComponent(query)}&limit=5`
      );
      if (res.ok) {
        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const suggestions = (data.pros || []).slice(0, 5).map((p: any) => ({
          id: p.id,
          name: p.name || p.companyName || "Pro",
          trade: p.trade,
          avatar: p.logo,
        }));
        setMentionSuggestions(suggestions);
      }
    } catch {
      // Silently fail
    } finally {
      setMentionLoading(false);
    }
  }, []);

  const handlePostContentChange = (value: string, cursorPos?: number) => {
    setNewPostContent(value);
    const cursor = cursorPos ?? value.length;
    const textBeforeCursor = value.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex >= 0 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === " ")) {
      const query = textBeforeCursor.slice(atIndex + 1);
      if (!query.includes(" ") && query.length >= 1) {
        setShowMentions(true);
        setMentionSearch(query);
        mentionAnchorRef.current = atIndex;
        void searchMentions(query);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (suggestion: { id: string; name: string }) => {
    const before = newPostContent.slice(0, mentionAnchorRef.current);
    const cursorPos = composerRef.current?.selectionStart || newPostContent.length;
    const after = newPostContent.slice(cursorPos);
    const mention = `@${suggestion.name} `;
    setNewPostContent(before + mention + after);
    setShowMentions(false);
    setMentionSearch("");
    setTimeout(() => {
      composerRef.current?.focus();
      const newPos = before.length + mention.length;
      composerRef.current?.setSelectionRange(newPos, newPos);
    }, 50);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setShowSearchResults(true);
    }
  };
  const [pendingInvitations, setPendingInvitations] = useState<
    Array<{
      id: string;
      companyName: string;
      companyLogo?: string;
      trade: string;
      invitedBy: string;
      message?: string;
      createdAt: string;
    }>
  >([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  const fetchInvitations = useCallback(async () => {
    try {
      setLoadingInvitations(true);
      const res = await fetch("/api/portal/invitations");
      if (res.ok) {
        const data = await res.json();
        setPendingInvitations(data.invitations || []);
      }
    } catch (error) {
      logger.error("Failed to fetch invitations:", error);
    } finally {
      setLoadingInvitations(false);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      setLoadingPosts(true);
      const params = new URLSearchParams();
      if (tradeFilter !== "All Trades") params.set("trade", tradeFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/portal/community/feed?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      logger.error("Failed to fetch posts:", error);
    } finally {
      setLoadingPosts(false);
    }
  }, [tradeFilter, searchQuery]);

  const fetchTrendingPros = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (tradeFilter !== "All Trades") params.set("trade", tradeFilter);
      params.set("limit", "10");

      const res = await fetch(`/api/portal/community/trending?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTrendingPros(data.pros || []);
      }
    } catch (error) {
      logger.error("Failed to fetch trending pros:", error);
    }
  }, [tradeFilter]);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/community/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      logger.error("Failed to fetch groups:", error);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPosts(), fetchTrendingPros(), fetchGroups(), fetchInvitations()]);
    setLoading(false);
  }, [fetchPosts, fetchTrendingPros, fetchGroups, fetchInvitations]);

  // Fetch data on mount
  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData]);

  // Refetch when trade filter changes
  useEffect(() => {
    if (!loading) {
      void fetchPosts();
      void fetchTrendingPros();
    }
  }, [tradeFilter, loading, fetchPosts, fetchTrendingPros]);

  // Content moderation check
  const checkContent = useCallback(async (content: string) => {
    if (!content.trim()) {
      setContentWarning(null);
      return;
    }

    try {
      const res = await fetch("/api/portal/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, quickCheckOnly: true }),
      });

      if (res.ok) {
        const data = await res.json();
        setContentWarning(data.warning || null);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // Silently fail moderation check
    }
  }, []);

  // Debounced content check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (newPostContent) {
        void checkContent(newPostContent);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [newPostContent, checkContent]);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return then.toLocaleDateString();
  };

  const handleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
              isLiked: !post.isLiked,
            }
          : post
      )
    );
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;

    // Run full moderation check before submitting
    setSubmitting(true);
    try {
      const moderateRes = await fetch("/api/portal/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPostContent }),
      });

      if (moderateRes.ok) {
        const modData = await moderateRes.json();
        if (modData.shouldBlock) {
          toast.error(modData.message || "Your post violates our community guidelines.");
          setSubmitting(false);
          return;
        }
      }

      // Submit post
      const res = await fetch("/api/portal/community/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newPostContent,
          type: "update",
          visibility: postVisibility,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPosts([data.post, ...posts]);
        setNewPostContent("");
        setShowCreatePost(false);
        setContentWarning(null);
        toast.success("Post shared to your network!");
      } else {
        toast.error("Failed to create post");
      }
    } catch (error) {
      logger.error("Post creation error:", error);
      toast.error("Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case "review":
        return <Star className="h-4 w-4 text-amber-500" />;
      case "recommendation":
        return <ThumbsUp className="h-4 w-4 text-blue-500" />;
      case "question":
        return <MessageCircle className="h-4 w-4 text-purple-500" />;
      case "project_complete":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <PenSquare className="h-4 w-4 text-slate-500" />;
    }
  };

  const getPostTypeLabel = (type: string) => {
    switch (type) {
      case "review":
        return "Left a review";
      case "recommendation":
        return "Recommended";
      case "question":
        return "Asked a question";
      case "project_complete":
        return "Completed a project";
      default:
        return "Shared an update";
    }
  };

  // Filter posts based on search and trade
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      searchQuery === "" ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.contractor?.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTrade =
      tradeFilter === "All Trades" ||
      post.contractor?.trade === tradeFilter ||
      post.projectType?.toLowerCase().includes(tradeFilter.toLowerCase());

    return matchesSearch && matchesTrade;
  });

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* ── TOP NAVIGATION BAR ── */}
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          {/* Logo & Title */}
          <Link href="/portal/network" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <span className="hidden font-bold text-slate-900 dark:text-white sm:inline">
              Homeowner Network
            </span>
          </Link>

          {/* Search */}
          <div className="flex max-w-md flex-1">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search contractors, reviews, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-9 w-full rounded-full bg-slate-100 pl-9 text-sm dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <Link href="/portal/messages">
              <Button variant="ghost" size="icon" className="relative">
                <MessageCircle className="h-5 w-5" />
              </Button>
            </Link>
            {pendingInvitations.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setActiveTab("invitations")}
              >
                <UserPlus className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {pendingInvitations.length}
                </span>
              </Button>
            )}
            {user && (
              <Link href="/portal/profile">
                <Avatar className="h-8 w-8 cursor-pointer border-2 border-transparent hover:border-purple-500">
                  <AvatarImage src={resolvedAvatar} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-sm text-white">
                    {user.firstName?.[0] || "U"}
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
            <Card className="overflow-hidden">
              <div className="h-16 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700" />
              <CardContent className="relative px-4 pb-4 pt-0">
                <div className="-mt-10">
                  <Avatar className="h-16 w-16 shadow-xl">
                    <AvatarImage src={resolvedAvatar} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-xl font-bold text-white">
                      {user?.firstName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <h3 className="mt-2 font-bold text-slate-900 dark:text-white">
                  {user?.firstName} {user?.lastName}
                </h3>
                <p className="text-xs text-slate-500">Homeowner</p>

                <div className="mt-3 border-t pt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Network posts</span>
                    <span className="font-semibold text-purple-600">{posts.length || 0}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs">
                    <span className="text-slate-500">Active pros</span>
                    <span className="font-semibold text-purple-600">
                      {trendingPros.length || 0}
                    </span>
                  </div>
                </div>

                <Link href="/portal/profile" className="mt-3 block">
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
                    href="/portal/find-a-pro"
                    className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Search className="h-4 w-4 text-slate-500" />
                    <span>Find a Contractor</span>
                  </Link>
                  <Link
                    href="/portal/find-a-pro"
                    className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Star className="h-4 w-4 text-slate-500" />
                    <span>My Reviews</span>
                  </Link>
                  <Link
                    href="/portal/messages"
                    className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <MessageCircle className="h-4 w-4 text-slate-500" />
                    <span>Messages</span>
                  </Link>
                  <Link
                    href="/portal/claims"
                    className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Briefcase className="h-4 w-4 text-slate-500" />
                    <span>My Claims</span>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Trade Filter */}
            <Card>
              <CardContent className="p-3">
                <p className="mb-2 text-xs font-semibold text-slate-500">Filter by Trade</p>
                <Select value={tradeFilter} onValueChange={setTradeFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADE_FILTERS.map((trade) => (
                      <SelectItem key={trade} value={trade}>
                        {trade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* ─── MAIN FEED ─── */}
          <div className="space-y-4 lg:col-span-2">
            {/* Mobile Trade Filter */}
            <div className="flex gap-2 lg:hidden">
              <Select value={tradeFilter} onValueChange={setTradeFilter}>
                <SelectTrigger className="h-9 flex-1 text-xs">
                  <Filter className="mr-1 h-3 w-3" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRADE_FILTERS.map((trade) => (
                    <SelectItem key={trade} value={trade}>
                      {trade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Full Search Results Overlay ── */}
            {showSearchResults && searchQuery.trim() && (
              <Card className="border-2 border-purple-200 dark:border-purple-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Search className="h-5 w-5 text-purple-600" />
                      Results for &ldquo;{searchQuery}&rdquo;
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={handleClearSearch}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Search in feed posts */}
                  {filteredPosts.length === 0 ? (
                    <div className="py-8 text-center">
                      <Search className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                      <p className="font-medium text-slate-600">No matching posts</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Try searching on{" "}
                        <Link href="/portal/find-a-pro" className="text-purple-600 hover:underline">
                          Find a Pro
                        </Link>
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Showing {filteredPosts.length} matching posts below
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Create Post Card — Inline Composer */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={resolvedAvatar} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                      {user?.firstName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!showCreatePost ? (
                    <button
                      className="flex h-10 flex-1 cursor-pointer items-center rounded-full bg-slate-100 px-4 text-left text-sm text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                      onClick={() => {
                        setShowCreatePost(true);
                        setTimeout(() => composerRef.current?.focus(), 100);
                      }}
                    >
                      Share a review, question, or update...
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
                                      ? "bg-purple-50 dark:bg-purple-900/20"
                                      : ""
                                  }`}
                                >
                                  <Icon className="h-4 w-4 text-slate-500" />
                                  <div>
                                    <p className="text-sm font-medium">{opt.label}</p>
                                    <p className="text-xs text-slate-400">{opt.description}</p>
                                  </div>
                                  {postVisibility === opt.value && (
                                    <span className="ml-auto text-purple-600">✓</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <Textarea
                        ref={composerRef}
                        placeholder="Share a review, ask a question, tag a @pro..."
                        value={newPostContent}
                        onChange={(e) =>
                          handlePostContentChange(e.target.value, e.target.selectionStart || 0)
                        }
                        className="min-h-[100px] resize-none"
                      />
                      {/* @Mention Dropdown */}
                      {showMentions && (
                        <div className="absolute left-12 z-50 w-72 rounded-lg border bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                          <div className="border-b p-2 text-xs font-medium text-slate-500">
                            🏷️ Tag a Pro {mentionSearch && `— "${mentionSearch}"`}
                          </div>
                          {mentionLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                            </div>
                          ) : mentionSuggestions.length === 0 ? (
                            <div className="px-3 py-4 text-center text-sm text-slate-400">
                              {mentionSearch.length < 2
                                ? "Type 2+ characters to search..."
                                : "No pros found"}
                            </div>
                          ) : (
                            <div className="max-h-48 overflow-y-auto p-1">
                              {mentionSuggestions.map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() => insertMention(s)}
                                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-purple-50 dark:hover:bg-slate-700"
                                >
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                                    {s.name[0]}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                      {s.name}
                                    </p>
                                    {s.trade && <p className="text-xs text-slate-400">{s.trade}</p>}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Content Warning */}
                      {contentWarning && (
                        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                          <AlertCircle className="h-4 w-4" />
                          {contentWarning}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled title="Coming soon">
                            <ImageIcon className="mr-2 h-4 w-4" />
                            Photo
                          </Button>
                          <Link href="/portal/find-a-pro">
                            <Button variant="outline" size="sm">
                              <Star className="mr-2 h-4 w-4" />
                              Review a Pro
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const pos =
                                composerRef.current?.selectionStart || newPostContent.length;
                              const before = newPostContent.slice(0, pos);
                              const after = newPostContent.slice(pos);
                              setNewPostContent(before + "@" + after);
                              setTimeout(() => {
                                composerRef.current?.focus();
                                composerRef.current?.setSelectionRange(pos + 1, pos + 1);
                              }, 50);
                            }}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Tag Pro
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowCreatePost(false);
                              setContentWarning(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleCreatePost}
                            disabled={submitting || !newPostContent.trim()}
                            className="bg-gradient-to-r from-purple-600 to-pink-600"
                          >
                            {submitting ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="mr-2 h-4 w-4" />
                            )}
                            {submitting ? "Posting..." : "Post"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {!showCreatePost && (
                  <div className="mt-3 flex justify-around border-t pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-xs text-slate-600"
                      onClick={() => {
                        setShowCreatePost(true);
                        setTimeout(() => composerRef.current?.focus(), 100);
                      }}
                    >
                      <Star className="h-4 w-4 text-amber-500" />
                      Review
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-xs text-slate-600"
                      onClick={() => {
                        setShowCreatePost(true);
                        setTimeout(() => composerRef.current?.focus(), 100);
                      }}
                    >
                      <MessageCircle className="h-4 w-4 text-purple-500" />
                      Question
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-xs text-slate-600"
                      onClick={() => {
                        setShowCreatePost(true);
                        setTimeout(() => composerRef.current?.focus(), 100);
                      }}
                    >
                      <PenSquare className="h-4 w-4 text-blue-500" />
                      Update
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="feed" className="gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">Feed</span>
                </TabsTrigger>
                <TabsTrigger value="discover" className="gap-2">
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Discover</span>
                </TabsTrigger>
                <TabsTrigger value="invitations" className="relative gap-2">
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Invitations</span>
                  {pendingInvitations.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                      {pendingInvitations.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="groups" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Groups</span>
                </TabsTrigger>
              </TabsList>

              {/* Feed Tab */}
              <TabsContent value="feed" className="mt-6 space-y-4">
                {loading ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <Loader2 className="mb-4 h-8 w-8 animate-spin text-purple-600" />
                      <h3 className="text-lg font-medium">Loading feed...</h3>
                    </CardContent>
                  </Card>
                ) : filteredPosts.length === 0 ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                        <MessageCircle className="h-8 w-8 text-purple-600" />
                      </div>
                      <h3 className="mb-2 text-xl font-semibold">No posts found</h3>
                      <p className="text-slate-500">Try adjusting your search or filters</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredPosts.map((post) => (
                    <Card
                      key={post.id}
                      className="group overflow-hidden transition-all hover:shadow-lg"
                    >
                      <CardContent className="p-0">
                        {/* Post Header */}
                        <div className="flex items-start justify-between p-4 pb-0">
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-lg font-bold text-slate-600 dark:from-slate-700 dark:to-slate-600 dark:text-slate-300">
                              {post.author.name[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{post.author.name}</span>
                                {getPostTypeIcon(post.type)}
                                <span className="text-sm text-slate-500">
                                  {getPostTypeLabel(post.type)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                {post.author.location && (
                                  <>
                                    <MapPin className="h-3 w-3" />
                                    <span>{post.author.location}</span>
                                    <span>•</span>
                                  </>
                                )}
                                <span>{formatTimeAgo(post.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Post Content */}
                        <div className="p-4">
                          <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                            {post.content}
                          </p>

                          {/* Rating Stars */}
                          {post.rating && (
                            <div className="mt-3 flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-5 w-5 ${
                                    i < post.rating!
                                      ? "fill-amber-400 text-amber-400"
                                      : "fill-slate-200 text-slate-200"
                                  }`}
                                />
                              ))}
                            </div>
                          )}

                          {/* Contractor Card */}
                          {post.contractor && (
                            <div className="mt-4 rounded-xl border bg-slate-50 p-4 dark:bg-slate-800/50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
                                    {post.contractor.name[0]}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold">{post.contractor.name}</span>
                                      {post.contractor.verified && (
                                        <Verified className="h-4 w-4 text-blue-500" />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                      <span>{post.contractor.trade}</span>
                                      <span>•</span>
                                      <div className="flex items-center gap-1">
                                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                        <span>{post.contractor.rating}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <Link
                                  href={`/portal/profiles/${post.contractor.slug || post.contractor.id}`}
                                >
                                  <Button variant="outline" size="sm">
                                    View Profile
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          )}

                          {/* Project Type Badge */}
                          {post.projectType && (
                            <Badge variant="secondary" className="mt-3">
                              <Hash className="mr-1 h-3 w-3" />
                              {post.projectType}
                            </Badge>
                          )}
                        </div>

                        {/* Post Actions */}
                        <div className="flex items-center justify-between border-t px-4 py-3">
                          <div className="flex items-center gap-6">
                            <button
                              onClick={() => handleLike(post.id)}
                              className={`flex items-center gap-2 transition-colors ${
                                post.isLiked
                                  ? "text-pink-600"
                                  : "text-slate-500 hover:text-pink-600"
                              }`}
                            >
                              <Heart className={`h-5 w-5 ${post.isLiked ? "fill-current" : ""}`} />
                              <span className="text-sm font-medium">{post.likes}</span>
                            </button>
                            <button
                              disabled
                              title="Coming soon"
                              className="flex cursor-not-allowed items-center gap-2 text-slate-400"
                            >
                              <MessageCircle className="h-5 w-5" />
                              <span className="text-sm font-medium">{post.comments}</span>
                            </button>
                            <button
                              disabled
                              title="Coming soon"
                              className="flex cursor-not-allowed items-center gap-2 text-slate-400"
                            >
                              <Share2 className="h-5 w-5" />
                              <span className="text-sm font-medium">{post.shares}</span>
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Discover Pros Tab */}
              <TabsContent value="discover" className="mt-6">
                {loading ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <Loader2 className="mb-4 h-8 w-8 animate-spin text-emerald-600" />
                      <h3 className="text-lg font-medium">Finding trending pros...</h3>
                    </CardContent>
                  </Card>
                ) : trendingPros.length === 0 ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <Search className="h-8 w-8 text-emerald-600" />
                      </div>
                      <h3 className="mb-2 text-xl font-semibold">No contractors found</h3>
                      <p className="text-slate-500">Be the first to connect with local pros</p>
                      <Link href="/portal/find-a-pro" className="mt-4">
                        <Button>Find a Pro</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {trendingPros.map((pro) => (
                      <Card
                        key={pro.id}
                        className="group overflow-hidden transition-all hover:shadow-lg"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white">
                              {pro.name[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="truncate font-semibold">{pro.name}</h3>
                                {pro.verified && (
                                  <Verified className="h-4 w-4 shrink-0 text-blue-500" />
                                )}
                              </div>
                              <p className="text-sm text-slate-500">{pro.trade}</p>
                              <div className="mt-2 flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                  <span className="font-medium">{pro.rating}</span>
                                  <span className="text-sm text-slate-500">
                                    ({pro.reviewCount} reviews)
                                  </span>
                                </div>
                              </div>
                              {pro.location && (
                                <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                                  <MapPin className="h-3 w-3" />
                                  {pro.location}
                                </div>
                              )}
                              <div className="mt-3 flex items-center gap-2">
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  <TrendingUp className="mr-1 h-3 w-3" />
                                  {pro.recentReviews} new reviews
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Link
                              href={`/portal/profiles/${pro.slug || pro.id}`}
                              className="flex-1"
                            >
                              <Button variant="outline" className="w-full">
                                View Profile
                              </Button>
                            </Link>
                            <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600">
                              <UserPlus className="mr-2 h-4 w-4" />
                              Connect
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                <div className="mt-6 text-center">
                  <Link href="/portal/find-a-pro">
                    <Button variant="outline" size="lg">
                      <Search className="mr-2 h-4 w-4" />
                      Search All Contractors
                    </Button>
                  </Link>
                </div>
              </TabsContent>
              {/* Invitations Tab */}
              <TabsContent value="invitations" className="mt-6 space-y-4">
                {loadingInvitations ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <Loader2 className="mb-4 h-8 w-8 animate-spin text-purple-600" />
                      <h3 className="text-lg font-medium">Loading invitations...</h3>
                    </CardContent>
                  </Card>
                ) : pendingInvitations.length === 0 ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <UserPlus className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="mb-2 text-xl font-semibold">No pending invitations</h3>
                      <p className="text-slate-500">
                        When contractors invite you to connect, they&apos;ll appear here
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">
                        Pending Invitations ({pendingInvitations.length})
                      </h2>
                    </div>
                    {pendingInvitations.map((invite) => (
                      <Card
                        key={invite.id}
                        className="overflow-hidden transition-all hover:shadow-lg"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-xl font-bold text-white">
                              {invite.companyLogo ? (
                                <Image
                                  src={invite.companyLogo}
                                  alt={invite.companyName}
                                  width={56}
                                  height={56}
                                  className="h-full w-full rounded-xl object-cover"
                                />
                              ) : (
                                invite.companyName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold">{invite.companyName}</h3>
                              <p className="text-sm text-slate-500">{invite.trade}</p>
                              {invite.message && (
                                <p className="mt-2 rounded-lg bg-slate-100 p-3 text-sm italic text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  &ldquo;{invite.message}&rdquo;
                                </p>
                              )}
                              <p className="mt-2 text-xs text-slate-400">
                                Invited by {invite.invitedBy} •{" "}
                                {new Date(invite.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-3">
                            <Button
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                              onClick={async () => {
                                try {
                                  const res = await fetch(
                                    `/api/portal/invitations/${invite.id}/accept`,
                                    {
                                      method: "POST",
                                    }
                                  );
                                  if (res.ok) {
                                    toast.success(`Connected with ${invite.companyName}!`);
                                    setPendingInvitations((prev) =>
                                      prev.filter((i) => i.id !== invite.id)
                                    );
                                  } else {
                                    throw new Error("Failed to accept");
                                  }
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                } catch (_error) {
                                  toast.error("Failed to accept invitation");
                                }
                              }}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={async () => {
                                try {
                                  const res = await fetch(
                                    `/api/portal/invitations/${invite.id}/decline`,
                                    {
                                      method: "POST",
                                    }
                                  );
                                  if (res.ok) {
                                    toast.success("Invitation declined");
                                    setPendingInvitations((prev) =>
                                      prev.filter((i) => i.id !== invite.id)
                                    );
                                  }
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                } catch (_error) {
                                  toast.error("Failed to decline invitation");
                                }
                              }}
                            >
                              <AlertCircle className="mr-2 h-4 w-4" />
                              Decline
                            </Button>
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/portal/messages?company=${invite.id}`}>
                                <MessageCircle className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              {/* Groups Tab */}
              <TabsContent value="groups" className="mt-6">
                {loading ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <Loader2 className="mb-4 h-8 w-8 animate-spin text-purple-600" />
                      <h3 className="text-lg font-medium">Loading groups...</h3>
                    </CardContent>
                  </Card>
                ) : groups.length === 0 ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                        <Users className="h-8 w-8 text-purple-600" />
                      </div>
                      <h3 className="mb-2 text-xl font-semibold">No groups yet</h3>
                      <p className="text-slate-500">Be the first to create a community group</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {groups.map((group) => (
                      <Card
                        key={group.id}
                        className="group overflow-hidden transition-all hover:shadow-lg"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-xl font-bold text-white">
                              {group.name[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold">{group.name}</h3>
                              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                {group.description}
                              </p>
                              <div className="mt-2 flex items-center gap-3 text-sm">
                                <span className="flex items-center gap-1 text-slate-500">
                                  <Users className="h-3 w-3" />
                                  {group.memberCount.toLocaleString()} members
                                </span>
                                <Badge variant="secondary">{group.category}</Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            className="mt-4 w-full"
                            variant="outline"
                            disabled
                            title="Coming soon"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Join Group
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                <div className="mt-6 text-center">
                  <Button variant="outline" size="lg" disabled title="Coming soon">
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Group
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* ─── RIGHT SIDEBAR ─── */}
          <div className="hidden space-y-4 lg:block">
            {/* Pending Invitations Alert */}
            {pendingInvitations.length > 0 && (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-900/40">
                      <UserPlus className="h-5 w-5 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        {pendingInvitations.length} pending
                      </p>
                      <p className="text-xs text-amber-700">Connection invitations</p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700"
                      onClick={() => setActiveTab("invitations")}
                    >
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trending Pros */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  Trending Pros
                </CardTitle>
                <CardDescription className="text-xs">Most reviewed this week</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {trendingPros.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">
                    No trending pros yet — check back soon.
                  </p>
                ) : (
                  trendingPros.slice(0, 4).map((pro, index) => (
                    <div key={pro.id} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {index + 1}
                      </span>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
                        {pro.name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{pro.name}</p>
                        <p className="flex items-center gap-1 text-xs text-slate-500">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {pro.rating} • {pro.trade}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <Link href="/portal/find-a-pro">
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    View all contractors
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Popular Groups */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-purple-500" />
                  Popular Groups
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groups.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">
                    No groups yet — be the first to create one.
                  </p>
                ) : (
                  groups.slice(0, 3).map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center gap-3 rounded-lg border p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 text-sm font-bold text-white">
                        {group.name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{group.name}</p>
                        <p className="text-xs text-slate-500">
                          {group.memberCount.toLocaleString()} members
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        Join
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Network Stats */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
                    <p className="text-2xl font-bold text-purple-600">{posts.length}</p>
                    <p className="text-xs text-slate-500">Posts</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                    <p className="text-2xl font-bold text-green-600">{trendingPros.length}</p>
                    <p className="text-xs text-slate-500">Active Pros</p>
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
                <Link href="/help" className="hover:underline">
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
              <p className="mt-2">© 2026 ClearSkai Homeowner Network</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
