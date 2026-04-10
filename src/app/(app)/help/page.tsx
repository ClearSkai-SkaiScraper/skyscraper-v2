"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useUser } from "@clerk/nextjs";
import {
  BookOpen,
  FileQuestion,
  HeadphonesIcon,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function HelpSupportPage() {
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supportForm, setSupportForm] = useState({
    subject: "",
    message: "",
    priority: "normal",
  });

  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportForm.subject.trim() || !supportForm.message.trim()) {
      toast.error("Please fill in both subject and message");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...supportForm,
          email: user?.primaryEmailAddress?.emailAddress,
          name: user?.fullName || user?.firstName,
        }),
      });

      if (res.ok) {
        toast.success("Support ticket submitted! We'll respond within 24 hours.");
        setSupportForm({ subject: "", message: "", priority: "normal" });
      } else {
        // Fallback: open email client
        const mailtoLink = `mailto:support@skaiscrape.com?subject=${encodeURIComponent(supportForm.subject)}&body=${encodeURIComponent(supportForm.message)}`;
        window.open(mailtoLink, "_blank");
        toast.success("Opening your email client...");
      }
    } catch {
      // Fallback: open email client
      const mailtoLink = `mailto:support@skaiscrape.com?subject=${encodeURIComponent(supportForm.subject)}&body=${encodeURIComponent(supportForm.message)}`;
      window.open(mailtoLink, "_blank");
      toast.success("Opening your email client...");
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickLinks = [
    {
      title: "Knowledge Base",
      description: "Browse FAQs, guides, and tutorials",
      href: "/help/knowledge-base",
      icon: BookOpen,
      color: "bg-blue-500",
    },
    {
      title: "Video Tutorials",
      description: "Watch step-by-step video guides",
      href: "/help/videos",
      icon: Video,
      color: "bg-purple-500",
    },
    {
      title: "Live Chat",
      description: "Chat with our support team",
      href: "#chat",
      icon: MessageCircle,
      color: "bg-green-500",
      onClick: () => {
        // Trigger Intercom or chat widget if available
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof window !== "undefined" && (window as any).Intercom) {
          (window as any).Intercom("show");
        } else {
          toast.info("Live chat will be available during business hours");
        }
      },
    },
    {
      title: "Schedule a Call",
      description: "Book a 1-on-1 support call",
      href: "https://calendly.com/skaiscraper/support",
      icon: Phone,
      color: "bg-orange-500",
      external: true,
    },
  ];

  const faqs = [
    {
      q: "How do I create a new claim?",
      a: "Navigate to Claims → New Claim, or use the + button in the header. Fill in the property address and homeowner details to get started.",
    },
    {
      q: "How do I generate a weather report?",
      a: "Go to any claim's Weather tab, or use Reports → Weather Reports. Select a claim, choose a template, and click Generate.",
    },
    {
      q: "Can I invite my team members?",
      a: "Yes! Go to Settings → Team → Invite Members. You can assign roles like Admin, Manager, or Member.",
    },
    {
      q: "How do contracts and signatures work?",
      a: "From any claim, go to the Documents tab and click 'Request Signature'. Enter the signer's email and they'll receive a link to sign electronically.",
    },
  ];

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        title="Help & Support"
        subtitle="Get help with SkaiScraper - browse guides, contact support, or submit a ticket"
        icon={<HelpCircle className="h-5 w-5" />}
        section="settings"
      />

      {/* Quick Links Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          const content = (
            <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:ring-1 hover:ring-primary/20">
              <CardHeader className="pb-2">
                <div className={`mb-2 inline-flex rounded-lg p-2 ${link.color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg">{link.title}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
            </Card>
          );

          if (link.onClick) {
            return (
              <button key={link.title} onClick={link.onClick} className="text-left">
                {content}
              </button>
            );
          }

          if (link.external) {
            return (
              <a
                key={link.title}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {content}
              </a>
            );
          }

          return (
            <Link key={link.title} href={link.href} className="block">
              {content}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact Support Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeadphonesIcon className="h-5 w-5" />
              Contact Support
            </CardTitle>
            <CardDescription>
              Submit a support ticket and we&apos;ll respond within 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitSupport} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your issue"
                  value={supportForm.subject}
                  onChange={(e) => setSupportForm((f) => ({ ...f, subject: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Describe your issue in detail..."
                  rows={5}
                  value={supportForm.message}
                  onChange={(e) => setSupportForm((f) => ({ ...f, message: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={supportForm.priority}
                  onChange={(e) => setSupportForm((f) => ({ ...f, priority: e.target.value }))}
                >
                  <option value="low">Low - General question</option>
                  <option value="normal">Normal - Need help soon</option>
                  <option value="high">High - Blocking my work</option>
                  <option value="urgent">Urgent - Production issue</option>
                </select>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Submit Ticket
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-4 pt-2 text-sm text-muted-foreground">
                <a
                  href="mailto:support@skaiscrape.com"
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <Mail className="h-4 w-4" />
                  support@skaiscrape.com
                </a>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* FAQs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="font-medium">{faq.q}</p>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}

              <div className="pt-4">
                <Button variant="outline" asChild className="w-full">
                  <Link href="/help/knowledge-base">
                    <BookOpen className="mr-2 h-4 w-4" />
                    View All Articles
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
            </span>
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { name: "API", status: "Operational" },
              { name: "Dashboard", status: "Operational" },
              { name: "Weather Services", status: "Operational" },
              { name: "Email & Notifications", status: "Operational" },
            ].map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <span className="font-medium">{service.name}</span>
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  {service.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
