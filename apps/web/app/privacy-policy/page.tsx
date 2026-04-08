'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  EyeOff, 
  Scale, 
  ArrowLeft, 
  Mail, 
  Database, 
  Globe, 
  ChevronRight,
  Info,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/logo';

export default function PrivacyPage() {
  const [lang, setLang] = useState<'es' | 'en'>('es');

  const content = {
    es: {
      title: 'Política de Privacidad',
      subtitle: 'Transparencia total sobre cómo protegemos tu operación y los datos de tus clientes.',
      back: 'Volver al Inicio',
      verified: 'Seguridad Verificada',
      lastUpdated: 'Última actualización: Abril 2026',
      contactTitle: 'Contacto y Eliminación de Datos',
      contactDesc: 'Para solicitudes de acceso, corrección, exportación o eliminación definitiva de tus datos, escribe a:',
      sections: [
        {
          id: 'collection',
          icon: Database,
          title: 'Qué datos recolectamos',
          content: 'EntréGA recolecta información esencial para la operación logística:',
          list: [
            'Información de cuenta comercial (nombre, email, empresa).',
            'Datos de clientes (nombres y números de teléfono).',
            'Registros operativos (inventario, pedidos y estados de entrega).',
            'Mensajes procesados vía WhatsApp Business API dedicados a la operación.',
            'Datos técnicos básicos (dirección IP, logs de acceso) para seguridad y estabilidad.'
          ]
        },
        {
          id: 'usage',
          icon: ShieldCheck,
          title: 'Cómo usamos los datos',
          content: 'Utilizamos la información recopilada estrictamente para:',
          list: [
            'Gestión y seguimiento de inventario en tiempo real.',
            'Ejecución de operaciones logísticas y de entrega.',
            'Facilitar la comunicación directa con tus clientes.',
            'Generación de reportes y administración de cuentas.',
            'Garantizar la seguridad y fiabilidad del servicio.'
          ]
        },
        {
          id: 'whatsapp',
          icon: EyeOff,
          title: 'Integración con WhatsApp',
          content: 'Como proveedor de soluciones, EntréGA procesa datos de Meta/WhatsApp bajo los siguientes principios:',
          list: [
            'Solo procesamos mensajes relacionados con flujos operativos de negocio.',
            'NO vendemos ni compartimos historiales de conversación con terceros.',
            'Los números se usan exclusivamente para notificaciones del servicio autorizadas.',
            'Los negocios conectan su cuenta mediante procesos oficiales de Meta.'
          ]
        },
        {
          id: 'third-party',
          icon: Globe,
          title: 'Servicios de Terceros',
          content: 'Para operar EntréGA, utilizamos proveedores que procesan datos cumpliendo estándares de seguridad:',
          list: [
            'Meta (WhatsApp Business API) para el canal de comunicación.',
            'Infraestructura en la nube (Google Cloud, Supabase) para hosting y bases de datos.',
            'Servicios de autenticación y analítica técnica para estabilidad del sistema.'
          ]
        },
        {
          id: 'rights',
          icon: Scale,
          title: 'Tus Derechos',
          content: 'Eres el dueño único de tu información. Tienes derecho a exportar, modificar o solicitar la eliminación total de tu base de datos y cuenta en cualquier momento.'
        }
      ]
    },
    en: {
      title: 'Privacy Policy',
      subtitle: 'Total transparency on how we protect your operations and your customers\' data.',
      back: 'Back to Home',
      verified: 'Verified Security',
      lastUpdated: 'Last updated: April 2026',
      contactTitle: 'Contact & Data Deletion',
      contactDesc: 'For access, correction, export, or permanent deletion requests, please contact:',
      sections: [
        {
          id: 'collection',
          icon: Database,
          title: 'Data Collection',
          content: 'EntréGA collects essential information required for logistics operations:',
          list: [
            'Business account information (name, email, company).',
            'Customer data (names and phone numbers).',
            'Operational records (inventory, orders, and delivery status).',
            'Messages processed via WhatsApp Business API for operational purposes.',
            'Basic technical data (IP address, access logs) for security and stability.'
          ]
        },
        {
          id: 'usage',
          icon: ShieldCheck,
          title: 'How we use the data',
          content: 'We use the collected information strictly for:',
          list: [
            'Real-time inventory management and tracking.',
            'Execution of logistics and delivery operations.',
            'Facilitating direct communication with your customers.',
            'Reporting and account administration.',
            'Ensuring service security and reliability.'
          ]
        },
        {
          id: 'whatsapp',
          icon: EyeOff,
          title: 'WhatsApp Integration',
          content: 'As a solution provider, EntréGA processes Meta/WhatsApp data under these principles:',
          list: [
            'We only process messages related to business operational workflows.',
            'We DO NOT sell or share conversation history with third parties.',
            'Phone numbers are used exclusively for authorized service notifications.',
            'Businesses connect their accounts through official Meta processes.'
          ]
        },
        {
          id: 'third-party',
          icon: Globe,
          title: 'Third-Party Services',
          content: 'To operate the service, EntréGA uses providers that process data following high security standards:',
          list: [
            'Meta (WhatsApp Business API) for the communication channel.',
            'Cloud infrastructure (Google Cloud, Supabase) for hosting and databases.',
            'Authentication and technical analytics services for system stability.'
          ]
        },
        {
          id: 'rights',
          icon: Scale,
          title: 'Your Rights',
          content: 'You are the sole owner of your information. You have the right to export, modify, or request the total deletion of your database and account at any time.'
        }
      ]
    }
  };

  const t = content[lang];

  return (
    <div className="min-h-screen bg-[#EBEEF2] font-sans text-[#1D3146]">
      
      {/* HEADER */}
      <header className="bg-[#1D3146] pt-20 pb-32 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-10">
            <Link href="/" className="inline-flex items-center gap-2 text-[#56CCF2] text-xs font-black uppercase tracking-widest hover:gap-4 transition-all">
              <ArrowLeft size={16} /> {t.back}
            </Link>
            
            {/* Language Toggle */}
            <div className="flex bg-white/10 rounded-xl p-1 border border-white/10">
              <button 
                onClick={() => setLang('es')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${lang === 'es' ? 'bg-[#56CCF2] text-[#1D3146]' : 'text-slate-400 hover:text-white'}`}
              >
                ES
              </button>
              <button 
                onClick={() => setLang('en')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${lang === 'en' ? 'bg-[#56CCF2] text-[#1D3146]' : 'text-slate-400 hover:text-white'}`}
              >
                EN
              </button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#56CCF2]/20 text-[#56CCF2] rounded-lg border border-[#56CCF2]/30">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">{t.verified}</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white leading-none tracking-tighter">
                {lang === 'es' ? <>{content.es.title.split(' ')[0]} de <br /> <span className="text-[#56CCF2]">{content.es.title.split(' ')[2]}</span></> : <span>{t.title}</span>}
              </h1>
              <p className="text-slate-400 font-medium max-w-md">
                {t.subtitle}
              </p>
            </div>
            <Logo variant="master" className="w-32 h-auto opacity-50 grayscale brightness-200" />
          </div>
        </div>
        
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#56CCF2] opacity-5 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
      </header>

      {/* CONTENT */}
      <main className="max-w-4xl mx-auto px-6 -mt-16 pb-20 relative z-20">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-[#1D3146]/5 p-8 md:p-16 space-y-16">
          
          {/* Dynamic Sections */}
          {t.sections.map((section) => (
            <section key={section.id} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${section.id === 'whatsapp' ? 'bg-[#56CCF2] text-[#1D3146]' : 'bg-[#1D3146] text-[#56CCF2]'} rounded-2xl flex items-center justify-center shadow-lg shadow-[#1D3146]/10`}>
                  <section.icon size={24} />
                </div>
                <h2 className="text-2xl font-black tracking-tight">{section.title}</h2>
              </div>
              <div className="prose prose-slate max-w-none text-slate-500 font-medium leading-relaxed">
                <p>{section.content}</p>
                {section.list && (
                  <ul className="list-disc pl-5 mt-4 space-y-3">
                    {section.list.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}

          {/* CONTACT & DELETION SECTION */}
          <section className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8 md:p-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
                <Trash2 size={24} />
              </div>
              <h2 className="text-2xl font-black tracking-tight">{t.contactTitle}</h2>
            </div>
            
            <div className="space-y-6">
              <p className="text-slate-500 font-medium leading-relaxed">
                {t.contactDesc}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md group">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-[#1D3146] group-hover:bg-[#56CCF2] group-hover:text-white transition-colors">
                  <Mail size={18} />
                </div>
                <span className="text-xl font-black text-[#1D3146] tracking-tight">admin@entrega.space</span>
                <a 
                  href="mailto:admin@entrega.space" 
                  className="sm:ml-auto inline-flex items-center gap-2 px-6 py-2 bg-[#1D3146] text-[#56CCF2] rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-[#1D3146]/20"
                >
                  {lang === 'es' ? 'Enviar Correo' : 'Email Now'} <ChevronRight size={14} />
                </a>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-700 font-medium">
                <Info size={16} className="mt-0.5 shrink-0" />
                <p>
                  {lang === 'es' 
                    ? 'Procesamos las solicitudes de eliminación de datos en un plazo máximo de 48 horas hábiles.' 
                    : 'We process data deletion requests within a maximum of 48 business hours.'}
                </p>
              </div>
            </div>
          </section>

          <footer className="pt-12 border-t border-slate-100 flex flex-col items-center gap-4">
            <Logo variant="master" className="h-12 w-auto opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              {t.lastUpdated} // EntréGA V1.1 Compliance Mode
            </p>
            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter mt-1 opacity-60">
              Entrega is a SaaS platform for business inventory and delivery operations.
            </p>
          </footer>
        </div>
      </main>

    </div>
  );
}
