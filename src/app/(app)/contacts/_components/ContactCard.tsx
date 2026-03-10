"use client";

import { Mail, MessageCircle, Phone } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ContactCardProps {
  contact: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    tags?: string[];
  };
}

export function ContactCard({ contact }: ContactCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/contacts/${contact.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative cursor-pointer rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-[0_0_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-all hover:scale-[1.02] hover:border-blue-500/50 hover:shadow-xl dark:border-slate-800/50 dark:bg-slate-900/50"
    >
      <div className="pointer-events-none">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <span className="mb-1 inline-flex text-lg font-semibold text-slate-900 transition group-hover:text-blue-700 dark:text-white">
              {contact.firstName} {contact.lastName}
            </span>
            <Badge variant="secondary" className="ml-2 text-xs">
              Client
            </Badge>
          </div>
          {contact.tags && contact.tags.length > 0 && (
            <span className="inline-flex rounded-xl bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {contact.tags[0]}
            </span>
          )}
        </div>
        <div className="space-y-2">
          {contact.email && (
            <div className="truncate text-sm text-slate-600 dark:text-slate-400">
              {contact.email}
            </div>
          )}
          {contact.phone && (
            <div className="text-sm text-slate-600 dark:text-slate-400">{contact.phone}</div>
          )}
        </div>
        <div className="pointer-events-auto mt-4 flex items-center gap-2">
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Phone className="h-4 w-4" />
                Call
              </Button>
            </a>
          )}
          {contact.phone && (
            <a
              href={`sms:${contact.phone}`}
              className="flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="outline" size="sm" className="w-full gap-2">
                <MessageCircle className="h-4 w-4" />
                Text
              </Button>
            </a>
          )}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
