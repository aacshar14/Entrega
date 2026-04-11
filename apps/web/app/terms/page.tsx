'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  ArrowLeft, 
  Scale, 
  Zap,
  Clock,
  Briefcase,
  ChevronRight,
  Database
} from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/logo';

export default function TermsOfServicePage() {
  const [lang, setLang] = useState<'es' | 'en'>('es');

  const content = {
    es: {
      title: 'Términos de Servicio',
      subtitle: 'El contrato de uso para operar tu negocio con la inteligencia de EntréGA.',
      back: 'Volver al Inicio',
      lastUpdated: 'Última actualización: Abril 2026',
      sections: [
        {
          id: 'acceptance',
          icon: Zap,
          title: 'Aceptación de los Términos',
          content: 'Al acceder o utilizar EntréGA Intelligence, aceptas quedar vinculado por estos términos. Nuestra plataforma es una solución SaaS para logística y control de inventario.'
        },
        {
          id: 'license',
          icon: Briefcase,
          title: 'Licencia de Uso',
          content: 'Otorgamos una licencia limitada, no exclusiva e intransferible para acceder a la plataforma según el plan contratado. El uso es exclusivo para fines comerciales legítimos.'
        },
        {
          id: 'obligations',
          icon: Scale,
          title: 'Obligaciones del Usuario',
          content: 'Como usuario de EntréGA, te comprometes a:',
          list: [
            'Proporcionar información veraz y mantenerla actualizada.',
            'No utilizar la plataforma para fines ilícitos o spam.',
            'Mantener la seguridad de tus credenciales de acceso.',
            'Cumplir con las políticas de Meta al usar la integración de WhatsApp.'
          ]
        },
        {
          id: 'payments',
          icon: Clock,
          title: 'Pagos y Cancelaciones',
          content: 'Los servicios se facturan por adelantado. La falta de pago resultará en la suspensión temporal del acceso a los datos operativos.'
        }
      ]
    },
    en: {
      title: 'Terms of Service',
      subtitle: 'The usage contract for operating your business with EntréGA Intelligence.',
      back: 'Back to Home',
      lastUpdated: 'Last updated: April 2026',
      sections: [
        {
          id: 'acceptance',
          icon: Zap,
          title: 'Acceptance of Terms',
          content: 'By accessing or using EntréGA Intelligence, you agree to be bound by these terms. Our platform is a SaaS solution for logistics and inventory control.'
        },
        {
          id: 'license',
          icon: Briefcase,
          title: 'Usage License',
          content: 'We grant a limited, non-exclusive, non-transferable license to access the platform according to the contracted plan. Use is exclusive for legitimate business purposes.'
        },
        {
          id: 'obligations',
          icon: Scale,
          title: 'User Obligations',
          content: 'As an EntréGA user, you agree to:',
          list: [
            'Provide truthful information and keep it updated.',
            'Not use the platform for illegal purposes or spam.',
            'Maintain the security of your access credentials.',
            'Comply with Meta\'s policies when using the WhatsApp integration.'
          ]
        }
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
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#56CCF2]/20 text-[#56CCF2] rounded-lg border border-[#56CCF2]/30">
                <FileText size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">Acuerdo Legal</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white leading-none tracking-tighter">{t.title}</h1>
              <p className="text-slate-400 font-medium max-w-md">{t.subtitle}</p>
            </div>
            <Logo variant="master" className="w-32 h-auto opacity-50 grayscale brightness-200" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 -mt-16 pb-20 relative z-20">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-[#1D3146]/5 p-8 md:p-16 space-y-16">
          {t.sections.map((section) => (
            <section key={section.id} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#1D3146] text-[#56CCF2] rounded-2xl flex items-center justify-center shadow-lg">
                  <section.icon size={24} />
                </div>
                <h2 className="text-2xl font-black tracking-tight">{section.title}</h2>
              </div>
              <div className="prose prose-slate max-w-none text-slate-500 font-medium leading-relaxed">
                <p>{section.content}</p>
                {section.list && (
                  <ul className="list-disc pl-5 mt-4 space-y-3">
                    {section.list.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                )}
              </div>
            </section>
          ))}
          <footer className="pt-12 border-t border-slate-100 text-center">
            <Logo variant="master" className="h-12 w-auto opacity-20 mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">{t.lastUpdated}</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
