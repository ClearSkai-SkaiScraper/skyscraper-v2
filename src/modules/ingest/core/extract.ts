// Phase 5 - OCR/Vision Text Extraction Core
// @ts-ignore - pdf-parse has complex module exports
const pdfParse = require("pdf-parse");

export interface TextExtractionResult {
  text: string;
  confidence: number;
  method: "pdf-native" | "ocr-vision" | "ocr-tesseract";
}

/**
 * Extract text from PDF (native text layer)
 * Uses pdf-parse library to extract embedded text
 */
export async function extractPdfText(buffer: Buffer | string): Promise<TextExtractionResult> {
  try {
    // Convert string path to buffer if needed
    let pdfBuffer: Buffer;
    if (typeof buffer === "string") {
      const fs = await import("fs");
      pdfBuffer = fs.readFileSync(buffer);
    } else {
      pdfBuffer = buffer;
    }

    // Parse PDF and extract text
    const data = await pdfParse(pdfBuffer);
    const text = data.text.trim();

    // Calculate confidence based on text extraction quality
    let confidence = 0.5;
    if (text.length > 100) confidence = 0.8; // Good extraction
    if (text.length > 500) confidence = 0.95; // Excellent extraction
    if (text.length === 0) confidence = 0.1; // No text found

    return {
      text,
      confidence,
      method: "pdf-native",
    };
  } catch (error) {
    console.error("PDF text extraction failed:", error);
    return {
      text: "",
      confidence: 0.0,
      method: "pdf-native",
    };
  }
}

/**
 * Run OCR on image or scanned PDF using Vision API
 * Falls back to Tesseract if Vision unavailable
 */
export async function runVisionOCR(buffer: Buffer | string): Promise<TextExtractionResult> {
  // Try OpenAI Vision API first (if API key available)
  // eslint-disable-next-line no-restricted-syntax
  if (process.env.OPENAI_API_KEY) {
    try {
      return await runOpenAIVision(buffer);
    } catch (error) {
      console.error("OpenAI Vision failed, falling back to Tesseract:", error);
    }
  }

  // Fallback to Tesseract
  try {
    return await runTesseractOCR(buffer);
  } catch (error) {
    console.error("Tesseract OCR failed:", error);
    return {
      text: "",
      confidence: 0.0,
      method: "ocr-tesseract",
    };
  }
}

/**
 * OpenAI Vision API OCR extraction
 */
async function runOpenAIVision(buffer: Buffer | string): Promise<TextExtractionResult> {
  // Convert buffer to base64 if needed
  let base64Image: string;
  if (typeof buffer === "string") {
    const fs = await import("fs");
    base64Image = fs.readFileSync(buffer).toString("base64");
  } else {
    base64Image = buffer.toString("base64");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // eslint-disable-next-line no-restricted-syntax
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text from this document. Return only the extracted text, preserving layout and structure.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Vision API error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices[0]?.message?.content || "";

  return {
    text,
    confidence: text.length > 100 ? 0.9 : 0.7,
    method: "ocr-vision",
  };
}

/**
 * Tesseract OCR fallback
 */
async function runTesseractOCR(buffer: Buffer | string): Promise<TextExtractionResult> {
  const Tesseract = await import("tesseract.js");

  const result = await Tesseract.recognize(buffer, "eng", {
    logger: () => {}, // Suppress logs
  });

  return {
    text: result.data.text,
    confidence: result.data.confidence / 100, // Convert 0-100 to 0-1
    method: "ocr-tesseract",
  };
}

/**
 * Main extraction function with fallback strategy
 * 1. Try native PDF text extraction
 * 2. If confidence < 0.8 or image file, run OCR
 */
export async function extractText(
  fileBuffer: Buffer | string,
  mimeType?: string
): Promise<TextExtractionResult> {
  // If image file, go straight to OCR
  if (mimeType && mimeType.startsWith("image/")) {
    return runVisionOCR(fileBuffer);
  }

  // Try PDF native extraction first
  const nativeResult = await extractPdfText(fileBuffer);

  // If low confidence, run OCR as fallback
  if (nativeResult.confidence < 0.8) {
    try {
      const ocrResult = await runVisionOCR(fileBuffer);
      // Return whichever has higher confidence
      return ocrResult.confidence > nativeResult.confidence ? ocrResult : nativeResult;
    } catch (error) {
      console.error("OCR fallback failed:", error);
      return nativeResult;
    }
  }

  return nativeResult;
}

/**
 * Parse numbers from text (amounts, dates, etc.)
 */
export function parseAmountFromText(text: string): number | undefined {
  // Match currency amounts like $1,234.56
  const match = text.match(/\$?[\d,]+\.?\d{0,2}/);
  if (!match) return undefined;

  const cleanedAmount = match[0].replace(/[$,]/g, "");
  const amount = parseFloat(cleanedAmount);
  return isNaN(amount) ? undefined : amount;
}

/**
 * Parse dates from text
 */
export function parseDateFromText(text: string): string | undefined {
  // Simple date pattern matching (MM/DD/YYYY, MM-DD-YYYY, etc.)
  const dateMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (!dateMatch) return undefined;

  try {
    const [, month, day, year] = dateMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return new Date(`${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`).toISOString();
  } catch {
    return undefined;
  }
}
