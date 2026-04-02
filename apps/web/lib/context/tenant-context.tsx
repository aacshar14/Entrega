'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { apiRequest } from '../api';
import { useRouter, usePathname } from 'next/navigation';

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

  const fetchContext = async (overrideId?: string) => {
    try {
      const data = await apiRequest('/me', 'GET', null, overrideId || activeTenantId || undefined);
      setUser(data.user);
      setActiveTenant(data.active_tenant);
      setMemberships(data.memberships);
      
      // If we are on onboarding and the tenant is ready, redirect to dashboard
      // If it's NOT ready and we are not on onboarding, redirect to onboarding
      if (data.active_tenant) {
        if (!data.active_tenant.ready && !pathname.startsWith('/onboarding')) {
          router.push('/onboarding');
        } else if (data.active_tenant.ready && pathname.startsWith('/onboarding')) {
          router.push('/dashboard');
        }
      }
    } catch (error) {
      console.error('Failed to fetch tenant context:', error);
      // If unauthorized, we might want to redirect to landing
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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

    // Initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchContext();
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [activeTenantId]);

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
