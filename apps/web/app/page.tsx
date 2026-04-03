'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/lib/context/tenant-context';

export default function RootPage() {
  const router = useRouter();
  const { user, isLoading } = useTenant();

  useEffect(() => {
    // Wait for the provider to finish initial session/context loading
    if (!isLoading) {
      if (!user) {
        // Unauthenticated: go to landing
        router.replace('/landing');
      }
      // If user exists, we stay neutral and let TenantProvider 
      // perform the correct redirect (/dashboard, /select-tenant, etc.)
    }
  }, [isLoading, user, router]);

  // Neutral entry point
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
       <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
