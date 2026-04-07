export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/requireAuth";
import { BasePDFTemplate } from "@/lib/pdf/baseTemplate.tsx";
import { uploadPDFToFirebase } from "@/lib/storage/firebaseUpload";
import { pdfToUint8 } from "@/pdf/render";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { orgId, userId } = auth;

  const body = await req.json();
  // Default to landscape unless explicitly set to false
  const landscape = body.landscape !== false;

  // Compose PDF using modular sections (stubbed for now)
  const pdf = await pdfToUint8(
    BasePDFTemplate({
      landscape,
      branding: body.branding ?? {},
      header: body.header,
      children: body.children,
      qrUrl: body.qrUrl,
      footer: body.footer,
    })
  );

  // Use Firebase upload
  const url = await uploadPDFToFirebase(Buffer.from(pdf), {
    lat: 0,
    lon: 0,
    date: String(Date.now()),
  });
  return NextResponse.json({ url });
}
