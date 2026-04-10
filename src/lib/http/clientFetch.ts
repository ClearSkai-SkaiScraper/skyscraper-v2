/**
 * Client-side Fetch Helper
 *
 * Standardized fetch wrapper for all client-side API calls
 * - Always uses relative URLs (preserves auth cookies)
 * - Always includes credentials
 * - Proper error handling with status codes
 * - Type-safe responses
 */

interface FetchOptions extends Omit<RequestInit, "body"> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
}

interface FetchError extends Error {
  status?: number;
  statusText?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

/**
 * Client-safe fetch helper
 *
 * Usage:
 *   const data = await clientFetch('/api/claims/123', { method: 'GET' });
 *   const result = await clientFetch('/api/claims/456', {
 *     method: 'POST',
 *     body: { key: 'value' }
 *   });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function clientFetch<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
  // Ensure URL is relative (preserves cookies)
  const relativeUrl = url.startsWith("http") ? new URL(url).pathname + new URL(url).search : url;

  // Prepare fetch options
  const fetchOptions: RequestInit = {
    ...options,
    credentials: "include", // CRITICAL: Include auth cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  // Serialize body if present
  if (options.body !== undefined) {
    fetchOptions.body =
      typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }

  try {
    const response = await fetch(relativeUrl, fetchOptions);

    // Parse response data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any;
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : {};
    }

    // Handle error responses
    if (!response.ok) {
      const error = new Error(
        data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`
      ) as FetchError;

      error.status = response.status;
      error.statusText = response.statusText;
      error.data = data;

      throw error;
    }

    return data as T;
  } catch (error) {
    // Re-throw with enhanced error info
    if (error instanceof Error) {
      const fetchError = error as FetchError;

      // Add helpful context for common errors
      if (!fetchError.status) {
        fetchError.message = `Network error: ${error.message}`;
      }

      throw fetchError;
    }

    throw new Error("Unknown fetch error");
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const http = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: <T = any>(url: string, options?: Omit<FetchOptions, "method" | "body">) =>
    clientFetch<T>(url, { ...options, method: "GET" }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: <T = any>(url: string, body?: any, options?: Omit<FetchOptions, "method" | "body">) =>
    clientFetch<T>(url, { ...options, method: "POST", body }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  put: <T = any>(url: string, body?: any, options?: Omit<FetchOptions, "method" | "body">) =>
    clientFetch<T>(url, { ...options, method: "PUT", body }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patch: <T = any>(url: string, body?: any, options?: Omit<FetchOptions, "method" | "body">) =>
    clientFetch<T>(url, { ...options, method: "PATCH", body }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete: <T = any>(url: string, options?: Omit<FetchOptions, "method" | "body">) =>
    clientFetch<T>(url, { ...options, method: "DELETE" }),
};
