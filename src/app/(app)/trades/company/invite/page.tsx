"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Home,
  Loader2,
  Mail,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface PendingInvite {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status: string;
  createdAt: string;
}

interface JoinRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  tradeType?: string;
  status: string;
  createdAt: string;
}

export default function CompanyInvitePage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteTitle, setInviteTitle] = useState("");
  const [sending, setSending] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [seatsAvailable, setSeatsAvailable] = useState(0);
  const [totalSeats, setTotalSeats] = useState(0);
  const [usedSeats, setUsedSeats] = useState(0);

  // Client invite state
  const [clientInviteEmail, setClientInviteEmail] = useState("");
  const [clientInviteFirstName, setClientInviteFirstName] = useState("");
  const [clientInviteLastName, setClientInviteLastName] = useState("");
  const [clientInviteMessage, setClientInviteMessage] = useState("");
  const [sendingClientInvite, setSendingClientInvite] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      const [seatsRes, requestsRes] = await Promise.all([
        fetch("/api/trades/company/seats"),
        fetch("/api/trades/company/join-requests"),
      ]);

      if (seatsRes.ok) {
        const data = await seatsRes.json();
        setIsAdmin(data.canManageSeats);
        setCompanyName(data.company?.name || "");
        setPendingInvites(data.pendingInvites || []);
        setSeatsAvailable(data.seats?.available || 0);
        setTotalSeats(data.seats?.total || 0);
        setUsedSeats(data.seats?.used || 0);
      }

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setJoinRequests(data.requests || []);
      }
    } catch (error) {
      logger.error("Failed to load invite data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Email is required");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/trades/company/seats/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          firstName: inviteFirstName,
          lastName: inviteLastName,
          role: inviteRole,
          title: inviteTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send invite");
      }

      if (data.emailSent === false) {
        toast.warning("Member added but email failed to send", {
          duration: 15000,
          description: data.emailError || "Share this link manually",
          action: data.inviteLink
            ? {
                label: "Copy Link",
                onClick: () => {
                  void navigator.clipboard.writeText(data.inviteLink);
                  toast.success("Link copied!");
                },
              }
            : undefined,
        });
      } else {
        toast.success("Invite sent!");
      }
      setInviteEmail("");
      setInviteFirstName("");
      setInviteLastName("");
      setInviteTitle("");
      setInviteRole("member");
      void loadData();
    } catch (error) {
      toast.error(error.message || "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm("Revoke this invite?")) return;

    setProcessing(inviteId);
    try {
      const res = await fetch(`/api/trades/company/seats/invite?id=${inviteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke invite");
      toast.success("Invite revoked");
      void loadData();
    } catch {
      toast.error("Failed to revoke invite");
    } finally {
      setProcessing(null);
    }
  };

  const handleJoinRequest = async (requestId: string, action: "approve" | "reject") => {
    setProcessing(requestId);
    try {
      const res = await fetch("/api/trades/company/join-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process request");

      toast.success(action === "approve" ? "Employee approved! 🎉" : "Request declined.");
      void loadData();
    } catch (error) {
      toast.error(error.message || "Failed to process request");
    } finally {
      setProcessing(null);
    }
  };

  const handleSendClientInvite = async () => {
    if (!clientInviteEmail.trim()) {
      toast.error("Client email is required");
      return;
    }

    setSendingClientInvite(true);
    try {
      const res = await fetch("/api/invitations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "single",
          email: clientInviteEmail,
          firstName: clientInviteFirstName,
          lastName: clientInviteLastName,
          message: clientInviteMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send client invite");
      }

      if (data.alreadyConnected > 0) {
        toast.info("This client is already connected to your company");
      } else {
        toast.success("Client invitation sent! 🎉");
      }

      setClientInviteEmail("");
      setClientInviteFirstName("");
      setClientInviteLastName("");
      setClientInviteMessage("");
    } catch (error) {
      toast.error(error.message || "Failed to send client invite");
    } finally {
      setSendingClientInvite(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-6">
        <div className="max-w-md text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h1 className="mb-2 text-xl font-semibold text-gray-900">Admin Access Required</h1>
          <p className="mb-4 text-gray-600">Only company admins can manage invites.</p>
          <Link href="/trades/company">
            <Button>Back to Company</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/trades/company/employees">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invite & Manage Requests</h1>
            <p className="text-sm text-gray-600">{companyName}</p>
          </div>
        </div>

        {/* Seats Overview */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">
                    Team Seats: {usedSeats} / {totalSeats}
                  </p>
                  <p className="text-sm text-gray-500">
                    {seatsAvailable > 0
                      ? `${seatsAvailable} seat${seatsAvailable !== 1 ? "s" : ""} available`
                      : "No seats available — upgrade to add more"}
                  </p>
                </div>
              </div>
              {seatsAvailable <= 0 && (
                <Link href="/settings/billing">
                  <Button size="sm" variant="outline">
                    Upgrade
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Join Requests */}
        {joinRequests.length > 0 && (
          <Card className="mb-6 border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="h-5 w-5 text-amber-600" />
                Join Requests
                <Badge variant="destructive" className="ml-2">
                  {joinRequests.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {joinRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-4 rounded-lg border border-amber-200 bg-white p-4"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700">
                    {(request.firstName?.[0] || "") + (request.lastName?.[0] || "")}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {request.firstName} {request.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {request.jobTitle || request.tradeType || request.email}
                    </p>
                    <p className="text-xs text-gray-400">
                      Requested {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleJoinRequest(request.id, "approve")}
                      disabled={processing === request.id}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {processing === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleJoinRequest(request.id, "reject")}
                      disabled={processing === request.id}
                      className="text-red-600 hover:bg-red-50"
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Send Invite Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-blue-600" />
              Send Invite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="invite-email">Email Address *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="teammate@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-first">First Name</Label>
                <Input
                  id="invite-first"
                  placeholder="First name"
                  value={inviteFirstName}
                  onChange={(e) => setInviteFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-last">Last Name</Label>
                <Input
                  id="invite-last"
                  placeholder="Last name"
                  value={inviteLastName}
                  onChange={(e) => setInviteLastName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-title">Job Title</Label>
                <Input
                  id="invite-title"
                  placeholder="e.g. Lead Roofer"
                  value={inviteTitle}
                  onChange={(e) => setInviteTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  title="Select role"
                >
                  <option value="member">Team Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <Button
              onClick={handleSendInvite}
              disabled={sending || !inviteEmail.trim() || seatsAvailable <= 0}
              className="mt-4 w-full"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Invite...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invite
                </>
              )}
            </Button>
            {seatsAvailable <= 0 && (
              <p className="mt-2 text-center text-sm text-red-500">
                No seats available. Upgrade your plan to invite more team members.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Invite Client / Homeowner */}
        <Card className="mb-6 border-emerald-200/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Home className="h-5 w-5 text-emerald-600" />
              Invite a Client
            </CardTitle>
            <CardDescription>
              Invite a homeowner or client to connect with your company on the SkaiTrades network.
              They&apos;ll be able to view your profile, send messages, and track jobs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="client-email">Client Email *</Label>
                <Input
                  id="client-email"
                  type="email"
                  placeholder="homeowner@email.com"
                  value={clientInviteEmail}
                  onChange={(e) => setClientInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-first">First Name</Label>
                <Input
                  id="client-first"
                  placeholder="First name"
                  value={clientInviteFirstName}
                  onChange={(e) => setClientInviteFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-last">Last Name</Label>
                <Input
                  id="client-last"
                  placeholder="Last name"
                  value={clientInviteLastName}
                  onChange={(e) => setClientInviteLastName(e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="client-message">Personal Message (optional)</Label>
                <Textarea
                  id="client-message"
                  placeholder="Hi! I'd like to connect with you on SkaiTrades so we can collaborate on your project..."
                  value={clientInviteMessage}
                  onChange={(e) => setClientInviteMessage(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <Button
              onClick={handleSendClientInvite}
              disabled={sendingClientInvite || !clientInviteEmail.trim()}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700"
            >
              {sendingClientInvite ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Home className="mr-2 h-4 w-4" />
                  Send Client Invitation
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Pending Invites */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-amber-600" />
              Pending Invites
              {pendingInvites.length > 0 && (
                <Badge variant="secondary">{pendingInvites.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingInvites.length === 0 ? (
              <p className="py-4 text-center text-gray-500">No pending invites</p>
            ) : (
              <div className="space-y-3">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center gap-4 rounded-lg border bg-white p-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {invite.firstName && invite.lastName
                          ? `${invite.firstName} ${invite.lastName}`
                          : invite.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {invite.email} • {invite.role} • Sent{" "}
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => handleRevokeInvite(invite.id)}
                      disabled={processing === invite.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
