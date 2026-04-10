// Central error taxonomy: stable codes for UI surfaces & monitoring.
export type ErrorCode =
  | 'ERR_UNAUTHORIZED'
  | 'ERR_FORBIDDEN'
  | 'ERR_NOT_FOUND'
  | 'ERR_CONFLICT'
  | 'ERR_RATE_LIMIT'
  | 'ERR_VALIDATION'
  | 'ERR_INTERNAL'
  | 'ERR_CLAIM_NOT_FOUND'
  | 'ERR_WEATHER_UNAVAILABLE'
  | 'ERR_FILE_TOO_LARGE'
  | 'ERR_FEATURE_DISABLED';

interface TaxonomyEntry { code: ErrorCode; http: number; message: string; }

const MAP: Record<ErrorCode, TaxonomyEntry> = {
  ERR_UNAUTHORIZED: { code: 'ERR_UNAUTHORIZED', http: 401, message: 'Unauthorized' },
  ERR_FORBIDDEN: { code: 'ERR_FORBIDDEN', http: 403, message: 'Forbidden' },
  ERR_NOT_FOUND: { code: 'ERR_NOT_FOUND', http: 404, message: 'Resource not found' },
  ERR_CONFLICT: { code: 'ERR_CONFLICT', http: 409, message: 'Conflict' },
  ERR_RATE_LIMIT: { code: 'ERR_RATE_LIMIT', http: 429, message: 'Rate limit exceeded' },
  ERR_VALIDATION: { code: 'ERR_VALIDATION', http: 400, message: 'Validation failed' },
  ERR_INTERNAL: { code: 'ERR_INTERNAL', http: 500, message: 'Internal server error' },
  ERR_CLAIM_NOT_FOUND: { code: 'ERR_CLAIM_NOT_FOUND', http: 404, message: 'Claim not found' },
  ERR_WEATHER_UNAVAILABLE: { code: 'ERR_WEATHER_UNAVAILABLE', http: 503, message: 'Weather service unavailable' },
  ERR_FILE_TOO_LARGE: { code: 'ERR_FILE_TOO_LARGE', http: 413, message: 'File too large' },
  ERR_FEATURE_DISABLED: { code: 'ERR_FEATURE_DISABLED', http: 403, message: 'Feature disabled' }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function errorResponse(code: ErrorCode, extras?: Record<string, any>) {
  const entry = MAP[code];
  return Response.json({ error: entry.message, code: entry.code, ...extras }, { status: entry.http });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wrapTry<T>(fn: () => Promise<T>, onError?: (e: any) => ErrorCode): Promise<T | Response> {
  return fn().catch(e => {
    const code = onError ? onError(e) : 'ERR_INTERNAL';
    return errorResponse(code, { details: e?.message });
  });
}
