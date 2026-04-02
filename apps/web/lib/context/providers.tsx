'use client';

import React from 'react';
import { TenantProvider } from './tenant-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      {children}
    </TenantProvider>
  );
}
