"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildClaimLabelShort } from "@/lib/context/buildContextLabel";
import { logger } from "@/lib/logger";

interface NewMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  onSuccess?: () => void;
  initialSubject?: string;
  initialBody?: string;
  initialRecipientType?: "contact" | "pro" | "team";
  initialContactId?: string;
  initialProProfileId?: string;
}

export default function NewMessageModal({
  open,
  onOpenChange,
  orgId,
  onSuccess,
  initialSubject,
  initialBody,
  initialRecipientType = "contact",
  initialContactId,
  initialProProfileId,
}: NewMessageModalProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contacts, setContacts] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [claims, setClaims] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [connectedPros, setConnectedPros] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recipientType, setRecipientType] = useState<"contact" | "pro" | "team">(
    initialRecipientType
  );

  const [formData, setFormData] = useState({
    contactId: "",
    claimId: "",
    subject: "",
    body: "",
    proProfileId: "",
    teamMemberId: "",
  });

  useEffect(() => {
    if (open) {
      void fetchData();
      setRecipientType(initialRecipientType);
      setFormData({
        contactId: initialContactId || "",
        claimId: "",
        subject: initialSubject || "",
        body: initialBody || "",
        proProfileId: initialProProfileId || "",
        teamMemberId: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    orgId,
    initialRecipientType,
    initialContactId,
    initialProProfileId,
    initialSubject,
    initialBody,
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch contacts, claims, connected pros, AND connected clients
      const [contactsRes, claimsRes, prosRes, clientConnectionsRes] = await Promise.all([
        fetch(`/api/contacts?orgId=${orgId}`),
        fetch("/api/claims/list-lite"),
        fetch("/api/network/trades"),
        fetch("/api/clients/connections"), // Connected clients via ClientProConnection
      ]);

      // Build contacts list from CRM contacts + connected clients independently
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let allContacts: any[] = [];

      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        allContacts = contactsData.contacts || [];
      } else {
        logger.warn("[NewMessageModal] Contacts API returned", contactsRes.status);
      }

      // Add connected clients from ClientProConnection (independent of contacts API)
      if (clientConnectionsRes.ok) {
        const clientData = await clientConnectionsRes.json();
        const connectedClients = (clientData.clients || [])
          .filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c: any) => c.connection?.status === "connected" || c.connection?.status === "accepted"
          )
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((c: any) => ({
            id: c.id,
            firstName: c.firstName || c.name?.split(" ")[0] || c.name || "Client",
            lastName: c.lastName || c.name?.split(" ").slice(1).join(" ") || "",
            email: c.email,
            phone: c.phone,
            isClientConnection: true,
          }));

        // Dedupe by ID and email — prefer the client connection version
        // so isClientConnection flag is preserved for correct routing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clientIds = new Set(connectedClients.map((c: any) => c.id));
        const clientEmails = new Set(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          connectedClients.map((c: any) => c.email?.toLowerCase()).filter(Boolean)
        );
        // Remove CRM contacts that overlap with connected clients
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        allContacts = allContacts.filter((c: any) => {
          if (clientIds.has(c.id)) return false;
          if (c.email && clientEmails.has(c.email.toLowerCase())) return false;
          return true;
        });
        // Add all connected clients
        allContacts.push(...connectedClients);
      } else {
        logger.warn(
          "[NewMessageModal] Client connections API returned",
          clientConnectionsRes.status
        );
      }

      setContacts(allContacts);

      if (claimsRes.ok) {
        const claimsData = await claimsRes.json();
        // Remap list-lite fields → ClaimLabelInput shape
        // list-lite: address=street, propertyAddress=formatted
        // ClaimLabelInput: address=formatted, street=raw street
        setClaims(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (claimsData.claims || []).map((c: any) => ({
            ...c,
            street: c.address,
            address: c.propertyAddress || c.address,
          }))
        );
      }

      if (prosRes.ok) {
        const prosData = await prosRes.json();
        setConnectedPros(prosData.trades || []);
      }

      // Fetch team members for internal messaging (exclude current user — can't message yourself)
      try {
        const teamRes = await fetch("/api/team/members");
        if (teamRes.ok) {
          const teamData = await teamRes.json();
          const allMembers = teamData.members || [];
          const currentId = teamData.currentUserId;
          setTeamMembers(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            currentId ? allMembers.filter((m: any) => m.id !== currentId) : allMembers
          );
        }
      } catch {
        // Team members fetch is non-critical
      }
    } catch (error) {
      logger.error("Failed to load data:", error);
      toast.error("Failed to load recipients and claims");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (recipientType === "contact" && !formData.contactId) {
      toast.error("Contact is required");
      return;
    }

    if (recipientType === "pro" && !formData.proProfileId) {
      toast.error("Connected pro is required");
      return;
    }

    if (recipientType === "team" && !formData.teamMemberId) {
      toast.error("Team member is required");
      return;
    }

    if (!formData.body) {
      toast.error("Message body is required");
      return;
    }

    setSubmitting(true);
    try {
      // Determine which endpoint to use based on recipient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const selectedContact = contacts.find((c: any) => c.id === formData.contactId);
      const isClientConnection = selectedContact?.isClientConnection;

      let res: Response;

      if (recipientType === "team") {
        // Internal team message via messages/create
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const member = teamMembers.find((m: any) => m.id === formData.teamMemberId);
        res = await fetch("/api/messages/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isInternal: true,
            recipientUserId: formData.teamMemberId,
            recipientName: member?.name || member?.email || "Team Member",
            recipientEmail: member?.email,
            subject: formData.subject || "Internal Message",
            body: formData.body,
          }),
        });
      } else if (recipientType === "pro") {
        // Pro-to-pro via trades network
        res = await fetch("/api/trades/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toProfileId: formData.proProfileId,
            subject: formData.subject || "New Message",
            message: formData.body,
          }),
        });
      } else if (isClientConnection) {
        // Pro-to-client via ClientProConnection system
        res = await fetch("/api/messages/pro-to-client/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: formData.contactId,
            claimId: formData.claimId || null,
            subject: formData.subject || "New Message",
            body: formData.body,
          }),
        });
      } else {
        // Pro-to-contact via CRM system
        res = await fetch("/api/messages/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            contactId: formData.contactId,
            claimId: formData.claimId || null,
            subject: formData.subject || "New Message",
            body: formData.body,
          }),
        });
      }

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send message");
      }

      toast.success("Message sent successfully");
      setFormData({
        contactId: "",
        claimId: "",
        subject: "",
        body: "",
        proProfileId: "",
        teamMemberId: "",
      });
      onOpenChange(false);
      onSuccess?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error("Failed to send message:", error);
      toast.error(error.message || "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-type">Recipient Type</Label>
              <Select
                value={recipientType}
                onValueChange={(value) => setRecipientType(value as "contact" | "pro" | "team")}
              >
                <SelectTrigger id="recipient-type">
                  <SelectValue placeholder="Select recipient type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team Member</SelectItem>
                  <SelectItem value="contact">Client / Contact</SelectItem>
                  <SelectItem value="pro">Connected Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">
                {recipientType === "team"
                  ? "Team Member *"
                  : recipientType === "pro"
                    ? "Connected Pro *"
                    : "Contact *"}
              </Label>
              {recipientType === "team" ? (
                <Select
                  value={formData.teamMemberId}
                  onValueChange={(value) => setFormData({ ...formData, teamMemberId: value })}
                >
                  <SelectTrigger id="contact">
                    <SelectValue placeholder="Select a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500">No team members found</div>
                    ) : (
                      teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name || member.email}
                          {member.role && ` • ${member.role}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              ) : recipientType === "pro" ? (
                <Select
                  value={formData.proProfileId}
                  onValueChange={(value) => setFormData({ ...formData, proProfileId: value })}
                >
                  <SelectTrigger id="contact">
                    <SelectValue placeholder="Select a connected pro" />
                  </SelectTrigger>
                  <SelectContent>
                    {connectedPros.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500">No connected pros found</div>
                    ) : (
                      connectedPros.map((pro) => (
                        <SelectItem key={pro.id} value={pro.id}>
                          {pro.companyName || pro.contactName || "Connected Pro"}
                          {pro.tradeType && ` • ${pro.tradeType}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={formData.contactId}
                  onValueChange={(value) => setFormData({ ...formData, contactId: value })}
                >
                  <SelectTrigger id="contact">
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500">No contacts found</div>
                    ) : (
                      contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.firstName || "Client"} {contact.lastName || ""}
                          {contact.email && ` (${contact.email})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {recipientType === "contact" && (
              <div className="space-y-2">
                <Label htmlFor="claim">Attach to Claim (Optional)</Label>
                <Select
                  value={formData.claimId}
                  onValueChange={(value) => setFormData({ ...formData, claimId: value })}
                >
                  <SelectTrigger id="claim">
                    <SelectValue placeholder="Attach to a claim (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {claims.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500">No claims found</div>
                    ) : (
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      claims.map((claim: any) => (
                        <SelectItem key={claim.id} value={claim.id}>
                          {buildClaimLabelShort(claim)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Message subject (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message *</Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Type your message here..."
                rows={6}
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Message"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
