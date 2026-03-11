// src/app/layout.tsx
import "./globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import type { ReactNode } from "react";

import { PHProvider } from "@/lib/analytics.tsx";
import { ThemeProvider } from "@/modules/ui/theme/ThemeProvider";

import { logger } from "@/lib/logger";

// Note: Clerk validation moved to runtime API health checks
// Build-time validation causes Vercel builds to fail

export const metadata = {
  title: "SkaiScraper",
  description:
    "AI-powered operations hub for trades professionals. Take your company to new heights.",
  metadataBase: new URL("https://skaiscrape.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SkaiScraper",
    description:
      "AI-powered operations hub for trades professionals. Take your company to new heights.",
    url: "https://skaiscrape.com",
    siteName: "SkaiScraper",
    images: [
      {
        url: "/brand/og-cover-1200x630.png",
        width: 1200,
        height: 630,
        alt: "SkaiScraper - Let's Take Your Company to New Heights",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SkaiScraper",
    description:
      "AI-powered operations hub for trades professionals. Take your company to new heights.",
    images: ["/brand/og-cover-1200x630.png"],
    creator: "@skaiscraper",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/brand/pro_portal_logo.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/brand/pro_portal_logo.png",
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!clerkKey) {
    logger.error("❌ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set! Auth will not work.");
    logger.error(
      "Available env vars:",
      Object.keys(process.env).filter((k) => k.includes("CLERK") || k.includes("PUBLIC"))
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkKey || ""}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/after-sign-in?mode=pro"
      afterSignUpUrl="/after-sign-in?mode=pro"
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#117CFF",
          colorBackground: "#ffffff",
          colorText: "#0f172a",
          colorTextSecondary: "#64748b",
          colorInputBackground: "#ffffff",
          colorInputText: "#0f172a",
        },
        layout: {
          socialButtonsPlacement: "bottom",
          socialButtonsVariant: "iconButton",
        },
        elements: {
          rootBox: "mx-auto",
          card: "bg-white shadow-xl border border-gray-200",
          headerTitle: "text-gray-900",
          headerSubtitle: "text-gray-600",
          formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
          formFieldInput: "bg-white border-gray-300 text-gray-900",
          footerActionLink: "text-blue-600 hover:text-blue-700",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body suppressHydrationWarning>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-0 focus:top-0 focus:z-[100] focus:rounded-br-lg focus:bg-blue-600 focus:p-4 focus:text-white focus:shadow-lg focus:outline-none"
          >
            Skip to main content
          </a>
          <PHProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </PHProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
