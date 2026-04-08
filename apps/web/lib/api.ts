import { createClient } from '@/utils/supabase/client';

// Use relative path to leverage Next.js proxy/rewrites in production
const API_BASE_URL = 'https://api.entrega.space/api/v1';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Entrega API Client
 * 
 * Standardized request utility with:
 * - Automatic absolute URL resolution
 * - Intelligent session token injection
 * - Lightweight retry policy for transient network failures
 * - Structured error handling
 */
export async function apiRequest(
  endpoint: string,
  method = 'GET',
  body: any = null,
  activeTenantId?: string,
  accessToken?: string
) {
  const cleanEndpoint = `/${endpoint.replace(/^\/+|\/+$/g, '')}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  // 🔐 Token Resolution: Prioritize injected token to avoid redundant session fetches
  let token = accessToken;
  
  // Only attempt auto-discovery if no token is provided and we are in a browser context
  if (!token && typeof window !== 'undefined') {
    const { data: { session } } = await createClient().auth.getSession();
    token = session?.access_token;
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (activeTenantId) {
    headers['X-Tenant-Id'] = activeTenantId;
  }

  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startedAt = performance.now();

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body instanceof FormData ? body : (body ? JSON.stringify(body) : null),
      });

      const durationMs = Math.round(performance.now() - startedAt);
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        let errorPayload: any = null;

        if (contentType.includes('application/json')) {
          errorPayload = await response.json().catch(() => null);
        } else {
          errorPayload = await response.text().catch(() => null);
        }

        // Operational logging for failures
        console.error('[API FAILURE]', {
          method,
          endpoint,
          status: response.status,
          durationMs,
          attempt,
          detail: errorPayload?.detail || 'No detail provided'
        });

        // Non-retryable status codes 
        const nonRetryable = [400, 401, 403, 404, 422].includes(response.status);

        const error: any = new Error(
          (errorPayload && errorPayload.detail) ||
          (typeof errorPayload === 'string' ? errorPayload : null) ||
          `API request failed with status ${response.status}`
        );
        error.status = response.status;
        error.payload = errorPayload;

        if (nonRetryable || attempt === maxAttempts) {
          throw error;
        }

        await sleep(300 * attempt); 
        continue;
      }

      // Success paths
      if (response.status === 204) return null;

      if (contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.text();
    } catch (error: any) {
      const durationMs = Math.round(performance.now() - startedAt);

      // Don't log if we are going to retry
      const retryableStatus = error?.status && ![400, 401, 403, 404, 422].includes(error.status);
      const retryableNetwork = !error?.status;

      if (attempt < maxAttempts && (retryableStatus || retryableNetwork)) {
        await sleep(300 * attempt);
        continue;
      }

      // Log terminal failure
      console.error('[API TERMINAL ERROR]', {
        method,
        endpoint,
        attempt,
        durationMs,
        message: error?.message,
        status: error?.status || 'Network Error',
      });

      throw error;
    }
  }
}
