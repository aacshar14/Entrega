'use client';

import React, { useState } from 'react';
import { 
  Trash2, 
  ShieldCheck, 
  ArrowLeft, 
  Mail, 
  Info,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/logo';

export default function DataDeletionPage() {
  const [lang, setLang] = useState<'es' | 'en'>('es');

  const content = {
    es: {
      title: 'Eliminación de Datos',
      subtitle: 'Instrucciones claras para solicitar la eliminación de tu información personal y operativa.',
      back: 'Volver al Inicio',
      lastUpdated: 'Última actualización: Abril 2026',
      instructions: 'Para solicitar la eliminación de tus datos asociados con Entrega y nuestras integraciones (WhatsApp/Meta), sigue estos pasos:',
      steps: [
        'Inicia sesión en tu panel de Entrega.',
        'Dirígete a Configuración > Integraciones.',
        'Selecciona "Desconectar" en la integración de WhatsApp.',
        'Para una eliminación completa de la cuenta y todos los registros históricos, envía un correo a admin@entrega.space con el asunto "Eliminación Definitiva".'
      ]
    },
    en: {
      title: 'Data Deletion',
      subtitle: 'Clear instructions to request the deletion of your personal and operational information.',
      back: 'Back to Home',
      lastUpdated: 'Last updated: April 2026',
      instructions: 'To request the deletion of your data associated with Entrega and our integrations (WhatsApp/Meta), please follow these steps:',
      steps: [
        'Log in to your Entrega dashboard.',
        'Go to Settings > Integrations.',
        'Select "Disconnect" on the WhatsApp integration.',
        'For a complete account deletion including all historical records, email admin@entrega.space with the subject "Permanent Deletion".'
      ]
    }
  };

  const t = content[lang];

  return (
    <div className="min-h-screen bg-[#EBEEF2] font-sans text-[#1D3146]">
      <header className="bg-[#1D3146] pt-20 pb-32 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-10">
            <Link href="/" className="inline-flex items-center gap-2 text-[#56CCF2] text-xs font-black uppercase tracking-widest hover:gap-4 transition-all">
              <ArrowLeft size={16} /> {t.back}
            </Link>
            <div className="flex bg-white/10 rounded-xl p-1 border border-white/10">
              <button onClick={() => setLang('es')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${lang === 'es' ? 'bg-[#56CCF2] text-[#1D3146]' : 'text-slate-400 hover:text-white'}`}>ES</button>
              <button onClick={() => setLang('en')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${lang === 'en' ? 'bg-[#56CCF2] text-[#1D3146]' : 'text-slate-400 hover:text-white'}`}>EN</button>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/20 text-rose-300 rounded-lg border border-rose-500/30">
                <Trash2 size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">Cumplimiento Meta</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white leading-none tracking-tighter">{t.title}</h1>
              <p className="text-slate-400 font-medium max-w-md">{t.subtitle}</p>
            </div>
            <Logo variant="master" className="w-32 h-auto opacity-50 grayscale brightness-200" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 -mt-16 pb-20 relative z-20">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-[#1D3146]/5 p-8 md:p-16 space-y-12">
          <section className="space-y-6">
             <p className="text-slate-600 font-medium leading-relaxed">{t.instructions}</p>
             <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
                <ul className="space-y-4">
                   {t.steps.map((step, i) => (
                     <li key={i} className="flex gap-4">
                        <div className="w-6 h-6 rounded-full bg-[#1D3146] text-[#56CCF2] text-[10px] font-black flex items-center justify-center shrink-0 mt-1">{i+1}</div>
                        <p className="text-slate-600 font-bold text-sm tracking-tight">{step}</p>
                     </li>
                   ))}
                </ul>
             </div>
          </section>

          <section className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex items-center gap-6">
             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-[#1D3146]">
                <Mail size={24} />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contacto Administrativo</p>
                <p className="text-xl font-black text-[#1D3146]">admin@entrega.space</p>
             </div>
             <a href="mailto:admin@entrega.space" className="ml-auto hidden sm:flex items-center gap-2 bg-[#1D3146] text-[#56CCF2] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-125 transition-all">
                Enviar E-mail <ExternalLink size={14} />
             </a>
          </section>

          <footer className="pt-12 border-t border-slate-100 text-center">
            <Logo variant="master" className="h-12 w-auto opacity-20 mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">{t.lastUpdated}</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
