'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  MessageCircle, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCcw, 
  Save, 
  ChevronRight,
  ShieldCheck,
  Bell,
  Database,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<'connected' | 'not_connected' | 'pending' | 'error'>('connected');
  
  const [businessData, setBusinessData] = useState({
    name: 'ChocoBites Pilot México',
    whatsapp: '+52 1 878 123 4567',
    email: 'contacto@chocobites.mx'
  });

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
        setLoading(true);
        alert("Configuración guardada correctamente");
        setLoading(false);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-12 animate-in fade-in duration-500">
      
      {/* Header Contextual */}
      <div className="flex items-center gap-6">
         <Link href="/dashboard" className="p-4 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-[#1D3146] transition-colors shadow-sm active:scale-95">
            <ArrowLeft size={20} />
         </Link>
         <div>
            <h1 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
               Configuración General
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestión Central ChocoBites</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         
         {/* Main Settings Form */}
         <div className="lg:col-span-8 space-y-8">
            
            {/* Section 1: Business Profile */}
            <section className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-sm space-y-8">
               <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                  <div className="bg-blue-50 p-3 rounded-2xl text-blue-500 shadow-inner">
                     <Building2 size={24} />
                  </div>
                  <h3 className="text-lg font-black text-[#1D3146] tracking-tight uppercase text-xs tracking-[0.2em] opacity-40">Perfil del Negocio</h3>
               </div>
               
               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre Comercial</label>
                     <input 
                        type="text" 
                        value={businessData.name}
                        onChange={(e) => setBusinessData({...businessData, name: e.target.value})}
                        className="w-full h-16 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none focus:ring-4 focus:ring-[#56CCF2]/10 transition-all"
                     />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email Operativo</label>
                        <input 
                           type="email" 
                           value={businessData.email}
                           onChange={(e) => setBusinessData({...businessData, email: e.target.value})}
                           className="w-full h-16 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">País / Moneda</label>
                        <select className="w-full h-16 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none appearance-none">
                           <option>México (MXN)</option>
                           <option>Colombia (COP)</option>
                           <option>USA (USD)</option>
                        </select>
                     </div>
                  </div>
               </div>
            </section>

            {/* Section 2: WhatsApp Connection (KEY PILOT FEATURE) */}
            <section className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-sm space-y-8 relative overflow-hidden">
               <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                  <div className="flex items-center gap-4">
                     <div className="bg-green-50 p-3 rounded-2xl text-green-500 shadow-inner">
                        <MessageCircle size={24} fill="currentColor" className="opacity-20" />
                     </div>
                     <h3 className="text-lg font-black text-[#1D3146] tracking-tight uppercase text-xs tracking-[0.2em] opacity-40">WhatsApp del Negocio</h3>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm flex items-center gap-1.5 ${
                     whatsappStatus === 'connected' ? 'bg-green-100 text-green-600' : 
                     whatsappStatus === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                     {whatsappStatus === 'connected' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                     {whatsappStatus === 'connected' ? 'Conectado' : 
                      whatsappStatus === 'pending' ? 'Pendiente' : 'Error / Desconectado'}
                  </div>
               </div>

               <div className="space-y-6">
                   <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4 text-center md:text-left">
                         <div className="bg-white p-3 rounded-2xl border border-slate-100 text-slate-400 shadow-sm">
                            <MessageCircle size={24} />
                         </div>
                         <div>
                            <p className="text-sm font-black text-[#1D3146]">{businessData.whatsapp}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-widest">Número de salida verificado</p>
                         </div>
                      </div>
                      <button className="px-6 py-3 bg-white border border-slate-200 text-slate-500 font-black rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                         <RefreshCcw size={14} />
                         Reconectar
                      </button>
                   </div>
                   
                   <p className="text-[10px] text-slate-400 font-medium italic text-center px-4 leading-relaxed">
                      El número conectado se utiliza para enviar confirmaciones automáticas de pedidos y pagos a tus clientes de ChocoBites.
                   </p>
               </div>
            </section>

            {/* Bottom Actions */}
            <div className="flex justify-end pt-4">
               <button onClick={handleSave} className="px-10 py-5 bg-[#1D3146] text-[#56CCF2] font-black rounded-[2rem] shadow-xl shadow-[#1D3146]/30 flex items-center justify-center gap-3 active:scale-95 hover:scale-105 transition-all text-sm uppercase tracking-widest">
                  <Save size={20} />
                  Guardar Cambios
               </button>
            </div>
         </div>

         {/* Sidebar / Quick Settings */}
         <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#1D3146] rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
               <div className="relative z-10">
                  <ShieldCheck className="text-[#56CCF2] mb-6" size={32} />
                  <h4 className="text-xl font-black mb-2 tracking-tight">Seguridad ChocoBites</h4>
                  <p className="text-slate-400 text-xs font-bold leading-relaxed mb-8">Administra los permisos de tus repartidores y el acceso a la base de datos operativa.</p>
                  <button className="w-full py-4 bg-white/10 text-white border border-white/20 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all">Configurar Accesos</button>
               </div>
               <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <ShieldCheck size={180} />
               </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 ml-1">Otros Ajustes</h4>
               <nav className="space-y-2">
                  {[
                    { icon: Bell, label: 'Notificaciones', href: '#' },
                    { icon: Database, label: 'Backup de Datos', href: '#' },
                    { icon: RefreshCcw, label: 'Historial de Cambios', href: '#' },
                  ].map((item, i) => (
                    <Link key={i} href={item.href} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all group">
                       <div className="flex items-center gap-3">
                          <item.icon size={16} className="text-slate-400 group-hover:text-[#1D3146]" />
                          <span className="text-xs font-bold text-[#1D3146]">{item.label}</span>
                       </div>
                       <ChevronRight size={14} className="text-slate-200 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  ))}
               </nav>
            </div>
         </div>

      </div>
    </div>
  );
}
