import { getSupabaseClient } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (activeTenantId) {
    headers['X-Tenant-Id'] = activeTenantId;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : null),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'No error body');
      console.error(`[API ERROR] ${method} ${path} -> ${response.status}`, errorBody);
      throw new Error(`API Error ${response.status}: ${errorBody || response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error(`[API FETCH FAILED] ${method} ${path}:`, error.message);
    throw error;
  }
}
