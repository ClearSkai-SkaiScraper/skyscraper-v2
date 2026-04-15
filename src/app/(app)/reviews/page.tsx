"use client";
import {
  Award,
  ExternalLink,
  Loader2,
  MessageSquare,
  Star,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface Review {
  id: string;
  customerName: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  platform: "google" | "yelp" | "facebook" | "direct";
  jobType: string;
  verified: boolean;
  response?: string;
}

function CustomerReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch("/api/trades/reviews");
      if (res.ok) {
        const data = await res.json();
        // Map API response to Review interface
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = (data.reviews || []).map((r: any) => ({
          id: r.id,
          customerName: r.reviewerName || r.clientName || "Anonymous",
          rating: r.rating || 5,
          title: r.title || "Review",
          content: r.content || r.body || "",
          date: r.createdAt || r.date || new Date().toISOString(),
          platform: r.platform || "direct",
          jobType: r.serviceType || r.jobType || "General",
          verified: r.verified ?? false,
          response: r.response || r.ownerResponse || undefined,
        }));
        setReviews(mapped);
      }
    } catch (e) {
      logger.error("Failed to fetch reviews", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const [showReviewWidget, setShowReviewWidget] = useState(false);

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;
  const totalReviews = reviews.length;
  const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
  const fourStarCount = reviews.filter((r) => r.rating === 4).length;
  const threeStarCount = reviews.filter((r) => r.rating === 3).length;

  // Compute per-platform averages from real data
  const platformAvg = (platform: Review["platform"]) => {
    const platReviews = reviews.filter((r) => r.platform === platform);
    if (platReviews.length === 0) return "—";
    return (platReviews.reduce((s, r) => s + r.rating, 0) / platReviews.length).toFixed(1);
  };

  const getPlatformBadge = (platform: Review["platform"]) => {
    const styles = {
      google: "bg-blue-100 text-blue-700",
      yelp: "bg-red-100 text-red-700",
      facebook: "bg-indigo-100 text-indigo-700",
      direct: "bg-green-100 text-green-700",
    };
    return styles[platform];
  };

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <PageHero
        section="network"
        title="Customer Reviews & Ratings"
        subtitle="Manage your online reputation and customer feedback"
        icon={<Star className="h-5 w-5" />}
      >
        <Button onClick={() => setShowReviewWidget(true)} className="gap-2">
          <MessageSquare className="h-5 w-5" />
          Request Review
        </Button>
      </PageHero>

      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-slate-400" />
          <p className="text-slate-500">Loading reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-lg bg-white py-16 text-center shadow dark:bg-slate-800">
          <Star className="mx-auto mb-4 h-16 w-16 text-slate-300" />
          <h3 className="mb-2 text-xl font-semibold">No reviews yet</h3>
          <p className="mb-4 text-slate-500">
            Request reviews from your customers to build your reputation
          </p>
          <Button onClick={() => setShowReviewWidget(true)} className="gap-2">
            <MessageSquare className="h-5 w-5" />
            Request Your First Review
          </Button>
        </div>
      ) : (
        <>
          {/* Rating Summary */}
          <div className="rounded-lg bg-gradient-warning p-8 text-white transition hover:opacity-95">
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-3 flex items-center gap-4">
                  <div className="text-6xl font-bold">{averageRating.toFixed(1)}</div>
                  <div>
                    <div className="mb-1 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-6 w-6 ${
                            star <= Math.round(averageRating) ? "fill-white" : "opacity-50"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-lg">{totalReviews} reviews across all platforms</div>
                  </div>
                </div>
                <div className="mt-6 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="w-16">5 stars</span>
                    <div className="h-3 flex-1 rounded-full bg-white bg-opacity-30 dark:bg-slate-700">
                      <div
                        className="h-3 rounded-full bg-white dark:bg-blue-500"
                        style={{ width: `${(fiveStarCount / totalReviews) * 100}%` }}
                      />
                    </div>
                    <span className="w-12 text-right">{fiveStarCount}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-16">4 stars</span>
                    <div className="h-3 flex-1 rounded-full bg-white bg-opacity-30 dark:bg-slate-700">
                      <div
                        className="h-3 rounded-full bg-white dark:bg-blue-500"
                        style={{ width: `${(fourStarCount / totalReviews) * 100}%` }}
                      />
                    </div>
                    <span className="w-12 text-right">{fourStarCount}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-16">3 stars</span>
                    <div className="h-3 flex-1 rounded-full bg-white bg-opacity-30 dark:bg-slate-700">
                      <div
                        className="h-3 rounded-full bg-white dark:bg-blue-500"
                        style={{ width: `${(threeStarCount / totalReviews) * 100}%` }}
                      />
                    </div>
                    <span className="w-12 text-right">{threeStarCount}</span>
                  </div>
                </div>
              </div>
              <Award className="h-24 w-24 opacity-50" />
            </div>
          </div>

          {/* Platform Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-slate-400">Google</span>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold dark:text-slate-100">{platformAvg("google")}</div>
              <div className="mt-1 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <div className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                {reviews.filter((r) => r.platform === "google").length} reviews
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-slate-400">Yelp</span>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold dark:text-slate-100">{platformAvg("yelp")}</div>
              <div className="mt-1 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <div className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                {reviews.filter((r) => r.platform === "yelp").length} reviews
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-slate-400">Facebook</span>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold dark:text-slate-100">
                {platformAvg("facebook")}
              </div>
              <div className="mt-1 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <div className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                {reviews.filter((r) => r.platform === "facebook").length} reviews
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-slate-400">Direct</span>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold dark:text-slate-100">{platformAvg("direct")}</div>
              <div className="mt-1 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <div className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                {reviews.filter((r) => r.platform === "direct").length} reviews
              </div>
            </div>
          </div>

          {/* Reviews List */}
          <div className="rounded-lg bg-white shadow dark:bg-slate-800">
            <div className="border-b p-6 dark:border-slate-700">
              <h2 className="text-xl font-bold dark:text-slate-100">Recent Reviews</h2>
            </div>
            <div className="divide-y">
              {reviews.map((review) => (
                <div key={review.id} className="p-6">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <span className="text-xl font-bold text-blue-600">
                          {review.customerName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="font-semibold">{review.customerName}</h3>
                          {review.verified && (
                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              Verified
                            </span>
                          )}
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${getPlatformBadge(review.platform)}`}
                          >
                            {review.platform.charAt(0).toUpperCase() + review.platform.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span>•</span>
                          <span>{new Date(review.date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{review.jobType}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ml-16">
                    <h4 className="mb-2 font-semibold">{review.title}</h4>
                    <p className="mb-3 text-gray-700">{review.content}</p>

                    {review.response && (
                      <div className="rounded border-l-4 border-blue-500 bg-blue-50 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <ThumbsUp className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-semibold">Your Response</span>
                        </div>
                        <p className="text-sm text-gray-700">{review.response}</p>
                      </div>
                    )}

                    {!review.response && (
                      <button className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                        <MessageSquare className="h-4 w-4" />
                        Respond to review
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Review Widget */}
      {showReviewWidget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-8 dark:bg-slate-800">
            <h2 className="mb-6 text-2xl font-bold dark:text-slate-100">Request Customer Review</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Customer Email</label>
                <input
                  type="email"
                  className="w-full rounded-lg border px-4 py-2"
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Job Completed</label>
                <select
                  className="w-full rounded-lg border px-4 py-2"
                  aria-label="Select review rating"
                >
                  <option>Roof Replacement - John Smith</option>
                  <option>Gutter Cleaning - Sarah Johnson</option>
                  <option>Roof Repair - Mike Davis</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Message (Optional)</label>
                <textarea
                  className="w-full rounded-lg border px-4 py-3"
                  rows={4}
                  placeholder="Thank you for choosing us! We'd love to hear about your experience..."
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Preferred Platform</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    <span>Google</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />
                    <span>Yelp</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />
                    <span>Facebook</span>
                  </label>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Button className="flex-1">Send Review Request</Button>
                <Button onClick={() => setShowReviewWidget(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerReviewsPage;
