'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Package, 
  MessageCircle, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  Upload,
  Zap,
  Loader2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useTenant } from '@/lib/context/tenant-context';
import { apiRequest } from '@/lib/api';
import { useRouter } from 'next/navigation';

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export default function OnboardingPage() {
  const { activeTenant, refreshUser } = useTenant();
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    business_name: activeTenant?.name || '',
    whatsapp: activeTenant?.business_whatsapp_number || '',
  });

  // Auto-advance if already done (except for explicit navigation)
  useEffect(() => {
    if (!activeTenant) return;
    
    // If business has everything, go to graduation
    if (activeTenant.ready && activeTenant.business_whatsapp_connected && step < 5) {
       // Only auto-jump to grade if they just landed here
       // setStep(5);
    }
  }, [activeTenant]);

  const handleUpdateBusinessName = async () => {
    if (!activeTenant) return;
    setLoading(true);
    setError(null);
    try {
      await apiRequest('/tenants/active', 'PATCH', { name: formData.business_name }, activeTenant.id);
      await refreshUser();
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Error al actualizar nombre");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (type: 'customers' | 'products', file: File) => {
    if (!activeTenant) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      
      const preview = await apiRequest(`/${type}/import/preview`, 'POST', fd, activeTenant.id);
      
      if (preview.valid_rows_count > 0) {
        const validRows = preview.rows.filter((r: any) => r.is_valid).map((r: any) => r.data);
        await apiRequest(`/${type}/import/commit`, 'POST', { rows: validRows }, activeTenant.id);
        await refreshUser();
        setStep(type === 'customers' ? 3 : 4);
      } else {
        setError("El archivo CSV no contiene filas válidas.");
      }
    } catch (err: any) {
      setError(err.message || `Error al subir ${type}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWhatsApp = async () => {
    if (!activeTenant) return;
    setLoading(true);
    setError(null);
    try {
      await apiRequest('/tenants/active', 'PATCH', { business_whatsapp_number: formData.whatsapp }, activeTenant.id);
      await refreshUser();
      setStep(5);
    } catch (err: any) {
      setError(err.message || "Error al conectar WhatsApp");
    } finally {
      setLoading(false);
    }
  };

  const prevStep = () => setStep((s) => (s - 1) as OnboardingStep);

  return (activeTenant && (
    <div className="min-h-screen bg-[#EBEEF2] flex flex-col p-6 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="flex flex-col items-center gap-4 py-8">
         <div className="bg-[#1D3146] p-4 rounded-3xl shadow-xl rotate-[-6deg]">
            <Zap className="text-[#56CCF2] w-8 h-8" fill="currentColor" />
         </div>
         <div className="text-center">
            <h1 className="text-2xl font-black text-[#1D3146] tracking-tighter italic">EntréGA Academy</h1>
            <p className="text-xs text-[#56CCF2] font-black uppercase tracking-[0.2em] mt-1">Programa de Activación {activeTenant.name}</p>
         </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-md mx-auto w-full mb-12 flex items-center justify-between px-2 relative">
         <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
         <div 
            className="absolute top-1/2 left-0 h-1 bg-[#56CCF2] -translate-y-1/2 z-0 transition-all duration-700"
            style={{ width: `${((step - 1) / 4) * 100}%` }}
         ></div>
         {[1, 2, 3, 4, 5].map((s) => (
            <div 
               key={s} 
               className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all duration-500 border-4 border-[#EBEEF2] ${
                  step === s ? 'bg-[#1D3146] text-white scale-125' : 
                  step > s ? 'bg-[#56CCF2] text-white' : 'bg-white text-slate-300'
               }`}
            >
               {step > s ? <CheckCircle2 size={16} strokeWidth={3} /> : <span className="text-xs font-black">{s}</span>}
            </div>
         ))}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-md mx-auto w-full mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold animate-in zoom-in-95">
           <AlertCircle size={18} />
           {error}
        </div>
      )}

      {/* Content */}
      <div className="max-w-md mx-auto w-full flex-grow">
         {step === 1 && (
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
               <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center text-blue-500 mb-6">
                  <Building2 size={32} />
               </div>
               <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-[#1D3146] text-[#56CCF2] text-[8px] font-black uppercase rounded-md">Lección 1</span>
                  <h2 className="text-2xl font-black text-[#1D3146] tracking-tight">Fundamentos del Negocio</h2>
               </div>
               <p className="text-sm text-slate-500 mb-8 font-medium italic">Comencemos con el nombre oficial de tu operación.</p>
               
               <div className="space-y-4">
                  <label htmlFor="biz_name" className="text-[10px] font-black uppercase tracking-widest text-[#1D3146] ml-2">Nombre Comercial</label>
                  <input 
                    id="biz_name"
                    type="text" 
                    placeholder="Ej: ChocoBites Pilot México" 
                    className="w-full h-16 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none"
                    value={formData.business_name}
                    onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                    title="Ingresa el nombre de tu negocio"
                  />
               </div>
               
               <button onClick={handleUpdateBusinessName} disabled={!formData.business_name || loading} className="w-full mt-10 py-5 bg-[#1D3146] text-[#56CCF2] font-black rounded-2xl shadow-xl shadow-[#1D3146]/20 flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-30">
                  {loading ? <Loader2 className="animate-spin text-white" /> : "Continuar"}
                  <ArrowRight size={20} />
               </button>
            </div>
         )}

         {step === 2 && (
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
               <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center text-emerald-500 mb-6">
                  <Users size={32} />
               </div>
               <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-[#1D3146] text-[#56CCF2] text-[8px] font-black uppercase rounded-md">Lección 2</span>
                  <h2 className="text-2xl font-black text-[#1D3146] tracking-tight">Maestría en Clientes</h2>
               </div>
               <p className="text-sm text-slate-500 mb-8 font-medium italic underline decoration-[#56CCF2]/30">Domina la carga masiva de tu base de datos operativa.</p>
               
               <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-10 text-center group hover:border-[#56CCF2]/30 transition-all cursor-pointer relative bg-slate-50/50">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept=".csv" 
                    onChange={(e) => e.target.files?.[0] && handleFileUpload('customers', e.target.files[0])}
                    disabled={loading}
                    title="Selecciona archivo CSV de clientes"
                  />
                  {loading ? <Loader2 className="animate-spin text-[#56CCF2] mx-auto" size={40} /> : <Upload className="text-slate-400 group-hover:text-[#56CCF2] mx-auto mb-4" size={40} />}
                  <p className="font-black text-xs text-[#1D3146] uppercase tracking-widest">Subir Clientes CSV</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-2">Formato: name, phone, email</p>
               </div>

               <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#1D3146] mb-3 flex items-center gap-2">
                     <Zap size={14} className="text-[#56CCF2]" />
                     Instrucciones CSV
                  </h4>
                  <ul className="space-y-2 text-[11px] text-slate-500 font-medium">
                     <li className="flex gap-2">
                        <span className="text-[#1D3146] font-black">1.</span>
                        Encabezados: <code className="bg-slate-200 px-1 rounded">name,phone,email</code>
                     </li>
                     <li className="flex gap-2">
                        <span className="text-[#1D3146] font-black">2.</span>
                        Código de país obligatorio (Ej: +52).
                     </li>
                  </ul>
               </div>
               
               <div className="flex gap-4 mt-8">
                  <button onClick={prevStep} className="py-5 px-6 text-slate-400 font-black rounded-2xl active:scale-95 transition-all" title="Regresar">
                     <ArrowLeft size={20} />
                  </button>
                  <button onClick={() => setStep(3)} className="flex-grow py-5 bg-slate-100 text-[#1D3146] font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-widest">
                     Saltar por ahora
                     <ArrowRight size={20} />
                  </button>
               </div>
            </div>
         )}

         {step === 3 && (
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
               <div className="bg-orange-50 w-16 h-16 rounded-2xl flex items-center justify-center text-orange-500 mb-6">
                  <Package size={32} />
               </div>
               <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-[#1D3146] text-[#56CCF2] text-[8px] font-black uppercase rounded-md">Lección 3</span>
                  <h2 className="text-2xl font-black text-[#1D3146] tracking-tight">Control de Inventario</h2>
               </div>
               <p className="text-sm text-slate-500 mb-8 font-medium italic underline decoration-orange-200">Sincroniza tus existencias actuales.</p>
               
               <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-10 text-center group hover:border-orange-200 transition-all cursor-pointer relative bg-slate-50/50">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept=".csv" 
                    onChange={(e) => e.target.files?.[0] && handleFileUpload('products', e.target.files[0])}
                    disabled={loading}
                    title="Selecciona archivo CSV de stock"
                  />
                  {loading ? <Loader2 className="animate-spin text-orange-400 mx-auto" size={40} /> : <Upload className="text-slate-400 group-hover:text-orange-400 mx-auto mb-4" size={40} />}
                  <p className="font-black text-xs text-[#1D3146] uppercase tracking-widest">Subir Stock CSV</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-2">Formato: sku, name, quantity, price</p>
               </div>

               <div className="mt-8 p-6 bg-orange-50/30 rounded-2xl border border-orange-100">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-700 mb-3 flex items-center gap-2">
                     <Package size={14} />
                     Preparación de Catálogo
                  </h4>
                  <ul className="space-y-2 text-[11px] text-orange-900/60 font-medium">
                     <li className="flex gap-2">
                        <span className="font-black">1.</span>
                        Encabezados: <code className="bg-white/50 px-1 rounded">sku,name,quantity,price</code>
                     </li>
                  </ul>
               </div>
               
               <div className="flex gap-4 mt-8">
                  <button onClick={prevStep} className="py-5 px-6 text-slate-400 font-black rounded-2xl active:scale-95 transition-all" title="Regresar">
                     <ArrowLeft size={20} />
                  </button>
                  <button onClick={() => setStep(4)} className="flex-grow py-5 bg-slate-100 text-[#1D3146] font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-widest">
                     Saltar
                     <ArrowRight size={20} />
                  </button>
               </div>
            </div>
         )}

         {step === 4 && (
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
               <div className="bg-green-50 w-16 h-16 rounded-2xl flex items-center justify-center text-green-500 mb-6">
                  <MessageCircle size={32} fill="currentColor" className="opacity-20" />
               </div>
               <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-[#1D3146] text-[#56CCF2] text-[8px] font-black uppercase rounded-md">Lección 4</span>
                  <h2 className="text-2xl font-black text-[#1D3146] tracking-tight">Canales de Comunicación</h2>
               </div>
               <p className="text-sm text-slate-500 mb-8 font-medium italic">Habilita avisos automáticos a tus clientes.</p>
               
               <div className="space-y-4">
                  <label htmlFor="wa_num" className="text-[10px] font-black uppercase tracking-widest text-[#1D3146] ml-2">WhatsApp del Negocio</label>
                  <div className="relative">
                     <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                        <MessageCircle size={20} />
                     </div>
                     <input 
                       id="wa_num"
                       type="tel" 
                       placeholder="+52 1 878 123 4567" 
                       className="w-full h-16 pl-14 pr-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none"
                       value={formData.whatsapp}
                       onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                       title="Ingresa el número de WhatsApp oficial"
                     />
                  </div>
               </div>
               
               <div className="flex gap-4 mt-10">
                  <button onClick={prevStep} className="py-5 px-6 text-slate-400 font-black rounded-2xl active:scale-95 transition-all" title="Regresar">
                     <ArrowLeft size={20} />
                  </button>
                  <button onClick={handleConnectWhatsApp} disabled={!formData.whatsapp || loading} className="flex-grow py-5 bg-[#1D3146] text-[#56CCF2] font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-30">
                     {loading ? <Loader2 className="animate-spin text-white" /> : "Conectar y Finalizar"}
                     <ArrowRight size={20} />
                  </button>
               </div>
            </div>
         )}

         {step === 5 && (
            <div className="bg-[#1D3146] rounded-[2.5rem] p-10 md:p-12 text-center shadow-2xl relative overflow-hidden group animate-in zoom-in-95 duration-500">
               <div className="relative z-10 flex flex-col items-center">
                  <div className="bg-[#56CCF2] w-24 h-24 rounded-full flex items-center justify-center text-[#1D3146] mb-8 shadow-2xl shadow-[#56CCF2]/30 animate-bounce">
                     <CheckCircle2 size={48} strokeWidth={3} />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-2 tracking-tight">¡Graduado!</h2>
                  <p className="text-[#56CCF2] text-sm font-black uppercase tracking-[0.2em] mb-10">Has completado la EntréGA Academy</p>
                  
                  <div className="w-full space-y-3 mb-12">
                     <div className={`flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 ${activeTenant.clients_imported ? 'opacity-100' : 'opacity-40'}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#56CCF2]">Base de Clientes</span>
                        <CheckCircle2 size={16} className={activeTenant.clients_imported ? 'text-[#56CCF2]' : 'text-white/20'} />
                     </div>
                     <div className={`flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 ${activeTenant.stock_imported ? 'opacity-100' : 'opacity-40'}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#56CCF2]">Gestión de Stock</span>
                        <CheckCircle2 size={16} className={activeTenant.stock_imported ? 'text-[#56CCF2]' : 'text-white/20'} />
                     </div>
                     <div className={`flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 ${activeTenant.business_whatsapp_connected ? 'opacity-100' : 'opacity-40'}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#56CCF2]">WhatsApp Operativo</span>
                        <CheckCircle2 size={16} className={activeTenant.business_whatsapp_connected ? 'text-[#56CCF2]' : 'text-white/20'} />
                     </div>
                  </div>

                  <Link href="/dashboard" className="w-full py-6 bg-[#56CCF2] text-[#1D3146] font-black rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-[#56CCF2]/20 hover:scale-105 transition-all text-sm uppercase tracking-[0.2em]">
                     Activar {activeTenant.name}
                     <Zap size={20} fill="currentColor" />
                  </Link>
               </div>
               <div className="absolute top-0 right-0 w-64 h-64 bg-[#56CCF2] opacity-[0.03] rounded-full translate-x-1/2 -translate-y-1/2"></div>
            </div>
         )}
      </div>

      {/* Footer */}
      <div className="py-8 text-center">
         <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.2em]">EntréGA Onboarding Academy © 2026</p>
      </div>

    </div>
  )) || null;
}
