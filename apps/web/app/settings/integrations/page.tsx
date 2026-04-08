'use client';

import React from 'react';
import { 
  ArrowLeft,
  LayoutGrid,
  MessageCircle,
  ChevronRight,
  Zap,
  Smartphone,
  ShieldCheck
} from 'lucide-react';
import { useTenant } from '@/lib/context/tenant-context';
import Link from 'next/link';

export default function IntegrationsPage() {
  const { activeTenant } = useTenant();

  const integrations = [
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      desc: 'Conecta tu número oficial para automatizar pedidos y stock.',
      icon: MessageCircle,
      color: 'bg-[#25D366]',
      href: '/settings/integrations/whatsapp',
      status: activeTenant?.business_whatsapp_connected ? 'Connected' : 'Configure'
    },
    {
      id: 'shopify',
      name: 'Shopify (Próximamente)',
      desc: 'Sincroniza tus ventas online con tu stock físico.',
      icon: Zap,
      color: 'bg-[#96bf48]',
      href: '#',
      disabled: true,
      status: 'Coming Soon'
    }
  ];

  if (!activeTenant) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center gap-6">
         <Link href="/settings" className="p-4 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-[#1D3146] transition-colors shadow-sm active:scale-95">
            <ArrowLeft size={20} />
         </Link>
         <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
               <div className="bg-[#1D3146] p-2 rounded-xl text-[#56CCF2]">
                  <LayoutGrid size={24} />
               </div>
               Integraciones
            </h2>
            <p className="text-sm text-slate-500 font-medium italic">Conecta EntréGA con tus herramientas favoritas.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((app) => (
          <Link 
            key={app.id} 
            href={app.href}
            className={`group bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm transition-all flex flex-col justify-between h-72 ${
              app.disabled ? 'opacity-60 cursor-not-allowed grayscale' : 'hover:shadow-xl hover:shadow-[#1D3146]/5 hover:-translate-y-1'
            }`}
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className={`w-16 h-16 ${app.color} text-white rounded-2xl flex items-center justify-center shadow-lg`}>
                  <app.icon size={28} />
                </div>
                <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                  app.status === 'Connected' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {app.status}
                </div>
              </div>
              <h3 className="text-xl font-black text-[#1D3146] mb-2">{app.name}</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">{app.desc}</p>
            </div>

            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[#56CCF2] opacity-0 group-hover:opacity-100 transition-opacity">
              {app.disabled ? 'En Desarrollo' : 'Gestionar Integración'}
              <ChevronRight size={16} />
            </div>
          </Link>
        ))}

        <div className="md:col-span-2 bg-[#1D3146] text-white p-10 rounded-[3rem] relative overflow-hidden">
           <div className="relative z-10 space-y-6">
              <h4 className="text-xl font-black flex items-center gap-3">
                 <ShieldCheck className="text-[#56CCF2]" />
                 Seguridad Multi-Tenant
              </h4>
              <p className="text-sm text-slate-400 font-medium max-w-2xl leading-relaxed">
                 En EntréGA, la privacidad es nuestra brújula. Cada integración es aislada a nivel de base de datos. 
                 Tus tokens de acceso están encriptados con AES-256 y nunca se comparten entre negocios.
              </p>
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2">
                    <Smartphone size={16} className="text-[#56CCF2]" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Aislamiento por Tenant</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Zap size={16} className="text-[#56CCF2]" />
                    <span className="text-[10px] font-black uppercase tracking-widest">OAuth 2.0 Nativo</span>
                 </div>
              </div>
           </div>
           <div className="absolute top-0 right-0 w-96 h-96 bg-[#56CCF2]/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        </div>
      </div>

    </div>
  );
}
