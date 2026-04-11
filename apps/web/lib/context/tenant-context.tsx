'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
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
  timezone?: string;
  currency?: string;
  billing_status?: string;
  trial_ends_at?: string;
  grace_ends_at?: string;
  subscription_ends_at?: string;
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
  clearTenant: () => void;
  refreshUser: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

/**
 * Entrega Multi-Tenant Context Provider
 * 
 * Manages the global state for the signed-in user and their active tenant context.
 * Performs automatic identity resolution and routing logic on boot.
 */
export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [activeRole, setActiveRole] = useState<'owner' | 'operator' | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [isTenantEntryExplicit, setIsTenantEntryExplicit] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const handleManualLogout = useCallback(() => {
    setUser(null);
    setActiveTenant(null);
    setActiveRole(null);
    setMemberships([]);
    setActiveTenantId(null);
    setIsTenantEntryExplicit(false);
  }, []);

  const fetchContext = useCallback(async (overrideId?: string, accessToken?: string) => {
    try {
      const targetId = overrideId || activeTenantId || undefined;
      const data = await apiRequest('me', 'GET', null, targetId, accessToken) as any;
      
      const isAdmin = data.user?.platform_role === 'admin';
      const mCount = data.memberships?.length || 0;

      // Persist Resolved Context
      setUser(data.user);
      setMemberships(data.memberships || []);
      setActiveTenant(data.active_tenant);
      
      if (data.active_tenant?.id) {
        setActiveTenantId(data.active_tenant.id);
        const m = data.memberships?.find((m: any) => m.tenant.id === data.active_tenant.id);
        setActiveRole(m?.role || (isAdmin ? 'owner' : null));
      } else {
        setActiveRole(null);
      }

      // --- ROUTING ENGINE ---
      const isPublic = ['/landing', '/login', '/', '/select-tenant', '/privacy-policy', '/terms', '/data-deletion'].includes(pathname);
      const isPlatformArea = pathname.startsWith('/platform');
      
      if (!data.user) return; // Wait for session

      // A. PLATFORM ADMIN FLOW
      if (isAdmin) {
        // If an admin land on Login/Root, take them to Platform
        if (pathname === '/login' || pathname === '/') {
          router.replace('/platform');
          return;
        }
        
        // If they chose a tenant, allow dashboard flow
        if (overrideId || (activeTenantId && isTenantEntryExplicit)) {
           // Allow regular ready-redirects below
        } else if (!isPlatformArea && !isPublic) {
           // If they are deep in a tenant route but didn't come from an explicit entry, 
           // and they are an admin, redirect them back to platform overview
           // unless it's a direct browser load with a tenant context already active
           if (!data.active_tenant && !isPlatformArea) {
              router.replace('/platform');
              return;
           }
        }
      }

      // B. REGULAR TENANT USER / ADMIN IN TENANT FLOW
      const isOnboarding = pathname.startsWith('/onboarding');

      // Rule 1: No tenants found -> Force Onboarding
      if (mCount === 0 && !isPublic && !isOnboarding && !isPlatformArea) {
        router.replace('/onboarding');
      } 
      // Rule 2: Tenant selected
      else if (data.active_tenant) {
        const isReady = data.active_tenant.ready;
        if (!isReady && !isPublic && !isOnboarding && !isPlatformArea) {
          router.replace('/onboarding');
        } else if (isReady && (isOnboarding || pathname === '/' || pathname === '/login')) {
          router.replace(isAdmin ? '/platform' : '/dashboard');
        }
      }
    } catch (error: any) {
      if (error.status === 401 || error.status === 403) {
        handleManualLogout();
        const currentPath = window.location.pathname;
        const isPublic = ['/landing', '/login', '/', '/select-tenant', '/privacy-policy', '/terms', '/data-deletion'].includes(currentPath);
        if (!isPublic) router.replace('/login');
      } else {
        console.error('[TENANT CONTEXT ERROR]', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeTenantId, router, handleManualLogout, isTenantEntryExplicit, pathname]);

  // Ref guard to prevent double-bootstrap in concurrent re-renders
  const authIsReady = React.useRef(false);

    // 🔄 Bootstrapper: Recovers identity and context on load or auth change
    useEffect(() => {
      // Create a subscription once to handle sign-ins and sign-outs globally
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          authIsReady.current = false;
          handleManualLogout();
          // We check the DOM directly to avoid re-running this effect on every pathname change
          const currentPath = window.location.pathname;
          const isPublic = ['/landing', '/login', '/', '/privacy-policy', '/terms', '/data-deletion'].includes(currentPath);
          if (!isPublic) router.replace('/login');
        } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          if (session && !authIsReady.current) {
            authIsReady.current = true;
            await fetchContext(undefined, session.access_token);
          }
        }
      });

      // Initialize recovery
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) {
          if (!authIsReady.current) {
            authIsReady.current = true;
            await fetchContext(undefined, session.access_token);
          }
        } else {
          setIsLoading(false);
          const currentPath = window.location.pathname;
          const isPublic = ['/landing', '/login', '/', '/privacy-policy', '/terms', '/data-deletion'].includes(currentPath);
          if (!isPublic) {
            router.replace('/login');
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }, [supabase, fetchContext, handleManualLogout, router]);

  const switchTenant = useCallback(async (tenantId: string) => {
    setIsLoading(true);
    setActiveTenantId(tenantId);
    setIsTenantEntryExplicit(true);
    try {
      await fetchContext(tenantId);
      router.push('/dashboard');
    } catch (err) {
      console.error('Switch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchContext, router]);

  const clearTenant = useCallback(() => {
    setActiveTenantId(null);
    setActiveTenant(null);
    setActiveRole(null);
    setIsTenantEntryExplicit(false);
    router.push('/platform');
  }, [router]);

  return (
    <TenantContext.Provider value={{ 
      user, activeTenant, activeRole, memberships, isLoading, 
      switchTenant, clearTenant, refreshUser: () => fetchContext() 
    }}>
      {children}
      <SessionTimeout user={user} onLogout={handleManualLogout} />
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) throw new Error('useTenant must be used within a TenantProvider');
  return context;
}
