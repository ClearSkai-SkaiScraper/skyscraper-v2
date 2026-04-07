"use client";

import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import {
  AtSign,
  Briefcase,
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Send,
  Share2,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface TradesPost {
  id: string;
  profileId: string;
  authorId: string;
  type: string;
  title?: string;
  content: string;
  location?: string;
  city?: string;
  state?: string;
  tags: string[];
  images: string[];
  likeCount: number;
  responseCount: number;
  createdAt: string;
}

interface MentionSuggestion {
  id: string;
  name: string;
  trade?: string;
  avatar?: string | null;
}

interface TradesFeedProps {
  isAuthenticated: boolean;
}

export function TradesFeed({ isAuthenticated }: TradesFeedProps) {
  const { user } = useUser();
  const [posts, setPosts] = useState<TradesPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  // @mention state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const mentionAnchorRef = useRef<number>(0);

  // Feed filter
  const [feedFilter, setFeedFilter] = useState<"all" | "projects" | "opportunities" | "updates">(
    "all"
  );

  useEffect(() => {
    void loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const response = await fetch("/api/trades/feed");
      if (!response.ok) throw new Error("Failed to load posts");

      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      logger.error("Load posts error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Search for pros to @mention
  const searchMentions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setMentionSuggestions([]);
      return;
    }
    setMentionLoading(true);
    try {
      const res = await fetch(`/api/trades/connections?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        // Map connections to mention suggestions
        const suggestions: MentionSuggestion[] = (data.connections || [])
          .slice(0, 5)
          .map((c: any) => ({
            id: c.id || c.companyId,
            name: c.companyName || c.name || "Pro",
            trade: c.trade || c.specialty,
            avatar: c.logo || c.avatar,
          }));
        setMentionSuggestions(suggestions);
      }
    } catch {
      // Silently fail
    } finally {
      setMentionLoading(false);
    }
  }, []);

  // Handle @mention detection in textarea
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

  // Insert @mention into content
  const insertMention = (suggestion: MentionSuggestion) => {
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

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || isPosting) return;

    setIsPosting(true);

    try {
      const response = await fetch("/api/trades/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newPostContent,
          type: "GENERAL",
          tags: [],
        }),
      });

      if (!response.ok) throw new Error("Failed to create post");

      const data = await response.json();
      setPosts((prev) => [data.post, ...prev]);
      setNewPostContent("");
      toast.success("Post shared to the network!");
    } catch (error) {
      logger.error("Create post error:", error);
      toast.error("Failed to create post");
    } finally {
      setIsPosting(false);
    }
  };

  const filteredPosts =
    feedFilter === "all"
      ? posts
      : posts.filter((p) => (p.type || "").toLowerCase().includes(feedFilter));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Inline Post Composer ── */}
      {isAuthenticated && (
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-sm text-white">
                  {user?.firstName?.[0] || "P"}
                </AvatarFallback>
              </Avatar>
              <div className="relative flex-1 space-y-3">
                <Textarea
                  ref={composerRef}
                  value={newPostContent}
                  onChange={handleContentChange}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      void handleCreatePost();
                    }
                  }}
                  placeholder="Share a project update, tag a @pro, or post an opportunity..."
                  className="min-h-[80px] resize-none"
                />

                {/* @Mention Dropdown */}
                {showMentions && (
                  <div className="absolute left-0 top-[85px] z-50 w-72 rounded-lg border bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b p-2 text-xs font-medium text-slate-500">
                      <AtSign className="mr-1 inline h-3 w-3" />
                      Tag a Pro {mentionSearch && `— "${mentionSearch}"`}
                    </div>
                    {mentionLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
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
                            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-blue-50 dark:hover:bg-slate-700"
                          >
                            <Avatar className="h-8 w-8">
                              {s.avatar && <AvatarImage src={s.avatar} />}
                              <AvatarFallback className="bg-blue-100 text-xs text-blue-700">
                                {s.name[0]}
                              </AvatarFallback>
                            </Avatar>
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

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-xs text-slate-500">
                      <ImageIcon className="mr-1.5 h-4 w-4" />
                      Photo
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs text-slate-500">
                      <Briefcase className="mr-1.5 h-4 w-4" />
                      Project
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
                      <AtSign className="mr-1.5 h-4 w-4" />
                      Tag Pro
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleCreatePost}
                    disabled={!newPostContent.trim() || isPosting}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600"
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
      )}

      {/* ── Feed Filter Tabs ── */}
      <div className="flex gap-2">
        {(["all", "projects", "opportunities", "updates"] as const).map((tab) => (
          <Button
            key={tab}
            variant={feedFilter === tab ? "default" : "outline"}
            size="sm"
            onClick={() => setFeedFilter(tab)}
            className="text-xs capitalize"
          >
            {tab === "all" ? "All Posts" : tab}
          </Button>
        ))}
      </div>

      {/* ── Posts Feed ── */}
      {filteredPosts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <h3 className="mb-2 text-lg font-semibold">
              {posts.length === 0 ? "No posts yet" : "No matching posts"}
            </h3>
            <p className="text-sm text-slate-500">
              {posts.length === 0
                ? "Be the first to share! Post a project update or tag a @pro."
                : "Try switching the filter above"}
            </p>
          </CardContent>
        </Card>
      ) : (
        filteredPosts.map((post) => (
          <Card key={post.id} className="overflow-hidden transition-all hover:shadow-md">
            <CardContent className="space-y-4 p-5">
              {/* Post Header */}
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {post.authorId.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                      Professional User
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {post.type}
                    </Badge>
                  </div>
                  {post.location && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {post.city && post.state ? `${post.city}, ${post.state}` : post.location}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    {format(new Date(post.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
              </div>

              {/* Post Content — render @mentions as highlighted */}
              {post.title && (
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {post.title}
                </h3>
              )}
              <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                {post.content.split(/(@\w+)/g).map((part, i) =>
                  part.startsWith("@") ? (
                    <span key={i} className="font-semibold text-blue-600">
                      {part}
                    </span>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </p>

              {/* Post Images */}
              {post.images && post.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {post.images.slice(0, 4).map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Post image ${index + 1}`}
                      className="aspect-video w-full rounded-lg object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Post Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Social Actions Row */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                <div className="flex gap-1">
                  <button className="group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-slate-500 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                    <Heart className="h-4 w-4 transition group-hover:scale-110" />
                    <span className="text-xs">{post.likeCount || 0}</span>
                  </button>
                  <button className="group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-slate-500 transition hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20">
                    <MessageCircle className="h-4 w-4 transition group-hover:scale-110" />
                    <span className="text-xs">{post.responseCount || 0}</span>
                  </button>
                  <button className="group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-slate-500 transition hover:bg-green-50 hover:text-green-500 dark:hover:bg-green-900/20">
                    <Share2 className="h-4 w-4 transition group-hover:scale-110" />
                    <span className="text-xs">Share</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
