/**
 * Enhanced Reviews Tab Component
 * Full review system with filtering, sorting, and detailed review cards
 */

"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Award,
  CheckCircle,
  ChevronDown,
  Filter,
  MessageSquare,
  Star,
  ThumbsUp,
  User,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

interface Review {
  id: string;
  authorName: string;
  authorAvatar?: string;
  rating: number;
  title?: string;
  content?: string;
  projectType?: string;
  createdAt: string;
  isVerified: boolean;
  helpful?: number;
  response?: {
    content: string;
    createdAt: string;
  };
  photos?: string[];
}

interface EnhancedReviewsTabProps {
  userId: string;
  isOwnProfile: boolean;
  reviews: Review[];
  averageRating: number;
}

export default function EnhancedReviewsTab({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId,
  isOwnProfile,
  reviews,
  averageRating,
}: EnhancedReviewsTabProps) {
  const [sortBy, setSortBy] = useState<"newest" | "highest" | "lowest" | "helpful">("newest");
  const [filterRating, setFilterRating] = useState<number | null>(null);

  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => Math.floor(r.rating) === rating).length,
    percentage:
      reviews.length > 0
        ? (reviews.filter((r) => Math.floor(r.rating) === rating).length / reviews.length) * 100
        : 0,
  }));

  // Sort and filter reviews
  const sortedReviews = [...reviews]
    .filter((r) => (filterRating ? Math.floor(r.rating) === filterRating : true))
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "highest":
          return b.rating - a.rating;
        case "lowest":
          return a.rating - b.rating;
        case "helpful":
          return (b.helpful || 0) - (a.helpful || 0);
        default:
          return 0;
      }
    });

  const verifiedCount = reviews.filter((r) => r.isVerified).length;

  const renderStars = (rating: number, size: "sm" | "md" | "lg" = "md") => {
    const sizeClasses = {
      sm: "h-3 w-3",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    };

    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating
                ? "fill-amber-400 text-amber-400"
                : star - 0.5 <= rating
                  ? "fill-amber-400/50 text-amber-400"
                  : "fill-slate-200 text-slate-200"
            }`}
          />
        ))}
      </div>
    );
  };

  if (reviews.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Star className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-semibold text-slate-900">No reviews yet</h3>
          <p className="text-slate-600">
            {isOwnProfile
              ? "Ask your satisfied customers to leave reviews!"
              : "This professional hasn't received any reviews yet."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Overall Rating */}
            <div className="text-center md:border-r md:text-left">
              <div className="flex items-center justify-center gap-4 md:justify-start">
                <div className="text-5xl font-bold text-slate-900">{averageRating.toFixed(1)}</div>
                <div>
                  {renderStars(averageRating, "lg")}
                  <p className="mt-1 text-sm text-slate-600">
                    Based on {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {verifiedCount > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-green-600 md:justify-start">
                  <CheckCircle className="h-4 w-4" />
                  {verifiedCount} verified purchase{verifiedCount !== 1 ? "s" : ""}
                </div>
              )}
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {ratingDistribution.map(({ rating, count, percentage }) => (
                <button
                  key={rating}
                  onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                  className={`flex w-full items-center gap-2 rounded p-1 transition hover:bg-slate-50 ${
                    filterRating === rating ? "bg-blue-50" : ""
                  }`}
                >
                  <span className="w-12 text-sm text-slate-600">{rating} star</span>
                  <Progress value={percentage} className="h-2 flex-1" />
                  <span className="w-10 text-right text-sm text-slate-500">{count}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter/Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {filterRating && (
            <Badge variant="secondary" className="gap-1">
              {filterRating} star
              <button onClick={() => setFilterRating(null)} className="ml-1 hover:text-slate-900">
                ×
              </button>
            </Badge>
          )}
          <span className="text-sm text-slate-600">
            {sortedReviews.length} review{sortedReviews.length !== 1 ? "s" : ""}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Sort:{" "}
              {sortBy === "newest"
                ? "Newest"
                : sortBy === "highest"
                  ? "Highest Rated"
                  : sortBy === "lowest"
                    ? "Lowest Rated"
                    : "Most Helpful"}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortBy("newest")}>Newest First</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("highest")}>Highest Rated</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("lowest")}>Lowest Rated</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("helpful")}>Most Helpful</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {sortedReviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="p-4">
              {/* Header */}
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Author Avatar */}
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                    {review.authorAvatar ? (
                      <img
                        src={review.authorAvatar}
                        alt={review.authorName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{review.authorName}</span>
                      {review.isVerified && (
                        <Badge
                          variant="secondary"
                          className="gap-1 bg-green-100 text-xs text-green-700"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>
                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                      </span>
                      {review.projectType && (
                        <>
                          <span>•</span>
                          <span>{review.projectType}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {renderStars(review.rating)}
              </div>

              {/* Content */}
              {review.title && (
                <h4 className="mb-2 font-semibold text-slate-900">{review.title}</h4>
              )}
              {review.content && (
                <p className="mb-3 whitespace-pre-wrap text-slate-700">{review.content}</p>
              )}

              {/* Photos */}
              {review.photos && review.photos.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {review.photos.map((photo, i) => (
                    <img
                      key={i}
                      src={photo}
                      alt={`Review photo ${i + 1}`}
                      className="h-20 w-20 cursor-pointer rounded-lg object-cover hover:opacity-90"
                    />
                  ))}
                </div>
              )}

              {/* Helpful Button */}
              <div className="flex items-center gap-4 border-t pt-3">
                <button className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                  <ThumbsUp className="h-4 w-4" />
                  Helpful ({review.helpful || 0})
                </button>
              </div>

              {/* Owner Response */}
              {review.response && (
                <div className="mt-4 rounded-lg bg-slate-50 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm">
                    <Award className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-slate-900">Response from owner</span>
                    <span className="text-xs text-slate-500">
                      {formatDistanceToNow(new Date(review.response.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{review.response.content}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Request Reviews CTA (for own profile) */}
      {isOwnProfile && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-semibold text-blue-900">Get more reviews</p>
              <p className="text-sm text-blue-700">Send review requests to your recent customers</p>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <MessageSquare className="mr-2 h-4 w-4" />
              Request Reviews
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
