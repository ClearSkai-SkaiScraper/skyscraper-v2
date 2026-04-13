"use client";

import { cn } from "@/lib/utils";

interface CustomerLogosProps {
  className?: string;
}

// Placeholder logos - replace with real customer logos when available
const CUSTOMERS = [
  { name: "Storm Shield Roofing", initials: "SS" },
  { name: "Apex Restoration", initials: "AR" },
  { name: "Heritage Contractors", initials: "HC" },
  { name: "Blue Sky Roofing", initials: "BS" },
  { name: "Summit Exteriors", initials: "SE" },
  { name: "Precision Storm", initials: "PS" },
  { name: "Elite Roof Pros", initials: "ER" },
  { name: "Guardian Restoration", initials: "GR" },
];

export function CustomerLogos({ className }: CustomerLogosProps) {
  return (
    <div className={cn("py-12", className)}>
      <p className="mb-8 text-center text-sm font-medium text-muted-foreground">
        Trusted by{" "}
        <span className="font-semibold text-foreground">50+ storm restoration contractors</span>{" "}
        across the country
      </p>

      <div className="relative overflow-hidden">
        {/* Gradient masks */}
        <div className="absolute bottom-0 left-0 top-0 z-10 w-20 bg-gradient-to-r from-background to-transparent" />
        <div className="absolute bottom-0 right-0 top-0 z-10 w-20 bg-gradient-to-l from-background to-transparent" />

        {/* Scrolling logos */}
        <div className="animate-scroll flex">
          {[...CUSTOMERS, ...CUSTOMERS].map((customer, index) => (
            <div
              key={`${customer.name}-${index}`}
              className="mx-8 flex flex-shrink-0 items-center justify-center"
            >
              <div className="flex items-center gap-3 rounded-xl border bg-card/50 px-6 py-3 transition-colors hover:bg-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#117CFF] to-[#004AAD] text-sm font-bold text-white">
                  {customer.initials}
                </div>
                <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  {customer.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
