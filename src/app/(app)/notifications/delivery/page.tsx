"use client";

import { useUser } from "@clerk/nextjs";
import {
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  Hammer,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  Send,
  Smartphone,
  Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/ui/ContentCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatCard } from "@/components/ui/MetricCard";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface DeliveryNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  channel: string;
  status: string;
  createdAt: string;
  readAt: string | null;
  userId: string;
}

const NOTIFICATION_TYPES = [
  {
    id: "schedule_update",
    label: "Schedule Update",
    icon: Clock,
    description: "Notify client about scheduling changes",
  },
  {
    id: "job_update",
    label: "Job Progress Update",
    icon: Hammer,
    description: "Update client on job progress",
  },
  {
    id: "completion_notice",
    label: "Job Completed",
    icon: CheckCircle2,
    description: "Notify client job is complete",
  },
  {
    id: "delivery_update",
    label: "Material Delivery",
    icon: Truck,
    description: "Materials delivery notification",
  },
  {
    id: "inspection_ready",
    label: "Inspection Ready",
    icon: FileText,
    description: "Property ready for inspection",
  },
];

const CHANNELS = [
  { id: "in_app", label: "In-App", icon: Bell },
  { id: "email", label: "Email", icon: Mail },
  { id: "sms", label: "SMS", icon: Smartphone },
];

export default function ClientDeliveryNotificationsPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    type: "job_update",
    title: "",
    message: "",
    channel: "in_app",
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications/client-delivery");
      const data = await res.json();
      if (data.success) setNotifications(data.notifications || []);
    } catch (e) {
      logger.error("Failed to load notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void fetchNotifications();
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/notifications/client-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Notification sent successfully!");
        setShowNewModal(false);
        setFormData({ type: "job_update", title: "", message: "", channel: "in_app" });
        void fetchNotifications();
      } else {
        toast.error(data.error || "Failed to send notification");
      }
    } catch (e) {
      toast.error("Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const sentCount = notifications.filter((n) => n.status === "sent").length;
  const readCount = notifications.filter((n) => n.readAt).length;

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        title="Client Delivery Notifications"
        subtitle="Send real-time updates to clients about their jobs, schedules, and deliveries"
        icon={<Bell className="h-5 w-5" />}
        section="finance"
      >
        <Button
          onClick={() => setShowNewModal(true)}
          className="bg-white text-emerald-600 hover:bg-emerald-50"
        >
          <Plus className="mr-2 h-4 w-4" />
          Send Notification
        </Button>
      </PageHero>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Total Sent"
          value={notifications.length}
          icon={<Send className="h-4 w-4" />}
          variant="gradient"
          gradientColor="success"
        />
        <StatCard
          label="Delivered"
          value={sentCount}
          icon={<CheckCircle2 className="h-4 w-4" />}
          intent="success"
        />
        <StatCard
          label="Read"
          value={readCount}
          icon={<MessageSquare className="h-4 w-4" />}
          intent="info"
        />
        <StatCard
          label="Open Rate"
          value={`${notifications.length > 0 ? Math.round((readCount / notifications.length) * 100) : 0}%`}
          icon={<Clock className="h-4 w-4" />}
          intent="warning"
        />
      </div>

      {/* Notification History */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-12 text-center dark:border-emerald-800 dark:from-emerald-950/20 dark:to-teal-950/20">
          <Bell className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
          <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
            No Notifications Yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-emerald-600 dark:text-emerald-400">
            Send your first client delivery notification to keep homeowners informed about their job
            progress, scheduling, and completions.
          </p>
          <Button onClick={() => setShowNewModal(true)} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Send First Notification
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const typeInfo =
              NOTIFICATION_TYPES.find((t) => t.id === n.type) || NOTIFICATION_TYPES[1];
            const TypeIcon = typeInfo.icon;
            return (
              <ContentCard key={n.id}>
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-950/30">
                    <TypeIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                        {n.title}
                      </h4>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {n.channel?.replace("_", " ") || "in-app"}
                      </span>
                      {n.readAt ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/50 dark:text-green-400">
                          ✓ Read
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{n.body}</p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    {new Date(n.createdAt).toLocaleDateString()}
                    <br />
                    {new Date(n.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </ContentCard>
            );
          })}
        </div>
      )}

      {/* New Notification Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-emerald-500" />
              Send Client Notification
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSend} className="space-y-4">
            {/* Notification Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notification Type</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {NOTIFICATION_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, type: t.id }))}
                      className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs transition-all ${
                        formData.type === t.id
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="font-medium">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g., Your roof repair is scheduled for Tuesday"
                className="w-full rounded-lg border bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                placeholder="Provide details about the update..."
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Channel */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery Channel</label>
              <div className="flex gap-2">
                {CHANNELS.map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, channel: c.id }))}
                      className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all ${
                        formData.channel === c.id
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30"
                          : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowNewModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Notification
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
