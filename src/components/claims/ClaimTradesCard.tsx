"use client";

import { Mail, Phone, Plus, Search,X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StandardButton } from "@/components/ui/StandardButton";
import { logger } from "@/lib/logger";

interface TradePartner {
  id: string;
  businessName: string;
  licenseNumber?: string;
  phone?: string;
  email?: string;
  specialties: string[];
}

interface LinkedTrade {
  id: string;
  role: string;
  tradePartner: TradePartner;
  addedAt: string;
}

interface ClaimTradesCardProps {
  claimId: string;
}

export function ClaimTradesCard({ claimId }: ClaimTradesCardProps) {
  const [linkedTrades, setLinkedTrades] = useState<LinkedTrade[]>([]);
  const [availableTrades, setAvailableTrades] = useState<TradePartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    void fetchLinkedTrades();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  useEffect(() => {
    if (isOpen) {
      void fetchAvailableTrades();
    }
  }, [isOpen]);

  const fetchLinkedTrades = async () => {
    try {
      const response = await fetch(`/api/claims/${claimId}/trades`);
      if (response.ok) {
        const data = await response.json();
        setLinkedTrades(data.trades || []);
      }
    } catch (error) {
      logger.error("Failed to fetch linked trades:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTrades = async () => {
    try {
      const response = await fetch("/api/trades");
      if (response.ok) {
        const data = await response.json();
        setAvailableTrades(data.trades || []);
      }
    } catch (error) {
      logger.error("Failed to fetch available trades:", error);
    }
  };

  const linkTrade = async (tradePartnerId: string) => {
    try {
      const response = await fetch(`/api/claims/${claimId}/trades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradePartnerId }),
      });

      if (response.ok) {
        toast.success("Success", {
        description: "Trade partner linked to claim",
      });
        void fetchLinkedTrades();
        setIsOpen(false);
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to link trade partner",
      });
    }
  };

  const unlinkTrade = async (linkId: string) => {
    try {
      const response = await fetch(`/api/claims/${claimId}/trades?linkId=${linkId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Success", {
        description: "Trade partner removed from claim",
      });
        void fetchLinkedTrades();
      } else {
        throw new Error("Failed to unlink");
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      toast.error("Error", {
        description: "Failed to remove trade partner",
      });
    }
  };

  const filteredTrades = availableTrades.filter(
    (trade) =>
      trade.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trade.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const linkedTradeIds = linkedTrades.map((lt) => lt.tradePartner.id);
  const unlinkedTrades = filteredTrades.filter((t) => !linkedTradeIds.includes(t.id));

  if (loading) {
    return (
      <Card className="border-slate-200/50 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-1/3 rounded bg-slate-200" />
          <div className="h-4 w-1/2 rounded bg-slate-200" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/50 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Linked Trade Partners</h3>
          <p className="text-sm text-slate-600">Working on this claim</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <StandardButton variant="secondary" gradient size="sm">
              <Plus className="h-4 w-4" />
              Add Trade Partner
            </StandardButton>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Trade Partner to Claim</DialogTitle>
              <DialogDescription>Select a trade partner to link to this claim</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by business name or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {unlinkedTrades.length === 0 ? (
                <div className="py-8 text-center text-slate-600">
                  {availableTrades.length === 0
                    ? "No trade partners available. Create one first."
                    : "All available trade partners are already linked."}
                </div>
              ) : (
                <div className="space-y-3">
                  {unlinkedTrades.map((trade) => (
                    <Card
                      key={trade.id}
                      className="cursor-pointer p-4 transition-shadow hover:shadow-md"
                      onClick={() => linkTrade(trade.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-900">{trade.businessName}</h4>
                          {trade.specialties.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {trade.specialties.map((specialty, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {specialty}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {(trade.phone || trade.email) && (
                            <div className="mt-2 space-y-1 text-sm text-slate-600">
                              {trade.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3" />
                                  {trade.phone}
                                </div>
                              )}
                              {trade.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3 w-3" />
                                  {trade.email}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <Button size="sm">Add</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {linkedTrades.length === 0 ? (
        <div className="py-8 text-center text-slate-600">
          <p>No trade partners linked yet.</p>
          <p className="mt-1 text-sm">Click &quot;Add Trade Partner&quot; to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {linkedTrades.map((link) => (
            <Card key={link.id} className="border-slate-200/50 bg-slate-50/50 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-slate-900">
                      {link.tradePartner.businessName}
                    </h4>
                    {link.role && (
                      <Badge variant="outline" className="text-xs">
                        {link.role}
                      </Badge>
                    )}
                  </div>
                  {link.tradePartner.specialties.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {link.tradePartner.specialties.map((specialty, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="bg-blue-100 text-xs text-blue-700"
                        >
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 space-y-1">
                    {link.tradePartner.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Phone className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{link.tradePartner.phone}</span>
                      </div>
                    )}
                    {link.tradePartner.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Mail className="h-4 w-4 text-amber-600" />
                        <span>{link.tradePartner.email}</span>
                      </div>
                    )}
                    {link.tradePartner.licenseNumber && (
                      <p className="mt-1 text-xs text-slate-600">
                        License: {link.tradePartner.licenseNumber}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => unlinkTrade(link.id)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
}
