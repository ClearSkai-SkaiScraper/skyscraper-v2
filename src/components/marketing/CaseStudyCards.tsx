"use client";

import { ArrowRight, Building2, DollarSign, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface CaseStudy {
  company: string;
  location: string;
  logo?: string;
  initials: string;
  metric1: { label: string; value: string; icon: React.ReactNode };
  metric2: { label: string; value: string; icon: React.ReactNode };
  metric3: { label: string; value: string; icon: React.ReactNode };
  quote: string;
  author: string;
  role: string;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    company: "Summit Exteriors",
    location: "Phoenix, AZ",
    initials: "SE",
    metric1: { label: "Claims Processed", value: "340%", icon: <TrendingUp className="h-4 w-4" /> },
    metric2: { label: "Time Saved", value: "18 hrs/wk", icon: <Users className="h-4 w-4" /> },
    metric3: {
      label: "Revenue Increase",
      value: "+$127K",
      icon: <DollarSign className="h-4 w-4" />,
    },
    quote:
      "We went from 15 claims a month to 50+ without adding staff. The AI reports close deals faster.",
    author: "Mike Torres",
    role: "Owner",
  },
  {
    company: "Heritage Restoration",
    location: "Dallas, TX",
    initials: "HR",
    metric1: {
      label: "Supplement Win Rate",
      value: "89%",
      icon: <TrendingUp className="h-4 w-4" />,
    },
    metric2: {
      label: "Avg Recovery Increase",
      value: "+$4,200",
      icon: <DollarSign className="h-4 w-4" />,
    },
    metric3: { label: "Team Seats", value: "12", icon: <Users className="h-4 w-4" /> },
    quote:
      "The supplement builder alone paid for the entire platform in the first month. Carriers can't argue with our reports.",
    author: "Sarah Chen",
    role: "Operations Manager",
  },
  {
    company: "Apex Storm Pros",
    location: "Oklahoma City, OK",
    initials: "AS",
    metric1: {
      label: "Door Knocking Leads",
      value: "2,400/mo",
      icon: <Building2 className="h-4 w-4" />,
    },
    metric2: {
      label: "Lead-to-Close Rate",
      value: "34%",
      icon: <TrendingUp className="h-4 w-4" />,
    },
    metric3: {
      label: "Revenue (6 months)",
      value: "$1.2M",
      icon: <DollarSign className="h-4 w-4" />,
    },
    quote:
      "The storm mapping and door knocking tools changed our entire sales approach. We hit storms before competitors even know they happened.",
    author: "James Williams",
    role: "Sales Director",
  },
];

interface CaseStudyCardsProps {
  className?: string;
  limit?: number;
}

export function CaseStudyCards({ className, limit }: CaseStudyCardsProps) {
  const studies = limit ? CASE_STUDIES.slice(0, limit) : CASE_STUDIES;

  return (
    <div className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3", className)}>
      {studies.map((study) => (
        <div
          key={study.company}
          className="group rounded-2xl border bg-card p-6 transition-all hover:border-[#117CFF]/30 hover:shadow-lg"
        >
          {/* Header */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#117CFF] to-[#004AAD] font-bold text-white">
              {study.initials}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{study.company}</h3>
              <p className="text-sm text-muted-foreground">{study.location}</p>
            </div>
          </div>

          {/* Metrics */}
          <div className="mb-4 grid grid-cols-3 gap-2">
            {[study.metric1, study.metric2, study.metric3].map((metric, i) => (
              <div key={i} className="rounded-lg bg-muted/50 p-2 text-center">
                <div className="mb-1 flex items-center justify-center text-[#117CFF]">
                  {metric.icon}
                </div>
                <p className="text-lg font-bold text-foreground">{metric.value}</p>
                <p className="text-[10px] leading-tight text-muted-foreground">{metric.label}</p>
              </div>
            ))}
          </div>

          {/* Quote */}
          <blockquote className="mb-4 border-l-2 border-[#117CFF]/30 pl-3">
            <p className="text-sm italic text-muted-foreground">&ldquo;{study.quote}&rdquo;</p>
          </blockquote>

          {/* Author */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{study.author}</p>
              <p className="text-xs text-muted-foreground">{study.role}</p>
            </div>
            <Link
              href="/contact"
              className="flex items-center gap-1 text-xs font-medium text-[#117CFF] opacity-0 transition-opacity group-hover:opacity-100"
            >
              Read more <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
