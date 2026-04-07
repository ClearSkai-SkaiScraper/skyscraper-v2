/**
 * ReviewsList Component
 * Displays reviews for a Pro with star ratings
 */

"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

interface Review {
  id: string;
  rating: number;
  title?: string;
  body: string;
  verified: boolean;
  createdAt: string;
  clientName: string;
}

interface ReviewsListProps {
  proId: string;
  limit?: number;
}

export function ReviewsList({ proId, limit }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadReviews();
  }, [proId]);

  async function loadReviews() {
    try {
      const res = await fetch(`/api/trades/reviews?proId=${proId}`);
      const data = await res.json();

      if (res.ok) {
        setReviews(limit ? data.reviews.slice(0, limit) : data.reviews);
        setAvgRating(data.avgRating || 0);
        setTotalReviews(data.totalReviews || 0);
      } else {
        throw new Error(data.error || "Failed to load reviews");
      }
    } catch (error: any) {
      logger.error("Failed to load reviews:", error);
      toast.error(error.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading reviews...</div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">No reviews yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Rating Summary */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-5 w-5 ${
                star <= avgRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
              }`}
            />
          ))}
        </div>
        <div className="text-sm">
          <span className="font-semibold">{avgRating.toFixed(1)}</span>
          <span className="text-muted-foreground">
            {" "}
            ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
          </span>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className="space-y-2 rounded-lg border border-border bg-card p-4">
            {/* Rating & Name */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                {review.verified && (
                  <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-xs text-green-600 dark:text-green-400">
                    ✓ Verified
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Title */}
            {review.title && <h4 className="text-sm font-medium">{review.title}</h4>}

            {/* Body */}
            <p className="text-sm leading-relaxed text-muted-foreground">{review.body}</p>

            {/* Client Name */}
            <p className="text-xs text-muted-foreground">- {review.clientName}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
