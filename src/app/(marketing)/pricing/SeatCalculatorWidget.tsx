"use client";

import { Minus, Plus, Rocket, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const PRICE_PER_SEAT = 80;
const MIN_SEATS = 1;
const MAX_SEATS = 500;

const QUICK_PICKS = [1, 5, 10, 25, 50, 100, 200];

export default function SeatCalculatorWidget() {
  const router = useRouter();
  const [seats, setSeats] = useState(5);
  const [loading, setLoading] = useState(false);

  const monthly = seats * PRICE_PER_SEAT;
  const annual = monthly * 12;

  function adjustSeats(delta: number) {
    setSeats((prev) => Math.max(MIN_SEATS, Math.min(MAX_SEATS, prev + delta)));
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setSeats(Math.max(MIN_SEATS, Math.min(MAX_SEATS, val)));
    }
  }

  async function handleSubscribe() {
    setLoading(true);
    try {
      // Send to Stripe Checkout via our API
      const res = await fetch("/api/stripe/checkout-seats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatCount: seats }),
      });

      const data = await res.json();

      if (data.requiresAuth) {
        // User not signed in - redirect to sign-up with seats param
        router.push(`/sign-up?seats=${seats}`);
        return;
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
        return;
      }

      if (data.error) {
        alert(data.error);
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-3xl border-2 border-[#117CFF]/20 bg-card shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#117CFF] via-[#0066DD] to-[#004AAD] px-8 py-6 text-center text-white">
          <h3 className="text-xl font-bold">Choose Your Team Size</h3>
          <p className="mt-1 text-sm text-white/70">
            $80/seat/month · Every feature included · Cancel anytime
          </p>
        </div>

        <div className="space-y-6 p-8">
          {/* Seat Picker */}
          <div className="flex flex-col items-center gap-4">
            <label className="text-sm font-medium text-muted-foreground">Number of Seats</label>

            <div className="flex items-center gap-3">
              <button
                onClick={() => adjustSeats(-1)}
                disabled={seats <= MIN_SEATS}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-200 text-slate-600 transition-all hover:border-[#117CFF] hover:bg-[#117CFF]/10 hover:text-[#117CFF] disabled:opacity-30 dark:border-slate-700 dark:text-slate-400"
                aria-label="Remove seat"
              >
                <Minus className="h-5 w-5" />
              </button>

              <input
                type="number"
                min={MIN_SEATS}
                max={MAX_SEATS}
                value={seats}
                onChange={handleInputChange}
                className="h-16 w-28 rounded-xl border-2 border-slate-200 bg-transparent text-center text-3xl font-bold text-foreground focus:border-[#117CFF] focus:outline-none focus:ring-2 focus:ring-[#117CFF]/20 dark:border-slate-700 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />

              <button
                onClick={() => adjustSeats(1)}
                disabled={seats >= MAX_SEATS}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-200 text-slate-600 transition-all hover:border-[#117CFF] hover:bg-[#117CFF]/10 hover:text-[#117CFF] disabled:opacity-30 dark:border-slate-700 dark:text-slate-400"
                aria-label="Add seat"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Pick Buttons */}
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_PICKS.map((n) => (
              <button
                key={n}
                onClick={() => setSeats(n)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  seats === n
                    ? "bg-[#117CFF] text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {n} {n === 1 ? "seat" : "seats"}
              </button>
            ))}
          </div>

          {/* Price Breakdown */}
          <div className="rounded-2xl bg-slate-50 p-6 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {seats} seat{seats !== 1 ? "s" : ""} × $80/mo
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-[#117CFF]">
                  ${monthly.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">per month</div>
              </div>
            </div>
            <div className="mt-3 border-t border-slate-200 pt-3 text-right text-sm text-muted-foreground dark:border-slate-700">
              ${annual.toLocaleString()}/year
            </div>
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleSubscribe}
            disabled={loading}
            size="lg"
            className="w-full rounded-xl bg-gradient-to-r from-[#117CFF] to-[#004AAD] py-6 text-lg font-bold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Processing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Start Subscription — {seats} Seat{seats !== 1 ? "s" : ""} · ${monthly.toLocaleString()}/mo
              </span>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            14-day free trial included · Powered by Stripe · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
