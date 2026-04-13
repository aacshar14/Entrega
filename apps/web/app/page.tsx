"use client";

import React from "react";
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Smartphone,
  ShieldCheck,
  ChevronRight,
  PlayCircle,
  Package,
  AlertTriangle,
  BarChart3,
  XCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import Logo from "@/components/logo";

export default function RootPage() {
  const trackEvent = (name: string) => {
    try {
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", name);
      }
      console.log(`[Analytics] Tracked: ${name}`);
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-white text-[#1D3146] font-sans selection:bg-[#56CCF2]/30">
      {/* 1. STICKY HEADER */}
      <header className="fixed top-0 left-0 right-0 z-[100] bg-[#1D3146] border-b border-[#1D3146]/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo variant="master" className="h-10 md:h-14 w-auto grow-0" />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#solucion" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">Solución</a>
            <a href="#precios" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">Precios</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-bold text-white/80 hover:text-white transition-all">Log in</Link>
            <Link
              href="/onboarding"
              onClick={() => trackEvent("signup_start")}
              className="bg-[#56CCF2] text-[#1D3146] px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#1D3146]/20"
            >
              Empieza Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="pt-32 md:pt-52 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-7 space-y-8">
            <h1 className="text-5xl md:text-8xl font-black leading-[0.9] tracking-tighter">
              Deja de perder <br />
              <span className="text-[#56CCF2] italic">dinero</span> en <br />
              WhatsApp.
            </h1>
            <p className="text-xl md:text-2xl text-slate-500 font-medium max-w-2xl leading-relaxed">
              Controla lo que vendes, quién te debe y tu inventario en tiempo real. 
              Sin libretas, sin errores, sin desorden.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/onboarding"
                onClick={() => trackEvent("cta_primary_click")}
                className="group h-16 px-10 bg-[#1D3146] text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[#1D3146]/30"
              >
                Empieza gratis 7 días
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="https://wa.me/message/ENTREGA_DEMO"
                className="h-16 px-10 bg-white border-2 border-slate-100 text-[#1D3146] rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-sm tracking-widest hover:bg-slate-50 transition-all"
              >
                <PlayCircle size={20} />
                Ver demo
              </Link>
            </div>
            
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
              Ideal para negocios que venden por WhatsApp
            </p>
          </div>

          <div className="lg:col-span-5 relative group">
            <div className="absolute inset-0 bg-[#56CCF2]/20 blur-[120px] rounded-full scale-150 opacity-30 group-hover:opacity-50 transition-opacity"></div>
            <div className="relative bg-[#1D3146] p-1.5 rounded-[3rem] shadow-2xl rotate-[1deg] group-hover:rotate-0 transition-all duration-700">
              <div className="bg-white rounded-[2.8rem] overflow-hidden aspect-[4/5] relative">
                <img src="/banner.png" className="w-full h-full object-cover" alt="Dashboard" />
                <div className="absolute bottom-6 left-6 right-6 bg-[#1D3146]/90 backdrop-blur-xl p-6 rounded-3xl border border-white/10 text-white space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-[#56CCF2]">Vista Real</p>
                   <p className="text-lg font-bold">Ventas del día: $12,450</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROBLEM VS SOLUTION */}
      <section id="solucion" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12">
           {/* Problem */}
           <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <h3 className="text-2xl font-black mb-10 flex items-center gap-3">
                <AlertTriangle className="text-red-500" /> El desorden hoy
              </h3>
              <ul className="space-y-6">
                {[
                  "Pedidos se pierden en WhatsApp",
                  "No sabes quién te debe",
                  "No sabes cuánto vendiste hoy",
                  "El inventario nunca cuadra"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-slate-500 font-bold group-hover:translate-x-2 transition-transform">
                    <XCircle className="text-red-200" size={20} /> {item}
                  </li>
                ))}
              </ul>
           </div>

           {/* Solution */}
           <div className="bg-[#1D3146] p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#56CCF2]/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <h3 className="text-2xl font-black mb-10 flex items-center gap-3">
                <Zap className="text-[#56CCF2]" /> Con Entrega
              </h3>
              <ul className="space-y-6">
                {[
                  "Registra ventas desde WhatsApp",
                  "Controla inventario automáticamente",
                  "Clientes y adeudos siempre al día",
                  "Dashboard claro con tus números reales"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 font-bold group-hover:translate-x-2 transition-transform">
                    <CheckCircle2 className="text-[#56CCF2]" size={20} /> {item}
                  </li>
                ))}
              </ul>
           </div>
        </div>
      </section>

      {/* 4. DASHBOARD CAPTIONS */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
             <h2 className="text-4xl md:text-5xl font-black tracking-tighter">Todo bajo tu control</h2>
             <p className="text-slate-500 font-medium">Información real para tomar mejores decisiones</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Ventas del día", desc: "Sabe exactamente cuánto entró hoy.", icon: BarChart3 },
              { title: "Clientes con adeudo", desc: "No dejes que se te escape la cobranza.", icon: Users },
              { title: "Inventario actual", desc: "Lo que tienes en almacén, real.", icon: Package }
            ].map((item, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border-2 border-slate-50 hover:border-[#56CCF2]/30 transition-all text-center space-y-4">
                <div className="w-12 h-12 bg-[#1D3146] text-[#56CCF2] rounded-xl flex items-center justify-center mx-auto">
                  <item.icon size={24} />
                </div>
                <h4 className="text-xl font-black">{item.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PRICING TABLE */}
      <section id="precios" className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <h2 className="text-5xl font-black tracking-tighter">Planes que <span className="text-[#56CCF2]">pagan solos</span></h2>
            <p className="text-slate-500 font-bold">Sin contratos. Sin tarjeta para empezar.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Basic */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 flex flex-col">
              <div className="space-y-4 mb-8">
                <h4 className="text-xl font-black uppercase tracking-widest text-slate-400">Basic</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">$199</span>
                  <span className="text-slate-400 text-sm font-bold">/ mes</span>
                </div>
                <p className="text-sm italic font-medium text-slate-500">“Solo reportes”</p>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-bold text-slate-400 decoration-red-500 line-through"><MessageCircle size={18} /> WhatsApp</li>
                <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 className="text-[#56CCF2]" size={18} /> Dashboard de ventas</li>
                <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 className="text-[#56CCF2]" size={18} /> Carga manual</li>
              </ul>
              <Link href="/onboarding?plan=basic" className="h-14 w-full border-2 border-slate-100 rounded-2xl flex items-center justify-center font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all">Empieza Gratis</Link>
            </div>

            {/* Pro - Highlighted */}
            <div className="bg-[#1D3146] p-10 rounded-[2.5rem] text-white flex flex-col scale-105 shadow-2xl shadow-[#1D3146]/20 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#56CCF2] text-[#1D3146] px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Lo más vendido</div>
              <div className="space-y-4 mb-8">
                <h4 className="text-xl font-black uppercase tracking-widest text-[#56CCF2]">Pro</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">$349</span>
                  <span className="text-slate-400 text-sm font-bold">/ mes</span>
                </div>
                <p className="text-sm italic font-medium text-slate-300">“Control con WhatsApp”</p>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-bold text-[#56CCF2]"><CheckCircle2 size={18} /> WhatsApp Inteligente</li>
                <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 className="text-[#56CCF2]" size={18} /> Control de Inventario</li>
                <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 className="text-[#56CCF2]" size={18} /> Cobranza + Adeudos</li>
                <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 className="text-[#56CCF2]" size={18} /> Dashboard en vivo</li>
              </ul>
              <Link
                href="/onboarding?plan=pro"
                onClick={() => trackEvent("pricing_pro_click")}
                className="h-14 w-full bg-[#56CCF2] text-[#1D3146] rounded-2xl flex items-center justify-center font-black uppercase text-xs tracking-widest hover:scale-105 transition-all"
              >
                Activa Pro gratis
              </Link>
            </div>

            {/* Premium */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 flex flex-col">
              <div className="space-y-4 mb-8">
                <h4 className="text-xl font-black uppercase tracking-widest text-slate-400">Premium</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">$449</span>
                  <span className="text-slate-400 text-sm font-bold">/ mes</span>
                </div>
                <p className="text-sm italic font-medium text-slate-500">“Escala tu operación”</p>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 className="text-[#56CCF2]" size={18} /> Todo el plan Pro</li>
                <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 className="text-[#56CCF2]" size={18} /> Multi-usuario</li>
                <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 className="text-[#56CCF2]" size={18} /> Exportación de reportes</li>
              </ul>
              <Link href="/onboarding?plan=premium" className="h-14 w-full border-2 border-slate-100 rounded-2xl flex items-center justify-center font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all">Contactar Ventas</Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FINAL CTA */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto bg-[#56CCF2] p-16 rounded-[4rem] text-[#1D3146] text-center space-y-8 relative overflow-hidden shadow-2xl shadow-[#56CCF2]/20">
           <div className="absolute top-0 left-0 w-32 h-32 bg-white/20 rounded-full -ml-16 -mt-16 blur-2xl"></div>
           <h3 className="text-4xl md:text-6xl font-black tracking-tight leading-none italic">¿Listo para tomar el control de tu dinero?</h3>
           <p className="text-xl font-bold opacity-80">Empieza tu prueba de 7 días hoy mismo. Sin tarjeta, sin compromisos.</p>
           <div className="pt-4">
              <Link
                href="/onboarding"
                className="inline-flex h-20 px-12 bg-[#1D3146] text-white rounded-3xl items-center justify-center gap-4 font-black uppercase tracking-widest text-lg hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[#1D3146]/30"
              >
                Prueba gratis 7 días
                <ArrowRight />
              </Link>
           </div>
           <p className="text-xs font-black uppercase tracking-[0.3em] opacity-60 italic">Configuración rápida en minutos</p>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="py-20 px-6 bg-[#1D3146] text-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
           <div className="space-y-4 text-center md:text-left">
              <Logo variant="master" className="h-24 w-auto brightness-110" />
              <p className="text-slate-400 text-sm max-w-xs">Olvídate de la libreta. Entrega es el sistema que tu negocio necesita para crecer.</p>
           </div>
           <div className="flex flex-col items-center md:items-end gap-6">
              <div className="flex gap-8 text-slate-500">
                <Smartphone size={24} />
                <ShieldCheck size={24} />
                <Package size={24} />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">© 2026 Entrega. Todos los derechos reservados.</p>
           </div>
        </div>
      </footer>
    </div>
  );
}
