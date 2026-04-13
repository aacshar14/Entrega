"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";
import Logo from "@/components/logo";
import DemoWalkthrough from "@/components/demo-walkthrough";

/**
 * DEMO PAGE V2.7.0 (VIDEO-ANIMATED)
 * Replaces static video with a live CSS walkthrough.
 */
export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#1D3146] flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* Dynamic Background */}
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#56CCF2]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#56CCF2]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-4xl space-y-12 relative z-10 text-center">
        {/* Header Section */}
        <div className="space-y-6">
          <Link href="/" className="inline-block transition-transform hover:scale-105 duration-300">
            <Logo variant="master" className="w-64 h-auto opacity-100" />
          </Link>
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight">
              Así conviertes mensajes de <br />
              WhatsApp en <span className="text-[#56CCF2]">ventas</span> automáticamente
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
              Ve cómo Entrega registra ventas, controla deudas y actualiza tu inventario en segundos.
            </p>
          </div>
        </div>

        {/* Live Animated Walkthrough Section */}
        <div className="space-y-4">
          <div className="relative group aspect-[16/10] w-full bg-black/40 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl backdrop-blur-3xl">
            <DemoWalkthrough />
          </div>
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest">
            Esto es exactamente cómo funciona en tu negocio.
          </p>
        </div>

        {/* Action Section */}
        <div className="flex flex-col items-center space-y-8">
          <div className="space-y-4">
            <Link
              href="/signup"
              className="h-20 px-12 bg-[#56CCF2] text-[#1D3146] rounded-[2rem] font-black uppercase tracking-widest text-lg shadow-2xl shadow-[#56CCF2]/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4"
            >
              Empieza gratis en 7 días
              <ArrowRight size={24} />
            </Link>
            <div className="flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-white/40">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#56CCF2]" />
                Sin tarjeta
              </div>
              <div className="flex items-center gap-1.5">
                <Zap size={14} className="text-[#56CCF2]" />
                Configuración en menos de 1 minuto
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 w-full flex flex-col md:flex-row items-center justify-center gap-10">
             <div className="text-left max-w-[200px]">
                <p className="text-[10px] font-black text-[#56CCF2] uppercase tracking-widest leading-none mb-1">Impacto Real</p>
                <p className="text-white/60 text-xs font-medium italic">"Controlé mi inventario en el primer día."</p>
             </div>
             <div className="text-left max-w-[200px]">
                <p className="text-[10px] font-black text-[#56CCF2] uppercase tracking-widest leading-none mb-1">Confianza</p>
                <p className="text-white/60 text-xs font-medium italic">Usado por negocios que venden por WhatsApp.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
