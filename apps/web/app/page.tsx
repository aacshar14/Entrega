'use client';

import { useTenant } from '@/lib/context/tenant-context';

export default function RootPage() {
  const { isLoading } = useTenant();

  // RootPage is now 100% neutral. 
  // It only serves as a visual placeholder while TenantProvider (the Single Authority)
  // resolves the session and performs the necessary redirection.
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
       {isLoading && (
         <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
       )}
    </div>
  );
}
