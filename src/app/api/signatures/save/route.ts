export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import { saveSignature } from "@/lib/signatures/saveSignature";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { documentId, signerName, signerEmail, role, signature } = body;

    if (!documentId || !signerName || !signerEmail || !role || !signature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await saveSignature({
      documentId,
      signerName,
      signerEmail,
      role,
      signature,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Signature save error:", error);
    return NextResponse.json(
      { error: "Failed to save signature" },
      { status: 500 }
    );
  }
}
