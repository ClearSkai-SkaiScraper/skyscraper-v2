"use client";

import { useUser } from "@clerk/nextjs";
import { Check, ChevronDown, ChevronUp, FileText, Mail, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logger } from "@/lib/logger";
import { sanitizeHtml } from "@/lib/sanitize";

interface AgreementDocument {
  id: string;
  title: string;
  version: string;
  content: string;
}

interface SignupAgreementsProps {
  userType: "client" | "pro";
  onComplete?: () => void;
  redirectTo?: string;
}

/**
 * Comprehensive Signup Agreement Component
 *
 * Displays all required legal documents in a single scrollable view
 * with sections for each document. Users must scroll through and
 * accept all terms, plus opt-in/out of marketing communications.
 */
export function SignupAgreements({ userType, onComplete, redirectTo }: SignupAgreementsProps) {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [documents, setDocuments] = useState<AgreementDocument[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Agreement checkboxes
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedUserAgreement, setAcceptedUserAgreement] = useState(false);

  // Email preferences
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [productUpdates, setProductUpdates] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [userType]);

  async function loadDocuments() {
    setLoading(true);
    try {
      // Fetch all required documents for this user type
      const docsToLoad =
        userType === "client"
          ? ["tos", "privacy", "client-agreement"]
          : ["tos", "privacy", "pro-agreement"];

      const loadedDocs: AgreementDocument[] = [];

      for (const docId of docsToLoad) {
        try {
          const res = await fetch(`/api/legal/document/${docId}`);
          if (res.ok) {
            const data = await res.json();
            loadedDocs.push({
              id: docId,
              title: data.title,
              version: data.version,
              content: data.content,
            });
          }
        } catch (err) {
          logger.error(`Failed to load ${docId}:`, err);
        }
      }

      setDocuments(loadedDocs);

      // Auto-expand all sections by default
      const expanded: Record<string, boolean> = {};
      loadedDocs.forEach((doc) => {
        expanded[doc.id] = true;
      });
      setExpandedSections(expanded);
    } catch (error) {
      logger.error("Failed to load documents:", error);
      toast.error("Failed to load agreements. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  const toggleSection = (docId: string) => {
    setExpandedSections((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

  const allAccepted = acceptedTerms && acceptedPrivacy && acceptedUserAgreement;

  async function handleSubmit() {
    if (!allAccepted) {
      toast.error("Please accept all required agreements to continue.");
      return;
    }

    setSubmitting(true);
    try {
      // Record acceptance of each document
      for (const doc of documents) {
        await fetch("/api/legal/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId: doc.id,
            version: doc.version,
          }),
        });
      }

      // Save email preferences
      await fetch("/api/user/email-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketingOptIn,
          productUpdates,
          securityAlerts: true, // Always on
          optInSource: "signup",
        }),
      });

      toast.success("Welcome to SkaiScraper!");

      if (onComplete) {
        onComplete();
      } else if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.push(userType === "client" ? "/portal" : "/dashboard");
      }
    } catch (error) {
      logger.error("Failed to save agreements:", error);
      toast.error("Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          <p className="text-sm text-slate-600">Loading agreements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/20">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome to SkaiScraper</h1>
          <p className="mt-2 text-slate-600">Please review and accept our terms to get started</p>
        </div>

        {/* Main Agreement Card */}
        <Card className="overflow-hidden border-slate-200 shadow-xl">
          <CardContent className="p-0">
            {/* Scrollable Agreement Area */}
            <ScrollArea className="h-[500px] border-b border-slate-200">
              <div className="space-y-6 p-6">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    {/* Section Header */}
                    <button
                      onClick={() => toggleSection(doc.id)}
                      className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{doc.title}</h3>
                          <p className="text-xs text-slate-500">Version {doc.version}</p>
                        </div>
                      </div>
                      {expandedSections[doc.id] ? (
                        <ChevronUp className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      )}
                    </button>

                    {/* Section Content */}
                    {expandedSections[doc.id] && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                        <div
                          className="prose prose-sm prose-slate max-w-none text-slate-700"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content) }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Agreement Checkboxes */}
            <div className="space-y-4 border-b border-slate-200 bg-slate-50 p-6">
              <h3 className="mb-4 font-semibold text-slate-900">Required Agreements</h3>

              <label className="group flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">
                  I have read and agree to the <strong>Terms of Service</strong>
                </span>
              </label>

              <label className="group flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={acceptedPrivacy}
                  onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">
                  I have read and agree to the <strong>Privacy Policy</strong>
                </span>
              </label>

              <label className="group flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={acceptedUserAgreement}
                  onCheckedChange={(checked) => setAcceptedUserAgreement(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">
                  I have read and agree to the{" "}
                  <strong>
                    {userType === "client"
                      ? "Client User Agreement"
                      : "Trades Professional Agreement"}
                  </strong>
                </span>
              </label>
            </div>

            {/* Email Preferences */}
            <div className="space-y-4 border-b border-slate-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Stay Updated</h3>
                  <p className="text-xs text-slate-500">Optional email preferences</p>
                </div>
              </div>

              <label className="group flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={marketingOptIn}
                  onCheckedChange={(checked) => setMarketingOptIn(checked === true)}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm text-slate-700 group-hover:text-slate-900">
                    Yes! Send me news, tips, and special offers
                  </span>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Get the latest updates on new features and exclusive promotions
                  </p>
                </div>
              </label>

              <label className="group flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={productUpdates}
                  onCheckedChange={(checked) => setProductUpdates(checked === true)}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm text-slate-700 group-hover:text-slate-900">
                    Notify me about important product updates
                  </span>
                  <p className="mt-0.5 text-xs text-slate-500">
                    New features, improvements, and platform changes
                  </p>
                </div>
              </label>

              <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
                You can change your email preferences at any time in your account settings. We will
                always notify you about important security alerts.
              </p>
            </div>

            {/* Submit Button */}
            <div className="bg-white p-6">
              <Button
                onClick={handleSubmit}
                disabled={!allAccepted || submitting}
                className="h-12 w-full bg-gradient-to-r from-blue-600 to-blue-700 text-base font-semibold shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="h-5 w-5" />I Accept - Get Started
                  </span>
                )}
              </Button>

              {!allAccepted && (
                <p className="mt-3 text-center text-xs text-amber-600">
                  Please accept all required agreements above to continue
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-500">
          <p>© 2026 ClearSkai Technologies, LLC. All rights reserved.</p>
          <p className="mt-1">
            Questions? Contact us at{" "}
            <a href="mailto:support@skaiscrape.com" className="text-blue-600 hover:underline">
              support@skaiscrape.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
