"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, MessageSquare, PieChart, Users, Zap, Wallet } from "lucide-react";

/**
 * DEMO WALKTHROUGH V1.0
 * Pure CSS/Tailwind animated demo simulating the core product flow.
 */
export default function DemoWalkthrough() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0F172A] p-4 md:p-12 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#56CCF2]/5 to-transparent pointer-events-none" />

      <div className="w-full max-w-3xl aspect-[16/10] bg-[#1D3146] rounded-[2rem] shadow-2xl border border-white/10 relative overflow-hidden flex flex-col">
        {/* Browser Top Bar */}
        <div className="h-10 bg-white/5 border-b border-white/5 flex items-center px-6 gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400 opacity-50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 opacity-50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 opacity-50" />
          </div>
          <div className="mx-auto bg-white/5 px-4 py-1 rounded-full text-[10px] text-white/30 font-medium">
            entrega.space/dashboard
          </div>
        </div>

        {/* Dynamic Canvas */}
        <div className="flex-1 p-6 relative">
          
          {/* SCENE 1: WHATSAPP (Step 0) */}
          <div className={`absolute inset-0 p-8 flex flex-col justify-end transition-all duration-700 ${step === 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
             <div className="max-w-xs space-y-3">
                <div className="bg-white/10 p-4 rounded-2xl rounded-bl-none border border-white/10 animate-fade-in">
                   <p className="text-white/80 text-sm font-medium">"Hola! Necesito 20 buckets de Aguachile para el domingo."</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#56CCF2] font-black uppercase tracking-widest pl-2">
                   <Zap size={10} className="animate-pulse" /> Automatizado
                </div>
                <div className="bg-[#56CCF2] p-4 rounded-2xl rounded-br-none text-[#1D3146] font-bold text-sm transform transition-all delay-700">
                   "¡Claro! Registrando venta de 20 buckets. Total: $4,000"
                </div>
             </div>
          </div>

          {/* SCENE 2: SALE CONFIRMATION (Step 1) */}
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${step === 1 ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
             <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center space-y-4">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                   <CheckCircle2 className="text-white" size={32} />
                </div>
                <div>
                   <h3 className="text-[#1D3146] font-black text-xl leading-none">Venta Registrada</h3>
                   <p className="text-slate-400 text-sm mt-1">20x Buckets Aguachile</p>
                </div>
                <div className="text-2xl font-black text-[#1D3146] tracking-tighter">$4,000.00</div>
             </div>
          </div>

          {/* SCENE 3: DASHBOARD REALTIME (Step 2) */}
          <div className={`absolute inset-0 p-8 transition-all duration-700 ${step === 2 ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"}`}>
             <div className="grid grid-cols-2 gap-4 h-full">
                <div className="bg-white/5 rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
                   <PieChart className="text-[#56CCF2]" size={24} />
                   <div>
                      <p className="text-white/40 text-[10px] font-black uppercase">Ventas hoy</p>
                      <p className="text-white text-3xl font-black tracking-tighter">$12,450</p>
                   </div>
                </div>
                <div className="bg-white/5 rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
                   <Users className="text-[#56CCF2]" size={24} />
                   <div>
                      <p className="text-white/40 text-[10px] font-black uppercase">Clientes Activos</p>
                      <p className="text-white text-3xl font-black tracking-tighter">84</p>
                   </div>
                </div>
                <div className="col-span-2 bg-[#56CCF2] rounded-3xl p-6 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#1D3146] rounded-2xl flex items-center justify-center shadow-lg">
                         <Zap className="text-[#56CCF2]" size={24} />
                      </div>
                      <div>
                         <p className="text-[#1D3146]/60 text-[10px] font-black uppercase">Inventario Saludable</p>
                         <p className="text-[#1D3146] text-lg font-black tracking-tight">Aguachile: 140 Port. restantes</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* SCENE 4: DEBT ALERT (Step 3) */}
          <div className={`absolute inset-0 p-8 flex items-center justify-center transition-all duration-700 ${step === 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
             <div className="w-full max-w-sm bg-red-500 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                   <Wallet className="text-white" size={24} />
                   <span className="bg-white/20 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">Alerta de Pago</span>
                </div>
                <div>
                   <p className="text-white font-black text-lg">Jorge Martínez debe $1,200</p>
                   <p className="text-white/80 text-xs">Vencido hace 2 días • 3 pedidos acumulados</p>
                </div>
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                   <div className="h-full bg-white w-2/3" />
                </div>
             </div>
          </div>

        </div>

        {/* Progress Timeline */}
        <div className="h-1 flex gap-1 px-1">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`flex-1 transition-all duration-1000 ${step === i ? "bg-[#56CCF2]" : "bg-white/10"}`} 
            />
          ))}
        </div>
      </div>
      
      {/* Current Step Label */}
      <div className="mt-8">
        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] text-center">
          {step === 0 && "Captura Ventas desde WhatsApp"}
          {step === 1 && "Confirmación Automática"}
          {step === 2 && "Dashboard en Tiempo Real"}
          {step === 3 && "Control de Cobranza y Deudas"}
        </p>
      </div>
    </div>
  );
}
