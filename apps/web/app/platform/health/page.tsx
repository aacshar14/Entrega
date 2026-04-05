'use client';
import React from 'react';
import { HeartPulse, Construction } from 'lucide-react';

export default function PlatformPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
       <div className="bg-amber-100 p-6 rounded-full mb-8">
          <Construction className="text-amber-600" size={48} />
       </div>
       <h1 className="text-3xl font-black text-[#1D3146]">Under Construction</h1>
       <p className="text-slate-500 mt-2 font-medium">Esta sección del Platform Admin está en desarrollo activo.</p>
    </div>
  );
}
