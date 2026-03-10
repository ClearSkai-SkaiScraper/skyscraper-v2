"use client";

import { Building2, Mail, Phone, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ConnectionCardProps {
  conn: {
    id: string;
    type: string;
    name: string;
    logo?: string | null;
    verified?: boolean;
    city?: string | null;
    state?: string | null;
    email?: string | null;
    phone?: string | null;
    specialties?: string[];
    companyId?: string;
  };
}

export function ConnectionCard({ conn }: ConnectionCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    // Navigate to trades company profile if we have a companyId
    if (conn.companyId) {
      router.push(`/trades/companies/${conn.companyId}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group block cursor-pointer rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-[0_0_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-all hover:scale-[1.02] hover:border-amber-500/50 hover:shadow-xl dark:border-slate-800/50 dark:bg-slate-900/50"
    >
      <div className="pointer-events-none">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {conn.logo ? (
              <img src={conn.logo} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Building2 className="h-5 w-5 text-amber-600" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 transition group-hover:text-amber-700 dark:text-white">
                {conn.name}
              </h3>
              <Badge
                variant="secondary"
                className={`text-xs ${
                  conn.type === "vendor"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : conn.type === "subcontractor"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                }`}
              >
                {conn.type === "vendor"
                  ? "Vendor"
                  : conn.type === "subcontractor"
                    ? "Subcontractor"
                    : "Contractor"}
              </Badge>
            </div>
          </div>
          {conn.verified && <UserCheck className="h-5 w-5 text-green-500" />}
        </div>
        <div className="space-y-2">
          {conn.city && conn.state && (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {conn.city}, {conn.state}
            </div>
          )}
          {conn.email && (
            <div className="truncate text-sm text-slate-600 dark:text-slate-400">{conn.email}</div>
          )}
          {conn.phone && (
            <div className="text-sm text-slate-600 dark:text-slate-400">{conn.phone}</div>
          )}
          {conn.specialties && conn.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {conn.specialties.slice(0, 3).map((s: string, i: number) => (
                <span
                  key={i}
                  className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Action buttons */}
        {(conn.phone || conn.email) && (
          <div className="pointer-events-auto mt-4 flex items-center gap-2">
            {conn.phone && (
              <a href={`tel:${conn.phone}`} className="flex-1" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
              </a>
            )}
            {conn.email && (
              <a
                href={`mailto:${conn.email}`}
                className="flex-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
