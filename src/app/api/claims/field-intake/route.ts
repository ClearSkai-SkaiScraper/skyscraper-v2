export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Mobile Field Intake
 * POST /api/claims/field-intake
 *
 * Accepts multipart form data from Field Mode and creates a claim quickly.
 * Photos are uploaded in a later step via claim photo endpoints.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { orgId, userId } = auth;

    const formData = await req.formData();
    const propertyAddress = String(formData.get("propertyAddress") || "").trim();
    const homeownerName = String(formData.get("homeownerName") || "").trim();
    const notes = String(formData.get("notes") || "").trim();
    const quickScopeRaw = String(formData.get("quickScope") || "[]");
    // New fields: GPS, address components, routing, linked records
    const latitude = formData.get("latitude") ? parseFloat(String(formData.get("latitude"))) : null;
    const longitude = formData.get("longitude")
      ? parseFloat(String(formData.get("longitude")))
      : null;
    const street = String(formData.get("street") || propertyAddress || "").trim();
    const city = String(formData.get("city") || "").trim();
    const state = String(formData.get("state") || "").trim();
    const zipCode = String(formData.get("zipCode") || "").trim();
    const jobType = String(formData.get("jobType") || "insurance_claim").trim();
    const homeownerEmail = String(formData.get("homeownerEmail") || "").trim();
    const homeownerPhone = String(formData.get("homeownerPhone") || "").trim();
    const linkedRecordId = String(formData.get("linkedRecordId") || "").trim() || null;
    const linkedRecordType = String(formData.get("linkedRecordType") || "").trim() || null;
    const existingPropertyId = String(formData.get("propertyId") || "").trim() || null;

    const quickScope: string[] = (() => {
      try {
        const parsed = JSON.parse(quickScopeRaw);
        return Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        return [];
      }
    })();

    // ── Server-side validation ──
    if (!homeownerName) {
      return NextResponse.json({ error: "Homeowner name is required" }, { status: 400 });
    }
    if (!propertyAddress && !street) {
      return NextResponse.json({ error: "Property address is required" }, { status: 400 });
    }

    const uploadedPhotos = formData.getAll("photos");

    // ── Reuse existing property or create new one ──
    let propertyId = existingPropertyId;

    if (existingPropertyId) {
      // Verify the property belongs to this org
      const existing = await prisma.properties.findFirst({
        where: { id: existingPropertyId, orgId },
        select: { id: true },
      });
      if (!existing) {
        logger.warn("[FIELD_INTAKE] Provided propertyId not found in org, creating new", {
          existingPropertyId,
          orgId,
        });
        propertyId = null;
      }
    }

    // Ensure we have a contact record (required by properties)
    const contact = await prisma.contacts.create({
      data: {
        id: createId(),
        orgId,
        firstName: homeownerName.split(" ")[0] || "Field",
        lastName: homeownerName.split(" ").slice(1).join(" ") || "Homeowner",
        email: homeownerEmail || null,
        phone: homeownerPhone || null,
        slug: `field-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (!propertyId) {
      const property = await prisma.properties.create({
        data: {
          id: createId(),
          orgId,
          contactId: contact.id,
          name: propertyAddress || "Field Inspection Property",
          propertyType: "residential",
          street: street || propertyAddress || "Unknown",
          city,
          state,
          zipCode,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      propertyId = property.id;
    }

    // ── Map job type to claim defaults ──
    const jobTypeDefaults: Record<
      string,
      { status: string; damageType: string; priority: string }
    > = {
      insurance_claim: { status: "intake", damageType: "storm", priority: "high" },
      repair: { status: "estimate_needed", damageType: "general", priority: "medium" },
      out_of_pocket: { status: "estimate_needed", damageType: "general", priority: "medium" },
      financing: { status: "intake", damageType: "general", priority: "medium" },
    };
    const defaults = jobTypeDefaults[jobType] || jobTypeDefaults.insurance_claim;

    const claimNumber = `FIELD-${Date.now().toString().slice(-8)}`;

    const descriptionParts = [
      notes,
      quickScope.length ? `Quick scope: ${quickScope.join(", ")}` : "",
      jobType !== "insurance_claim" ? `Job type: ${jobType.replace(/_/g, " ")}` : "",
      latitude && longitude ? `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : "",
    ].filter(Boolean);

    const claim = await prisma.claims.create({
      data: {
        id: createId(),
        orgId,
        propertyId,
        claimNumber,
        title: `Field Inspection — ${propertyAddress || street || "Unknown Address"}`,
        description: descriptionParts.join("\n\n"),
        damageType: defaults.damageType,
        dateOfLoss: new Date(),
        status: defaults.status,
        priority: defaults.priority,
        insured_name: homeownerName || null,
        homeownerEmail: homeownerEmail || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // ── Link to existing record if specified ──
    if (linkedRecordId && linkedRecordType === "claim") {
      logger.info("[FIELD_INTAKE] Linked to existing claim", {
        linkedRecordId,
        newClaimId: claim.id,
      });
      // Store link in description for now (claim_activities could be used later)
      try {
        await prisma.claims.update({
          where: { id: claim.id },
          data: {
            description: `${claim.description || ""}\n\nLinked from claim: ${linkedRecordId}`,
          },
        });
      } catch {
        // Non-fatal
      }
    }

    logger.info("[FIELD_INTAKE] Created field claim", {
      orgId,
      userId,
      claimId: claim.id,
      jobType,
      photoCount: uploadedPhotos.length,
      hasGPS: !!(latitude && longitude),
      linkedRecordId,
    });

    // ── Persist uploaded photos to Supabase + file_assets ──
    let savedPhotoCount = 0;
    if (uploadedPhotos.length > 0) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        // eslint-disable-next-line no-restricted-syntax
        const sbUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        // eslint-disable-next-line no-restricted-syntax
        const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (sbUrl && sbKey) {
          const supabase = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
          const bucket = "claim-photos";
          const maxSize = 25 * 1024 * 1024;
          const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/heic",
            "image/heif",
          ];

          // Ensure bucket exists
          const { data: buckets } = await supabase.storage.listBuckets();
          if (!buckets?.some((b: { name: string }) => b.name === bucket)) {
            await supabase.storage.createBucket(bucket, {
              public: true,
              fileSizeLimit: maxSize,
            });
          }

          for (const photo of uploadedPhotos) {
            if (!(photo instanceof File)) continue;
            if (!allowedTypes.includes(photo.type)) continue;
            if (photo.size > maxSize) continue;

            try {
              const bytes = await photo.arrayBuffer();
              const buffer = Buffer.from(bytes);
              const ext = photo.name.split(".").pop() || "jpg";
              const timestamp = Date.now();
              const uuid = crypto.randomUUID();
              const filePath = `${orgId}/${claim.id}/${timestamp}-${uuid}.${ext}`;

              const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, buffer, { contentType: photo.type, upsert: true });

              if (uploadError) {
                logger.warn("[FIELD_INTAKE] Photo upload failed", {
                  filename: photo.name,
                  error: uploadError.message,
                });
                continue;
              }

              const {
                data: { publicUrl },
              } = supabase.storage.from(bucket).getPublicUrl(filePath);

              await prisma.file_assets.create({
                data: {
                  id: crypto.randomUUID(),
                  orgId,
                  ownerId: userId,
                  claimId: claim.id,
                  filename: photo.name,
                  mimeType: photo.type,
                  sizeBytes: photo.size,
                  storageKey: filePath,
                  bucket,
                  publicUrl,
                  category: "damage",
                  source: "field_intake",
                  metadata: {
                    latitude: latitude || null,
                    longitude: longitude || null,
                    jobType,
                    capturedAt: new Date().toISOString(),
                  },
                  updatedAt: new Date(),
                },
              });

              savedPhotoCount++;
            } catch (photoErr) {
              logger.warn("[FIELD_INTAKE] Photo save error", {
                filename: photo.name,
                error: photoErr instanceof Error ? photoErr.message : String(photoErr),
              });
            }
          }

          logger.info("[FIELD_INTAKE] Photos persisted", {
            claimId: claim.id,
            attempted: uploadedPhotos.length,
            saved: savedPhotoCount,
          });
        } else {
          logger.warn("[FIELD_INTAKE] Supabase not configured, photos skipped");
        }
      } catch (storageErr) {
        // Non-fatal — claim is already created
        logger.error("[FIELD_INTAKE] Storage init error", storageErr);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        claimId: claim.id,
        claimNumber: claim.claimNumber,
        photoCount: savedPhotoCount,
        photoAttempted: uploadedPhotos.length,
        note:
          savedPhotoCount > 0
            ? `Claim created with ${savedPhotoCount} photo(s) from field mode.`
            : "Claim created from field mode. Upload photos to the claim workspace to finalize packet.",
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("[FIELD_INTAKE] Error", error);
    return NextResponse.json({ error: "Failed to create field claim" }, { status: 500 });
  }
}
