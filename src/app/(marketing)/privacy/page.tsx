import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - SkaiScraper",
  description: "Our privacy policy explains how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="container max-w-4xl py-16">
      <h1 className="mb-4 text-4xl font-bold">Privacy Policy</h1>
      <p className="mb-8 text-muted-foreground">Last updated: December 21, 2024</p>

      <div className="prose prose-blue max-w-none">
        <p className="lead">
          At SkaiScraper, we take your privacy seriously. This policy explains how we collect, use,
          and protect your data.
        </p>

        <h2>Information We Collect</h2>
        <h3>Account Information</h3>
        <ul>
          <li>Name, email address, and phone number (when you create an account)</li>
          <li>Company/organization details (name, license number, branding assets)</li>
          <li>Billing information (processed securely through Stripe)</li>
        </ul>

        <h3>Usage Data</h3>
        <ul>
          <li>Claims, properties, and client data you enter into the system</li>
          <li>Photos and documents you upload (stored securely in Supabase)</li>
          <li>AI-generated reports and artifacts</li>
          <li>Activity logs and analytics (to improve the product)</li>
        </ul>

        <h3>Technical Data</h3>
        <ul>
          <li>Browser type, device information, and IP address</li>
          <li>Cookies and similar tracking technologies</li>
          <li>Error logs and performance metrics (via Sentry)</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <ul>
          <li>
            <strong>Provide Services:</strong> Process claims, generate AI reports, manage your
            account
          </li>
          <li>
            <strong>Improve Product:</strong> Analyze usage patterns to enhance features
          </li>
          <li>
            <strong>Customer Support:</strong> Respond to questions and resolve issues
          </li>
          <li>
            <strong>Billing:</strong> Process payments and send invoices
          </li>
          <li>
            <strong>Security:</strong> Detect and prevent fraud, abuse, and security threats
          </li>
        </ul>

        <h2>Data Sharing</h2>
        <p>
          We do <strong>NOT</strong> sell your data. We only share data with:
        </p>
        <ul>
          <li>
            <strong>Service Providers:</strong> Clerk (auth), Supabase (storage), Stripe (billing),
            OpenAI (AI processing)
          </li>
          <li>
            <strong>Legal Requirements:</strong> When required by law or to protect our rights
          </li>
        </ul>

        <h2>Data Security</h2>
        <ul>
          <li>All data is transmitted over HTTPS (encrypted in transit)</li>
          <li>Database encrypted at rest (PostgreSQL with Supabase)</li>
          <li>Organization-level data isolation (no cross-org access)</li>
          <li>Regular security audits and penetration testing</li>
        </ul>

        <h2>Your Rights</h2>
        <ul>
          <li>
            <strong>Access:</strong> Request a copy of your data
          </li>
          <li>
            <strong>Correction:</strong> Update inaccurate information
          </li>
          <li>
            <strong>Deletion:</strong> Request account deletion (data removed within 30 days)
          </li>
          <li>
            <strong>Export:</strong> Download your data in portable format
          </li>
        </ul>

        <p>
          To exercise these rights, contact us at{" "}
          <a href="mailto:privacy@skaiscrape.com">privacy@skaiscrape.com</a>
        </p>

        <h2>Cookies</h2>
        <p>We use cookies for:</p>
        <ul>
          <li>Authentication (Clerk session cookies)</li>
          <li>Analytics (PostHog, respects Do Not Track)</li>
          <li>Product improvements (anonymized usage data)</li>
        </ul>
        <p>You can disable cookies in your browser, but some features may not work.</p>

        <h2>Children&apos;s Privacy</h2>
        <p>
          SkaiScraper is not intended for users under 18. We do not knowingly collect data from
          children.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this policy periodically. We&apos;ll notify you of significant changes via email
          or in-app notification.
        </p>

        <h2>Contact Us</h2>
        <p>
          Questions about privacy? Email us at{" "}
          <a href="mailto:privacy@skaiscrape.com">privacy@skaiscrape.com</a> or visit our{" "}
          <Link href="/support">support page</Link>.
        </p>
      </div>
    </div>
  );
}
