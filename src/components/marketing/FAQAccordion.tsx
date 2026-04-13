"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
  className?: string;
}

export function FAQAccordion({ items, className }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border bg-card transition-all">
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-muted/50"
          >
            <span className="pr-4 font-semibold text-foreground">{item.question}</span>
            <ChevronDown
              className={cn(
                "h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200",
                openIndex === index && "rotate-180"
              )}
            />
          </button>
          <div
            className={cn(
              "grid transition-all duration-200 ease-in-out",
              openIndex === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            )}
          >
            <div className="overflow-hidden">
              <p className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Pre-built FAQ sets for different pages
export const pricingFAQs: FAQItem[] = [
  {
    question: "Why per-seat pricing instead of tiers?",
    answer:
      "Tiers create artificial limits and upgrade pressure. With per-seat pricing, a solo operator pays the same rate as a 200-person company. Everyone gets every feature. No gotchas, no 'upgrade to unlock' moments.",
  },
  {
    question: "Can I add or remove seats mid-month?",
    answer:
      "Yes! Stripe prorates automatically. If you add 5 seats halfway through the month, you only pay for the remaining days. Remove seats anytime and get credit toward your next invoice.",
  },
  {
    question: 'What counts as a "seat"?',
    answer:
      "A seat is one team member who can log in and use the platform. Each user needs their own seat. Client portal access is FREE and unlimited — your homeowners never pay anything.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes! All new accounts get a 3-day free trial with full access to every feature. No credit card required to start. You'll only be charged after you decide to continue.",
  },
  {
    question: "Do you offer enterprise discounts?",
    answer:
      "Our per-seat pricing is already competitive at scale ($80/seat). For teams of 100+ seats, contact us to discuss custom onboarding, dedicated support, and volume arrangements.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Absolutely. No contracts, no cancellation fees, no hassle. Cancel from your Stripe billing portal and keep access until the end of your billing period.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards through Stripe. For enterprise accounts (100+ seats), we can also arrange ACH transfers or invoiced billing.",
  },
  {
    question: "Is client portal access included?",
    answer:
      "Yes! Unlimited clients can access the portal for free. They can view their claim status, upload photos, sign documents, and communicate with your team — all at no extra cost.",
  },
];

export const featuresFAQs: FAQItem[] = [
  {
    question: "How accurate is the AI damage detection?",
    answer:
      "Our AI has been trained on hundreds of thousands of storm damage photos. It identifies hail hits, wind damage, and wear patterns with high accuracy. However, it's designed to assist — not replace — your professional judgment.",
  },
  {
    question: "Where does the weather data come from?",
    answer:
      "We pull from NOAA radar archives, providing property-level storm verification with precise hail size, wind speeds, and storm dates. Reports include confidence scoring and can be exported as carrier-ready PDFs.",
  },
  {
    question: "Can I white-label reports with my branding?",
    answer:
      "Yes! Upload your logo, set your colors, and every PDF report goes out with your company branding. Premium plans include custom report templates and cover pages.",
  },
  {
    question: "Does the platform integrate with my existing tools?",
    answer:
      "We integrate with Stripe for billing, and our API allows custom integrations. We're actively building integrations with popular CRMs and estimating software — let us know what you need!",
  },
  {
    question: "How does the trades network work?",
    answer:
      "Connect with vetted contractors, roofers, and specialty trades. Send work requests, share job packets, and collaborate on claims. Think of it as LinkedIn meets a contractor marketplace.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. We use bank-level encryption (AES-256), SOC 2 compliant infrastructure, and strict tenant isolation. Your data is yours — we never share or sell it.",
  },
];
