'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MessageCircle, 
  Save, 
  Settings as SettingsIcon, 
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  DollarSign,
  ArrowLeft
} from 'lucide-react';
import { useTenant } from '@/lib/context/tenant-context';
import { apiRequest } from '@/lib/api';
import Link from 'next/link';

export default function SettingsPage() {
  const { activeTenant, refreshUser } = useTenant();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: activeTenant?.name || '',
    whatsapp: activeTenant?.business_whatsapp_number || '',
    timezone: 'America/Mexico_City',
    currency: 'MXN'
  });

  useEffect(() => {
    if (activeTenant) {
      setFormData({
        name: activeTenant.name,
        whatsapp: activeTenant.business_whatsapp_number || '',
        timezone: 'America/Mexico_City',
        currency: 'MXN'
      });
    }
  }, [activeTenant]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    setLoading(true);
    setSuccess(false);
    setError(null);
    try {
      await apiRequest('/tenants/active', 'PATCH', {
        name: formData.name,
        business_whatsapp_number: formData.whatsapp
      }, activeTenant.id);
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Error al guardar configuración");
    } finally {
      setLoading(false);
    }
  };

  if (!activeTenant) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500">
      
      {/* Header Contextual */}
      <div className="flex items-center gap-6">
         <Link href="/dashboard" className="p-4 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-[#1D3146] transition-colors shadow-sm active:scale-95">
            <ArrowLeft size={20} />
         </Link>
         <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
               <div className="bg-[#1D3146] p-2 rounded-xl text-[#56CCF2]">
                  <SettingsIcon size={24} />
               </div>
               Configuración
            </h2>
            <p className="text-sm text-slate-500 font-medium italic underline decoration-[#56CCF2]/30">Gestión de la plataforma operativa de {activeTenant.name}.</p>
         </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 text-emerald-600 text-xs font-bold animate-in slide-in-from-top-4">
           <CheckCircle2 size={18} />
           ¡Configuración guardada correctamente!
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold animate-in slide-in-from-top-4">
           <AlertCircle size={18} />
           {error}
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-8">
         
         {/* Business Identitiy */}
         <div className="md:col-span-12 bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#1D3146] mb-8 flex items-center gap-2">
               <Building2 size={16} /> Identidad del Negocio
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-3">
                  <label htmlFor="biz_name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre Comercial</label>
                  <input 
                    id="biz_name"
                    type="text" 
                    className="w-full h-16 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    title="Nombre del negocio"
                  />
               </div>
               <div className="space-y-3">
                  <label htmlFor="biz_slug" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Slug (ID Único)</label>
                  <input 
                    id="biz_slug"
                    type="text" 
                    readOnly
                    className="w-full h-16 px-6 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-400 outline-none cursor-not-allowed"
                    value={activeTenant.slug}
                    title="Slug del negocio"
                  />
               </div>
            </div>
         </div>

         {/* WhatsApp Section */}
         <div className="md:col-span-8 bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#1D3146] flex items-center gap-2">
                  <Smartphone size={16} /> WhatsApp del Negocio
               </h3>
               <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                  activeTenant.business_whatsapp_connected ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
               }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${activeTenant.business_whatsapp_connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                  {activeTenant.business_whatsapp_connected ? 'Conectado' : 'No Conectado'}
               </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-4 text-center md:text-left">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                     activeTenant.whatsapp_status === 'connected' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                     <MessageCircle size={24} />
                  </div>
                  <div>
                     <h4 className="text-sm font-black text-[#1D3146] uppercase tracking-tight">
                        {activeTenant.whatsapp_status === 'connected' ? (activeTenant.whatsapp_account_name || 'Cuenta Conectada') : 'No hay cuenta conectada'}
                     </h4>
                     <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                        {activeTenant.whatsapp_status === 'connected' ? (activeTenant.whatsapp_display_number || activeTenant.business_whatsapp_number) : 'Integra tu WhatsApp Business'}
                     </p>
                  </div>
               </div>
               
               <button 
                  type="button"
                  onClick={async () => {
                     if (activeTenant.whatsapp_status === 'connected') {
                        if (confirm('¿Estás seguro de que deseas desconectar tu cuenta de WhatsApp?')) {
                           setLoading(true);
                           await apiRequest('/whatsapp/auth/disconnect', 'DELETE', {}, activeTenant.id);
                           await refreshUser();
                           setLoading(false);
                        }
                        return;
                     }
                     
                     setLoading(true);
                     try {
                        const mockCode = 'meta_auth_code_settings_' + Math.random().toString(36).substring(7);
                        await apiRequest('/whatsapp/auth/exchange', 'POST', { code: mockCode }, activeTenant.id);
                        await refreshUser();
                        setSuccess(true);
                        setTimeout(() => setSuccess(false), 3000);
                     } catch (err: any) {
                        setError("Error: " + err.message);
                     } finally {
                        setLoading(false);
                     }
                  }}
                  disabled={loading}
                  className={`px-6 py-3 font-black rounded-xl text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center gap-2 ${
                     activeTenant.whatsapp_status === 'connected' 
                     ? 'bg-rose-50 text-rose-500 hover:bg-rose-100' 
                     : 'bg-blue-600 text-white shadow-lg hover:bg-blue-700'
                  }`}
               >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : (
                     activeTenant.whatsapp_status === 'connected' ? 'Desconectar' : 'Conectar con Meta'
                  )}
               </button>
            </div>
         </div>

         {/* Regions */}
         <div className="md:col-span-4 bg-[#1D3146] rounded-[2.5rem] p-8 md:p-10 shadow-2xl text-white">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#56CCF2] mb-8">Preferencias Regionales</h3>
            <div className="space-y-6">
               <div className="space-y-2">
                  <label htmlFor="timezone" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Zona Horaria</label>
                  <div className="flex items-center gap-3 text-sm font-bold">
                     <Globe size={18} className="text-[#56CCF2]" />
                     <select 
                       id="timezone"
                       className="bg-transparent border-none outline-none w-full appearance-none"
                       value={formData.timezone}
                       onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                       title="Zona horaria"
                     >
                        <option value="America/Mexico_City">CDMX (GMT-6)</option>
                        <option value="America/Bogota">Bogotá (GMT-5)</option>
                     </select>
                  </div>
               </div>
               <div className="space-y-2">
                  <label htmlFor="currency" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Moneda</label>
                  <div className="flex items-center gap-3 text-sm font-bold">
                     <DollarSign size={18} className="text-[#56CCF2]" />
                     <select 
                       id="currency"
                       className="bg-transparent border-none outline-none w-full appearance-none"
                       value={formData.currency}
                       onChange={(e) => setFormData({...formData, currency: e.target.value})}
                       title="Moneda operativa"
                     >
                        <option value="MXN">Peso Mexicano (MXN)</option>
                        <option value="USD">Dólar (USD)</option>
                     </select>
                  </div>
               </div>
            </div>
         </div>

         <div className="md:col-span-12 flex justify-end gap-6 pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="px-10 py-5 bg-[#1D3146] text-[#56CCF2] font-black rounded-2xl flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all uppercase text-xs tracking-widest disabled:opacity-50"
            >
               {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
               Guardar Cambios
            </button>
         </div>
      </form>
    </div>
  );
}
