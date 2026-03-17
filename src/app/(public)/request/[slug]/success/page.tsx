"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

type Contractor = {
  id: string;
  businessName: string;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
};

export default function RequestSuccessPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const searchParams = useSearchParams();
  const router = useRouter();

  const leadId = searchParams?.get("lead");
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/contractors/public/${slug}`);
        const json = await res.json();
        setContractor(json.contractor);
      } catch (err) {
        logger.error(err);
      }
    }
    load();
  }, [slug]);

  async function addToTradeTeam() {
    setAdding(true);

    try {
      const res = await fetch("/api/customer/trade-team/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorSlug: slug,
          trade: "GENERAL",
          makePrimary: true,
        }),
      });

      if (res.ok) {
        setAdded(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 401) {
          // Not signed in
          router.push(`/sign-in?redirect_url=/my/trades`);
        } else {
          alert(errorData.error || "Failed to add to trade team");
        }
      }
    } catch (err) {
      logger.error(err);
      alert("An error occurred. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  if (!leadId) {
    return (
      <div className="mx-auto max-w-xl p-10">
        <h1 className="text-2xl font-bold">Invalid Request</h1>
        <p className="mt-2 text-slate-600">No lead ID provided. Please try again.</p>
        <Button onClick={() => router.push("/find")} className="mt-4">
          Find a Contractor
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-8 p-10 text-center">
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <svg
            className="h-10 w-10 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <h1 className="text-4xl font-bold text-emerald-600">Request Submitted!</h1>

      <p className="text-lg text-slate-700">
        Your service request has been successfully sent to
        <br />
        <span className="font-bold text-slate-900">
          {contractor?.businessName || "the contractor"}
        </span>
      </p>

      <div className="rounded-lg border bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-600">Lead ID</p>
        <p className="font-mono text-xl font-bold">{leadId}</p>
        <p className="mt-2 text-xs text-slate-500">Save this for your records</p>
      </div>

      {/* CTA: Add to Trade Team */}
      <div className="space-y-3">
        {!added ? (
          <Button
            className="w-full bg-amber-500 py-6 text-lg font-semibold hover:bg-amber-600"
            onClick={addToTradeTeam}
            disabled={adding}
          >
            {adding ? "Adding..." : "⭐ Add to My Trade Team"}
          </Button>
        ) : (
          <div className="rounded-lg bg-emerald-50 p-4 text-emerald-700">
            <div className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold">Added to your Trade Team! 🎉</span>
            </div>
          </div>
        )}
        <p className="text-xs text-slate-500">Save this contractor for future projects</p>
      </div>

      <div className="space-y-3 pt-6">
        <h2 className="text-sm font-semibold text-slate-700">What&apos;s Next?</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href={`/c/${slug}`}>
            <Button variant="outline" className="w-full">
              View Contractor Profile
            </Button>
          </Link>
          <Link href="/my/trades">
            <Button variant="outline" className="w-full">
              My Trade Team
            </Button>
          </Link>
        </div>
        <Link href="/find">
          <Button variant="ghost" className="w-full">
            Find More Contractors
          </Button>
        </Link>
      </div>
    </div>
  );
}
