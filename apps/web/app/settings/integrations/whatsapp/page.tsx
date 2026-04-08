'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useTenant } from '@/lib/context/tenant-context';
import { apiRequest } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function WhatsAppIntegrationPage() {
  const router = useRouter();
  const { activeTenant, refreshUser } = useTenant();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [metaAppId, setMetaAppId] = useState<string | null>(null);

  // 1. Fetch current status
  const fetchStatus = async () => {
    if (!activeTenant) return;
    try {
      const data = await apiRequest('/integrations/whatsapp/status', 'GET', null, activeTenant.id);
      setStatus(data);
    } catch (err) {
      console.error("Error fetching WhatsApp status:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [activeTenant]);

  // 2. Load Meta SDK
  useEffect(() => {
    apiRequest('/config/public', 'GET')
      .then(res => {
        if (res.whatsapp_app_id) {
          setMetaAppId(res.whatsapp_app_id);
          initMetaSDK(res.whatsapp_app_id);
        }
      })
      .catch(err => {
        console.error("Could not fetch public config", err);
      });
  }, []);

  const initMetaSDK = (appId: string) => {
    if (!(window as any).FB) {
      const script = document.createElement('script');
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        (window as any).fbAsyncInit = function() {
          (window as any).FB.init({
            appId: appId,
            cookie: true,
            xfbml: true,
            version: 'v19.0'
          });
        };
      };
      document.body.appendChild(script);
    }
  };

  const handleConnect = () => {
    if (!(window as any).FB) {
      setError("Meta SDK not loaded yet. Please wait a moment.");
      return;
    }

    (window as any).FB.login((response: any) => {
      if (response.authResponse) {
        const code = response.authResponse.code;
        // The Meta Embedded Signup flow might return more info in the response or via the SDK callback
        // For simplicity and matching the existing pattern, we exchange the code.
        completeIntegration(code);
      } else {
        setError("Onboarding cancelled or failed.");
      }
    }, {
      scope: 'whatsapp_business_management,whatsapp_business_messaging',
      extras: {
        feature: 'whatsapp_embedded_signup',
        session_info: { version: 2 },
        setup_mode: 'direct_enumeration'
      }
    });
  };

  const completeIntegration = async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      // We pass the code to the new backend endpoint
      await apiRequest('/integrations/whatsapp/complete', 'POST', { code }, activeTenant?.id);
      await refreshUser();
      await fetchStatus();
    } catch (err: any) {
      setError("Connection error: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  if (!activeTenant) return null;

  const isConnected = status?.status === 'connected';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center gap-6">
         <Link href="/settings" className="p-4 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-[#1D3146] transition-colors shadow-sm active:scale-95">
            <ArrowLeft size={20} />
         </Link>
         <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#56CCF2]">
              Configuración / Integraciones
            </div>
            <h2 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
               WhatsApp Business API
            </h2>
         </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] flex items-center gap-4 text-rose-600 font-bold animate-in slide-in-from-top-4">
           <AlertCircle size={24} />
           <div className="text-sm">{error}</div>
        </div>
      )}

      {/* Main Status Card */}
      <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        
        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl ${
              isConnected ? 'bg-[#25D366] text-white shadow-[#25D366]/30' : 'bg-slate-100 text-slate-400 shadow-slate-200/50'
            }`}>
              <MessageCircle size={40} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-[#1D3146]">
                {isConnected ? status.business_name || 'Conectado con Meta' : 'Conecta tu WhatsApp'}
              </h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                {isConnected 
                  ? `Gestiona tus pedidos y clientes directamente desde tu número oficial de WhatsApp.` 
                  : 'Digitaliza tu operación de campo integrando el canal de comunicación más potente del mundo.'}
              </p>
            </div>

            {isConnected && (
              <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 opacity-70">Phone Number ID</p>
                  <p className="text-xs font-black text-emerald-900">{status.phone_number_id}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {!isConnected ? (
              <button 
                onClick={handleConnect}
                disabled={loading || !metaAppId}
                className="group h-20 px-10 bg-[#25D366] text-white rounded-3xl flex items-center justify-center gap-4 font-black uppercase text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[#25D366]/30 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <MessageCircle size={24} />}
                Conectar WhatsApp
              </button>
            ) : (
              <>
                <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</span>
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase">
                      <CheckCircle2 size={12} /> Activo
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Proveedor</span>
                    <span className="text-[10px] font-black uppercase text-[#1D3146]">Meta Cloud API</span>
                  </div>
                </div>
                
                <button 
                  onClick={handleConnect}
                  className="h-16 px-8 bg-white text-[#1D3146] border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all"
                >
                  <RefreshCw size={16} /> Re-sincronizar
                </button>
              </>
            )}

            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mt-4">
              <ShieldCheck size={12} className="inline mr-1" /> Conexión auditada y encriptada (AES-256)
            </p>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-[#1D3146] text-white p-10 rounded-[3rem] space-y-6">
          <h4 className="text-lg font-black text-[#56CCF2] tracking-tight flex items-center gap-3">
            <Smartphone size={20} /> Multi-Tenant Ready
          </h4>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            A diferencia de otras plataformas, EntréGA permite que **{activeTenant.name}** mantenga el control total de su propio activo en Meta. 
            No usamos números compartidos; tu marca es la que habla con tus clientes.
          </p>
          <ul className="space-y-3">
            {[
              'Propiedad total de tus activos Meta',
              'Historial de mensajes privado por tenant',
              'Soporte nativo para WhatsApp Embedded Signup'
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-300">
                <CheckCircle2 size={14} className="text-[#56CCF2]" /> {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 space-y-6">
          <h4 className="text-lg font-black text-[#1D3146] tracking-tight flex items-center gap-3">
            <ExternalLink size={20} className="text-[#56CCF2]" /> Requisitos Previos
          </h4>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Para una integración exitosa, asegúrate de tener:
          </p>
          <div className="space-y-4">
            <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#1D3146] shadow-sm">1</div>
              <p className="text-xs font-bold text-slate-600">Cuenta de Meta Business Suite verificada (recomendado).</p>
            </div>
            <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#1D3146] shadow-sm">2</div>
              <p className="text-xs font-bold text-slate-600">Un número de teléfono libre (que no tenga WhatsApp activo).</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
