"use client";

import { ExternalLink,Loader2, Star, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  matchScore: number;
  reason: string;
  avatar?: string;
}

export default function RecommendedContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        setLoading(true);
        const response = await fetch("/api/ai/recommendations");
        if (!response.ok) throw new Error("Failed to fetch recommendations");
        const data = await response.json();
        setContacts(data.contacts);
      } catch (error) {
        logger.error("Recommendations error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600 dark:text-sky-400" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">
          Finding recommended contacts...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Recommended Contacts
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            AI-curated connections based on your claims and network
          </p>
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/30 bg-white/40 p-6 backdrop-blur-sm transition-all hover:border-purple-500/50 hover:bg-white/60 hover:shadow-lg hover:shadow-purple-500/10 dark:border-slate-700/50 dark:bg-slate-800/40 dark:hover:bg-slate-800/60"
          >
            {/* Match Score Badge */}
            <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 text-xs font-bold text-white">
              <Star className="h-3 w-3" />
              {contact.matchScore}%
            </div>

            {/* Avatar */}
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-2xl font-bold text-white">
              {contact.avatar || contact.name.substring(0, 2).toUpperCase()}
            </div>

            {/* Info */}
            <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">
              {contact.name}
            </h3>
            <div className="mb-2 text-sm text-slate-600 dark:text-slate-400">
              {contact.role} at {contact.company}
            </div>

            {/* Reason */}
            <div className="mb-4 rounded-lg bg-slate-100/50 p-3 dark:bg-slate-700/30">
              <div className="mb-1 flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                <TrendingUp className="h-3 w-3" />
                Why recommended
              </div>
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {contact.reason}
              </p>
            </div>

            {/* Action Button */}
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700">
              View Profile
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {contacts.length === 0 && !loading && (
        <div className="rounded-2xl border border-slate-200/30 bg-white/40 p-12 text-center backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/40">
          <Users className="mx-auto mb-4 h-12 w-12 text-slate-400 dark:text-slate-600" />
          <h3 className="mb-2 text-lg font-bold text-slate-700 dark:text-slate-400">
            No Recommendations Yet
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-500">
            Our AI will suggest contacts as you add more claims and build your network.
          </p>
        </div>
      )}
    </div>
  );
}
