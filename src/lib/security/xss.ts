/**
 * XSS Prevention
 *
 * Sanitizes user inputs to prevent Cross-Site Scripting attacks
 * Escapes HTML, JavaScript, and dangerous characters
 */

import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML input
 * Removes dangerous tags and attributes
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "a",
      "blockquote",
      "code",
      "pre",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize HTML with more permissive rules (for rich text editors)
 */
export function sanitizeRichText(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "a",
      "blockquote",
      "code",
      "pre",
      "span",
      "div",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "img",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "class", "style"],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Strip ALL HTML tags
 */
export function stripHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Escape HTML entities
 */
export function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Escape JavaScript string
 */
export function escapeJS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\f/g, "\\f")
    .replace(/\v/g, "\\v");
}

/**
 * Sanitize URL to prevent javascript: and data: URLs
 */
export function sanitizeURL(url: string): string {
  const urlLower = url.toLowerCase().trim();

  // Block dangerous protocols
  const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"];
  for (const protocol of dangerousProtocols) {
    if (urlLower.startsWith(protocol)) {
      return "";
    }
  }

  // Only allow http, https, mailto, tel
  const allowedProtocols = ["http://", "https://", "mailto:", "tel:"];
  const hasAllowedProtocol = allowedProtocols.some((p) => urlLower.startsWith(p));

  if (!hasAllowedProtocol && url.includes(":")) {
    return "";
  }

  return url;
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace invalid chars
    .replace(/\.\.+/g, ".") // Remove path traversal
    .replace(/^\.+/, "") // Remove leading dots
    .substring(0, 255); // Limit length
}

/**
 * Sanitize user input for display
 */
export function sanitizeUserInput(input: string, type: "text" | "html" | "url" = "text"): string {
  if (!input) return "";

  switch (type) {
    case "html":
      return sanitizeHTML(input);
    case "url":
      return sanitizeURL(input);
    case "text":
    default:
      return escapeHTML(input);
  }
}

/**
 * Sanitize object recursively
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeObject(obj: any, type: "text" | "html" = "text"): any {
  if (typeof obj === "string") {
    return sanitizeUserInput(obj, type);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, type));
  }

  if (typeof obj === "object" && obj !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value, type);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Validate and sanitize content security policy
 */
export function getCSPHeader(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.vercel-insights.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.clerk.com https://*.clerk.accounts.dev",
    "frame-src 'self' https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}
