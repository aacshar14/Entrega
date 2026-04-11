"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/lib/context/tenant-context";
import { 
  CheckCircle2, 
  Zap, 
  ArrowRight, 
  MessageSquare, 
  Database, 
  Star,
  Loader2
} from "lucide-react";
import Link from "next/link";
import Logo from "@/components/logo";

export default function LandingRedirect() {
  const router = useRouter();
  const { user, isLoading } = useTenant();

  useEffect(() => {
    if (user && !isLoading) {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  if (isLoading || (user && !isLoading)) {
    return (
      <div className="min-h-screen bg-[#1D3146] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 border-4 border-[#56CCF2]/20 border-t-[#56CCF2] rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-[#56CCF2] uppercase tracking-[0.3em] animate-pulse">
          Cargando Entrega...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1D3146] text-white font-sans selection:bg-[#56CCF2]/30">
      {/* A. HERO SECTION */}
      <section className="pt-20 pb-20 px-6 text-center max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-10 duration-1000">
        <div className="flex justify-center mb-6">
           <Logo variant="master" className="h-20 w-auto" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tighter">
          Controla tu negocio <br/>
          <span className="text-[#56CCF2]">desde WhatsApp</span>
        </h1>
        
        <p className="text-xl text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
          Sin Excel. Sin libretas. Solo mensajes. <br/>
          Entrega procesa tus entregas, inventario y deudas automáticamente.
        </p>

        <div className="flex justify-center">
          <Link
            href="/login"
            className="group h-16 px-10 bg-[#56CCF2] text-[#1D3146] rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[#56CCF2]/20"
          >
            Probar ahora
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* B. DEMO EXPLANATION */}
      <section className="py-20 bg-black/10 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight">Escribes: <span className="text-[#56CCF2] italic">"le dejé 10 a Juan"</span></h2>
            <div className="p-1 px-4 bg-white/5 border border-white/10 rounded-2xl inline-block">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Entrega lo registra automáticamente</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
             {[
               { icon: Database, text: "Actualiza tu inventario real." },
               { icon: MessageSquare, text: "Gestiona adeudos sin anotaciones." },
               { icon: Zap, text: "Recibe reportes instantáneos." }
             ].map((item, i) => (
               <div key={i} className="flex items-center gap-4 p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                  <div className="w-10 h-10 bg-[#56CCF2]/20 text-[#56CCF2] rounded-xl flex items-center justify-center">
                    <item.icon size={20} />
                  </div>
                  <p className="font-bold text-slate-200">{item.text}</p>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* C. PRICING SECTION */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16 space-y-4">
           <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#56CCF2]/10 text-[#56CCF2] rounded-full border border-[#56CCF2]/20">
              <Star size={14} className="fill-[#56CCF2]" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Acceso inicial disponible — cupos limitados
              </span>
           </div>
           <h2 className="text-3xl font-black tracking-widest uppercase">Planes de Control</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
           {/* CARD 1 — BÁSICO */}
           <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 flex flex-col justify-between hover:bg-white/10 transition-all group">
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black tracking-tight mb-1">Básico</h3>
                  <p className="text-4xl font-black text-[#56CCF2]">$199 <span className="text-sm font-medium text-slate-400">/ mes</span></p>
                </div>
                
                <ul className="space-y-4">
                  {["Registro manual", "Dashboard", "Control de clientes"].map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300 font-medium text-sm">
                      <CheckCircle2 size={18} className="text-[#56CCF2] opacity-50" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              <Link 
                href="/login" 
                className="mt-10 h-14 w-full bg-white/10 text-white rounded-2xl flex items-center justify-center font-black uppercase tracking-widest text-xs hover:bg-white/20 transition-all border border-white/10"
              >
                Empezar
              </Link>
           </div>

           {/* CARD 2 — PREMIUM (HIGHLIGHTED) */}
           <div className="bg-gradient-to-br from-[#1D3146] to-[#243d57] border-4 border-[#56CCF2] rounded-[3rem] p-10 flex flex-col justify-between relative shadow-2xl shadow-[#56CCF2]/10 scale-105">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#56CCF2] text-[#1D3146] px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl">
                Más popular
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black tracking-tight mb-1">Premium</h3>
                  <p className="text-4xl font-black text-[#56CCF2]">$399 <span className="text-sm font-medium text-slate-400">/ mes</span></p>
                </div>
                
                <ul className="space-y-4">
                  {["Todo lo básico", "WhatsApp automático", "Parsing inteligente"].map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-white font-bold text-sm">
                      <CheckCircle2 size={18} className="text-[#56CCF2]" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              <Link 
                href="/login" 
                className="mt-10 h-14 w-full bg-[#56CCF2] text-[#1D3146] rounded-2xl flex items-center justify-center font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#56CCF2]/20"
              >
                Empezar
              </Link>
           </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-white/5 opacity-50">
        <div className="max-w-7xl mx-auto px-6 flex justify-center">
           <Logo variant="master" className="h-10 w-auto opacity-40 hover:opacity-100 transition-all" />
        </div>
      </footer>
    </div>
  );
}
