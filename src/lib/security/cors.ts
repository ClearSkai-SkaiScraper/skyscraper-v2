/**
 * CORS Configuration for API Routes
 * Ensures only trusted domains can access external-facing APIs
 */

const ALLOWED_ORIGINS = [
  "https://skaiscrape.com",
  "https://www.skaiscrape.com",
  // eslint-disable-next-line no-restricted-syntax
  process.env.NEXT_PUBLIC_APP_URL,
  // eslint-disable-next-line no-restricted-syntax
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean) as string[];

// Add localhost for development
// eslint-disable-next-line no-restricted-syntax
if (process.env.NODE_ENV === "development") {
  ALLOWED_ORIGINS.push("http://localhost:3000");
  ALLOWED_ORIGINS.push("http://127.0.0.1:3000");
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed));
}

/**
 * Get CORS headers for a response
 * @param origin - Request origin
 * @param allowCredentials - Whether to allow credentials
 */
export function getCorsHeaders(
  origin: string | null,
  allowCredentials = true
): HeadersInit {
  const headers: HeadersInit = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Access-Control-Max-Age": "86400", // 24 hours
  };

  // Only set origin if it's allowed
  if (origin && isOriginAllowed(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    if (allowCredentials) {
      headers["Access-Control-Allow-Credentials"] = "true";
    }
  }

  return headers;
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflightRequest(request: Request): Response {
  const origin = request.headers.get("origin");
  const headers = getCorsHeaders(origin);

  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * Add CORS headers to a response
 */
export function addCorsHeaders(response: Response, request: Request): Response {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Clone response and add CORS headers
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Middleware wrapper to add CORS to API route
 */
export function withCors(
  handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    // Handle preflight
    if (request.method === "OPTIONS") {
      return handleCorsPreflightRequest(request);
    }

    // Execute handler and add CORS headers
    const response = await handler(request);
    return addCorsHeaders(response, request);
  };
}
