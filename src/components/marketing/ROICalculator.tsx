"use client";

import { Calculator, Clock, DollarSign, TrendingUp } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface ROICalculatorProps {
  className?: string;
}

export function ROICalculator({ className }: ROICalculatorProps) {
  const [claimsPerMonth, setClaimsPerMonth] = useState(20);
  const [avgClaimValue, setAvgClaimValue] = useState(15000);
  const [teamSize, setTeamSize] = useState(3);

  // ROI calculations
  const hoursPerClaimSaved = 4; // Hours saved per claim with AI
  const hourlyRate = 75; // Average contractor hourly rate
  const supplementRecoveryRate = 0.15; // 15% more recovered with AI supplements
  const closingRateIncrease = 0.1; // 10% higher close rate with better reports

  const monthlyCost = teamSize * 80;
  const hoursSaved = claimsPerMonth * hoursPerClaimSaved;
  const laborSavings = hoursSaved * hourlyRate;
  const additionalRecovery = claimsPerMonth * avgClaimValue * supplementRecoveryRate;
  const additionalCloses = Math.round(claimsPerMonth * closingRateIncrease) * avgClaimValue;
  const totalMonthlyBenefit = laborSavings + additionalRecovery + additionalCloses;
  const monthlyROI = totalMonthlyBenefit - monthlyCost;
  const roiMultiple = Math.round((totalMonthlyBenefit / monthlyCost) * 10) / 10;

  return (
    <div className={cn("rounded-3xl border bg-card p-8", className)}>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#117CFF]/10">
          <Calculator className="h-6 w-6 text-[#117CFF]" />
        </div>
        <div>
          <h3 className="text-xl font-bold">ROI Calculator</h3>
          <p className="text-sm text-muted-foreground">See your potential savings</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Input: Claims per month */}
        <div>
          <label className="mb-2 flex items-center justify-between text-sm font-medium">
            <span>Claims per month</span>
            <span className="font-bold text-[#117CFF]">{claimsPerMonth}</span>
          </label>
          <input
            type="range"
            min="5"
            max="100"
            value={claimsPerMonth}
            onChange={(e) => setClaimsPerMonth(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-[#117CFF]"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>5</span>
            <span>100</span>
          </div>
        </div>

        {/* Input: Average claim value */}
        <div>
          <label className="mb-2 flex items-center justify-between text-sm font-medium">
            <span>Average claim value</span>
            <span className="font-bold text-[#117CFF]">${avgClaimValue.toLocaleString()}</span>
          </label>
          <input
            type="range"
            min="5000"
            max="50000"
            step="1000"
            value={avgClaimValue}
            onChange={(e) => setAvgClaimValue(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-[#117CFF]"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>$5K</span>
            <span>$50K</span>
          </div>
        </div>

        {/* Input: Team size */}
        <div>
          <label className="mb-2 flex items-center justify-between text-sm font-medium">
            <span>Team size (seats)</span>
            <span className="font-bold text-[#117CFF]">{teamSize}</span>
          </label>
          <input
            type="range"
            min="1"
            max="25"
            value={teamSize}
            onChange={(e) => setTeamSize(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-[#117CFF]"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>25</span>
          </div>
        </div>

        {/* Results */}
        <div className="mt-6 border-t pt-6">
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Hours Saved</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{hoursSaved}/mo</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Monthly Cost</span>
              </div>
              <p className="text-2xl font-bold text-foreground">${monthlyCost}</p>
            </div>
          </div>

          <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6">
            <div className="mb-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">Monthly ROI</span>
            </div>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">
              +${monthlyROI.toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              That&apos;s a{" "}
              <span className="font-semibold text-green-600 dark:text-green-400">
                {roiMultiple}x return
              </span>{" "}
              on your investment
            </p>
          </div>

          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <p>
              • Labor savings: ${laborSavings.toLocaleString()}/mo ({hoursPerClaimSaved}h saved per
              claim × ${hourlyRate}/hr)
            </p>
            <p>
              • Additional supplement recovery: ${additionalRecovery.toLocaleString()}/mo (+15% with
              AI)
            </p>
            <p>
              • Higher close rate: ${additionalCloses.toLocaleString()}/mo (+10% with better
              reports)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
