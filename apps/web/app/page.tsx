'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-black text-slate-800 tracking-tight">Cargando EntréGA</h3>
        <p className="text-slate-500 font-medium animate-pulse text-sm">Verificando sesión y accesos...</p>
      </div>
    </div>
  );
}
