"use client";

import { AlertCircle, ArrowLeft, Building2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageHero } from "@/components/layout/PageHero";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { calculateHoaPrice } from "@/lib/pricing/hoaPricing";

type Mode = "neutral" | "contractor_assisted";

export default function NewHoaNoticePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [community, setCommunity] = useState("");
  const [stormDate, setStormDate] = useState("");
  const [homeCount, setHomeCount] = useState("");
  const [mode, setMode] = useState<Mode>("neutral");
  const [customMessage, setCustomMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/hoa/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community,
          stormDate,
          homeCount: parseInt(homeCount),
          mode,
          customMessage: customMessage || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create notice pack");
      }

      router.push(`/hoa/notices/${data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pricing = homeCount ? calculateHoaPrice(parseInt(homeCount)) : null;

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <PageHero
            section="jobs"
            title="Create HOA Notice Pack"
            subtitle="Generate community storm intelligence package"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Community Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              Community Information
            </CardTitle>
            <CardDescription>Basic details about the HOA or community</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="community">Community Name *</Label>
              <Input
                id="community"
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
                placeholder="e.g., Oakwood Estates HOA"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stormDate">Storm Date *</Label>
                <Input
                  id="stormDate"
                  type="date"
                  value={stormDate}
                  onChange={(e) => setStormDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="homeCount">Number of Homes *</Label>
                <Input
                  id="homeCount"
                  type="number"
                  value={homeCount}
                  onChange={(e) => setHomeCount(e.target.value)}
                  placeholder="e.g., 250"
                  min="1"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messaging Mode */}
        <Card>
          <CardHeader>
            <CardTitle>Messaging Mode</CardTitle>
            <CardDescription>Choose how the notice presents information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <div className="flex items-start space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="neutral" id="neutral" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="neutral" className="cursor-pointer text-base font-semibold">
                    Neutral Notice
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Purely informational. Provides storm impact data without contractor information.
                    Best for board-approved communications.
                  </p>
                  <Badge variant="outline" className="mt-2">
                    Board-Safe
                  </Badge>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="contractor_assisted" id="contractor" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="contractor" className="cursor-pointer text-base font-semibold">
                    Contractor Assisted
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Includes your contact information and inspection offer. For communities where
                    you have existing relationships.
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    Relationship Required
                  </Badge>
                </div>
              </div>
            </RadioGroup>

            {/* Custom Message */}
            <div>
              <Label htmlFor="customMessage">
                Custom Message <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="customMessage"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add any custom notes or context for the HOA board..."
                rows={4}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                This will be included in the cover letter to the board.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        {pricing && (
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>One-time package cost</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tier: {pricing.tier.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {homeCount} homes • {mode === "neutral" ? "Neutral" : "Contractor Assisted"}{" "}
                    mode
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">
                    {pricing.isCustom ? "Custom" : `$${pricing.price.toLocaleString()}`}
                  </p>
                  {pricing.isCustom && (
                    <p className="text-xs text-muted-foreground">Contact sales for quote</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !community || !stormDate || !homeCount}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Notice Pack"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
