'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabaseClient } from '../supabase';
import { apiRequest } from '../api';
import { useRouter, usePathname } from 'next/navigation';
import SessionTimeout from './session-timeout';

interface User {
  id: string;
  email: string;
  full_name: string;
  platform_role: 'admin' | 'user';
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  status: string;
  business_whatsapp_number?: string;
  clients_imported: boolean;
  stock_imported: boolean;
  business_whatsapp_connected: boolean;
  ready: boolean;
  whatsapp_status: string;
  whatsapp_display_number?: string;
  whatsapp_account_name?: string;
  whatsapp_app_id?: string;
}

interface Membership {
  tenant: Tenant;
  role: 'owner' | 'operator';
  is_default: boolean;
}

interface TenantContextType {
  user: User | null;
  activeTenant: Tenant | null;
  memberships: Membership[];
  isLoading: boolean;
  switchTenant: (tenantId: string) => void;
  refreshUser: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  
  const router = useRouter();
  const pathname = usePathname();

  const handleManualLogout = () => {
    setUser(null);
    setActiveTenant(null);
    setMemberships([]);
    setActiveTenantId(null);
  };

  const fetchContext = async (overrideId?: string) => {
    console.log('[DEBUG AUTH] fetchContext started', { overrideId, activeTenantId });
    try {
      const data = await apiRequest('/me', 'GET', null, overrideId || activeTenantId || undefined);
      
      console.log('[DEBUG AUTH] /me response', { 
        role: data.user?.platform_role, 
        memberships: data.memberships?.length,
        active_tenant_from_api: data.active_tenant?.id 
      });

      const isAdminWithMultiple = data.user?.platform_role === 'admin' && (data.memberships?.length || 0) > 1;

      // 1. MANDATORY SELECTOR PRIORITY: If Admin + multiple tenants + NO explicit session selection
      if (isAdminWithMultiple && !overrideId && !activeTenantId) {
        console.log('[DEBUG AUTH] Admin selector branch forced.');
        setUser(data.user);
        setMemberships(data.memberships || []);
        setActiveTenant(null); // Force no active tenant
        
        if (!pathname.startsWith('/select-tenant')) {
          router.push('/select-tenant');
        }
        return; // HALT HERE
      }

      // 2. ASSIGNMENT: Proceed only if selection is made or not admin-with-multiple
      setUser(data.user);
      setActiveTenant(data.active_tenant);
      setMemberships(data.memberships || []);
      
      if (data.active_tenant?.id) {
        console.log('[DEBUG AUTH] Persisting selection:', data.active_tenant.id);
        setActiveTenantId(data.active_tenant.id);
      }

      // 3. AUTO-ROUTING
      if (data.active_tenant) {
        console.log('[DEBUG AUTH] Entering routing logic for:', data.active_tenant.slug);
        if (!data.active_tenant.ready && !pathname.startsWith('/onboarding')) {
          router.push('/onboarding');
        } else if (data.active_tenant.ready && pathname.startsWith('/onboarding')) {
          router.push('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch tenant context:', error);
      
      // Handle 401/403 explicitly
      if (error.status === 401 || error.status === 403) {
        setUser(null);
        setActiveTenant(null);
        if (!pathname.startsWith('/landing') && !pathname.startsWith('/login')) {
          router.push('/landing');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const supabase = getSupabaseClient();
        
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN') {
            fetchContext();
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setActiveTenant(null);
            setMemberships([]);
            router.push('/landing');
          }
        });

        // Initial load check
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          fetchContext();
        } else {
          setIsLoading(false);
          // Redirect to landing if on protected page without session
          if (!pathname.startsWith('/landing') && !pathname.startsWith('/login')) {
            router.push('/landing');
          }
        }
        
        return () => subscription.unsubscribe();
      } catch (err) {
        console.error('Supabase initialization failed:', err);
        setIsLoading(false);
      }
    };

    initialize();
  }, [activeTenantId, pathname]);

  const switchTenant = (tenantId: string) => {
    setActiveTenantId(tenantId);
    setIsLoading(true);
    fetchContext(tenantId);
  };

  return (
    <TenantContext.Provider value={{ 
      user, 
      activeTenant, 
      memberships, 
      isLoading, 
      switchTenant,
      refreshUser: fetchContext
    }}>
      {children}
      <SessionTimeout user={user} onLogout={handleManualLogout} />
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
