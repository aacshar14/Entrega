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
  Package,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/logo';

export default function RootPage() {
  return (
    <div className="min-h-screen bg-white text-[#1D3146] font-sans selection:bg-[#56CCF2]/30">
      
      {/* 1. STICKY HEADER */}
      <header className="fixed top-0 left-0 right-0 z-[100] bg-[#1D3146] border-b border-[#1D3146]/20 backdrop-blur-md">
         <div className="max-w-7xl mx-auto px-6 py-4 md:py-6 flex items-center justify-between transition-all duration-300">
            <Link href="/" className="flex items-center gap-3">
               <Logo variant="master" className="h-12 md:h-18 w-auto grow-0" />
            </Link>
            
            <nav className="hidden md:flex items-center gap-6 lg:gap-10">
               <a href="#como-funciona" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">Cómo Funciona</a>
               <a href="#recursos" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">Recursos</a>
               <a href="#precios" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">Precios</a>
            </nav>

            <div className="flex items-center gap-4">
               <Link href="/login" className="hidden sm:block text-sm font-bold px-6 py-2.5 rounded-xl text-white/80 hover:bg-white/5 transition-all">Log in</Link>
               <Link href="/onboarding" className="bg-[#56CCF2] text-[#1D3146] px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-[#1D3146]/20 hover:scale-105 active:scale-95 transition-all">
                  Empieza Gratis
               </Link>
            </div>
         </div>
      </header>

      {/* 2. HERO SECTION */}
      <section id="como-funciona" className="pt-32 md:pt-60 pb-20 px-6">
         <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-7 space-y-8">
               <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#56CCF2]/10 text-[#1D3146] rounded-full border border-[#56CCF2]/20">
                  <span className="relative flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#56CCF2] opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-[#56CCF2]"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest">v1.1 Pilot Launch - Open Beta</span>
               </div>
               
               <h1 className="text-5xl md:text-8xl font-black leading-[0.9] tracking-tighter">
                  Inteligencia <br/>
                  <span className="text-[#56CCF2] italic">Logística</span> para <br/>
                  tu Negocio.
               </h1>
               
               <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl leading-relaxed">
                  Controla tus entregas y cobros desde WhatsApp sin errores ni pérdidas. Sabe exactamente cuánto vendes, cuánto te deben y qué tienes en inventario — en tiempo real.
               </p>

               <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 w-fit px-3 py-1 rounded-lg">
                  Funciona directamente desde WhatsApp. Sin apps complicadas.
               </p>
               
               <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Link href="/onboarding" className="group h-16 px-10 bg-[#1D3146] text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[#1D3146]/30">
                     Empieza a controlar tus entregas hoy
                     <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link href="/onboarding_demo.webp" target="_blank" rel="noopener noreferrer" className="h-16 px-10 bg-white border-2 border-slate-100 text-[#1D3146] rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-sm tracking-widest hover:bg-slate-50 transition-all">
                     <PlayCircle size={20} />
                     Ver demo
                  </Link>
               </div>
               
               <div className="flex items-center gap-8 pt-8 border-t border-slate-50">
                  <div className="flex items-center gap-3">
                     <div className="flex -space-x-3">
                        {[
                           {bg: '#56CCF2', text: '#1D3146', initials: 'JD'},
                           {bg: '#1D3146', text: '#56CCF2', initials: 'AM'},
                           {bg: '#F1F5F9', text: '#64748B', initials: 'EG'}
                         ].map((u, i) => (
                           <div key={i} className="w-10 h-10 rounded-full border-4 border-white flex items-center justify-center font-black text-[10px]" style={{backgroundColor: u.bg, color: u.text}}>
                              {u.initials}
                           </div>
                        ))}
                     </div>
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">+12 negocios ya controlan sus entregas con Entrega</p>
                  </div>
                  <div className="h-10 w-px bg-slate-100 px-0"></div>
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-[#56CCF2]/10 flex items-center justify-center text-[#56CCF2]">
                        <ShieldCheck size={18} />
                     </div>
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-black italic">Operación Validada</p>
                  </div>
               </div>
            </div>
            
             <div className="lg:col-span-5 relative group">
                <div className="absolute inset-0 bg-[#56CCF2]/20 blur-[120px] rounded-full scale-150 opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative bg-[#1D3146] p-1.5 rounded-[3rem] shadow-2xl rotate-[1deg] group-hover:rotate-0 transition-all duration-700">
                   <div className="bg-white rounded-[2.8rem] overflow-hidden aspect-[4/5] relative transition-transform duration-1000">
                      <img src="/banner.png" className="w-full h-full object-cover" alt="Entrega Intelligence Dashboard" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1D3146]/20 to-transparent pointer-events-none"></div>
                   </div>
                </div>
             </div>
         </div>
      </section>

      {/* 3. "KNOW HOW" INTEGRATED DOCS SECTION */}
      <section id="recursos" className="py-32 bg-slate-50">
         <div className="max-w-7xl mx-auto px-6">
             <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#56CCF2]">Pérdidas vs Control</h2>
                <h3 className="text-4xl md:text-5xl font-black tracking-tight italic">¿Sigues controlando tu negocio con libreta o Excel?</h3>
                <p className="text-slate-500 font-medium italic">Cada error te cuesta dinero.</p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
                {[
                   { 
                     icon: Zap, 
                     title: 'Pierdes inventario', 
                     desc: 'Se va mercancía sin registrar y no te das cuenta hasta que falta.',
                   },
                   { 
                     icon: AlertTriangle, 
                     title: 'No sabes cuánto te deben', 
                     desc: 'Sin saldos en tiempo real, la cobranza es una pesadilla manual.',
                   },
                   { 
                     icon: ShieldCheck, 
                     title: 'Errores constantes', 
                     desc: 'Equivocaciones en entregas y cobros que dañan tu reputación.',
                   }
                ].map((card, i) => (
                   <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all group block">
                      <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mb-8">
                         <card.icon size={28} />
                      </div>
                      <h4 className="text-xl font-black mb-4 tracking-tight">{card.title}</h4>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">{card.desc}</p>
                   </div>
                ))}
             </div>

             <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#56CCF2]">Solución Total</h2>
                <h3 className="text-4xl md:text-5xl font-black tracking-tight italic">Convierte WhatsApp en tu centro de operaciones</h3>
                <p className="text-slate-500 font-medium italic">Tú vendes. Entrega controla.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                   { 
                     icon: Package, 
                     title: 'Descuento de Stock', 
                     desc: 'Cada mensaje descuenta inventario automáticamente del almacén.',
                   },
                   { 
                     icon: BarChart3, 
                     title: 'Registro de Venta', 
                     desc: 'Se guarda la transacción y el historial del cliente sin escribir una letra.',
                   },
                   { 
                     icon: Smartphone, 
                     title: 'Actualiza Deuda', 
                     desc: 'El saldo del cliente se ajusta en el dashboard al instante.',
                   }
                ].map((card, i) => (
                   <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all group block">
                      <div className="w-14 h-14 bg-[#56CCF2]/10 text-[#56CCF2] rounded-2xl flex items-center justify-center mb-8">
                         <card.icon size={28} />
                      </div>
                      <h4 className="text-xl font-black mb-4 tracking-tight">{card.title}</h4>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">{card.desc}</p>
                   </div>
                ))}
             </div>
            
            <div className="mt-16 p-1 bg-[#1D3146] rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-10 p-10 md:p-16 relative z-10">
                   <div className="md:w-1/2 space-y-6 text-center md:text-left">
                      <h3 className="text-3xl font-black text-white leading-tight">Así de simple funciona</h3>
                      <div className="space-y-4">
                         <div className="flex items-center gap-4 text-slate-300">
                            <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">1</span>
                            <p className="font-bold">Recibes mensaje: “Quiero 10 cajas”</p>
                         </div>
                         <div className="flex items-center gap-4 text-slate-300">
                            <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">2</span>
                            <p className="font-bold">Entrega procesa automáticamente</p>
                         </div>
                         <div className="flex items-center gap-4 text-slate-300">
                            <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">3</span>
                            <p className="font-bold">Ves todo en tu dashboard</p>
                         </div>
                      </div>
                      <p className="text-[#56CCF2] font-black uppercase tracking-widest text-[10px]">Sin errores. Sin desorden.</p>
                   </div>
                  <div className="md:w-1/2 flex justify-center translate-y-8">
                     <div className="bg-white/5 p-4 rounded-[2rem] border border-white/10 backdrop-blur-3xl shadow-inner w-full max-w-sm">
                        <img src="/settings_whatsapp.png" className="w-full rounded-2xl shadow-2xl border border-white/20" alt="Entrega WhatsApp Configuration" />
                     </div>
                  </div>
               </div>
               <div className="absolute top-0 right-0 w-96 h-96 bg-[#56CCF2] opacity-[0.03] rounded-full translate-x-1/4 -translate-y-1/2 scale-150"></div>
            </div>
         </div>
      </section>

      {/* 4. PRECIOS TÁCTICOS */}
      <section id="precios" className="py-32 bg-white">
         <div className="max-w-7xl mx-auto px-6 text-center">
             <h2 className="text-4xl md:text-6xl font-black text-[#1D3146] mb-8 uppercase tracking-tighter">Control total <span className="text-[#56CCF2]">en tiempo real</span></h2>
             <div className="max-w-2xl mx-auto bg-[#1D3146] p-16 rounded-[4rem] text-white overflow-hidden relative group shadow-2xl shadow-[#1D3146]/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#56CCF2]/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                <div className="relative z-10">
                   <p className="text-[#56CCF2] font-black uppercase tracking-[0.3em] text-sm mb-6">Sabes exactamente qué está pasando</p>
                   <ul className="text-left space-y-4 mb-12 max-w-xs mx-auto">
                      <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="text-[#56CCF2]" size={18} /> Ventas del día</li>
                      <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="text-[#56CCF2]" size={18} /> Inventario actualizado</li>
                      <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="text-[#56CCF2]" size={18} /> Errores detectados</li>
                      <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="text-[#56CCF2]" size={18} /> Intentos fallidos</li>
                   </ul>
                   <Link href="/onboarding" className="inline-block w-full bg-[#56CCF2] text-[#1D3146] px-16 py-6 rounded-3xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-2xl shadow-[#56CCF2]/20">
                      Activa tu negocio ahora
                   </Link>
                   <p className="mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuración en menos de 30 minutos</p>
                </div>
             </div>
         </div>
      </section>

      {/* 5. Misión */}
      <section className="py-32 bg-slate-50">
         <div className="max-w-4xl mx-auto px-6 text-center space-y-10">
            <Smartphone className="mx-auto text-slate-200" size={64} strokeWidth={1} />
            <h3 className="text-4xl md:text-5xl font-black tracking-tight leading-[0.95]">No es solo software. <span className="text-[#56CCF2]">Es un sistema.</span></h3>
            <p className="text-lg text-slate-500 font-medium italic">Entrega incluye una metodología operativa para negocios reales. Opera como empresa grande, sin serlo.</p>
         </div>
      </section>

      {/* 5. CTA FOOTER */}
      <footer className="py-20 px-6 bg-[#1D3146] text-white overflow-hidden relative">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
             <div className="space-y-4 text-center md:text-left">
                <Logo variant="master" className="h-32 w-auto brightness-110" />
                <div className="space-y-4">
                   <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Deja de perder dinero por desorden</p>
                   <p className="text-xs text-slate-500 max-w-xs mx-auto md:mx-0">Si hoy usas libreta o Excel, ya estás perdiendo dinero.</p>
                   <div className="flex flex-col gap-4">
                      <Link href="/privacy-policy" className="inline-flex items-center justify-center md:justify-start gap-2 bg-[#56CCF2]/10 text-[#56CCF2] px-6 py-3 rounded-xl hover:bg-[#56CCF2]/20 transition-all text-xs font-black uppercase tracking-widest border border-[#56CCF2]/20">
                         <ShieldCheck size={16} />
                         Política de Privacidad
                      </Link>
                      <p className="text-[8px] text-slate-600 font-medium uppercase tracking-tighter opacity-50">
                         Entrega is a SaaS platform for business inventory and delivery operations.
                      </p>
                   </div>
                </div>
             </div>
             
             <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="flex gap-10 text-slate-500">
                   <Smartphone size={24} />
                   <ShieldCheck size={24} />
                   <Package size={24} />
                </div>
                <Link href="/onboarding" className="group h-16 px-10 bg-[#56CCF2] text-[#1D3146] rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[#56CCF2]/20">
                   Activa tu negocio ahora
                   <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
             </div>
         </div>
         <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#56CCF2] opacity-[0.05] rounded-full blur-[100px]"></div>
      </footer>

    </div>
  );
}
