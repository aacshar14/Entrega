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
    // Load Meta SDK for WhatsApp Embedded Signup
    if (!(window as any).FB) {
      const script = document.createElement('script');
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        (window as any).fbAsyncInit = function() {
          (window as any).FB.init({
            appId      : activeTenant?.whatsapp_app_id || '904555555555555', // Should match WHATSAPP_APP_ID
            cookie     : true,
            xfbml      : true,
            version    : 'v19.0'
          });
        };
      };
      document.body.appendChild(script);
    }
  }, [activeTenant]);

  const launchWhatsAppOnboarding = () => {
    if (!(window as any).FB) {
       setError("SDK de Meta no cargado. Reintenta en unos segundos.");
       return;
    }

    (window as any).FB.login((response: any) => {
      if (response.authResponse) {
        const code = response.authResponse.code;
        handleExchangeCode(code);
      } else {
        console.log('User cancelled login or did not fully authorize.');
      }
    }, {
      scope: 'whatsapp_business_management,whatsapp_business_messaging',
      extras: {
        feature: 'whatsapp_embedded_signup'
      }
    });
  };

  const handleExchangeCode = async (code: string) => {
    setLoading(true);
    try {
      await apiRequest('/whatsapp/auth/exchange', 'POST', { code }, activeTenant?.id);
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError("Error en la conexión: " + err.message);
    } finally {
      setLoading(false);
    }
  };

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

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
         
         {/* Business Identitiy */}
         <form onSubmit={handleSave} className="md:col-span-12 bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100 grid md:grid-cols-2 gap-8">
            <h3 className="md:col-span-2 text-xs font-black uppercase tracking-[0.2em] text-[#1D3146] mb-8 flex items-center gap-2">
               <Building2 size={16} /> Identidad del Negocio
            </h3>
            
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
            <div className="md:col-span-2 flex justify-end">
               <button 
                  type="submit" 
                  disabled={loading}
                  className="px-10 py-5 bg-[#1D3146] text-[#56CCF2] font-black rounded-2xl flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all uppercase text-xs tracking-widest disabled:opacity-50"
               >
                  {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                  Guardar Identidad
               </button>
            </div>
         </form>

         {/* WhatsApp Section */}
         <div className="md:col-span-12 bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#1D3146] flex items-center gap-2">
                  <Smartphone size={16} /> WhatsApp Cloud API
               </h3>
               <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                  activeTenant.business_whatsapp_connected ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
               }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${activeTenant.business_whatsapp_connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                  {activeTenant.business_whatsapp_connected ? 'Conectado' : 'No Conectado'}
               </div>
            </div>

            <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
               <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg ${
                     activeTenant.whatsapp_status === 'connected' ? 'bg-emerald-100 text-emerald-600 shadow-emerald-200/50' : 'bg-blue-100 text-blue-600 shadow-blue-200/50'
                  }`}>
                     <MessageCircle size={32} />
                  </div>
                  <div>
                     <h4 className="text-lg font-black text-[#1D3146] tracking-tight">
                        {activeTenant.whatsapp_status === 'connected' ? (activeTenant.whatsapp_account_name || 'Cuenta Oficial') : 'Automatización WhatsApp'}
                     </h4>
                     <p className="text-sm text-slate-400 font-medium max-w-sm mt-1">
                        {activeTenant.whatsapp_status === 'connected' 
                           ? `Número activo: ${activeTenant.whatsapp_display_number || activeTenant.business_whatsapp_number}` 
                           : 'Conecta tu cuenta para enviar notificaciones automáticas de pedidos y pagos.'}
                     </p>
                  </div>
               </div>
               
               <button 
                  type="button"
                  onClick={async () => {
                     if (activeTenant.whatsapp_status === 'connected') {
                        if (confirm('¿Deseas desconectar WhatsApp? Se detendrán todas las automatizaciones.')) {
                           setLoading(true);
                           try {
                              await apiRequest('/whatsapp/auth/disconnect', 'DELETE', {}, activeTenant.id);
                              await refreshUser();
                           } finally {
                              setLoading(false);
                           }
                        }
                        return;
                     }
                     launchWhatsAppOnboarding();
                  }}
                  disabled={loading}
                  className={`px-8 py-4 font-black rounded-2xl text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-3 shadow-xl ${
                     activeTenant.whatsapp_status === 'connected' 
                     ? 'bg-white text-rose-500 border border-rose-100 hover:bg-rose-50' 
                     : 'bg-[#25D366] text-white hover:scale-105 shadow-[#25D366]/20'
                  }`}
               >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : (
                     activeTenant.whatsapp_status === 'connected' ? 'Desconectar Servicio' : 'Conectar con Meta'
                  )}
               </button>
            </div>
         </div>

         {/* Regions */}
         <div className="md:col-span-12 bg-[#1D3146] rounded-[2.5rem] p-8 md:p-10 shadow-2xl text-white grid md:grid-cols-2 gap-8">
            <h3 className="md:col-span-2 text-xs font-black uppercase tracking-[0.2em] text-[#56CCF2]">Preferencias Regionales</h3>
            <div className="space-y-4">
               <label htmlFor="timezone" className="text-[10px] font-black uppercase tracking-widest text-[#56CCF2]/50">Zona Horaria</label>
               <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                  <Globe size={20} className="text-[#56CCF2]" />
                  <select 
                     id="timezone"
                     className="bg-transparent border-none outline-none w-full appearance-none font-bold text-sm"
                     value={formData.timezone}
                     onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                  >
                     <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                     <option value="America/Bogota">Bogotá (GMT-5)</option>
                  </select>
               </div>
            </div>
            <div className="space-y-4">
               <label htmlFor="currency" className="text-[10px] font-black uppercase tracking-widest text-[#56CCF2]/50">Moneda</label>
               <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                  <DollarSign size={20} className="text-[#56CCF2]" />
                  <select 
                     id="currency"
                     className="bg-transparent border-none outline-none w-full appearance-none font-bold text-sm"
                     value={formData.currency}
                     onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  >
                     <option value="MXN">Peso Mexicano (MXN)</option>
                     <option value="USD">Dólar (USD)</option>
                  </select>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
