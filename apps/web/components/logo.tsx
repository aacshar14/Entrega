import React from "react";

interface LogoProps {
  className?: string;
  variant?: "master" | "light";
}

export default function Logo({
  className = "w-48 h-auto",
  variant = "master",
}: LogoProps) {
  // Hugo: Este componente es el ÚNICO punto de verdad para la marca.
  // 'master' (logo.png): Para fondos oscuros (Navy, Negro, Gris).
  // 'light' (logo_light.png): Para fondos blancos/claros (Landing Header, Papelería).
  const assetPath =
    variant === "light" ? "/logo_light.png" : "/logo_official.png";

  return (
    <div className={className}>
      <img
        src={assetPath}
        alt="Entrega Logo"
        className="w-full h-full object-contain drop-shadow-2xl"
        style={{ pointerEvents: "none" }}
      />
    </div>
  );
}
