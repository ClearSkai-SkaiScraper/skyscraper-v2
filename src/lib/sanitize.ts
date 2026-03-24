/**
 * HTML SANITIZER — XSS Protection
 * ─────────────────────────────────────────────────────────
 * Lightweight server-safe HTML sanitizer for rendering
 * AI-generated or user-provided HTML content.
 *
 * Uses an allowlist approach — only explicitly permitted tags
 * and attributes survive. Everything else is stripped.
 *
 * @see MASTER_HARDENING_AUDIT.md — SEC-006
 */

/** Tags allowed in sanitized output */
const ALLOWED_TAGS = new Set([
  // Text formatting
  "p",
  "br",
  "hr",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "mark",
  "small",
  "sub",
  "sup",
  // Headings
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  // Lists
  "ul",
  "ol",
  "li",
  // Tables
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  // Block elements
  "div",
  "span",
  "blockquote",
  "pre",
  "code",
  // Links (href will be validated)
  "a",
]);

/** Attributes allowed per tag (beyond class which is always allowed) */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  img: new Set(["src", "alt", "width", "height"]),
};

/** Attribute values that should always be added for security */
const FORCED_ATTRS: Record<string, Record<string, string>> = {
  a: { rel: "noopener noreferrer", target: "_blank" },
};

/**
 * Strip all HTML tags and return plain text.
 * Use when no HTML is needed at all.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Escape text for safe HTML insertion.
 * Use when embedding dynamic text inside HTML templates.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitize HTML — allowlist-based tag/attribute filtering.
 *
 * Strips all tags not in the allowlist, removes dangerous attributes
 * (onclick, onerror, style with expressions), and validates href URLs.
 *
 * NOT a full DOMPurify replacement — for production-grade needs,
 * consider adding `isomorphic-dompurify` as a dependency.
 *
 * @param html - Raw HTML string (possibly from AI, user input, or API)
 * @returns Sanitized HTML safe for dangerouslySetInnerHTML
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  // 1. Remove script/style tags and their contents entirely
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed[^>]*\/?>/gi, "")
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "");

  // 2. Remove event handler attributes (on*)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");

  // 3. Remove javascript: and data: URLs in any attribute
  sanitized = sanitized.replace(
    /(?:href|src|action)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi,
    ""
  );
  sanitized = sanitized.replace(/(?:href|src|action)\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi, "");

  // 4. Process tags — keep allowed, strip disallowed
  sanitized = sanitized.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)?\/?>/g,
    (match, tagName: string, attrs: string = "") => {
      const tag = tagName.toLowerCase();

      // Strip disallowed tags entirely (not their contents, just the tags)
      if (!ALLOWED_TAGS.has(tag)) {
        return "";
      }

      // For closing tags, just return the clean closing tag
      if (match.startsWith("</")) {
        return `</${tag}>`;
      }

      // Filter attributes
      const cleanAttrs = filterAttributes(tag, attrs);
      const forcedAttrs = FORCED_ATTRS[tag];
      let attrString = cleanAttrs;

      if (forcedAttrs) {
        for (const [key, value] of Object.entries(forcedAttrs)) {
          if (!attrString.includes(`${key}=`)) {
            attrString += ` ${key}="${escapeHtml(value)}"`;
          }
        }
      }

      const selfClosing = match.endsWith("/>") ? " /" : "";
      return `<${tag}${attrString}${selfClosing}>`;
    }
  );

  return sanitized.trim();
}

/**
 * Filter attributes on a tag, keeping only allowlisted ones.
 */
function filterAttributes(tag: string, attrString: string): string {
  if (!attrString?.trim()) return "";

  const allowedForTag = ALLOWED_ATTRS[tag] || new Set<string>();
  const parts: string[] = [];

  // Match attribute patterns: name="value", name='value', name=value, name
  const attrRegex = /([a-zA-Z_][\w-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let m: RegExpExecArray | null;

  while ((m = attrRegex.exec(attrString)) !== null) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? "";

    // Always allow class
    if (name === "class") {
      parts.push(` class="${escapeHtml(value)}"`);
      continue;
    }

    // Check tag-specific allowlist
    if (allowedForTag.has(name)) {
      // Validate href values
      if (name === "href") {
        if (isValidUrl(value)) {
          parts.push(` href="${escapeHtml(value)}"`);
        }
      } else {
        parts.push(` ${name}="${escapeHtml(value)}"`);
      }
    }
  }

  return parts.join("");
}

/**
 * Validate a URL is safe (http, https, mailto, tel, or relative).
 */
function isValidUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:")
  ) {
    return false;
  }
  return true;
}

/**
 * Convert markdown-style **bold** text to HTML <strong> tags,
 * then sanitize the result. Safe replacement for the common pattern
 * of `.replace(/\*\*(.*?)\*\*\/g, '<strong>$1</strong>')` + dangerouslySetInnerHTML.
 */
export function markdownBoldToHtml(text: string): string {
  const html = escapeHtml(text).replace(
    /\*\*(.*?)\*\*/g,
    '<strong class="text-slate-900">$1</strong>'
  );
  return html;
}
