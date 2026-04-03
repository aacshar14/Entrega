import { getSupabaseClient } from './supabase';

const API_BASE_URL = '/api/v1';

export async function apiRequest(
  endpoint: string, 
  method = 'GET', 
  body: any = null,
  activeTenantId?: string
) {
  // Normalize endpoint: ensure it starts with / and has no trailing slash unless it's just /
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (cleanEndpoint.length > 1 && cleanEndpoint.endsWith('/')) {
    cleanEndpoint = cleanEndpoint.slice(0, -1);
  }

  const { data: { session } } = await getSupabaseClient().auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (activeTenantId) {
    headers['X-Tenant-Id'] = activeTenantId;
  }

  const url = `${API_BASE_URL}${cleanEndpoint}`;

  console.log(`[API DEBUG] ${method} ${url}`, { body, tenant: activeTenantId });

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[API DEBUG] Error ${response.status} on ${url}:`, errorData);
      const error: any = new Error(errorData.detail || 'Error en la petición al API');
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) return null;
    return await response.json();
  } catch (error: any) {
    console.error(`[API DEBUG] Fetch failed for ${url}:`, error);
    throw error;
  }
}
