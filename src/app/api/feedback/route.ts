import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { safeSendEmail } from "@/lib/mail";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Prisma singleton imported from @/lib/db/prisma

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    const rlIdentifier = userId || req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await checkRateLimit(rlIdentifier, "PUBLIC");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }
    const body = await req.json();
    const { message, email, name, category, task, issue, confusion, timestamp, userAgent, url } =
      body;

    // Support both old format (message) and new format (task/issue)
    const feedbackMessage = issue || message;
    const feedbackTask = task || category || "General";

    if (!feedbackMessage || feedbackMessage.trim().length < 10) {
      return NextResponse.json(
        { error: "Please provide feedback with at least 10 characters" },
        { status: 400 }
      );
    }

    // Log feedback for tracking (no DB storage to reduce dependencies)
    if (userId) {
      logger.info("[FEEDBACK_SUBMITTED]", {
        userId,
        category: category || feedbackTask,
        task: feedbackTask,
        issue: feedbackMessage,
        confusion,
        email: email || "not provided",
        name: name || "not provided",
        timestamp: timestamp || new Date().toISOString(),
        userAgent,
        url,
      });
    }

    // Send email notification to ops
    await safeSendEmail({
      to: "ops@skaiscrape.com",
      subject: `Feedback: ${category || "General"} - ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #0A1A2F; color: #FFC838; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .field { margin-bottom: 20px; }
              .label { font-weight: 600; color: #374151; margin-bottom: 5px; }
              .value { color: #6b7280; }
              .category-badge { display: inline-block; padding: 4px 12px; background: #117CFF; color: white; border-radius: 4px; font-size: 12px; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">📬 New Feedback Received</h2>
              </div>
              <div class="content">
                <div class="field">
                  <div class="label">Category:</div>
                  <div class="value">
                    <span class="category-badge">${category || "General"}</span>
                  </div>
                </div>
                
                <div class="field">
                  <div class="label">From:</div>
                  <div class="value">${name} (${email})</div>
                </div>
                
                <div class="field">
                  <div class="label">Message:</div>
                  <div class="value" style="white-space: pre-wrap; background: #f9fafb; padding: 15px; border-radius: 6px; border-left: 3px solid #117CFF;">${message}</div>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Reply directly to ${email} to follow up.
                </p>
              </div>
            </div>
          </body>
        </html>`,
    });

    // Log feedback
    logger.info("Feedback received:", {
      name,
      email,
      category,
      message,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      description: "Thank you for your feedback! It helps us improve SkaiScraper™.",
    });
  } catch (error) {
    logger.error("Feedback submission error:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
