"use client";

import React from "react";
import Link from "next/link";
import Logo from "@/components/logo";
import { ArrowRight, Play, ShieldCheck, Zap } from "lucide-react";

/**
 * DEMO PAGE V2.7.0 (VIDEO-FIRST)
 * Replaces interactive sessions with deterministic video value discovery.
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
              Mira <span className="text-[#56CCF2]">EntréGA</span> en acción
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
              Descubre cómo registrar ventas, deudas y controlar tu inventario desde WhatsApp en menos de 1 minuto.
            </p>
          </div>
        </div>

        {/* Video Section (Conversion Point) */}
        <div className="relative group aspect-video w-full bg-black/40 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl backdrop-blur-3xl">
          {/* Placeholder/Player Implementation */}
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-24 h-24 bg-[#56CCF2] rounded-full flex items-center justify-center shadow-2xl shadow-[#56CCF2]/40 transition-transform group-hover:scale-110 duration-500 cursor-pointer">
               <Play size={40} className="text-[#1D3146] fill-[#1D3146] ml-2" />
             </div>
          </div>
          
          {/* Mockup Overlay (Shows value even without play) */}
          <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end">
             <div className="text-left space-y-2">
                <div className="flex gap-2">
                   <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase text-[#56CCF2] tracking-tighter">WhatsApp Integration</span>
                   <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase text-[#56CCF2] tracking-tighter">Real-time Dashboard</span>
                </div>
                <p className="text-white/60 text-xs font-bold leading-none">Tour oficial del producto • 45 segundos</p>
             </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="flex flex-col items-center space-y-8">
          <div className="space-y-4">
            <Link
              href="/signup"
              className="h-20 px-12 bg-[#56CCF2] text-[#1D3146] rounded-[2rem] font-black uppercase tracking-widest text-lg shadow-2xl shadow-[#56CCF2]/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4"
            >
              Empieza gratis ahora
              <ArrowRight size={24} />
            </Link>
            <div className="flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-white/40">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#56CCF2]" />
                Sin tarjeta
              </div>
              <div className="flex items-center gap-1.5">
                <Zap size={14} className="text-[#56CCF2]" />
                Setup < 1 minuto
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
