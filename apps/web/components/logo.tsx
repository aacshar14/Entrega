import React from 'react';

export default function Logo({ className = "w-48 h-auto" }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        viewBox="0 0 320 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Stylized E Icon */}
        <g id="icon">
          {/* Top segment of E (Cyan) */}
          <path
            d="M20 15H60V30H35V45H60V55H20V15Z"
            fill="#56CCF2"
          />
          {/* Bottom segment of E (White) */}
          <path
            d="M35 15H20V65H60V50H35V15Z"
            fill="white"
          />
          {/* Arrow in the middle (Cyan) */}
          <path
            d="M50 32L65 40L50 48V43H15V37H50V32Z"
            fill="#56CCF2"
            className="animate-pulse"
          />
        </g>

        {/* Text 'Entrega' */}
        <text
          x="80"
          y="55"
          fontFamily="Inter, sans-serif"
          fontSize="42"
          fontWeight="900"
          fill="white"
          letterSpacing="-0.05em"
          style={{ fontStyle: 'italic' }}
        >
          Entrega
        </text>
      </svg>
    </div>
  );
}
