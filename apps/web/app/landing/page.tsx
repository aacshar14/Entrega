'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#1D3146] flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-[#56CCF2]/20 border-t-[#56CCF2] rounded-full animate-spin"></div>
    </div>
  );
}
