import React from 'react';

export default function Logo({ className = "w-48 h-auto" }: { className?: string }) {
  return (
    <div className={`${className} relative overflow-hidden flex items-center justify-center`}>
      {/* 
        Using the high-fidelity AI-generated logo with PURE BLACK background.
        By applying mix-blend-mode: screen, the black background becomes 
        perfectly transparent, leaving only the brilliant icon and typography.
        This provides a World-class, seamless brand integration that perfectly 
        fits into our Navy (#1D3146) theme.
      */}
      <img 
        src="/logo_black.png" 
        alt="Entrega Logo" 
        className="w-full h-auto mix-blend-screen brightness-110 contrast-125"
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
}
