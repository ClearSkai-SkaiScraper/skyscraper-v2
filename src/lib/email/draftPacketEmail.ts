// src/lib/email/draftPacketEmail.ts
import { logger } from "@/lib/logger";
import { getOpenAI } from "@/lib/openai";

import type { DraftedPacketEmail,PacketRecipientType } from "./types";

interface DraftEmailParams {
  recipientType: PacketRecipientType;
  claim: any;
  payload: any;
  packetType: "report" | "estimate" | "supplement";
  packetUrl: string;
}

/**
 * Uses GPT-4o to draft a professional email for sending packet exports
 * Tone varies by recipient: professional for adjusters, friendly for homeowners
 */
export async function draftPacketEmail(params: DraftEmailParams): Promise<DraftedPacketEmail> {
  const { recipientType, claim, payload, packetType, packetUrl } = params;

  // Extract claim context
  const claimNumber = claim?.claimNumber ?? claim?.id?.slice(0, 8) ?? "Unknown";
  const insured_name = claim?.insured_name ?? "the insured";
  const propertyAddress = claim?.propertyAddress ?? claim?.property?.address ?? "the property";
  const carrier = claim?.carrier ?? claim?.carrierName ?? "the insurance company";

  // Determine default recipient email
  let defaultTo = "";
  if (recipientType === "adjuster") {
    defaultTo = claim?.adjusterEmail ?? "";
  } else if (recipientType === "homeowner") {
    defaultTo = claim?.homeownerEmail ?? "";
  }

  // Build context for AI
  const systemPrompt = `You are a professional assistant helping contractors draft emails to send insurance claim packets.

Tone guidelines:
- For adjusters: Professional, concise, claims industry language, respectful but direct
- For homeowners: Friendly, reassuring, plain language, educational

Always:
- Keep subject lines under 70 characters
- Keep email body under 300 words
- Be clear about what's attached/linked
- Use proper formatting with line breaks`;

  let userPrompt = "";
  
  if (recipientType === "adjuster") {
    userPrompt = `Draft an email to send a ${packetType} packet to an insurance adjuster.

Claim context:
- Claim #: ${claimNumber}
- Insured: ${insured_name}
- Property: ${propertyAddress}
- Carrier: ${carrier}

Packet type: ${packetType}
${packetType === "supplement" ? "- This is a supplemental request for additional items not included in the original estimate" : ""}
${packetType === "estimate" ? "- This is our detailed estimate for repairs" : ""}
${packetType === "report" ? "- This is a comprehensive assessment report" : ""}

The packet is available at: ${packetUrl}

Generate:
1. A professional subject line (under 70 chars)
2. A concise email body that:
   - References the claim number
   - States what's being submitted
   - Mentions the link to the packet
   - Asks for review/approval
   - Provides your contact info placeholder

Format as JSON:
{
  "subject": "...",
  "message": "..."
}`;
  } else {
    // Homeowner
    userPrompt = `Draft a friendly email to send a ${packetType} summary to a homeowner.

Claim context:
- Claim #: ${claimNumber}
- Homeowner: ${insured_name}
- Property: ${propertyAddress}
- Insurance Company: ${carrier}

Packet type: ${packetType}
${packetType === "supplement" ? "- This explains additional items we're requesting from their insurance" : ""}
${packetType === "estimate" ? "- This shows our detailed estimate for their repairs" : ""}
${packetType === "report" ? "- This provides an update on their claim status" : ""}

The summary is available at: ${packetUrl}

Generate:
1. A friendly subject line (under 70 chars)
2. A reassuring email body that:
   - Greets them warmly
   - Explains what this document is in plain language
   - Mentions the link
   - Reassures them about next steps
   - Invites them to call with questions

Format as JSON:
{
  "subject": "...",
  "message": "..."
}`;
  }

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    const result = JSON.parse(content);
    
    return {
      to: defaultTo,
      subject: result.subject || `${packetType} packet for claim ${claimNumber}`,
      message: result.message || `Please see attached ${packetType} packet for claim ${claimNumber}.`,
      recipientType,
      packetUrl,
    };
  } catch (error) {
    logger.error("Error drafting packet email:", error);
    
    // Fallback to simple template
    const fallbackSubject = recipientType === "adjuster"
      ? `Claim ${claimNumber} – ${packetType} packet`
      : `Update on your insurance claim (${claimNumber})`;
    
    const fallbackMessage = recipientType === "adjuster"
      ? `Please review the attached ${packetType} packet for claim ${claimNumber}.\n\nPacket link: ${packetUrl}\n\nPlease let me know if you have any questions or need additional information.\n\nThank you,\n[Your name]`
      : `Hi ${insured_name},\n\nI wanted to share an update on your insurance claim (${claimNumber}).\n\nYou can view the details here: ${packetUrl}\n\nThis document explains what we're working on with ${carrier}. Please feel free to call if you have any questions!\n\nThank you,\n[Your contractor]`;
    
    return {
      to: defaultTo,
      subject: fallbackSubject,
      message: fallbackMessage,
      recipientType,
      packetUrl,
    };
  }
}
