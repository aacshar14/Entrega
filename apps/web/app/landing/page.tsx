'use client';

import React from 'react';
import { 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Truck, 
  MessageCircle, 
  Smartphone,
  ShieldCheck,
  ChevronRight,
  PlayCircle,
  Users,
  Package
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default function PublicLanding() {
  return (
    <div className="min-h-screen bg-white text-[#1D3146] font-sans selection:bg-[#56CCF2]/30">
      
      {/* 1. STICKY HEADER */}
      <header className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100">
         <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
               <img src="/logo_light.png" alt="Entrega Logo" className="h-10 w-auto" />
            </Link>
            
            <nav className="hidden md:flex items-center gap-10">
               {['Cómo Funciona', 'Recursos', 'Precios'].map((item) => (
                  <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="text-sm font-bold text-slate-500 hover:text-[#1D3146] transition-colors">{item}</a>
               ))}
            </nav>

            <div className="flex items-center gap-4">
               <Link href="/login" className="hidden sm:block text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-slate-50 transition-all">Log in</Link>
               <Link href="/onboarding" className="bg-[#1D3146] text-[#56CCF2] px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-[#1D3146]/20 hover:scale-105 active:scale-95 transition-all">
                  Empieza Gratis
               </Link>
            </div>
         </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="pt-40 pb-20 px-6">
         <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-7 space-y-8">
               <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#56CCF2]/10 text-[#1D3146] rounded-full border border-[#56CCF2]/20">
                  <span className="relative flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#56CCF2] opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-[#56CCF2]"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest">v1.1 Pilot Launch - ChocoBites Ready</span>
               </div>
               
               <h1 className="text-5xl md:text-7xl font-black leading-[0.95] tracking-tighter">
                  Tu operación de <span className="text-[#56CCF2] italic">entrega</span> en piloto automático.
               </h1>
               
               <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl leading-relaxed">
                  Entrega centraliza tus pedidos, clientes y stock en una experiencia <span className="text-[#1D3146] font-bold">mobile-first</span> diseñada para el mundo real. Olvida el caos de WhatsApp y las hojas de cálculo.
               </p>
               
               <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Link href="/onboarding" className="group h-16 px-10 bg-[#1D3146] text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[#1D3146]/30">
                     Activar mi Negocio
                     <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <button className="h-16 px-10 bg-white border-2 border-slate-100 text-[#1D3146] rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-sm tracking-widest hover:bg-slate-50 transition-all">
                     <PlayCircle size={20} />
                     Ver Demo
                  </button>
               </div>
               
               <div className="flex items-center gap-8 pt-8 border-t border-slate-50">
                  <div className="flex items-center gap-3">
                     <div className="flex -space-x-4">
                        {[1,2,3].map(i => <div key={i} className="w-10 h-10 rounded-full bg-slate-200 border-4 border-white"></div>)}
                     </div>
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">+50 Negocios en espera</p>
                  </div>
                  <div className="h-10 w-px bg-slate-100 px-0"></div>
                  <div className="flex items-center gap-3">
                     <img src="/chocobites.jpg" className="w-8 h-8 rounded-lg grayscale opacity-50" alt="ChocoBites" />
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pilot: ChocoBites</p>
                  </div>
               </div>
            </div>
            
            <div className="lg:col-span-5 relative">
               <div className="absolute inset-0 bg-[#56CCF2]/20 blur-[120px] rounded-full scale-150 opacity-30"></div>
               <div className="relative bg-[#1D3146] p-3 rounded-[3rem] shadow-2xl rotate-[2deg] group">
                  <div className="bg-white rounded-[2.5rem] overflow-hidden aspect-[9/16] relative">
                     <img src="/onboarding_step_1.png" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="Mobile App Demo" />
                     <div className="absolute inset-0 bg-gradient-to-t from-[#1D3146]/20 to-transparent"></div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* 3. "KNOW HOW" INTEGRATED DOCS SECTION */}
      <section id="recursos" className="py-32 bg-slate-50">
         <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
               <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#56CCF2]">Onboarding Academy</h2>
               <h3 className="text-4xl md:text-5xl font-black tracking-tight italic">Entrega Academy: Tu formación operativa.</h3>
               <p className="text-slate-500 font-medium italic">Accede a las lecciones tácticas y recursos que usamos para activar ChocoBites.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {[
                  { 
                    icon: Users, 
                    title: 'Formato Clientes (CSV)', 
                    desc: 'Plantilla estandarizada para cargar tu base de datos masivamente sin errores.',
                    action: 'Descargar CSV'
                  },
                  { 
                    icon: Package, 
                    title: 'Control de Stock', 
                    desc: 'Estructura recomendada para sincronizar inventario inicial y precios.',
                    action: 'Carga de CSV'
                  },
                  { 
                    icon: MessageCircle, 
                    title: 'WhatsApp Business', 
                    desc: 'Configuración paso a paso para conectar tu número oficial con Entrega.',
                    action: 'Ver Tutorial'
                  }
               ].map((card, i) => (
                  <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-[#1D3146]/5 transition-all group cursor-pointer hover:-translate-y-2">
                     <div className="w-14 h-14 bg-[#1D3146] text-[#56CCF2] rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-[#1D3146]/20 group-hover:scale-110 transition-transform">
                        <card.icon size={28} />
                     </div>
                     <h4 className="text-xl font-black mb-4 tracking-tight">{card.title}</h4>
                     <p className="text-sm text-slate-500 font-medium leading-relaxed mb-10">{card.desc}</p>
                     <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#56CCF2] group-hover:gap-4 transition-all">
                        {card.action} <ChevronRight size={16} />
                     </div>
                  </div>
               ))}
            </div>
            
            <div className="mt-16 p-1 bg-[#1D3146] rounded-[3rem] shadow-2xl relative overflow-hidden">
               <div className="flex flex-col md:flex-row items-center gap-10 p-10 md:p-16 relative z-10">
                  <div className="md:w-1/2 space-y-6 text-center md:text-left">
                     <h3 className="text-3xl font-black text-white leading-tight">¿Tienes dudas tácticas?</h3>
                     <p className="text-slate-400 font-medium">Consulta el **Know How Hub** completo. Documentación diseñada por y para operadores de campo.</p>
                     <Link href="/docs" className="inline-flex h-12 px-8 bg-[#56CCF2] text-[#1D3146] rounded-xl items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all">
                        Ir al Centro de Ayuda
                     </Link>
                  </div>
                  <div className="md:w-1/2 flex justify-center translate-y-8">
                     <div className="bg-white/5 p-4 rounded-[2rem] border border-white/10 backdrop-blur-3xl shadow-inner w-full max-w-sm">
                        <img src="/onboarding_demo.webp" className="w-full rounded-2xl shadow-2xl border border-white/20" alt="Demo Video Preview" />
                     </div>
                  </div>
               </div>
               <div className="absolute top-0 right-0 w-96 h-96 bg-[#56CCF2] opacity-[0.03] rounded-full translate-x-1/4 -translate-y-1/2 scale-150"></div>
            </div>
         </div>
      </section>

      {/* 4. Misión */}
      <section className="py-32 bg-white">
         <div className="max-w-4xl mx-auto px-6 text-center space-y-10">
            <Smartphone className="mx-auto text-slate-200" size={64} strokeWidth={1} />
            <h3 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.95]">Digitaliza tu pequeña flota, <span className="text-[#56CCF2]">profesionaliza</span> tu marca.</h3>
            <p className="text-lg text-slate-500 font-medium italic">"Entrega nació para darle a los que entregan el poder de las grandes logísticas."</p>
         </div>
      </section>

      {/* 5. CTA FOOTER */}
      <footer className="py-20 px-6 bg-[#1D3146] text-white overflow-hidden relative">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
            <div className="space-y-4 text-center md:text-left">
               <img src="/logo.png" alt="Entrega Logo" className="h-10 w-auto brightness-110" />
               <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">Crafted for ChocoBites & The New Logistics Generation</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-8">
               <div className="flex gap-10">
                  <a href="#" className="opacity-40 hover:opacity-100 transition-opacity" title="Descargar App"><Smartphone size={24} /></a>
                  <a href="#" className="opacity-40 hover:opacity-100 transition-opacity" title="Seguridad"><ShieldCheck size={24} /></a>
                  <a href="#" className="opacity-40 hover:opacity-100 transition-opacity" title="Propulsor"><Zap size={24} /></a>
               </div>
               <Link href="/onboarding" className="group h-16 px-10 bg-[#56CCF2] text-[#1D3146] rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[#56CCF2]/20">
                  Reserva tu acceso
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
               </Link>
            </div>
         </div>
         <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#56CCF2] opacity-[0.05] rounded-full blur-[100px]"></div>
      </footer>

    </div>
  );
}
