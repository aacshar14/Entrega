'use client';

import { useTenant } from '@/lib/context/tenant-context';

export default function RootPage() {
  const { isLoading } = useTenant();

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center">
      <div className="relative">
        {/* Animated outer ring */}
        <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        
        {/* Central Logo Placeholder (SVG) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-8 h-8 fill-blue-500" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <h2 className="text-white/40 text-sm font-medium tracking-widest uppercase animate-pulse">
          Iniciando Plataforma
        </h2>
      </div>
    </div>
  );
}
