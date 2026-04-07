// src/app/(app)/leads/[id]/_components/ClientAttachSection.tsx
"use client";

import { CheckCircle2, Search, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

interface ClientAttachSectionProps {
  leadId: string;
  currentClientId?: string | null;
  currentContactName?: string;
}

export function ClientAttachSection({
  leadId,
  currentClientId,
  currentContactName,
}: ClientAttachSectionProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [attachedClient, setAttachedClient] = useState<Contact | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  // Fetch current attached client
  useEffect(() => {
    if (currentClientId) {
      void fetchAttachedClient(currentClientId);
    }
  }, [currentClientId]);

  const fetchAttachedClient = async (clientId: string) => {
    try {
      const res = await fetch(`/api/contacts/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setAttachedClient(data.contact);
      }
    } catch (error) {
      logger.error("Failed to fetch attached client:", error);
    }
  };

  const searchContacts = async () => {
    if (!searchQuery.trim()) {
      setContacts([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (error) {
      logger.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const attachClient = async (contactId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: contactId }),
      });

      if (!res.ok) throw new Error("Failed to attach client");

      // Fetch the contact details
      const contactRes = await fetch(`/api/contacts/${contactId}`);
      if (contactRes.ok) {
        const data = await contactRes.json();
        setAttachedClient(data.contact);
      }

      setSearchQuery("");
      setContacts([]);
      setShowSearch(false);
      router.refresh();
      alert("✅ Client attached successfully!");
    } catch (error) {
      logger.error("Attach client failed:", error);
      alert("Failed to attach client. Please try again.");
    }
  };

  const detachClient = async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: null }),
      });

      if (!res.ok) throw new Error("Failed to detach client");

      setAttachedClient(null);
      router.refresh();
      alert("✅ Client detached");
    } catch (error) {
      logger.error("Detach client failed:", error);
      alert("Failed to detach client. Please try again.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Attached Client
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Attached Client */}
        {attachedClient ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <p className="font-medium">
                    {attachedClient.firstName} {attachedClient.lastName}
                  </p>
                  {attachedClient.email && (
                    <p className="text-xs text-green-700 dark:text-green-300">
                      {attachedClient.email}
                    </p>
                  )}
                  {attachedClient.phone && (
                    <p className="text-xs text-green-700 dark:text-green-300">
                      {attachedClient.phone}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={detachClient}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : currentContactName ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <p className="font-medium">Contact: {currentContactName}</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">From lead record</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              No client attached to this job yet
            </p>
          </div>
        )}

        {/* Toggle Search */}
        {!showSearch ? (
          <Button variant="outline" className="w-full" onClick={() => setShowSearch(true)}>
            <Search className="mr-2 h-4 w-4" />
            {attachedClient ? "Change Client" : "Attach Client"}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchContacts()}
                  placeholder="Search by name, email, or phone..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <Button onClick={searchContacts} disabled={loading}>
                {loading ? "..." : "Search"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowSearch(false);
                  setContacts([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Search Results */}
            {contacts.length > 0 && (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => attachClient(contact.id)}
                    className="w-full rounded-lg bg-white p-3 text-left shadow-sm transition-colors hover:bg-blue-50 dark:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {contact.firstName} {contact.lastName}
                    </p>
                    {contact.email && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">{contact.email}</p>
                    )}
                    {contact.phone && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">{contact.phone}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {searchQuery && contacts.length === 0 && !loading && (
              <p className="text-center text-sm text-muted-foreground">
                No contacts found. Try a different search.
              </p>
            )}
          </div>
        )}

        {/* Create New Contact Link */}
        <div className="border-t pt-4">
          <Button variant="ghost" className="w-full text-sm" asChild>
            <a href="/contacts/new">
              <UserPlus className="mr-2 h-4 w-4" />
              Create New Contact
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
