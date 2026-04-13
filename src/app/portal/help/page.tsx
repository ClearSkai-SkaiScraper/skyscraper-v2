"use client";

/**
 * Portal Help Center (C2 Enhancement)
 *
 * FAQ accordion with common client questions about:
 * - Insurance claims process
 * - How to submit photos
 * - Claim timeline expectations
 * - Contacting support
 */

import {
  Camera,
  ChevronDown,
  Clock,
  FileText,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  icon: React.ReactNode;
  category: string;
}

const FAQ_ITEMS: FAQItem[] = [
  // Claims Process
  {
    id: "faq-1",
    category: "Claims Process",
    question: "What happens after I file a claim?",
    answer:
      "Once you file a claim, our team reviews your submission within 24-48 hours. We'll assign an inspector to assess the damage, contact your insurance company on your behalf, and keep you updated at every step through your portal dashboard and email notifications.",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: "faq-2",
    category: "Claims Process",
    question: "How long does the claims process take?",
    answer:
      "Most claims are processed within 2-4 weeks from initial filing to approval. Simple claims may resolve faster, while complex cases or those requiring additional documentation may take longer. You can track your claim status in real-time through your portal.",
    icon: <Clock className="h-5 w-5" />,
  },
  {
    id: "faq-3",
    category: "Claims Process",
    question: "What if my insurance company denies my claim?",
    answer:
      "Don't worry — we specialize in helping homeowners navigate denied claims. Our team will review the denial, gather additional evidence if needed, and file an appeal on your behalf. Many initially denied claims are successfully overturned with proper documentation.",
    icon: <Shield className="h-5 w-5" />,
  },

  // Photo Submission
  {
    id: "faq-4",
    category: "Photo Submission",
    question: "What kind of photos should I submit?",
    answer:
      "Take clear photos of all damage from multiple angles. Include wide shots showing the overall area, close-ups of specific damage, and any supporting evidence like fallen debris or damaged items. The more photos, the better — our AI will help identify and categorize the damage.",
    icon: <Camera className="h-5 w-5" />,
  },
  {
    id: "faq-5",
    category: "Photo Submission",
    question: "How do I upload photos to my claim?",
    answer:
      "Go to your claim details page and click 'Add Photos'. You can drag and drop multiple photos, or click to select them from your device. Each photo will show upload progress, and our AI will automatically analyze them for damage detection.",
    icon: <Camera className="h-5 w-5" />,
  },
  {
    id: "faq-6",
    category: "Photo Submission",
    question: "Can I submit videos of the damage?",
    answer:
      "Currently, we accept photos in JPG, PNG, and WEBP formats (up to 25MB each). For video evidence, we recommend taking screenshots of key frames and uploading those as photos. Video upload support is coming soon!",
    icon: <Camera className="h-5 w-5" />,
  },

  // Timeline & Updates
  {
    id: "faq-7",
    category: "Timeline & Updates",
    question: "How will I know when there's an update on my claim?",
    answer:
      "You'll receive email notifications for all major updates. You can also check your portal dashboard anytime to see the current status, view messages from our team, and access all documents related to your claim.",
    icon: <MessageCircle className="h-5 w-5" />,
  },
  {
    id: "faq-8",
    category: "Timeline & Updates",
    question: "What do the different claim statuses mean?",
    answer:
      "FILED = We received your claim. INSPECTION = An inspector has been assigned. ESTIMATE = We're preparing the repair estimate. APPROVED = Insurance approved the claim. IN PROGRESS = Repairs are underway. COMPLETED = Your claim is fully resolved.",
    icon: <Clock className="h-5 w-5" />,
  },

  // Support
  {
    id: "faq-9",
    category: "Support",
    question: "How do I contact my claims specialist?",
    answer:
      "You can message your claims specialist directly through the portal by clicking 'Messages' on your claim page. For urgent matters, you can also call our support line during business hours (Monday-Friday, 8am-6pm local time).",
    icon: <Phone className="h-5 w-5" />,
  },
  {
    id: "faq-10",
    category: "Support",
    question: "I have a question that's not listed here. What should I do?",
    answer:
      "No problem! Send us a message through your portal or email support@skaiscrape.com. Our team typically responds within 1 business day. For urgent issues, please call our support line.",
    icon: <HelpCircle className="h-5 w-5" />,
  },
];

export default function PortalHelpPage() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Group FAQs by category
  const categories = Array.from(new Set(FAQ_ITEMS.map((item) => item.category)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="border-b border-border bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <HelpCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Help Center</h1>
              <p className="text-sm text-muted-foreground">
                Find answers to common questions about your claims
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category}>
              <h2 className="mb-4 text-lg font-semibold text-foreground">{category}</h2>
              <div className="space-y-3">
                {FAQ_ITEMS.filter((item) => item.category === category).map((item) => (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-xl border border-border bg-white shadow-sm dark:bg-slate-900"
                  >
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        {item.icon}
                      </div>
                      <span className="flex-1 font-medium text-foreground">{item.question}</span>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200",
                          openItems.has(item.id) && "rotate-180"
                        )}
                      />
                    </button>
                    <div
                      className={cn(
                        "grid transition-all duration-200",
                        openItems.has(item.id) ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground">
                          {item.answer}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Support Card */}
        <div className="mt-10 rounded-xl border border-border bg-gradient-to-br from-blue-50 to-indigo-50 p-6 dark:from-blue-900/20 dark:to-indigo-900/20">
          <h3 className="mb-2 text-lg font-semibold text-foreground">Still need help?</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Our support team is here to assist you with any questions.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/portal/messages"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <MessageCircle className="h-4 w-4" />
              Send Message
            </Link>
            <a
              href="mailto:support@skaiscrape.com"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <Mail className="h-4 w-4" />
              Email Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
