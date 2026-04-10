/**
 * Advanced AI Document Processing
 *
 * Specialized AI-powered document parsing with OCR
 * Extract structured data from insurance docs, invoices, policies
 */

import { callAI, getAIConfig } from "@/lib/ai/aiAssistant";
import { logger } from "@/lib/logger";

export type DocumentType =
  | "INSURANCE_POLICY"
  | "ESTIMATE"
  | "INVOICE"
  | "CONTRACT"
  | "INSPECTION_REPORT"
  | "PHOTO_EVIDENCE"
  | "RECEIPT"
  | "CORRESPONDENCE";

export interface ParsedDocument {
  type: DocumentType;
  confidence: number;
  extractedData: Record<string, any>;
  rawText?: string;
  metadata: {
    pages: number;
    language: string;
    processingTime: number;
  };
}

/**
 * Parse document with AI + OCR
 */
export async function parseDocument(
  documentUrl: string,
  documentType?: DocumentType
): Promise<ParsedDocument> {
  try {
    const startTime = Date.now();

    // Step 1: OCR extraction (if image/PDF)
    const rawText = await extractTextFromDocument(documentUrl);

    // Step 2: Detect document type if not provided
    const detectedType = documentType || (await detectDocumentType(rawText));

    // Step 3: Extract structured data based on type
    const extractedData = await extractStructuredData(rawText, detectedType);

    // Step 4: Validate and enhance data
    const validatedData = await validateExtractedData(extractedData, detectedType);

    return {
      type: detectedType,
      confidence: calculateConfidence(extractedData),
      extractedData: validatedData,
      rawText,
      metadata: {
        pages: countPages(rawText),
        language: detectLanguage(rawText),
        processingTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    logger.error("Document parsing failed:", error);
    throw new Error("Failed to parse document");
  }
}

/**
 * Extract text from document using OCR
 */
async function extractTextFromDocument(url: string): Promise<string> {
  try {
    // TODO: Integrate with OCR service (Tesseract, Google Cloud Vision, AWS Textract)

    // Mock implementation
    logger.debug(`📄 OCR Processing: ${url}`);

    // Simulated OCR output
    return `
Insurance Policy Document
Policy Number: INS-2024-12345
Policyholder: John Smith
Coverage Amount: $250,000
Deductible: $2,500
Effective Date: 01/15/2024
Expiration Date: 01/15/2025
    `.trim();
  } catch (error) {
    logger.error("OCR extraction failed:", error);
    throw error;
  }
}

/**
 * Detect document type using AI
 */
async function detectDocumentType(text: string): Promise<DocumentType> {
  try {
    const prompt = `Analyze this document and identify its type. Return ONLY one of these exact types:
- INSURANCE_POLICY
- ESTIMATE
- INVOICE
- CONTRACT
- INSPECTION_REPORT
- PHOTO_EVIDENCE
- RECEIPT
- CORRESPONDENCE

Document text:
${text.substring(0, 1000)}

Type:`;

    const config = getAIConfig();
    const response = await callAI(prompt, { ...config, maxTokens: 50 });
    const type = response.result.trim().toUpperCase();

    // Validate type
    const validTypes: DocumentType[] = [
      "INSURANCE_POLICY",
      "ESTIMATE",
      "INVOICE",
      "CONTRACT",
      "INSPECTION_REPORT",
      "PHOTO_EVIDENCE",
      "RECEIPT",
      "CORRESPONDENCE",
    ];

    if (validTypes.includes(type as DocumentType)) {
      return type as DocumentType;
    }

    return "CORRESPONDENCE"; // Default fallback
  } catch {
    return "CORRESPONDENCE";
  }
}

/**
 * Extract structured data based on document type
 */
async function extractStructuredData(
  text: string,
  type: DocumentType
): Promise<Record<string, any>> {
  const schemas = {
    INSURANCE_POLICY: {
      policyNumber: "Policy number or ID",
      policyHolder: "Policyholder name",
      coverageAmount: "Total coverage amount",
      deductible: "Deductible amount",
      effectiveDate: "Policy effective date",
      expirationDate: "Policy expiration date",
      carrier: "Insurance carrier name",
      coverageTypes: "Types of coverage (wind, hail, water, etc)",
      premiumAmount: "Premium amount",
    },
    ESTIMATE: {
      estimateNumber: "Estimate or quote number",
      contractor: "Contractor or company name",
      totalCost: "Total estimated cost",
      lineItems: "Array of line items with description, quantity, unit price",
      laborCost: "Total labor cost",
      materialCost: "Total material cost",
      validUntil: "Estimate validity date",
      startDate: "Proposed start date",
      completionDate: "Estimated completion date",
    },
    INVOICE: {
      invoiceNumber: "Invoice number",
      invoiceDate: "Invoice date",
      dueDate: "Payment due date",
      totalAmount: "Total amount due",
      paidAmount: "Amount already paid",
      balanceDue: "Remaining balance",
      lineItems: "Array of billed items",
      paymentTerms: "Payment terms",
      vendorName: "Vendor/company name",
      vendorContact: "Vendor contact information",
    },
    CONTRACT: {
      contractNumber: "Contract number",
      parties: "Names of contracting parties",
      effectiveDate: "Contract start date",
      expirationDate: "Contract end date",
      scope: "Scope of work",
      paymentTerms: "Payment schedule and terms",
      totalValue: "Total contract value",
      cancellationTerms: "Cancellation policy",
    },
    INSPECTION_REPORT: {
      inspectionDate: "Date of inspection",
      inspector: "Inspector name",
      propertyAddress: "Property address",
      findings: "Key findings and observations",
      damageAssessment: "Damage severity and areas",
      recommendations: "Recommended repairs",
      estimatedCost: "Estimated repair cost",
      photos: "Photo references",
    },
    RECEIPT: {
      receiptNumber: "Receipt number",
      date: "Transaction date",
      vendor: "Vendor name",
      items: "Purchased items",
      totalAmount: "Total amount",
      paymentMethod: "Payment method used",
    },
    CORRESPONDENCE: {
      sender: "Sender name/email",
      recipient: "Recipient name/email",
      date: "Date sent",
      subject: "Subject line",
      summary: "Brief summary of content",
      actionItems: "Action items or next steps",
    },
    PHOTO_EVIDENCE: {
      location: "Location/area depicted",
      damageType: "Type of damage visible",
      severity: "Damage severity (minor/moderate/severe)",
      description: "Description of what is shown",
    },
  };

  const schema = schemas[type] || schemas.CORRESPONDENCE;

  const prompt = `Extract structured data from this ${type.replace("_", " ").toLowerCase()} document.

Document text:
${text}

Extract these fields as JSON:
${JSON.stringify(schema, null, 2)}

Return ONLY valid JSON with extracted values. Use null for missing fields.`;

  try {
    const config = getAIConfig();
    const response = await callAI(prompt, { ...config, maxTokens: 2000 });

    // Parse AI response
    let extracted = JSON.parse(response.result);

    // Clean and normalize
    extracted = normalizeExtractedData(extracted, type);

    return extracted;
  } catch (error) {
    logger.error("Data extraction failed:", error);
    return {};
  }
}

/**
 * Normalize extracted data
 */
function normalizeExtractedData(
  data: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type: DocumentType
): Record<string, any> {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      continue;
    }

    // Normalize dates
    if (key.includes("Date") || key.includes("date")) {
      normalized[key] = parseDate(value);
      continue;
    }

    // Normalize currency
    if (key.includes("Amount") || key.includes("Cost") || key.includes("Price")) {
      normalized[key] = parseCurrency(value);
      continue;
    }

    // Clean strings
    if (typeof value === "string") {
      normalized[key] = value.trim();
      continue;
    }

    normalized[key] = value;
  }

  return normalized;
}

/**
 * Validate extracted data
 */
async function validateExtractedData(
  data: Record<string, any>,
  type: DocumentType
): Promise<Record<string, any>> {
  const validated = { ...data };

  // Type-specific validation
  switch (type) {
    case "INSURANCE_POLICY":
      // Validate policy number format
      if (validated.policyNumber && !/^[A-Z0-9-]+$/i.test(validated.policyNumber)) {
        validated._warnings = validated._warnings || [];
        validated._warnings.push("Policy number format may be invalid");
      }
      break;

    case "INVOICE":
    case "ESTIMATE":
      // Validate amounts
      if (validated.totalAmount && validated.totalAmount < 0) {
        validated._warnings = validated._warnings || [];
        validated._warnings.push("Negative total amount detected");
      }
      break;
  }

  return validated;
}

/**
 * Parse date string
 */
function parseDate(value: any): Date | null {
  if (!value) return null;

  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Parse currency string
 */
function parseCurrency(value: any): number | null {
  if (typeof value === "number") return value;
  if (!value) return null;

  try {
    // Remove currency symbols and commas
    const cleaned = String(value).replace(/[$,]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Calculate extraction confidence
 */
function calculateConfidence(data: Record<string, any>): number {
  const keys = Object.keys(data).filter((k) => !k.startsWith("_"));
  const filledFields = keys.filter((k) => data[k] !== null && data[k] !== undefined);

  return keys.length > 0 ? (filledFields.length / keys.length) * 100 : 0;
}

/**
 * Count pages in document
 */
function countPages(text: string): number {
  // Estimate based on text length (rough approximation)
  const avgCharsPerPage = 2000;
  return Math.max(1, Math.ceil(text.length / avgCharsPerPage));
}

/**
 * Detect document language
 */
function detectLanguage(text: string): string {
  // Simple detection (can be enhanced with a proper library)
  const spanish = /\b(seguro|póliza|reclamación|daños)\b/i.test(text);
  const french = /\b(assurance|police|réclamation|dommages)\b/i.test(text);

  if (spanish) return "es";
  if (french) return "fr";
  return "en";
}

/**
 * Batch process multiple documents
 */
export async function batchParseDocuments(
  documents: Array<{ url: string; type?: DocumentType }>
): Promise<ParsedDocument[]> {
  const results: ParsedDocument[] = [];

  // Process in batches of 5
  for (let i = 0; i < documents.length; i += 5) {
    const batch = documents.slice(i, i + 5);

    const batchResults = await Promise.allSettled(
      batch.map((doc) => parseDocument(doc.url, doc.type))
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        logger.error("[DOCUMENT_PROCESSING] Document parsing failed", { reason: result.reason });
      }
    }

    // Rate limiting delay
    if (i + 5 < documents.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Store parsed document
 */
export async function storeParsedDocument(
  documentId: string,
  parsed: ParsedDocument
): Promise<boolean> {
  try {
    // TODO: Add ParsedDocument model to Prisma schema if needed
    // For now, log the parsed document data
    logger.debug(`[DOCUMENT_PROCESSING] Storing parsed document: ${documentId}`, {
      type: parsed.type,
      confidence: parsed.confidence,
      extractedDataKeys: Object.keys(parsed.extractedData),
    });

    return true;
  } catch {
    return false;
  }
}
