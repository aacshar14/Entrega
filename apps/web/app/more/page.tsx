'use client';

import React from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Package, 
  ShieldCheck, 
  Settings, 
  ChevronRight, 
  LogOut,
  HelpCircle,
  Database,
  Search,
  Bell,
  ArrowLeft
} from 'lucide-react';

export default function MorePage() {
  // Mock session role
  const user = { role: "owner" }; 

  const adminItems = [
    { icon: FileText, label: 'Reportes', sub: 'Análisis de ventas y pagos', href: '/reports', color: 'bg-indigo-50 text-indigo-600' },
    { icon: Package, label: 'Productos', sub: 'Gestión de catálogo maestro', href: '/products', color: 'bg-blue-50 text-blue-600' },
    { icon: ShieldCheck, label: 'Usuarios', sub: 'Permisos de equipo y accesos', href: '/users', color: 'bg-emerald-50 text-emerald-600' },
    { icon: Settings, label: 'Configuración', sub: 'Ajustes del tenant y negocio', href: '/settings', color: 'bg-slate-100 text-slate-600' },
  ];

  const appItems = [
    { icon: HelpCircle, label: 'Ayuda y Soporte', sub: 'Guías de uso de Entrega', href: '/docs' },
    { icon: Database, label: 'Sincronizar Datos', sub: 'Forzar refresco de red', href: '#' },
    { icon: Bell, label: 'Notificaciones', sub: 'Alertas y WhatsApp', href: '#' },
  ];

  return (
    <div className="max-w-xl mx-auto py-4 space-y-10 animate-in slide-in-from-right-4 duration-500">
      
      {/* Header Contextual */}
      <div className="flex items-center gap-4 mb-2">
         <Link href="/dashboard" className="p-3 bg-white rounded-2xl border border-slate-100 text-slate-400">
            <ArrowLeft size={20} />
         </Link>
         <div>
            <h1 className="text-2xl font-black text-[#1D3146] tracking-tight">Opciones</h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Administración ChocoBites</p>
         </div>
      </div>

      {/* Admin Section (Only for Owners) */}
      {user.role === 'owner' && (
        <section className="space-y-4">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 px-2 mt-4 mb-2">Gestión Administrativa</h3>
           <div className="grid grid-cols-1 gap-3">
              {adminItems.map((item, i) => (
                 <Link key={i} href={item.href} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group active:scale-95 transition-all">
                    <div className="flex items-center gap-4">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${item.color}`}>
                          <item.icon size={24} />
                       </div>
                       <div>
                          <p className="text-sm font-black text-[#1D3146] group-hover:text-[#56CCF2] transition-colors">{item.label}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{item.sub}</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                 </Link>
              ))}
           </div>
        </section>
      )}

      {/* App & Tools Section */}
      <section className="space-y-4">
         <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 px-2 mt-4 mb-2">Herramientas</h3>
         <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
            {appItems.map((item, i) => (
               <Link key={i} href={item.href} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors active:bg-slate-100">
                  <div className="flex items-center gap-4">
                     <div className="text-slate-400 group-hover:text-[#1D3146]">
                        <item.icon size={22} />
                     </div>
                     <div>
                        <p className="text-sm font-black text-[#1D3146]">{item.label}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{item.sub}</p>
                     </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
               </Link>
            ))}
         </div>
      </section>

      {/* Account Control */}
      <section className="pt-6">
         <button className="w-full p-6 bg-rose-50 text-rose-500 rounded-[2rem] border border-rose-100 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm shadow-rose-100/50">
            <LogOut size={20} />
            Cerrar Sesión
         </button>
         <p className="text-center text-[10px] text-slate-300 font-bold mt-8 uppercase tracking-[0.2em]">Entrega Pilot v1.1.0 • ChocoBites Space</p>
      </section>

    </div>
  );
}
