'use client';

import React from 'react';
import { ShieldCheck, Lock, EyeOff, Scale, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/logo';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#EBEEF2] font-sans text-[#1D3146]">
      
      {/* HEADER: Deep Navy Executive Style */}
      <header className="bg-[#1D3146] pt-20 pb-24 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10">
          <Link href="/landing" className="inline-flex items-center gap-2 text-[#56CCF2] text-xs font-black uppercase tracking-widest mb-10 hover:gap-4 transition-all">
            <ArrowLeft size={16} /> Volver a la plataforma
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#56CCF2]/20 text-[#56CCF2] rounded-lg border border-[#56CCF2]/30">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">Seguridad Verificada</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white leading-none tracking-tighter">
                Política de <br /> <span className="text-[#56CCF2]">Privacidad</span>
              </h1>
              <p className="text-slate-400 font-medium max-w-md">
                Transparencia total sobre cómo protegemos tu operación y los datos de tus clientes en Entrega.
              </p>
            </div>
            <Logo variant="master" className="w-32 h-auto opacity-50 grayscale brightness-200" />
          </div>
        </div>
        
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#56CCF2] opacity-5 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
      </header>

      {/* CONTENT: Clean Card Style */}
      <main className="max-w-4xl mx-auto px-6 -mt-12 pb-20">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-[#1D3146]/5 p-8 md:p-16 space-y-12">
          
          {/* Section 1 */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1D3146] text-[#56CCF2] rounded-2xl flex items-center justify-center">
                <Lock size={24} />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Protección de Datos Operativos</h2>
            </div>
            <div className="prose prose-slate max-w-none text-slate-500 font-medium leading-relaxed">
              <p>
                En <strong>Entrega</strong>, entendemos que tu base de clientes y tu inventario son el activo más valioso de tu negocio. Implementamos encriptación de grado bancario (AES-256) para asegurar que solo tú y tus colaboradores autorizados tengan acceso a esta información.
              </p>
            </div>
          </section>

          {/* Section 2: WhatsApp Specific */}
          <section className="space-y-6 p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#56CCF2] text-[#1D3146] rounded-2xl flex items-center justify-center">
                <EyeOff size={24} />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Integración con WhatsApp</h2>
            </div>
            <div className="prose prose-slate max-w-none text-slate-500 font-medium leading-relaxed">
              <p>
                Al conectar tu cuenta de WhatsApp Business Cloud API con nuestra plataforma:
              </p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li>Solo procesamos mensajes relacionados con pedidos y consultas de clientes.</li>
                <li>Los números de teléfono de tus clientes se usan exclusivamente para la logística y notificaciones de entrega.</li>
                <li>Nunca compartiremos ni venderemos tu historial de conversaciones a terceros.</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 text-[#1D3146] rounded-2xl flex items-center justify-center">
                <Scale size={24} />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Tus Derechos</h2>
            </div>
            <p className="text-slate-500 font-medium leading-relaxed">
              Tienes derecho a exportar, modificar o eliminar tu base de datos en cualquier momento. Entrega es una herramienta facilitadora; tú eres el dueño único de la información.
            </p>
          </section>

          <footer className="pt-12 border-t border-slate-100 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Última actualización: Abril 2026 // Entrega V1.1 Compliance Mode
            </p>
          </footer>
        </div>
      </main>

    </div>
  );
}
