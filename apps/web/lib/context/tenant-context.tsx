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
  const supabase = useMemo(() => createClient(), []);

  const handleManualLogout = useCallback(() => {
    setUser(null);
    setActiveTenant(null);
    setActiveRole(null);
    setMemberships([]);
    setActiveTenantId(null);
  }, []);

  const fetchContext = useCallback(async (overrideId?: string, accessToken?: string) => {
    try {
      const targetId = overrideId || activeTenantId || undefined;
      console.log('[API] Resolving /me context', { targetId, hasInputToken: !!accessToken });
      const data = await apiRequest('me', 'GET', null, targetId, accessToken) as any;
      
      console.log('[TENANT CONTEXT] Context resolved:', {
        role: data.user?.platform_role,
        tenant: data.active_tenant?.slug || 'none'
      });

      const isAdmin = data.user?.platform_role === 'admin';
      const mCount = data.memberships?.length || 0;

      // Update State
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

      // --- ROUTING LOGIC ---
      const isPublic = ['/landing', '/login', '/'].includes(pathname);
      const isOnboarding = pathname.startsWith('/onboarding');
      const isSelector = pathname.startsWith('/select-tenant');

      if (!data.user) return; // Wait for auth session

      // Scenario A: New User -> Onboarding
      if (mCount === 0 && !isPublic && !isOnboarding) {
        router.replace('/onboarding');
      } 
      // Scenario B: Admin needing selection
      else if (isAdmin && mCount > 1 && !targetId && !isSelector && !isPublic) {
        router.replace('/select-tenant');
      }
      // Scenario C: Active Tenant Status (Gates)
      else if (data.active_tenant) {
        const isReady = data.active_tenant.ready;
        if (!isReady && !isPublic && !isSelector && !isOnboarding) {
          router.replace('/onboarding');
        } else if (isReady && (isOnboarding || pathname === '/' || pathname === '/login')) {
          router.replace('/dashboard');
        }
      }
      
      // Fallback: if we are on root and somehow didn't redirect
      if (pathname === '/' && data.active_tenant) {
         router.replace(data.active_tenant.ready ? '/dashboard' : '/onboarding');
      }
    } catch (error: any) {
      console.error('[TENANT CONTEXT] Resolution Error:', error);
      if (error.status === 401 || error.status === 403) {
        handleManualLogout();
        if (!pathname.startsWith('/login')) router.replace('/login');
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeTenantId, pathname, router, handleManualLogout]);

  const authIsReady = React.useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH EVENT]', event, { hasSession: !!session });
      
      if (event === 'SIGNED_OUT') {
        authIsReady.current = false;
        handleManualLogout();
        router.replace('/login');
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        if (session && !authIsReady.current) {
          console.log('[AUTH BOOTSTRAP] Event-driven context resolution', { event });
          authIsReady.current = true;
          await fetchContext(undefined, session.access_token);
        }
      }
    });

    // Initial silent check (critical for SSR/Reload stalls)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        if (!authIsReady.current) {
          console.log('[AUTH BOOTSTRAP] Session found in storage, bootstrapping context');
          authIsReady.current = true;
          await fetchContext(undefined, session.access_token);
        }
      } else {
        console.log('[AUTH BOOTSTRAP] No session found');
        setIsLoading(false);
        const isPublic = pathname.startsWith('/landing') || pathname.startsWith('/login');
        if (!isPublic) router.replace('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchContext, handleManualLogout, pathname, router]);

  const switchTenant = (tenantId: string) => {
    setIsLoading(true);
    setActiveTenantId(tenantId);
    fetchContext(tenantId);
  };

  return (
    <TenantContext.Provider value={{ 
      user, activeTenant, activeRole, memberships, isLoading, 
      switchTenant, refreshUser: () => fetchContext() 
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
