import { Metadata } from "next";

import { ReferralProgramEmpty } from "@/components/portal/ReferralProgram";

export const metadata: Metadata = {
  title: "Refer a Neighbor | Client Portal",
  description: "Earn $50 for every neighbor you refer. Share your link and both of you save!",
};

export default function PortalReferralPage() {
  // In production, fetch real referral stats from API
  // For now, use the empty state component
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <ReferralProgramEmpty />
    </div>
  );
}
