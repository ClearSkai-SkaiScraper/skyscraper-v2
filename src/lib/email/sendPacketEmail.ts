// src/lib/email/sendPacketEmail.ts
import { safeSendEmail } from "@/lib/mail";

interface SendPacketEmailParams {
  to: string;
  cc?: string;
  subject: string;
  message: string;
  packetUrl: string;
  from?: string;
}

/**
 * Sends a packet email using Resend
 * Includes the packet URL as a clickable link in the message
 */
export async function sendPacketEmail(params: SendPacketEmailParams) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { to, cc, subject, message, packetUrl, from } = params;

  // Convert plain text message to HTML with packet link
  const htmlMessage = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="white-space: pre-wrap; line-height: 1.6;">
        ${message.replace(/\n/g, "<br>")}
      </div>
      
      <div style="margin: 30px 0; padding: 20px; background: #f5f5f5; border-radius: 8px;">
        <p style="margin: 0 0 10px 0; font-weight: 600;">View Packet:</p>
        <a href="${packetUrl}" style="color: #2563eb; text-decoration: none; word-break: break-all;">
          ${packetUrl}
        </a>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666;">
        <p>Sent via SkaiScraper</p>
      </div>
    </div>
  `;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const textMessage = `${message}\n\nView Packet:\n${packetUrl}\n\n---\nSent via SkaiScraper`;

  const recipients = cc ? `${to}, ${cc}` : to;

  const result = await safeSendEmail({
    to: recipients,
    subject,
    html: htmlMessage,
  } as any);

  return result;
}
