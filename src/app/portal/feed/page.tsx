"use client";

import { useUser } from "@clerk/nextjs";
import {
  Activity,
  AtSign,
  CheckCircle,
  Clock,
  FileText,
  Globe,
  Heart,
  Loader2,
  MessageCircle,
  MessageSquare,
  Send,
  Share2,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import PortalPageHero from "@/components/portal/portal-page-hero";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

/**
 * Activity Feed Page - Standalone Portal (no slug required)
 * Shows recent activity across all projects
 */

interface ActivityItem {
  id: string;
  type: "message" | "update" | "document" | "status" | "milestone";
  title: string;
  description: string;
  timestamp: string;
  projectName?: string;
  isRead?: boolean;
  threadId?: string;
}

// Demo activity removed — feed now shows real data or empty state

export default function FeedPage() {
  const { user } = useUser();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  // Social feed state
  interface SocialPost {
    id: string;
    type: string;
    content: string;
    author: { id: string; name: string; avatar: string | null };
    contractor?: { name: string; trade: string } | null;
    likes: number;
    comments: number;
    isLiked: boolean;
    createdAt: string;
  }
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);

  // Inline composer
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // @mention
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState<
    Array<{ id: string; name: string; trade?: string }>
  >([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const mentionAnchorRef = useRef<number>(0);

  useEffect(() => {
    void fetchActivity();
    void fetchSocialPosts();
  }, []);

  async function fetchActivity() {
    try {
      const res = await fetch("/api/portal/activity");
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      logger.error("Failed to fetch activity:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSocialPosts() {
    try {
      const res = await fetch("/api/portal/community/feed?limit=10");
      if (res.ok) {
        const data = await res.json();
        setSocialPosts(data.posts || []);
      }
    } catch {
      // Community feed not required
    }
  }

  // Like a post
  async function handleLikePost(postId: string) {
    // Optimistic update
    setSocialPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );

    // Like is optimistic-only for now — community persistence is coming soon
  }

  // Share a post
  async function handleSharePost(post: SocialPost) {
    const shareUrl = `${window.location.origin}/portal/network?post=${post.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.author.name}`,
          text: post.content.slice(0, 100),
          url: shareUrl,
        });
        toast.success("Shared successfully!");
      } catch {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    }
  }

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
        setMentionSuggestions(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data.pros || []).slice(0, 5).map((p: any) => ({
            id: p.id,
            name: p.name,
            trade: p.trade,
          }))
        );
      }
    } catch {
      // Silently fail
    } finally {
      setMentionLoading(false);
    }
  }, []);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewPostContent(value);
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
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
    setTimeout(() => {
      composerRef.current?.focus();
      const newPos = before.length + mention.length;
      composerRef.current?.setSelectionRange(newPos, newPos);
    }, 50);
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || isPosting) return;
    setIsPosting(true);
    try {
      const res = await fetch("/api/portal/community/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newPostContent,
          type: "update",
          visibility: "public",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSocialPosts((prev) => [data.post, ...prev]);
        setNewPostContent("");
        toast.success("Post shared!");
      } else {
        toast.error("Failed to create post");
      }
    } catch {
      toast.error("Failed to create post");
    } finally {
      setIsPosting(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      case "status":
        return <TrendingUp className="h-4 w-4" />;
      case "milestone":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "message":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
      case "document":
        return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
      case "status":
        return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
      case "milestone":
        return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    }
  };

  // Use real data only
  const filteredActivities =
    filter === "all" ? activities : activities.filter((a) => a.type === filter);

  // Stats
  const unreadCount = activities.filter((a) => !a.isRead).length;
  const messageCount = activities.filter((a) => a.type === "message").length;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateCount = activities.filter((a) => a.type === "status" || a.type === "update").length;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-pink-600 border-t-transparent" />
          <p className="text-slate-500 dark:text-slate-400">Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <PortalPageHero
        title="Activity Feed"
        subtitle="Stay on top of all your project updates, messages, and milestones. Never miss an important notification."
        icon={Zap}
        badge="Real-time Updates"
        gradient="rose"
        stats={[
          { label: "Total Updates", value: activities.length },
          { label: "Unread", value: unreadCount },
          { label: "Community Posts", value: socialPosts.length },
          { label: "Messages", value: messageCount },
        ]}
      />

      {/* ── Inline Post Composer ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="bg-gradient-to-br from-pink-600 to-rose-600 text-sm text-white">
                {user?.firstName?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="relative flex-1 space-y-3">
              <Textarea
                ref={composerRef}
                value={newPostContent}
                onChange={handleContentChange}
                placeholder="Share an update, tag a @pro, or ask a question..."
                className="min-h-[70px] resize-none"
              />

              {/* @Mention Dropdown */}
              {showMentions && (
                <div className="absolute left-0 top-[75px] z-50 w-72 rounded-lg border bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <div className="border-b p-2 text-xs font-medium text-slate-500">
                    🏷️ Tag a Pro {mentionSearch && `— "${mentionSearch}"`}
                  </div>
                  {mentionLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
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
                          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-pink-50 dark:hover:bg-slate-700"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-xs font-bold text-pink-700">
                            {s.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{s.name}</p>
                            {s.trade && <p className="text-xs text-slate-400">{s.trade}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-xs text-slate-500">
                    <Star className="mr-1.5 h-4 w-4 text-amber-500" />
                    Review
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-500"
                    onClick={() => {
                      const pos = composerRef.current?.selectionStart || newPostContent.length;
                      const before = newPostContent.slice(0, pos);
                      const after = newPostContent.slice(pos);
                      setNewPostContent(before + "@" + after);
                      setTimeout(() => {
                        composerRef.current?.focus();
                        composerRef.current?.setSelectionRange(pos + 1, pos + 1);
                      }, 50);
                    }}
                  >
                    <AtSign className="mr-1.5 h-4 w-4 text-purple-500" />
                    Tag Pro
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim() || isPosting}
                  className="bg-gradient-to-r from-pink-600 to-rose-600"
                >
                  {isPosting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {isPosting ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Community Posts Section ── */}
      {socialPosts.length > 0 && filter === "all" && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Globe className="h-4 w-4" />
            Community Posts
          </h3>
          {socialPosts.slice(0, 5).map((post) => (
            <Card key={post.id} className="transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9">
                    {post.author.avatar && <AvatarImage src={post.author.avatar} />}
                    <AvatarFallback className="bg-purple-100 text-xs text-purple-700">
                      {post.author.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {post.author.name}
                      </span>
                      {post.contractor && (
                        <Badge variant="outline" className="text-xs">
                          reviewed {post.contractor.name}
                        </Badge>
                      )}
                      <span className="text-xs text-slate-400">
                        {formatTimeAgo(post.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                      {post.content.split(/(@\w+)/g).map((part, i) =>
                        part.startsWith("@") ? (
                          <span key={i} className="font-semibold text-pink-600">
                            {part}
                          </span>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </p>
                    <div className="mt-2 flex gap-4">
                      <button
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-1 text-xs transition-colors ${post.isLiked ? "text-pink-600" : "text-slate-500 hover:text-pink-600"}`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${post.isLiked ? "fill-current" : ""}`} />
                        {post.likes || 0}
                      </button>
                      <Link
                        href={`/portal/network?post=${post.id}`}
                        className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-purple-600"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {post.comments || 0}
                      </Link>
                      <button
                        onClick={() => handleSharePost(post)}
                        className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-blue-600"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Link href="/portal/network">
            <Button variant="ghost" size="sm" className="w-full text-purple-600">
              View all community posts →
            </Button>
          </Link>
        </div>
      )}

      {/* ── Activity Filter Tabs ── */}
      <Tabs value={filter} onValueChange={setFilter} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:flex lg:w-auto lg:grid-cols-none">
          <TabsTrigger value="all" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">All</span>
          </TabsTrigger>
          <TabsTrigger value="message" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Messages</span>
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Updates</span>
          </TabsTrigger>
          <TabsTrigger value="document" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="milestone" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Milestones</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {filteredActivities.length === 0 ? (
            <Card className="border-2 border-dashed bg-gradient-to-br from-pink-50/50 to-white dark:from-pink-900/10 dark:to-slate-900">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shadow-pink-500/30">
                  <Activity className="h-10 w-10 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-semibold dark:text-white">No activity yet</h3>
                <p className="mb-6 max-w-md text-slate-500 dark:text-slate-400">
                  Your project updates, messages, and documents will appear here as you work with
                  contractors.
                </p>
                <Link href="/portal/find-a-pro">
                  <Button className="bg-gradient-to-r from-pink-600 to-rose-600 shadow-lg shadow-pink-500/30">
                    Find a Pro to Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <Card
                  key={activity.id}
                  className={`group relative overflow-hidden transition-all hover:shadow-lg ${
                    !activity.isRead
                      ? "border-l-4 border-l-pink-500 bg-pink-50/50 dark:bg-pink-900/10"
                      : ""
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-rose-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
                  <CardContent className="flex items-start gap-4 p-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${getActivityColor(activity.type)}`}
                    >
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                              {activity.title}
                            </h3>
                            {!activity.isRead && (
                              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-pink-500" />
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                            {activity.description}
                          </p>
                        </div>
                        {activity.projectName && (
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {activity.projectName}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(activity.timestamp)}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${getActivityColor(activity.type)}`}
                          >
                            {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                          </Badge>
                        </div>
                        {activity.type === "message" && (
                          <Link
                            href={
                              activity.threadId
                                ? `/portal/messages/${activity.threadId}`
                                : "/portal/messages"
                            }
                          >
                            <Button variant="outline" size="sm" className="gap-2">
                              <MessageSquare className="h-3 w-3" />
                              View Full Message
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
