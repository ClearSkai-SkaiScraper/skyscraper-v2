"use client";

import { useOrganization } from "@clerk/nextjs";
import { Clock, CreditCard } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface TrialInfo {
  isActive: boolean;
  hasEnded: boolean;
  timeRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
}

export default function TrialBanner() {
  const { organization } = useOrganization();
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (!organization) return;

    // Fetch trial info
    const fetchTrialInfo = async () => {
      try {
        const res = await fetch(`/api/trial/status?orgId=${organization.id}`);
        if (res.ok) {
          const data = await res.json();
          setTrialInfo(data);
        }
      } catch (error) {
        logger.error("Failed to fetch trial info:", error);
      }
    };

    void fetchTrialInfo();

    // Update countdown every minute
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
      void fetchTrialInfo(); // Refresh trial data
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [organization]);

  // Don't show if no trial or not active
  if (!trialInfo || !trialInfo.isActive) {
    return null;
  }

  const hours = trialInfo.hoursRemaining;
  const minutes = trialInfo.minutesRemaining;

  // Different urgency levels
  const isUrgent = hours < 24;
  const isCritical = hours < 1;

  const bgColor = isCritical
    ? "bg-red-50 border-red-200"
    : isUrgent
      ? "bg-amber-50 border-amber-200"
      : "bg-blue-50 border-blue-200";

  const textColor = isCritical ? "text-red-900" : isUrgent ? "text-amber-900" : "text-blue-900";

  const accentColor = isCritical ? "text-red-600" : isUrgent ? "text-amber-600" : "text-blue-600";

  return (
    <div className={`mb-6 rounded-lg border p-4 ${bgColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className={`h-5 w-5 ${accentColor}`} />
          <div>
            <h3 className={`font-semibold ${textColor}`}>Free Trial Active</h3>
            <p className={`text-sm ${textColor}`}>
              {hours}h {minutes}m remaining
              {isCritical && " — Trial expires soon!"}
              {isUrgent && !isCritical && " — Less than 24 hours left"}
            </p>
          </div>
        </div>
        <Link
          href="/pricing"
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
            isCritical
              ? "bg-red-600 text-white hover:bg-red-700"
              : isUrgent
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Subscribe Now
        </Link>
      </div>
    </div>
  );
}
