export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: { templateId: string } }) {
  try {
    const { templateId } = params;

    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        tags: true,
        version: true,
        thumbnailUrl: true,
        sections: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!template) {
      return NextResponse.json({ ok: false, error: "TEMPLATE_NOT_FOUND" }, { status: 404 });
    }

    // Only return published templates for public access
    if (!template.isPublished) {
      return NextResponse.json({ ok: false, error: "TEMPLATE_NOT_PUBLISHED" }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      template: {
        ...template,
        placeholderCount: Array.isArray(template.sections)
          ? (template.sections as unknown[]).length
          : 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "UNKNOWN_ERROR",
      },
      { status: 500 }
    );
  }
}
