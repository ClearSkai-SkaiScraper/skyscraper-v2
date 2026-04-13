import { Mail, MapPin, MessageCircle, Phone, Sparkles } from "lucide-react";
import type { Metadata } from "next";

import ContactForm from "@/components/marketing/ContactForm";

export const metadata: Metadata = {
  title: "Contact – SkaiScraper",
  description:
    "Get in touch with the SkaiScraper team. Whether you're a solo roofer or a multi-branch restoration team, we'd love to hear from you.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact – SkaiScraper",
    description:
      "Get in touch with the SkaiScraper team. Whether you're a solo roofer or a multi-branch restoration team, we'd love to hear from you.",
  },
};
export const dynamic = "force-static";
export const revalidate = 3600;

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#117CFF] via-[#0066DD] to-[#004AAD] py-20 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-[#FFC838]/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
            <MessageCircle className="h-4 w-4 text-[#FFC838]" />
            <span className="text-sm font-medium">Let&apos;s Talk</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Get in{" "}
            <span className="bg-gradient-to-r from-[#FFC838] to-[#FFD970] bg-clip-text text-transparent">
              Touch
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Whether you&apos;re a solo roofer or a multi-branch restoration team, we&apos;d love to
            learn about your workflow and show you how SkaiScraper can help.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-3">
          {/* Contact Form - Takes up 2 columns */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl border bg-card p-8 shadow-lg">
              <h2 className="mb-6 text-2xl font-bold">Send us a message</h2>
              <ContactForm />
            </div>
          </div>

          {/* Contact Info Sidebar */}
          <div className="space-y-6">
            {/* Direct Contact */}
            <div className="rounded-3xl border bg-gradient-to-br from-[#117CFF]/5 to-[#117CFF]/10 p-8">
              <div className="mb-4 inline-flex rounded-xl bg-[#117CFF] p-3">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold">Talk to the Founder</h3>
              <p className="mt-2 text-muted-foreground">
                Get answers directly from Damien Willingham
              </p>

              <div className="mt-6 space-y-4">
                <a
                  href="tel:+14809955820"
                  className="flex items-center gap-3 text-foreground transition-colors hover:text-[#117CFF]"
                >
                  <div className="rounded-full bg-[#117CFF]/10 p-2">
                    <Phone className="h-4 w-4 text-[#117CFF]" />
                  </div>
                  <span className="font-semibold">(480) 995-5820</span>
                </a>

                <a
                  href="mailto:damien@skaiscrape.com"
                  className="flex items-center gap-3 text-foreground transition-colors hover:text-[#117CFF]"
                >
                  <div className="rounded-full bg-[#117CFF]/10 p-2">
                    <Mail className="h-4 w-4 text-[#117CFF]" />
                  </div>
                  <span className="font-semibold">damien@skaiscrape.com</span>
                </a>
              </div>
            </div>

            {/* Response Time */}
            <div className="rounded-3xl border bg-card p-8">
              <h3 className="font-bold text-foreground">Response Time</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                We typically respond within 2-4 business hours. For urgent matters, please call
                directly.
              </p>
            </div>

            {/* Office Location */}
            <div className="rounded-3xl border bg-card p-8">
              <div className="flex items-center gap-2 text-foreground">
                <MapPin className="h-4 w-4 text-[#117CFF]" />
                <h3 className="font-bold">Based in Arizona</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Serving trades professionals nationwide from the heart of storm country.
              </p>
            </div>

            {/* Quick Links */}
            <div className="rounded-3xl bg-gradient-to-br from-[#FFC838] to-[#FFB800] p-8 text-white">
              <h3 className="font-bold">Quick Links</h3>
              <div className="mt-4 space-y-2">
                <a href="/pricing" className="block text-sm text-white/80 hover:text-white">
                  → View Pricing
                </a>
                <a href="/features" className="block text-sm text-white/80 hover:text-white">
                  → Explore Features
                </a>
                <a href="/sign-up" className="block text-sm text-white/80 hover:text-white">
                  → Start Free Trial
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
