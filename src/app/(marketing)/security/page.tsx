import { AlertCircle, CheckCircle,Database, Eye, Lock, Shield } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Security - SkaiScraper",
  description: "Learn how we protect your data with industry-standard security practices.",
};

export default function SecurityPage() {
  return (
    <div className="container max-w-6xl py-16">
      <div className="mb-12 text-center">
        <Shield className="mx-auto mb-4 h-16 w-16 text-blue-600" />
        <h1 className="mb-4 text-4xl font-bold">Security & Data Protection</h1>
        <p className="text-xl text-muted-foreground">
          Your data is critical to your business. Here&apos;s how we keep it safe.
        </p>
      </div>

      <div className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <Lock className="mb-2 h-8 w-8 text-blue-600" />
            <CardTitle>Encryption Everywhere</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>All data transmitted over HTTPS (TLS 1.3)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>Database encrypted at rest (AES-256)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>File storage encrypted (Supabase)</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Database className="mb-2 h-8 w-8 text-blue-600" />
            <CardTitle>Organization Isolation</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>Every query is scoped to your org</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>No cross-org data access possible</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>API routes verify ownership before serving data</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Eye className="mb-2 h-8 w-8 text-blue-600" />
            <CardTitle>Access Control</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>Authentication via Clerk (SOC 2 compliant)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>Multi-factor authentication (MFA) available</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>Role-based permissions (Admin/User/Viewer)</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="prose prose-blue max-w-none">
        <h2>Data Handling Practices</h2>

        <h3>What We Store</h3>
        <ul>
          <li>Claims, properties, and client data (scoped to your organization)</li>
          <li>Photos and documents (Supabase encrypted storage)</li>
          <li>AI-generated reports and artifacts</li>
          <li>Activity logs (for debugging and analytics)</li>
        </ul>

        <h3>What We Don&apos;t Store</h3>
        <ul>
          <li>Credit card numbers (processed by Stripe, PCI DSS Level 1)</li>
          <li>Plaintext passwords (hashed by Clerk)</li>
          <li>Unnecessary personal information</li>
        </ul>

        <h3>Third-Party Services</h3>
        <p>We rely on industry-leading security providers:</p>
        <ul>
          <li>
            <strong>Clerk:</strong> Authentication & user management (SOC 2 Type II certified)
          </li>
          <li>
            <strong>Supabase:</strong> PostgreSQL database & file storage (ISO 27001 certified)
          </li>
          <li>
            <strong>Stripe:</strong> Payment processing (PCI DSS Level 1)
          </li>
          <li>
            <strong>OpenAI:</strong> AI model processing (enterprise-grade security)
          </li>
          <li>
            <strong>Vercel:</strong> Hosting & deployment (SOC 2 certified)
          </li>
        </ul>

        <h2>Monitoring & Incident Response</h2>
        <ul>
          <li>
            <strong>Real-time Monitoring:</strong> Sentry error tracking, uptime monitors
          </li>
          <li>
            <strong>Automated Backups:</strong> Daily database snapshots, 30-day retention
          </li>
          <li>
            <strong>Incident Response:</strong> 24-hour notification for security incidents
          </li>
          <li>
            <strong>Regular Audits:</strong> Quarterly security reviews and penetration testing
          </li>
        </ul>

        <h2>Compliance</h2>
        <ul>
          <li>
            <strong>GDPR Ready:</strong> Data portability, right to deletion, data processing
            agreements
          </li>
          <li>
            <strong>CCPA Compliant:</strong> California consumer privacy protections
          </li>
          <li>
            <strong>HIPAA Considerations:</strong> Not currently HIPAA compliant (medical data not
            supported)
          </li>
        </ul>

        <div className="not-prose my-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
            <div className="text-sm text-yellow-900">
              <p className="font-semibold">Beta Disclaimer</p>
              <p className="mt-1">
                While SkaiScraper is in beta, we maintain production-level security practices.
                However, we recommend maintaining your own backups of critical data until we exit
                beta.
              </p>
            </div>
          </div>
        </div>

        <h2>Report a Security Issue</h2>
        <p>
          If you discover a security vulnerability, please email us immediately at{" "}
          <a href="mailto:security@skaiscrape.com">security@skaiscrape.com</a>. We take all reports
          seriously and respond within 24 hours.
        </p>
        <p>
          Please <strong>do not</strong> publicly disclose security issues until we&apos;ve had a chance
          to address them. We appreciate responsible disclosure.
        </p>

        <h2>Questions?</h2>
        <p>
          For more information about our security practices, contact us at{" "}
          <a href="mailto:security@skaiscrape.com">security@skaiscrape.com</a> or visit our{" "}
          <Link href="/support">support page</Link>.
        </p>
      </div>
    </div>
  );
}
