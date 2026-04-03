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
  activeRole: 'owner' | 'operator' | null;
  memberships: Membership[];
  isLoading: boolean;
  switchTenant: (tenantId: string) => void;
  refreshUser: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [activeRole, setActiveRole] = useState<'owner' | 'operator' | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  
  const router = useRouter();
  const pathname = usePathname();

  const handleManualLogout = () => {
    setUser(null);
    setActiveTenant(null);
    setActiveRole(null);
    setMemberships([]);
    setActiveTenantId(null);
  };

  const fetchContext = async (overrideId?: string) => {
    try {
      // Safety: if the API call hangs, we don't want to lock the UI forever
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT_ME_RESOLUTION')), 8000)
      );

      const data = await Promise.race([
        apiRequest('/me', 'GET', null, overrideId || activeTenantId || undefined),
        timeoutPromise
      ]) as any;
      
      console.log('[AUTH DEBUG] Context resolved successfully', {
        role: data.user?.platform_role,
        tenant: data.active_tenant?.id,
        pathname
      });

      const isAdmin = data.user?.platform_role === 'admin';
      const membershipCount = data.memberships?.length || 0;
      const isAdminWithMultiple = isAdmin && membershipCount > 1;

      // Update state
      setUser(data.user);
      setMemberships(data.memberships || []);
      setActiveTenant(data.active_tenant);
      if (data.active_tenant?.id) {
        setActiveTenantId(data.active_tenant.id);
        
        // Resolve active role
        const activeMembership = data.memberships?.find(
          (m: Membership) => m.tenant.id === data.active_tenant.id
        );
        setActiveRole(activeMembership?.role || null);
      } else {
        setActiveRole(null);
      }

      // --- CENTRALIZED ROUTING AUTHORITY (PHASE 2 - STRICT) ---
      
      // 1. Admin with multiple tenants and no selection -> Force Selector
      if (isAdminWithMultiple && !overrideId && !activeTenantId) {
        if (!pathname.startsWith('/select-tenant')) {
          router.replace('/select-tenant');
        }
        setIsLoading(false);
        return; // HALT
      }

      // 2. Active Tenant Onboarding/Dashboard Gates
      if (data.active_tenant) {
        const isNotReady = !data.active_tenant.ready;
        const isOnboarding = pathname.startsWith('/onboarding');
        const isProtectedAppRoute = !['/landing', '/login', '/select-tenant', '/'].includes(pathname);

        if (isNotReady && isProtectedAppRoute && !isOnboarding) {
          router.replace('/onboarding');
        } else if (!isNotReady && isOnboarding) {
          router.replace('/dashboard');
        } else if (!isNotReady && pathname === '/') {
          router.replace('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Failed to resolve context:', error);
      if (error.message === 'TIMEOUT_ME_RESOLUTION' || error.status === 401 || error.status === 403) {
        handleManualLogout();
        if (!pathname.startsWith('/landing') && !pathname.startsWith('/login')) {
          router.replace('/landing');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    const initialize = async () => {
      try {
        const supabase = getSupabaseClient();
        
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('[AUTH DEBUG] Auth Event:', event);
          if (event === 'SIGNED_OUT') {
            handleManualLogout();
            router.replace('/landing');
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session) await fetchContext();
          }
        });
        subscription = data.subscription;

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[AUTH DEBUG] Active session found, fetching context...');
          await fetchContext();
        } else {
          console.log('[AUTH DEBUG] No active session, releasing loader.');
          setIsLoading(false);
          const isPublic = pathname.startsWith('/landing') || pathname.startsWith('/login');
          if (!isPublic && pathname !== '/') {
            router.replace('/landing');
          }
        }
      } catch (err) {
        console.error('Provider initialization failed:', err);
        setIsLoading(false);
      }
    };

    initialize();
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []); 

  const switchTenant = (tenantId: string) => {
    setActiveTenant(null);
    setActiveRole(null);
    setMemberships([]);
    setActiveTenantId(tenantId);
    setIsLoading(true);
    fetchContext(tenantId);
  };

  return (
    <TenantContext.Provider value={{ 
      user, 
      activeTenant,
      activeRole,
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
