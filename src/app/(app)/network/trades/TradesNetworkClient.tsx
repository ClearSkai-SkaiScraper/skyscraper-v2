"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { TradesGridCard } from "@/components/trades/TradesGridCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

type ConnectionStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED";

interface ContractorData {
  id: string;
  businessName: string;
  companyLogoUrl: string | null;
  rating: number | null;
  reviewCount: number;
  serviceAreas: string[];
  primaryServices: string[];
  emergencyService: boolean;
  isVerified: boolean;
  clientConnections: Array<{ status: ConnectionStatus }>;
}

interface TradesNetworkClientProps {
  contractors: ContractorData[];
  currentUserId: string;
}

export function TradesNetworkClient({ contractors, currentUserId }: TradesNetworkClientProps) {
  const router = useRouter();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<ContractorData | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConnect = async (contractorId: string) => {
    const contractor = contractors.find((c) => c.id === contractorId);
    if (!contractor) return;

    setSelectedContractor(contractor);
    setConnectModalOpen(true);
  };

  const handleSendRequest = async () => {
    if (!selectedContractor) return;

    setLoading(true);
    try {
      const res = await fetch("/api/connections/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId: selectedContractor.id,
          message: message.trim() || undefined,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to send connection request");
        setLoading(false);
        return;
      }

      toast.success("Connection request sent!");
      setConnectModalOpen(false);
      setMessage("");
      router.refresh(); // Refresh to update connection status
    } catch (error) {
      logger.error("Error sending connection request:", error);
      toast.error("Failed to send connection request");
    } finally {
      setLoading(false);
    }
  };

  const getConnectionStatus = (contractor: ContractorData) => {
    if (contractor.clientConnections.length === 0) return "none";
    const status = contractor.clientConnections[0].status;
    return status.toLowerCase() as "none" | "pending" | "connected" | "declined";
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contractors.map((contractor) => (
          <TradesGridCard
            key={contractor.id}
            id={contractor.id}
            businessName={contractor.businessName}
            logoUrl={contractor.companyLogoUrl}
            rating={contractor.rating}
            reviewCount={contractor.reviewCount}
            serviceAreas={contractor.serviceAreas}
            primaryServices={contractor.primaryServices}
            emergencyService={contractor.emergencyService}
            isVerified={contractor.isVerified}
            connectionStatus={getConnectionStatus(contractor)}
            onViewProfile={(id) => router.push(`/contractors/${id}`)}
            onConnect={handleConnect}
          />
        ))}
      </div>

      <Dialog open={connectModalOpen} onOpenChange={setConnectModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Connect with {selectedContractor?.businessName}
            </DialogTitle>
            <DialogDescription className="text-base">
              Send a connection request to start collaborating with this contractor. You&apos;ll be
              notified when they respond.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="message" className="text-sm font-semibold">
                  Message (optional)
                </Label>
                <span className="text-xs text-muted-foreground">{message.length} / 500</span>
              </div>
              <Textarea
                id="message"
                placeholder="Hi, I'd like to connect and explore potential collaboration opportunities..."
                value={message}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setMessage(e.target.value);
                  }
                }}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Introduce yourself and explain why you&apos;d like to connect
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setConnectModalOpen(false);
                setMessage("");
              }}
              disabled={loading}
              className="min-w-[100px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendRequest}
              disabled={loading}
              className="min-w-[140px] bg-gradient-to-r from-[#117CFF] to-[#0D63CC] text-white hover:shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
