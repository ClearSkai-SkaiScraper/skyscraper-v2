/**
 * File Upload Validation
 *
 * Validates file uploads for type, size, and potential malware
 * Prevents malicious file uploads
 */

import { NextRequest } from "next/server";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB default
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25MB for documents

/**
 * Allowed MIME types by category
 */
const ALLOWED_MIME_TYPES = {
  images: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  documents: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ],
  archives: [
    "application/zip",
    "application/x-zip-compressed",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
  ],
  videos: ["video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/webm"],
};

/**
 * Dangerous file extensions (never allow)
 */
const DANGEROUS_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".scr",
  ".vbs",
  ".js",
  ".jar",
  ".msi",
  ".dll",
  ".sys",
  ".drv",
  ".ps1",
  ".psm1",
  ".sh",
  ".bash",
  ".app",
  ".deb",
  ".rpm",
  ".dmg",
  ".pkg",
];

/**
 * Validate file type
 */
export function validateFileType(filename: string, mimeType: string, category: string): boolean {
  // Check dangerous extensions first
  const ext = filename.toLowerCase().substring(filename.lastIndexOf("."));
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    throw new Error(`File type not allowed: ${ext}`);
  }

  // Check MIME type
  const allowedTypes = ALLOWED_MIME_TYPES[category as keyof typeof ALLOWED_MIME_TYPES];
  if (!allowedTypes) {
    throw new Error(`Invalid file category: ${category}`);
  }

  if (!allowedTypes.includes(mimeType)) {
    throw new Error(`File type not allowed: ${mimeType}`);
  }

  return true;
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, category: string): boolean {
  let maxSize = MAX_FILE_SIZE;

  if (category === "images") {
    maxSize = MAX_IMAGE_SIZE;
  } else if (category === "documents") {
    maxSize = MAX_DOCUMENT_SIZE;
  }

  if (size > maxSize) {
    throw new Error(`File too large. Max size: ${maxSize / 1024 / 1024}MB`);
  }

  return true;
}

/**
 * Validate filename
 */
export function validateFilename(filename: string): boolean {
  // Check length
  if (filename.length > 255) {
    throw new Error("Filename too long (max 255 characters)");
  }

  // Check for null bytes (path traversal attempt)
  if (filename.includes("\0")) {
    throw new Error("Invalid filename: contains null byte");
  }

  // Check for path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    throw new Error("Invalid filename: path traversal detected");
  }

  // Must have extension
  if (!filename.includes(".")) {
    throw new Error("Invalid filename: no extension");
  }

  return true;
}

/**
 * Scan file for malware signatures (basic)
 */
export function scanForMalware(buffer: Buffer): boolean {
  // Check for executable signatures
  const signatures = [
    Buffer.from([0x4d, 0x5a]), // EXE/DLL (MZ)
    Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // ELF
    Buffer.from([0xca, 0xfe, 0xba, 0xbe]), // Mach-O
    Buffer.from([0x21, 0x3c, 0x61, 0x72, 0x63, 0x68, 0x3e]), // Debian package
  ];

  for (const signature of signatures) {
    if (buffer.slice(0, signature.length).equals(signature)) {
      throw new Error("Malware detected: executable file signature found");
    }
  }

  // Check for suspicious patterns
  const suspicious = [
    Buffer.from("eval("),
    Buffer.from("<script"),
    Buffer.from("<?php"),
    Buffer.from("<%"),
  ];

  for (const pattern of suspicious) {
    if (buffer.includes(pattern)) {
      console.warn("⚠️ Suspicious pattern detected in file");
    }
  }

  return true;
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace invalid chars
    .replace(/\.\.+/g, ".") // Remove path traversal
    .replace(/^\.+/, "") // Remove leading dots
    .substring(0, 255); // Limit length
}

/**
 * Validate and process file upload
 */
export async function validateFileUpload(
  file: File,
  category: string,
  _options?: {
    maxSize?: number;
    allowedTypes?: string[];
  }
): Promise<{ valid: boolean; sanitizedName: string }> {
  // Validate filename
  validateFilename(file.name);

  // Validate file type
  validateFileType(file.name, file.type, category);

  // Validate file size
  validateFileSize(file.size, category);

  // Read file buffer for malware scan
  const buffer = Buffer.from(await file.arrayBuffer());
  scanForMalware(buffer);

  // Sanitize filename
  const sanitizedName = sanitizeFilename(file.name);

  return {
    valid: true,
    sanitizedName,
  };
}

/**
 * Middleware for file upload validation
 */
export function withFileValidation(category: string) {
  return async (req: NextRequest) => {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      await validateFileUpload(file, category);

      return null; // Allow request to proceed
    } catch (error) {
      return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
}

/**
 * Check if file is image
 */
export function isImage(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.images.includes(mimeType);
}

/**
 * Check if file is document
 */
export function isDocument(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.documents.includes(mimeType);
}

/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = getFileExtension(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}.${ext}`;
}
