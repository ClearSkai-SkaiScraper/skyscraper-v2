/**
 * Group Feed Component
 * Shows posts within a group
 */

"use client";

import { formatDistanceToNow } from "date-fns";
import { Image as ImageIcon, Loader2, Lock, MoreHorizontal, Pin, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface Post {
  id: string;
  authorId: string;
  content: string;
  images: string[];
  isPinned: boolean;
  likeCount: number;
  createdAt: string;
  author: {
    userId: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    tradeType?: string;
    companyName?: string;
  } | null;
}

interface GroupFeedProps {
  groupId: string;
  canPost: boolean;
  isMember: boolean;
  groupPrivacy: string;
}

export default function GroupFeed({ groupId, canPost, isMember, groupPrivacy }: GroupFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(
    async (pageNum: number = 1) => {
      try {
        const res = await fetch(`/api/trades/groups/posts?groupId=${groupId}&page=${pageNum}`);
        if (res.ok) {
          const data = await res.json();
          if (pageNum === 1) {
            setPosts(data.posts);
          } else {
            setPosts((prev) => [...prev, ...data.posts]);
          }
          setHasMore(data.pagination.page < data.pagination.pages);
        }
      } catch (error) {
        logger.error("Failed to fetch posts:", error);
      } finally {
        setLoading(false);
      }
    },
    [groupId]
  );

  useEffect(() => {
    void fetchPosts(1);
  }, [fetchPosts]);

  const handlePost = async () => {
    if (!newPost.trim()) return;

    setPosting(true);
    try {
      const res = await fetch("/api/trades/groups/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, content: newPost.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setPosts((prev) => [data.post, ...prev]);
        setNewPost("");
        toast.success("Posted!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to post");
      }
    } catch {
      toast.error("Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const [deletePostId, setDeletePostId] = useState<string | null>(null);

  const handleDelete = async (postId: string) => {
    try {
      const res = await fetch(`/api/trades/groups/posts?id=${postId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setDeletePostId(null);
        toast.success("Post deleted");
      } else {
        toast.error("Failed to delete post");
      }
    } catch {
      toast.error("Failed to delete post");
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return ((firstName?.[0] || "") + (lastName?.[0] || "")).toUpperCase() || "?";
  };

  // Non-member view for private groups
  if (!isMember && groupPrivacy !== "public") {
    return (
      <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
        <Lock className="mx-auto h-10 w-10 text-slate-300" />
        <h3 className="mt-4 font-semibold text-slate-900">Members Only</h3>
        <p className="mt-2 text-sm text-slate-600">
          Join this group to see posts and participate in discussions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Post */}
      {canPost && (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <Textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share something with the group..."
            className="min-h-[100px] resize-none border-0 p-0 focus-visible:ring-0"
          />
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <Button variant="ghost" size="sm" disabled>
              <ImageIcon className="mr-1 h-4 w-4" />
              Photo
            </Button>
            <Button
              onClick={handlePost}
              disabled={posting || !newPost.trim()}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {posting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="mr-1 h-4 w-4" />
                  Post
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">No posts yet. Be the first to share something!</p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <div key={post.id} className="rounded-xl border bg-white shadow-sm">
              {/* Pinned badge */}
              {post.isPinned && (
                <div className="flex items-center gap-1 border-b bg-amber-50 px-4 py-2 text-xs text-amber-700">
                  <Pin className="h-3 w-3" />
                  Pinned post
                </div>
              )}

              <div className="p-4">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <Link href={`/trades/profiles/${post.author?.userId}/public`}>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.author?.avatar || undefined} />
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {getInitials(post.author?.firstName, post.author?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/trades/profiles/${post.author?.userId}/public`}
                      className="font-medium text-slate-900 hover:text-blue-600"
                    >
                      {post.author?.firstName} {post.author?.lastName}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {post.author?.tradeType || post.author?.companyName || "Member"} •{" "}
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setDeletePostId(post.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Content */}
                <div className="mt-3 whitespace-pre-wrap text-slate-800">{post.content}</div>

                {/* Images */}
                {post.images.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {post.images.map((img, i) => (
                      <img key={i} src={img} alt="" className="max-h-96 rounded-lg object-cover" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => {
                  setPage((p) => p + 1);
                  void fetchPosts(page + 1);
                }}
              >
                Load More
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete Post Confirmation */}
      <ConfirmDeleteDialog
        open={!!deletePostId}
        onOpenChange={(open) => !open && setDeletePostId(null)}
        title="Delete Post"
        description="This post will be permanently deleted. This cannot be undone."
        showArchive={false}
        deleteLabel="Delete Post"
        onConfirmDelete={() => (deletePostId ? handleDelete(deletePostId) : Promise.resolve())}
      />
    </div>
  );
}
