'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/lib/context/tenant-context';

export default function RootPage() {
  const router = useRouter();
  const { user, isLoading } = useTenant();

  useEffect(() => {
    // 1. If we are at root, we prioritize the landing experience for neutrality.
    // 2. Only if the session is already fully loaded and we have a user/tenant,
    // we jump to dashboard. Otherwise, go to landing.
    if (!isLoading) {
      if (user) {
        // Resolved authenticated user: TenantProvider already manages redirects, 
        // but if we are still at root, let's jump.
        router.replace('/dashboard');
      } else {
        router.replace('/landing');
      }
    }
  }, [isLoading, user, router]);

  // Clean, white minimalist entry - no heavy loaders here to avoid the "loop" perception
  return <div className="min-h-screen bg-white" />;
}
