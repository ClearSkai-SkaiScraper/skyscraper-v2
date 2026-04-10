import Link from "next/link";

/**
 * PUBLIC, read-only branding demo for investors/users.
 * No auth required. Mirrors your Branding tabs but non-editable.
 */
export const metadata = {
  title: "SkaiScraper™ Branding Showcase | Investor & Demo View",
  description:
    "See how companies brand their AI reports and packets in SkaiScraper™. Live, read-only demo.",
  openGraph: {
    title: "SkaiScraper™ Branding Showcase",
    siteName: "SkaiScraper",
    description:
      "Investor/demo page showing logos, colors, doc defaults, and team library—read-only.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SkaiScraper™ Branding Showcase",
    description: "Investor/demo page—see branding before sign-in.",
  },
};

export default function ShowcasePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">SkaiScraper™ Branding Showcase</h1>
        <p className="mt-2 text-gray-600">
          Read-only demo of how your company&apos;s look & feel flows into reports and packets.
        </p>
      </header>

      {/* Logos (static demo) */}
      <section className="mb-6 rounded-2xl border p-6">
        <h2 className="mb-2 text-xl font-medium">Logos (Demo)</h2>
        <p className="mb-4 text-gray-600">
          Your primary logo and optional co-brand appear on all PDFs, cover pages, and emails.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            // eslint-disable-next-line react/jsx-no-comment-textnodes
            <div className="mb-2 text-sm text-gray-500">Primary Logo</div>
            // eslint-disable-next-line react/jsx-no-comment-textnodes
            <div className="flex h-24 items-center justify-center rounded bg-gray-50">
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/logo.svg" alt="SkaiScraper" className="h-12" />
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="mb-2 text-sm text-gray-500">Co-brand (example)</div>
            <div className="flex h-24 items-center justify-center rounded bg-gray-50">
              <span className="text-gray-600 dark:text-gray-400">Your Company Logo Here</span>
            </div>
          </div>
        </div>
      </section>

      {/* Colors & Typography (static demo) */}
      <section className="mb-6 rounded-2xl border p-6">
        <h2 className="mb-2 text-xl font-medium">Colors & Typography (Demo)</h2>
        <p className="mb-4 text-gray-600">
          These styles auto-apply to headings, table accents, and badges in PDFs.
        </p>
        <div className="mb-4 flex gap-4">
          <div className="h-12 w-24 rounded-lg bg-[#081A2F]" />
          <div className="h-12 w-24 rounded-lg bg-[#1F6FEB]" />
          <div className="h-12 w-24 rounded-lg bg-[#F2F4F7]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="mb-2 text-sm text-gray-500">Heading Example</div>
            <h3 className="text-2xl font-semibold">Roof Damage Assessment</h3>
          </div>
          <div className="rounded-lg border p-4">
            <div className="mb-2 text-sm text-gray-500">Body Example</div>
            <p className="text-gray-700">
              Auto-formatted content with your fonts, sizes, and spacing for carrier-ready clarity.
            </p>
          </div>
        </div>
      </section>

      {/* Document Defaults (static demo) */}
      <section className="mb-6 rounded-2xl border p-6">
        <h2 className="mb-2 text-xl font-medium">Document Defaults (Demo)</h2>
        <p className="mb-4 text-gray-600">
          Standard cover page, footer, and sign-off. These feed directly into Insurance/Retail
          packets.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-gray-700">
          <li>
            Cover title: <strong>Inspection & Weather Verification</strong>
          </li>
          <li>
            Footer: <strong>SkaiScraper™ • Claims & Reports for Roofers</strong>
          </li>
          <li>
            Signature block: <strong>Estimator • License • Contact</strong>
          </li>
        </ul>
      </section>

      {/* CTA */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/pricing"
          className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black"
        >
          Get Started
        </Link>
        <Link href="/demo" className="rounded-lg border px-4 py-2 hover:bg-gray-50">
          View Live Demo
        </Link>
        <Link href="/reports/history" className="rounded-lg border px-4 py-2 hover:bg-gray-50">
          View Report History
        </Link>
      </div>
    </main>
  );
}
