/**
 * Network Invitations - Professional Invitation System
 * Shows sent invitations AND received connection requests from clients.
 * Pros can accept / decline incoming requests right from this page.
 */

"use client";

import { format } from "date-fns";
import {
  AlertCircle,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Inbox,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Send,
  Share,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Invitation {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  message: string;
  status: "pending" | "sent" | "viewed" | "accepted" | "expired";
  createdAt: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
}

interface ReceivedConnection {
  id: string;
  status: string;
  notes: string | null;
  invitedAt: string;
  connectedAt: string | null;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    city: string | null;
    state: string | null;
    category: string | null;
  };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [received, setReceived] = useState<ReceivedConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReceived, setLoadingReceived] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("received");
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showSingleDialog, setShowSingleDialog] = useState(false);

  // Single invite form
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [message, setMessage] = useState("");

  // Bulk invite form
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");

  // Default message template
  const defaultMessage = `Hi there! I'd love to connect with you on our platform. I provide professional services and would be happy to help with any upcoming projects you might have. Looking forward to working together!`;

  /* -------------------------------- loaders -------------------------------- */

  const loadInvitations = useCallback(async () => {
    try {
      const response = await fetch("/api/invitations");
      if (!response.ok) throw new Error("Failed to load invitations");
      const data = await response.json();
      setInvitations(data.invitations || []);
    } catch (error) {
      logger.error("Error loading invitations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReceived = useCallback(async () => {
    try {
      const response = await fetch("/api/connections/received");
      if (!response.ok) throw new Error("Failed to load received connections");
      const data = await response.json();
      setReceived(data.received || []);
    } catch (error) {
      logger.error("Error loading received connections:", error);
    } finally {
      setLoadingReceived(false);
    }
  }, []);

  useEffect(() => {
    void loadInvitations();
    void loadReceived();
  }, [loadInvitations, loadReceived]);

  /* ------------------------------ actions --------------------------------- */

  const acceptConnection = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      const res = await fetch("/api/connections/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to accept");
      toast.success("Connection accepted!");
      await loadReceived();
    } catch (err) {
      logger.error("Accept error:", err);
      toast.error(err.message || "Failed to accept connection");
    } finally {
      setActionLoading(null);
    }
  };

  const declineConnection = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      const res = await fetch("/api/connections/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to decline");
      toast.success("Connection declined");
      await loadReceived();
    } catch (err) {
      logger.error("Decline error:", err);
      toast.error(err.message || "Failed to decline connection");
    } finally {
      setActionLoading(null);
    }
  };

  const sendSingleInvite = async () => {
    if (!email.trim()) {
      toast.error("Email address is required");
      return;
    }
    try {
      const response = await fetch("/api/invitations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "single",
          email: email.trim(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          message: message.trim() || defaultMessage,
        }),
      });
      if (!response.ok) throw new Error("Failed to send invitation");
      toast.success("Invitation sent successfully!");
      setShowSingleDialog(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setMessage("");
      void loadInvitations();
    } catch (error) {
      logger.error("Error sending invitation:", error);
      toast.error("Failed to send invitation");
    }
  };

  const sendBulkInvites = async () => {
    if (!bulkEmails.trim()) {
      toast.error("Email addresses are required");
      return;
    }
    const emails = bulkEmails
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      toast.error("Please provide valid email addresses");
      return;
    }
    try {
      const response = await fetch("/api/invitations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "bulk",
          emails,
          message: bulkMessage.trim() || defaultMessage,
        }),
      });
      if (!response.ok) throw new Error("Failed to send invitations");
      toast.success(`${emails.length} invitation(s) sent successfully!`);
      setShowBulkDialog(false);
      setBulkEmails("");
      setBulkMessage("");
      void loadInvitations();
    } catch (error) {
      logger.error("Error sending bulk invitations:", error);
      toast.error("Failed to send invitations");
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/invitations/${invitationId}/resend`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to resend invitation");
      toast.success("Invitation resent successfully!");
      void loadInvitations();
    } catch (error) {
      logger.error("Error resending invitation:", error);
      toast.error("Failed to resend invitation");
    }
  };

  /* ------------------------------ helpers --------------------------------- */

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "sent":
        return <Send className="h-4 w-4" />;
      case "viewed":
        return <AlertCircle className="h-4 w-4" />;
      case "accepted":
      case "ACCEPTED":
        return <Check className="h-4 w-4" />;
      case "expired":
        return <X className="h-4 w-4" />;
      case "DECLINED":
      case "declined":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
      case "sent":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
      case "viewed":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
      case "connected":
        return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
      case "declined":
        return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const generateInviteLink = () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/sign-up?ref=invitation`;
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(generateInviteLink());
      toast.success("Invite link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const shareInviteLink = async () => {
    if (!navigator.share) {
      void copyInviteLink();
      return;
    }
    try {
      await navigator.share({
        title: "Join me on our platform!",
        text: "I'd like to invite you to connect with me on our professional services platform.",
        url: generateInviteLink(),
      });
    } catch {
      void copyInviteLink();
    }
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  /* ------------------------------ derived --------------------------------- */

  const pendingReceived = received.filter((r) => r.status.toLowerCase() === "pending");
  const acceptedReceived = received.filter(
    (r) => r.status.toLowerCase() === "accepted" || r.status.toLowerCase() === "connected"
  );
  const declinedReceived = received.filter((r) => r.status.toLowerCase() === "declined");

  // Stats
  const stats = {
    total: invitations.length,
    pending: invitations.filter((i) => i.status === "pending").length,
    sent: invitations.filter((i) => i.status === "sent").length,
    viewed: invitations.filter((i) => i.status === "viewed").length,
    accepted: invitations.filter((i) => i.status === "accepted").length,
    expired: invitations.filter((i) => i.status === "expired").length,
  };

  /* ------------------------------ loading --------------------------------- */

  if (loading && loadingReceived) {
    return (
      <PageContainer maxWidth="7xl">
        <PageHero
          section="network"
          title="Network Invitations"
          subtitle="Manage sent invitations and incoming connection requests"
          icon={<UserPlus className="h-6 w-6" />}
        />
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
          <div className="h-64 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
      </PageContainer>
    );
  }

  /* ------------------------------ render ---------------------------------- */

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="network"
        title="Network Invitations"
        subtitle="Manage sent invitations and incoming connection requests"
        icon={<UserPlus className="h-6 w-6" />}
        actions={
          <div className="flex gap-2">
            <Dialog open={showSingleDialog} onOpenChange={setShowSingleDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  className="gap-2 bg-white/20 text-white hover:bg-white/30"
                >
                  <Mail className="h-4 w-4" />
                  Send Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Invitation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>First Name</Label>
                      <Input
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input
                        placeholder="Smith"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Email Address *</Label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Personal Message</Label>
                    <Textarea
                      placeholder={defaultMessage}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button onClick={sendSingleInvite} className="w-full">
                    <Send className="mr-2 h-4 w-4" />
                    Send Invitation
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="secondary"
              className="gap-2 bg-white/20 text-white hover:bg-white/30"
              onClick={shareInviteLink}
            >
              <Share className="h-4 w-4" />
              Share Link
            </Button>
            <Button
              variant="secondary"
              className="gap-2 bg-white/20 text-white hover:bg-white/30"
              asChild
            >
              <Link href="/invitations/analytics">
                <BarChart3 className="h-4 w-4" />
                View Analytics
              </Link>
            </Button>
          </div>
        }
      />

      {/* ------------------------------------------------------------------ */}
      {/*  Stats Cards                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-sky-100 p-3 dark:bg-sky-900">
              <Inbox className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingReceived.length}</p>
              <p className="text-sm text-muted-foreground">Pending Requests</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{acceptedReceived.length}</p>
              <p className="text-sm text-muted-foreground">Connected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900">
              <Send className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Sent Invitations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{received.length}</p>
              <p className="text-sm text-muted-foreground">Total Received</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Tabs — Received / Sent                                             */}
      {/* ------------------------------------------------------------------ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="received" className="gap-2">
              <Inbox className="h-4 w-4" />
              Received
              {pendingReceived.length > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 h-5 min-w-[20px] rounded-full px-1.5 text-xs"
                >
                  {pendingReceived.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <Send className="h-4 w-4" />
              Sent
            </TabsTrigger>
          </TabsList>

          {activeTab === "sent" && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setShowSingleDialog(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Invite
              </Button>
              <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Users className="mr-1 h-4 w-4" />
                    Bulk
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Send Bulk Invitations</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulkEmails">Email Addresses *</Label>
                      <Textarea
                        id="bulkEmails"
                        value={bulkEmails}
                        onChange={(e) => setBulkEmails(e.target.value)}
                        placeholder={"john@example.com, jane@example.com\nmike@example.com"}
                        rows={6}
                      />
                      <p className="text-sm text-slate-600">
                        Enter email addresses separated by commas or new lines
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bulkMessage">Message</Label>
                      <Textarea
                        id="bulkMessage"
                        value={bulkMessage}
                        onChange={(e) => setBulkMessage(e.target.value)}
                        placeholder={defaultMessage}
                        rows={4}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={sendBulkInvites}>
                        <Send className="mr-1 h-4 w-4" />
                        Send Invitations
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={copyInviteLink}>
                <Copy className="mr-1 h-4 w-4" />
                Copy Link
              </Button>
              <Button variant="outline" size="sm" onClick={shareInviteLink}>
                <Share className="mr-1 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/invitations/analytics">
                  <BarChart3 className="mr-1 h-4 w-4" />
                  Analytics
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/*  RECEIVED TAB                                                   */}
        {/* ============================================================== */}
        <TabsContent value="received" className="mt-4 space-y-4">
          {loadingReceived ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : received.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-lg font-semibold">No connection requests yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  When clients request to connect with your trades profile, their requests will
                  appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Pending — show first */}
              {pendingReceived.length > 0 && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <Clock className="h-4 w-4" />
                    Pending — Action Required ({pendingReceived.length})
                  </h3>
                  {pendingReceived.map((conn) => (
                    <ReceivedCard
                      key={conn.id}
                      conn={conn}
                      actionLoading={actionLoading}
                      onAccept={acceptConnection}
                      onDecline={declineConnection}
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
                      initials={initials}
                    />
                  ))}
                </div>
              )}

              {/* Accepted */}
              {acceptedReceived.length > 0 && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Connected ({acceptedReceived.length})
                  </h3>
                  {acceptedReceived.map((conn) => (
                    <ReceivedCard
                      key={conn.id}
                      conn={conn}
                      actionLoading={actionLoading}
                      onAccept={acceptConnection}
                      onDecline={declineConnection}
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
                      initials={initials}
                    />
                  ))}
                </div>
              )}

              {/* Declined */}
              {declinedReceived.length > 0 && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-500 dark:text-red-400">
                    <XCircle className="h-4 w-4" />
                    Declined ({declinedReceived.length})
                  </h3>
                  {declinedReceived.map((conn) => (
                    <ReceivedCard
                      key={conn.id}
                      conn={conn}
                      actionLoading={actionLoading}
                      onAccept={acceptConnection}
                      onDecline={declineConnection}
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
                      initials={initials}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ============================================================== */}
        {/*  SENT TAB                                                       */}
        {/* ============================================================== */}
        <TabsContent value="sent" className="mt-4 space-y-4">
          {invitations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-lg font-semibold">No invitations sent yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start by sending your first client invitation!
                </p>
                <Button className="mt-4" onClick={() => setShowSingleDialog(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Send First Invitation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <Card key={invitation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-medium">
                              {invitation.firstName || invitation.lastName
                                ? `${invitation.firstName || ""} ${invitation.lastName || ""}`.trim()
                                : invitation.email}
                            </h3>
                            {(invitation.firstName || invitation.lastName) && (
                              <p className="text-sm text-muted-foreground">{invitation.email}</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <Badge variant="secondary" className={getStatusColor(invitation.status)}>
                            {getStatusIcon(invitation.status)}
                            <span className="ml-1 capitalize">{invitation.status}</span>
                          </Badge>
                          <span>Sent {format(new Date(invitation.createdAt), "MMM d, yyyy")}</span>
                          {invitation.viewedAt && (
                            <span>Viewed {format(new Date(invitation.viewedAt), "MMM d")}</span>
                          )}
                          {invitation.acceptedAt && (
                            <span>Accepted {format(new Date(invitation.acceptedAt), "MMM d")}</span>
                          )}
                        </div>

                        {invitation.message && (
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                            {invitation.message}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {(invitation.status === "pending" || invitation.status === "sent") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendInvitation(invitation.id)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Received Connection Card                                                  */
/* -------------------------------------------------------------------------- */

function ReceivedCard({
  conn,
  actionLoading,
  onAccept,
  onDecline,
  getStatusColor,
  getStatusIcon,
  initials,
}: {
  conn: ReceivedConnection;
  actionLoading: string | null;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  getStatusColor: (s: string) => string;
  getStatusIcon: (s: string) => React.ReactNode;
  initials: (n: string) => string;
}) {
  const isPending = conn.status.toLowerCase() === "pending";
  const isLoading = actionLoading === conn.id;

  return (
    <Card className={isPending ? "border-amber-200 dark:border-amber-800" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={conn.client.avatarUrl || undefined} alt={conn.client.name} />
            <AvatarFallback className="bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300">
              {initials(conn.client.name)}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold">{conn.client.name}</h4>
              <Badge variant="secondary" className={getStatusColor(conn.status)}>
                {getStatusIcon(conn.status)}
                <span className="ml-1 capitalize">{conn.status.toLowerCase()}</span>
              </Badge>
              {conn.client.category && (
                <Badge variant="outline" className="text-xs">
                  {conn.client.category}
                </Badge>
              )}
            </div>

            {/* Contact & location row */}
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {conn.client.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {conn.client.email}
                </span>
              )}
              {conn.client.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {conn.client.phone}
                </span>
              )}
              {(conn.client.city || conn.client.state) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {[conn.client.city, conn.client.state].filter(Boolean).join(", ")}
                </span>
              )}
            </div>

            {/* Notes */}
            {conn.notes && <p className="mt-1.5 text-sm text-muted-foreground">{conn.notes}</p>}

            {/* Timestamp */}
            <p className="mt-1.5 text-xs text-muted-foreground">
              Requested {format(new Date(conn.invitedAt), "MMM d, yyyy 'at' h:mm a")}
              {conn.connectedAt &&
                ` · Connected ${format(new Date(conn.connectedAt), "MMM d, yyyy")}`}
            </p>
          </div>

          {/* Actions */}
          {isPending && (
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="default"
                className="gap-1"
                disabled={isLoading}
                onClick={() => onAccept(conn.id)}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
                disabled={isLoading}
                onClick={() => onDecline(conn.id)}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Decline
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
