import { createClient } from '@/utils/supabase/client';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiRequest(
  endpoint: string,
  method = 'GET',
  body: any = null,
  activeTenantId?: string,
  accessToken?: string
) {
  const cleanEndpoint = `/${endpoint.replace(/^\/+|\/+$/g, '')}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  console.log('[API BASE URL CHECK]', {
     env: process.env.NEXT_PUBLIC_API_URL,
     url,
  });

  // Resolve token: provided or from session
  let token = accessToken;
  if (!token) {
    console.log('[API TOKEN] Resolving token from session storage...');
    const { data: { session } } = await createClient().auth.getSession();
    token = session?.access_token;
    console.log('[API TOKEN] Resolution complete', { hasToken: !!token });
  } else {
    console.log('[API TOKEN] Using provided accessToken');
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
      console.log('[API INITIATING FETCH]', {
        method,
        endpoint,
        url,
        attempt,
        hasToken: !!token,
        tenantId: activeTenantId || null,
      });

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

        console.error('[API RESPONSE ERROR]', {
          method,
          url,
          status: response.status,
          durationMs,
          attempt,
          errorPayload,
        });

        // Non-retryable status codes (e.g., 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Validation Error)
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

        await sleep(300); // Wait before retry
        continue;
      }

      console.log('[API RESPONSE OK]', {
        method,
        url,
        status: response.status,
        durationMs,
        attempt,
      });

      if (response.status === 204) return null;

      if (contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.text();
    } catch (error: any) {
      const durationMs = Math.round(performance.now() - startedAt);

      console.error('[API FETCH FAILURE]', {
        method,
        url,
        attempt,
        durationMs,
        message: error?.message,
        status: error?.status || null,
      });

      // Retry on network errors or non-client-side error status codes
      const retryableStatus = error?.status && ![400, 401, 403, 404, 422].includes(error.status);
      const retryableNetwork = !error?.status;

      if (attempt < maxAttempts && (retryableStatus || retryableNetwork)) {
        await sleep(300);
        continue;
      }

      throw error;
    }
  }
}
