import React from 'react';

export default function Logo({ className = "w-48 h-auto" }: { className?: string, mode?: "light" | "dark" }) {
  // Hugo: He restaurado el logo para usar ÚNICAMENTE el activo oficial de alta resolución.
  // Es 100% transparente ("Clear") y de 2048px, por lo que es un 'tesoro nacional' que 
  // no se pixela y se adapta quirúrgicamente a cualquier fondo oscuro (Navy, Negro, Gris).
  return (
    <div className={className}>
      <img 
        src="/logo.png" 
        alt="Entrega Logo" 
        className="w-full h-auto drop-shadow-2xl" 
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
}
