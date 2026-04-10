import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - SkaiScraper",
  description: "Terms and conditions for using SkaiScraper.",
};

export default function TermsPage() {
  return (
    <div className="container max-w-4xl py-16">
      <h1 className="mb-4 text-4xl font-bold">Terms of Service</h1>
      <p className="mb-8 text-muted-foreground">Last updated: December 21, 2024</p>

      <div className="prose prose-blue max-w-none">
        <p className="lead">
          By using SkaiScraper, you agree to these terms. Please read them carefully.
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using SkaiScraper (&quot;the Service&quot;), you agree to be bound by these Terms of
          Service (&quot;Terms&quot;). If you do not agree, do not use the Service.
        </p>

        <h2>2. Beta Testing</h2>
        <p>
          SkaiScraper is currently in <strong>beta testing</strong>. During this period:
        </p>
        <ul>
          <li>All features are provided free of charge</li>
          <li>Service may be interrupted or modified without notice</li>
          <li>Data may be migrated or reset as we improve the platform</li>
          <li>We appreciate your feedback and bug reports</li>
        </ul>
        <p>Beta status does not diminish our commitment to data security and privacy.</p>

        <h2>3. Account Registration</h2>
        <ul>
          <li>You must provide accurate, complete information when creating an account</li>
          <li>You are responsible for maintaining the security of your account</li>
          <li>You must notify us immediately of any unauthorized access</li>
          <li>One account per organization (no duplicate accounts)</li>
        </ul>

        <h2>4. Acceptable Use</h2>
        <p>
          You agree <strong>NOT</strong> to:
        </p>
        <ul>
          <li>Use the Service for illegal purposes or to violate any laws</li>
          <li>Upload malicious code, viruses, or harmful content</li>
          <li>Attempt to hack, reverse engineer, or compromise the Service</li>
          <li>Scrape data or automate access without permission</li>
          <li>Impersonate others or misrepresent your affiliation</li>
          <li>Share your account credentials with unauthorized users</li>
        </ul>

        <h2>5. Intellectual Property</h2>
        <h3>Your Content</h3>
        <p>
          You retain ownership of all data you upload (claims, photos, documents, etc.). By using
          the Service, you grant us a license to:
        </p>
        <ul>
          <li>Store, process, and display your content to provide the Service</li>
          <li>Use AI models to analyze and generate reports from your data</li>
          <li>Create anonymized, aggregated analytics (no personally identifiable information)</li>
        </ul>

        <h3>Our Platform</h3>
        <p>
          SkaiScraper owns all rights to the software, UI, code, and AI models. You may not copy,
          redistribute, or reverse engineer our platform.
        </p>

        <h2>6. Payment & Billing</h2>
        <p>
          <strong>Beta Period:</strong> Currently free. When billing is enabled:
        </p>
        <ul>
          <li>You&apos;ll be notified 30 days before any charges</li>
          <li>Payments processed securely via Stripe</li>
          <li>Subscription auto-renews unless you cancel</li>
          <li>Refunds handled case-by-case (contact support)</li>
        </ul>

        <h2>7. Service Availability</h2>
        <ul>
          <li>We strive for 99.9% uptime but do not guarantee uninterrupted service</li>
          <li>Scheduled maintenance will be announced in advance when possible</li>
          <li>We are not liable for damages from service outages</li>
        </ul>

        <h2>8. Data Backup & Loss</h2>
        <ul>
          <li>We perform daily backups of all data</li>
          <li>You are responsible for maintaining your own backups of critical data</li>
          <li>We are not liable for data loss due to user error, bugs, or force majeure</li>
        </ul>

        <h2>9. Termination</h2>
        <h3>By You</h3>
        <p>
          You may cancel your account at any time from the settings page. Data will be deleted
          within 30 days.
        </p>

        <h3>By Us</h3>
        <p>We may suspend or terminate your account if you:</p>
        <ul>
          <li>Violate these Terms</li>
          <li>Engage in fraudulent activity</li>
          <li>Fail to pay (when billing is enabled)</li>
          <li>Abuse the Service or harm other users</li>
        </ul>

        <h2>10. Disclaimers & Limitations of Liability</h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE THAT
          AI-GENERATED REPORTS ARE ACCURATE, COMPLETE, OR SUITABLE FOR YOUR SPECIFIC USE CASE.
        </p>
        <p>
          YOU ARE RESPONSIBLE FOR REVIEWING ALL AI-GENERATED CONTENT BEFORE SUBMITTING IT TO
          INSURANCE COMPANIES, COURTS, OR OTHER THIRD PARTIES.
        </p>
        <p>
          WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE
          OF THE SERVICE.
        </p>

        <h2>11. Indemnification</h2>
        <p>
          You agree to indemnify SkaiScraper from any claims, damages, or expenses arising from your
          violation of these Terms or your use of the Service.
        </p>

        <h2>12. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of [Your State], USA. Disputes will be
          resolved in [Your County] courts.
        </p>

        <h2>13. Changes to Terms</h2>
        <p>
          We may update these Terms periodically. We&apos;ll notify you of significant changes via email.
          Continued use of the Service constitutes acceptance of the updated Terms.
        </p>

        <h2>14. Contact</h2>
        <p>
          Questions about these Terms? Email us at{" "}
          <a href="mailto:legal@skaiscrape.com">legal@skaiscrape.com</a> or visit our{" "}
          <Link href="/support">support page</Link>.
        </p>
      </div>
    </div>
  );
}
