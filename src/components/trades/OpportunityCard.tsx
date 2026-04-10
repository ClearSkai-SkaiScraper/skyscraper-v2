"use client";

import { useAuth } from "@clerk/nextjs";
import { Calendar, MapPin, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { getTradeEmoji } from "@/lib/trades";

interface OpportunityCardProps {
  id: string;
  title: string;
  body: string;
  trade: string;
  city?: string;
  state?: string;
  createdAt: string;
  applicantCount: number;
  createdBy: string;
  hasFullAccess?: boolean;
}

export function OpportunityCard({
  id,
  title,
  body,
  trade,
  city,
  state,
  createdAt,
  applicantCount,
  createdBy,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hasFullAccess = false,
}: OpportunityCardProps) {
  const router = useRouter();
  const { userId } = useAuth();
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [intro, setIntro] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const isOwnPost = userId === createdBy;
  const location = [city, state].filter(Boolean).join(", ");
  const emoji = getTradeEmoji(trade);
  const createdDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleApplyClick = () => {
    if (isOwnPost) {
      toast.error("You cannot apply to your own opportunity");
      return;
    }

    setShowApplyModal(true);
  };

  const handleSubmitApplication = async () => {
    if (!intro.trim()) {
      toast.error("Please write an introduction message");
      return;
    }

    setIsApplying(true);

    try {
      const response = await fetch("/api/trades/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: id,
          intro: intro.trim(),
          attachments: [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          toast.error("Full Access required to apply");
        } else {
          toast.error(data.error || "Failed to apply");
        }
        return;
      }

      toast.success("Application sent!");

      setShowApplyModal(false);
      setIntro("");

      // Redirect to thread
      if (data.threadId) {
        router.push(`/network/thread/${data.threadId}`);
      }
    } catch (err) {
      logger.error("Apply error:", err);
      toast.error("Failed to send application");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <>
      <Card className="transition-colors hover:border-primary/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-2xl">{emoji}</span>
                <span className="truncate">{title}</span>
              </CardTitle>
              <CardDescription className="mt-2 flex items-center gap-4">
                {location && (
                  <span className="flex items-center gap-1 text-xs">
                    <MapPin className="h-3 w-3" />
                    {location}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                  {createdDate}
                </span>
              </CardDescription>
            </div>
            <Badge variant="secondary" className="flex shrink-0 items-center gap-1">
              <Users className="h-3 w-3" />
              {applicantCount}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-3 text-sm text-muted-foreground">{body}</p>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleApplyClick}
            disabled={isOwnPost}
            variant={isOwnPost ? "ghost" : "default"}
            className="w-full"
          >
            {isOwnPost ? "Your Opportunity" : "Apply Now"}
          </Button>
        </CardFooter>
      </Card>

      {/* Apply Modal */}
      <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to {title}</DialogTitle>
            <DialogDescription>Introduce yourself to the poster.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="intro">Your Message</Label>
              <Textarea
                id="intro"
                placeholder="Hi, I'm interested in this opportunity. I have experience with..."
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                rows={6}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowApplyModal(false)} disabled={isApplying}>
              Cancel
            </Button>
            <Button onClick={handleSubmitApplication} disabled={isApplying}>
              {isApplying ? "Sending..." : "Send Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
