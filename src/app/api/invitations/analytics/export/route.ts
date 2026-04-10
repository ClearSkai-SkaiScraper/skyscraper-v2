export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";

    // Generate CSV report - in a real implementation this would query your database
    const csvData = [
      [
        "Date",
        "Sent",
        "Viewed",
        "Accepted",
        "Expired",
        "Pending",
        "View Rate (%)",
        "Accept Rate (%)",
      ],
      ["2024-01-01", "25", "18", "12", "2", "3", "72", "48"],
      ["2024-01-02", "30", "22", "15", "1", "6", "73", "50"],
      ["2024-01-03", "35", "28", "18", "2", "8", "80", "51"],
    ];

    const csv = csvData.map((row) => row.join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="invitation-analytics-${period}.csv"`,
      },
    });
  } catch (error: unknown) {
    logger.error("Error exporting invitation analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
