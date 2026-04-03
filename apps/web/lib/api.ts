import { getSupabaseClient } from './supabase';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_BASE_URL = BASE_URL.endsWith('/api/v1') ? BASE_URL : `${BASE_URL}/api/v1`;

export async function apiRequest(
  path: string, 
  method = 'GET', 
  body: any = null,
  activeTenantId?: string
) {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {};
  
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Enforce Authorization (Supabase token)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Enforce Multi-tenant isolation header
  if (activeTenantId) {
    headers['X-Tenant-Id'] = activeTenantId;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : null),
    });

    // Handle 401/403 explicitly for better UI feedback
    if (!response.ok) {
      let errorDetail = '';
      try {
        const errJson = await response.json();
        errorDetail = errJson.detail || JSON.stringify(errJson);
      } catch {
        errorDetail = await response.text().catch(() => response.statusText);
      }

      console.error(`[API ERROR] ${method} ${path} -> ${response.status}`, errorDetail);
      
      const error: any = new Error(errorDetail || `API Error ${response.status}`);
      error.status = response.status;
      error.path = path;
      throw error;
    }

    return await response.json();
  } catch (error: any) {
    console.error(`[API FETCH FAILED] ${method} ${path}:`, error.message);
    throw error;
  }
}
