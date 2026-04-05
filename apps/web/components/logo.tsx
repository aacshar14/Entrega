import React from 'react';

export default function Logo({ className = "w-48 h-auto", mode = "light" }: { className?: string, mode?: "light" | "dark" }) {
  // mode="light" means the logo is for a LIGHT background (Inverse colors)
  // mode="dark"  means the logo is for a DARK background (Default brand colors: White/Cyan)
  
  const textColor = mode === "dark" ? "white" : "#1D3146";
  const iconBaseColor = mode === "dark" ? "white" : "#1D3146";
  const cyan = "#56CCF2";

  return (
    <div className={className}>
      <svg
        viewBox="0 0 320 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* ICON - STYLIZED E WITH ARROW */}
        <g id="e-arrow-icon">
          {/* Top Bar of E (Cyan) */}
          <rect x="20" y="20" width="45" height="12" rx="2" fill={cyan} />
          
          {/* Bottom Bar of E (Icon Base Color: White or Navy) */}
          <rect x="20" y="68" width="45" height="12" rx="2" fill={iconBaseColor} />
          
          {/* Vertical Backbone of E */}
          <rect x="20" y="20" width="12" height="60" rx="2" fill={iconBaseColor} />

          {/* ICON OVERLAY FOR BACKBONE SEGMENT (Matching Cyan Top) */}
          <rect x="20" y="20" width="12" height="30" rx="2" fill={cyan} />

          {/* ARROW - THE CENTERPIECE */}
          <path
            d="M10 44H65L55 34M65 44L55 54"
            stroke={cyan}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* TYPOGRAPHY - 'Entrega' */}
        <text
          x="85"
          y="68"
          fill={textColor}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "48px",
            fontWeight: "900",
            fontStyle: "italic",
            letterSpacing: "-0.04em",
          }}
        >
          Entrega
        </text>

        {/* SUBTLE BRAND GLOW (Only on dark mode) */}
        {mode === "dark" && (
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
        )}
      </svg>
    </div>
  );
}
