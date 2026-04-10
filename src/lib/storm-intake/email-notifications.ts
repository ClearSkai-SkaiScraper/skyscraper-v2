/**
 * Storm Intake Email Notifications
 * Sends emails when storm intakes are completed
 */

import { Resend } from "resend";

import { logger } from "@/lib/observability/logger";

let _resend: Resend | null = null;

function getResend() {
  // eslint-disable-next-line no-restricted-syntax
  if (!_resend && process.env.RESEND_API_KEY) {
    // eslint-disable-next-line no-restricted-syntax
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}
// eslint-disable-next-line no-restricted-syntax
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "no-reply@skaiscrape.com";

interface StormIntakeEmailData {
  orgName?: string;
  orgEmail?: string;
  homeownerEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  severityScore?: number;
  reportUrl?: string;
  intakeId: string;
}

/**
 * Send notification to organization when public storm intake is completed
 */
export async function sendOrgIntakeNotification(data: StormIntakeEmailData): Promise<boolean> {
  // eslint-disable-next-line no-restricted-syntax
  if (!data.orgEmail || !process.env.RESEND_API_KEY) {
    logger.debug("[EMAIL] Skipping org notification (no email or API key)");
    return false;
  }

  try {
    const severity = data.severityScore ?? 0;
    const severityLabel =
      severity >= 70 ? "High Risk" : severity >= 40 ? "Moderate Risk" : "Low Risk";

    await getResend()?.emails?.send({
      from: FROM_EMAIL,
      to: data.orgEmail,
      subject: `🚨 New Storm Damage Intake - ${data.address || "Property"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Storm Damage Intake Submitted</h2>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Property Information</h3>
            <p><strong>Address:</strong> ${data.address || "Unknown"}</p>
            <p><strong>City:</strong> ${data.city}, ${data.state}</p>
            <p><strong>Severity Score:</strong> ${severity}/100 (${severityLabel})</p>
          </div>

          ${
            data.reportUrl
              ? `
          <div style="margin: 20px 0;">
            <a href="${data.reportUrl}" 
               style="background: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              View Full Report
            </a>
          </div>
          `
              : ""
          }

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This intake was submitted via your public storm damage assessment form.
            <br/>
            Intake ID: ${data.intakeId}
          </p>

          <p style="color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
            ${data.orgName || "SkaiScraper"} • Powered by SkaiScraper AI Platform
          </p>
        </div>
      `,
    });

    logger.debug(`[EMAIL] ✅ Sent org notification to ${data.orgEmail}`);
    return true;
  } catch (error) {
    logger.error("[EMAIL] Failed to send org notification:", error);
    return false;
  }
}

/**
 * Send report to homeowner when storm intake is completed
 */
export async function sendHomeownerReport(data: StormIntakeEmailData): Promise<boolean> {
  // eslint-disable-next-line no-restricted-syntax
  if (!data.homeownerEmail || !process.env.RESEND_API_KEY) {
    logger.debug("[EMAIL] Skipping homeowner email (no email or API key)");
    return false;
  }

  try {
    const severity = data.severityScore ?? 0;
    const severityLabel =
      severity >= 70 ? "High Risk" : severity >= 40 ? "Moderate Risk" : "Low Risk";

    await getResend()?.emails?.send({
      from: FROM_EMAIL,
      to: data.homeownerEmail,
      subject: `Your Storm Damage Assessment Report - ${data.address || "Property"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Your Storm Damage Assessment is Complete</h2>
          
          <p>Thank you for completing the storm damage assessment for your property.</p>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Assessment Summary</h3>
            <p><strong>Property:</strong> ${data.address || "Unknown"}</p>
            <p><strong>Severity Score:</strong> ${severity}/100 (${severityLabel})</p>
          </div>

          ${
            severity >= 70
              ? `
          <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
            <strong style="color: #dc2626;">⚠️ High Risk Detected</strong>
            <p style="margin: 8px 0 0 0;">We strongly recommend scheduling a professional inspection as soon as possible.</p>
          </div>
          `
              : ""
          }

          ${
            data.reportUrl
              ? `
          <div style="margin: 20px 0;">
            <a href="${data.reportUrl}" 
               style="background: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Download Your Full Report (PDF)
            </a>
          </div>
          `
              : ""
          }

          <div style="margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px;">
            <h3 style="margin-top: 0;">Next Steps</h3>
            ${
              severity >= 70
                ? `
              <ul>
                <li>Schedule immediate professional inspection</li>
                <li>Document all damage with photos</li>
                <li>Contact your insurance company</li>
                <li>Consider emergency repairs to prevent further damage</li>
              </ul>
            `
                : severity >= 40
                  ? `
              <ul>
                <li>Schedule professional assessment within 1-2 weeks</li>
                <li>Monitor for changes in damage severity</li>
                <li>Review insurance coverage</li>
              </ul>
            `
                  : `
              <ul>
                <li>Continue monitoring property condition</li>
                <li>Schedule routine maintenance inspection</li>
                <li>Keep photos for records</li>
              </ul>
            `
            }
          </div>

          <p style="color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
            This assessment is based on the information you provided and should not replace a professional inspection.
            <br/><br/>
            ${data.orgName || "SkaiScraper"} • Powered by SkaiScraper AI Platform
          </p>
        </div>
      `,
    });

    logger.debug(`[EMAIL] ✅ Sent homeowner report to ${data.homeownerEmail}`);
    return true;
  } catch (error) {
    logger.error("[EMAIL] Failed to send homeowner email:", error);
    return false;
  }
}
