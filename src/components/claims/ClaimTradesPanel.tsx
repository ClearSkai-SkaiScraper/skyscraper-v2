"use client";

import { Briefcase,Mail, Phone, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  addedAt: string;
  tradePartner: TradePartner;
}

interface ClaimTradesPanelProps {
  claimId: string;
}

export function ClaimTradesPanel({ claimId }: ClaimTradesPanelProps) {
  const [linkedTrades, setLinkedTrades] = useState<LinkedTrade[]>([]);
  const [allTrades, setAllTrades] = useState<TradePartner[]>([]);
  const [selectedTradeId, setSelectedTradeId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("Contractor");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    void fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  const fetchData = async () => {
    try {
      const [linkedRes, allTradesRes] = await Promise.all([
        fetch(`/api/claims/${claimId}/trades`),
        fetch(`/api/trades`),
      ]);

      if (linkedRes.ok) {
        const data = await linkedRes.json();
        setLinkedTrades(data.trades || []);
      }

      if (allTradesRes.ok) {
        const data = await allTradesRes.json();
        setAllTrades(data.trades || []);
      }
    } catch (error) {
      logger.error("Failed to fetch trades:", error);
      toast.error("Error", {
        description: "Failed to load trade partners",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignTrade = async () => {
    if (!selectedTradeId) {
      toast.error("Select a trade partner", {
        description: "Please choose a trade partner to assign",
      });
      return;
    }

    setAssigning(true);
    try {
      const response = await fetch(`/api/claims/${claimId}/trades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradePartnerId: selectedTradeId,
          role: selectedRole,
        }),
      });

      if (response.ok) {
        toast.success("Trade partner assigned", {
        description: "Successfully linked trade partner to claim",
      });
        setSelectedTradeId("");
        setSelectedRole("Contractor");
        void fetchData();
      } else {
        const data = await response.json();
        toast.error("Failed to assign", {
        description: data.error || "Could not assign trade partner",
      });
      }
    } catch (error) {
      logger.error("Failed to assign trade:", error);
      toast.error("Error", {
        description: "Failed to assign trade partner",
      });
    } finally {
      setAssigning(false);
    }
  };

  const unassignTrade = async (linkId: string, businessName: string) => {
    if (!confirm(`Remove ${businessName} from this claim?`)) return;

    try {
      const response = await fetch(`/api/claims/${claimId}/trades?linkId=${linkId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Trade partner removed", {
        description: `${businessName} unassigned from claim`,
      });
        void fetchData();
      } else {
        toast.error("Failed to remove", {
        description: "Could not unassign trade partner",
      });
      }
    } catch (error) {
      logger.error("Failed to unassign trade:", error);
      toast.error("Error", {
        description: "Failed to unassign trade partner",
      });
    }
  };

  const availableTrades = allTrades.filter(
    (trade) => !linkedTrades.some((link) => link.tradePartner.id === trade.id)
  );

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-1/3 rounded bg-slate-200" />
          <div className="h-4 w-1/2 rounded bg-slate-200" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Trade Partners
          </h3>
          <p className="mt-1 text-sm text-slate-500">Assign contractors to work on this claim</p>
        </div>
      </div>

      {/* Assign New Trade Partner */}
      {availableTrades.length > 0 && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-700">Assign Trade Partner</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select value={selectedTradeId} onValueChange={setSelectedTradeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select trade partner..." />
              </SelectTrigger>
              <SelectContent>
                {availableTrades.map((trade) => (
                  <SelectItem key={trade.id} value={trade.id}>
                    {trade.businessName}
                    {trade.specialties.length > 0 && ` (${trade.specialties[0]})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Contractor">Contractor</SelectItem>
                <SelectItem value="Sub-Contractor">Sub-Contractor</SelectItem>
                <SelectItem value="Specialist">Specialist</SelectItem>
                <SelectItem value="Inspector">Inspector</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={assignTrade}
              disabled={!selectedTradeId || assigning}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              {assigning ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </div>
      )}

      {/* Linked Trades List */}
      {linkedTrades.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-6 py-8 text-center">
          <Briefcase className="mx-auto h-12 w-12 text-slate-400" />
          <h4 className="mt-3 text-sm font-semibold text-slate-900">No trade partners assigned</h4>
          <p className="mt-1 text-sm text-slate-500">
            Assign contractors to help resolve this claim
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {linkedTrades.map((link) => (
            <div key={link.id} className="rounded-lg border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900">
                      {link.tradePartner.businessName}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {link.role}
                    </Badge>
                  </div>

                  {link.tradePartner.specialties.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {link.tradePartner.specialties.map((specialty, idx) => (
                        <Badge key={idx} className="bg-blue-100 text-xs text-blue-700">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 space-y-1">
                    {link.tradePartner.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Phone className="h-4 w-4 text-blue-600" />
                        <a
                          href={`tel:${link.tradePartner.phone}`}
                          className="font-medium hover:text-blue-600"
                        >
                          {link.tradePartner.phone}
                        </a>
                      </div>
                    )}
                    {link.tradePartner.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Mail className="h-4 w-4 text-amber-600" />
                        <a
                          href={`mailto:${link.tradePartner.email}`}
                          className="hover:text-amber-600"
                        >
                          {link.tradePartner.email}
                        </a>
                      </div>
                    )}
                    {link.tradePartner.licenseNumber && (
                      <p className="mt-1 text-xs text-slate-600">
                        License: {link.tradePartner.licenseNumber}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      Added: {new Date(link.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => unassignTrade(link.id, link.tradePartner.businessName)}
                  className="ml-4 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {availableTrades.length === 0 && allTrades.length > 0 && (
        <p className="mt-4 text-center text-xs text-slate-500">
          All available trade partners are assigned to this claim
        </p>
      )}
    </Card>
  );
}
