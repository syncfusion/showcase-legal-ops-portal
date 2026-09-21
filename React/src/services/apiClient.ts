// GET helper for the portal API.

/**
 * API origin. Leave empty in dev so `/api` uses the Vite proxy (port 5187).
 */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly problemTitle?: string;

  constructor(status: number, message: string, problemTitle?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problemTitle = problemTitle;
  }
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const base = path.startsWith('http') ? '' : API_BASE_URL;
  const url = new URL(base + path, globalThis.location?.origin ?? 'http://localhost');

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return base ? url.toString() : `${url.pathname}${url.search}`;
}

/** GET JSON from the API. */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  signal?: AbortSignal,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(buildUrl(path, params), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, `Network error calling ${path}: ${(err as Error).message}`);
  }

  if (!res.ok) {
    let problemTitle: string | undefined;
    try {
      const body = await res.json();
      // Prefer the problem-details title.
      const title = typeof body?.title === 'string' ? body.title : undefined;
      const detail = typeof body?.detail === 'string' ? body.detail : undefined;
      problemTitle = title && detail
        ? `${title} — ${detail.split('\n')[0]}`
        : title ?? detail;
    } catch {
      // non-JSON body; ignore
    }
    throw new ApiError(
      res.status,
      `GET ${path} → ${res.status} ${res.statusText}`,
      problemTitle,
    );
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Absolute URL for a document's content stream. */
export function documentContentUrl(documentId: number | string): string {
  const path = `/api/v1/documents/${documentId}/content`;
  if (API_BASE_URL) {
    return `${API_BASE_URL}${path}`;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}
