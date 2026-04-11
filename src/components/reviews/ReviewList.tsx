"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

import { StarRating } from "./StarRating";

interface Review {
  id: string;
  userId: string;
  rating: number;
  content: string;
  photos: string[];
  publicLeadId: string | null;
  response: string | null;
  respondedAt: Date | null;
  createdAt: Date;
}

interface ReviewListProps {
  contractorId: string;
  limit?: number;
}

export function ReviewList({ contractorId, limit = 10 }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    void loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function loadReviews() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews/${contractorId}?page=${page}&limit=${limit}`);
      const data = await res.json();

      if (res.ok) {
        setReviews(data.reviews);
        setTotalPages(data.pagination.totalPages);
        setAverageRating(data.averageRating);
        setTotalReviews(data.totalReviews);
      }
    } catch (error) {
      logger.error("Error loading reviews:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="animate-pulse text-gray-500">Loading reviews...</div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border bg-gray-50 py-12 text-center">
        <p className="text-gray-600">No reviews yet.</p>
        <p className="mt-1 text-sm text-gray-500">Be the first to review this contractor!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-6">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600">{averageRating.toFixed(1)}</div>
            <StarRating value={averageRating} readonly size="md" />
            <div className="mt-1 text-sm text-gray-600">
              {totalReviews} review{totalReviews !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="space-y-3 rounded-xl border bg-white p-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                    <span className="font-medium text-gray-600">
                      {review.userId.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Customer</div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(review.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StarRating value={review.rating} readonly size="sm" />
                {review.publicLeadId && (
                  <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <p className="leading-relaxed text-gray-700">{review.content}</p>

            {/* Photos */}
            {review.photos && review.photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {review.photos.map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPhoto(photo)}
                    className="h-20 w-20 overflow-hidden rounded-lg border transition hover:border-blue-500"
                    // eslint-disable-next-line @next/next/no-img-element
                  >
                    <img
                      src={photo}
                      alt={`Review photo ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Contractor Response */}
            {review.response && (
              <div className="rounded-lg border-l-4 border-blue-500 bg-gray-50 p-4">
                <div className="mb-1 text-sm font-medium text-gray-900">
                  Response from Contractor
                </div>
                <p className="text-sm text-gray-700">{review.response}</p>
                {review.respondedAt && (
                  <div className="mt-2 text-xs text-gray-500">
                    {format(new Date(review.respondedAt), "MMM d, yyyy")}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute right-4 top-4 text-3xl text-white hover:text-gray-300"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedPhoto}
            alt="Review photo"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
