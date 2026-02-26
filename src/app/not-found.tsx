import Link from "next/link";

const QUICK_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/claims", label: "Claims", icon: "📋" },
  { href: "/messages", label: "Messages", icon: "💬" },
  { href: "/reports/hub", label: "Reports", icon: "📄" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
  { href: "/onboarding", label: "Getting Started", icon: "🚀" },
];

// Custom not-found page with helpful navigation links.
// Next.js App Router allows a plain component; this wrapper ensures no legacy <Html> usage.
export default function NotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 px-6">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-neutral-400 to-neutral-500 text-white">
            <span className="text-3xl font-bold">404</span>
          </div>
          <h1 className="mb-3 text-3xl font-bold text-neutral-900">Page not found</h1>
          <p className="mb-8 text-neutral-600">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          {/* Quick links grid */}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center gap-1 rounded-xl border border-neutral-200 bg-white p-3 text-sm font-medium text-neutral-700 shadow-sm transition-all hover:border-[#147BFF] hover:shadow-md"
              >
                <span className="text-lg">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          <Link
            href="/"
            className="inline-flex items-center rounded-2xl bg-[#147BFF] px-6 py-3 font-medium text-white transition-colors hover:bg-[#0366D6]"
          >
            Go back home
          </Link>
        </div>
      </body>
    </html>
  );
}
