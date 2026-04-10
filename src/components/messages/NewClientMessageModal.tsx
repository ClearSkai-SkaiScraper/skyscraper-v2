"use client";

import { Loader2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface Pro {
  id: string;
  name: string;
  logo?: string;
  specialties?: string[];
}

interface NewClientMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultProId?: string | null;
}

export default function NewClientMessageModal({
  isOpen,
  onClose,
  onSuccess,
  defaultProId,
}: NewClientMessageModalProps) {
  const [pros, setPros] = useState<Pro[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProId, setSelectedProId] = useState(defaultProId || "");
  const [message, setMessage] = useState("");

  // Update selected pro when defaultProId changes
  useEffect(() => {
    if (defaultProId) {
      setSelectedProId(defaultProId);
    }
  }, [defaultProId]);

  useEffect(() => {
    if (isOpen) {
      void fetchConnectedPros();
    }
  }, [isOpen]);

  const fetchConnectedPros = async () => {
    setLoading(true);
    try {
      // Fetch pros the client is connected to
      const res = await fetch(`/api/client/connections`);
      if (res.ok) {
        const data = await res.json();
        setPros(data.connections || []);
      } else {
        // Fallback - try to get from trades network
        const altRes = await fetch("/api/trades/connections?role=client");
        if (altRes.ok) {
          const altData = await altRes.json();
          setPros(altData.connections || []);
        }
      }
    } catch (error) {
      logger.error("Failed to load pros:", error);
      toast.error("Failed to load your connected professionals");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProId) {
      toast.error("Please select a professional to message");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/messages/client/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proId: selectedProId,
          body: message,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send message");
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const data = await res.json();
      toast.success("Message sent!");
      setSelectedProId("");
      setMessage("");
      onClose();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : pros.length === 0 ? (
          <div className="py-8 text-center">
            <User className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 font-medium text-slate-900 dark:text-slate-100">
              No Connected Professionals
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Connect with a professional first to start messaging.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Select Professional
              </label>
              <Select value={selectedProId} onValueChange={setSelectedProId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a professional..." />
                </SelectTrigger>
                <SelectContent>
                  {pros.map((pro) => (
                    <SelectItem key={pro.id} value={pro.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={pro.logo} />
                          <AvatarFallback className="text-xs">
                            {pro.name?.charAt(0) || "P"}
                          </AvatarFallback>
                        </Avatar>
                        <span>{pro.name}</span>
                        {pro.specialties?.[0] && (
                          <span className="text-xs text-slate-500">({pro.specialties[0]})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Message
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi! I'm interested in your services..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onClose()}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !selectedProId || !message.trim()}>
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
