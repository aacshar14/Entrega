'use client';

import React, { useState, useEffect } from 'react';

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}
import { 
  ArrowLeft, 
  MessageCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Power,
  RefreshCw,
  Info,
  ExternalLink,
  Smartphone,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { useTenant } from '@/lib/context/tenant-context';

interface WhatsAppStatus {
  status: 'not_connected' | 'connected' | 'token_expired' | 'reconnect_required' | 'disconnected' | 'pending';
  business_name?: string;
  phone_number_id?: string;
  connected_at?: string;
  last_validated?: string;
  disconnected_at?: string;
}

export default function WhatsAppConfigPage() {
  const { activeTenant } = useTenant();
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/whatsapp/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Load Meta SDK
    if (!window.FB) {
      const script = document.createElement('script');
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.FB.init({
          appId: '', // Will be fetched from backend
          cookie: true,
          xfbml: true,
          version: 'v21.0'
        });
      };
      document.body.appendChild(script);
    }
  }, []);

  const handleLaunchOnboarding = async () => {
    setProcessing(true);
    try {
      // 1. Get secure nonce and AppID from backend
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/whatsapp/onboarding-url`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const { nonce, app_id } = await res.json();

      // 2. Launch Meta Embedded Signup
      window.FB.login((response: any) => {
        if (response.authResponse) {
          const code = response.authResponse.code;
          completeOnboarding(code, nonce);
        } else {
          setProcessing(false);
        }
      }, {
        config_id: '', // Meta Configuration ID if any, or use default flow
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup_nonce: nonce
        }
      });
    } catch (err) {
      setProcessing(false);
    }
  };

  const completeOnboarding = async (code: string, state: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/whatsapp/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ code, state })
      });
      if (res.ok) {
        await fetchStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('¿Seguro que deseas suspender la integración de WhatsApp?')) return;
    setProcessing(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/whatsapp/disconnect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      await fetchStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !activeTenant) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="animate-spin text-[#56CCF2]" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-6">
         <Link href="/settings/integrations" className="p-4 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-[#1D3146] transition-colors shadow-sm active:scale-95">
            <ArrowLeft size={20} />
         </Link>
         <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
               <div className="bg-[#25D366] p-2 rounded-xl text-white">
                  <MessageCircle size={24} />
               </div>
               WhatsApp Business
            </h2>
            <p className="text-sm text-slate-500 font-medium italic">Automatización nativa de pedidos vía Cloud API.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Main Status Card */}
        <div className={`rounded-[3rem] p-10 border transition-all ${
          status?.status === 'connected' ? 'bg-emerald-50/50 border-emerald-100' : 
          status?.status === 'token_expired' || status?.status === 'reconnect_required' ? 'bg-amber-50/50 border-amber-100' :
          'bg-white border-slate-100'
        }`}>
          <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
            
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-3">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  status?.status === 'connected' ? 'bg-emerald-500 text-white animate-pulse' :
                  status?.status === 'token_expired' || status?.status === 'reconnect_required' ? 'bg-amber-500 text-white' :
                  'bg-slate-200 text-slate-500'
                }`}>
                  {status?.status === 'connected' ? '🟢 Conectado' : 
                   status?.status === 'token_expired' ? '🟠 Token Expirado' :
                   status?.status === 'disconnected' ? '🔴 Suspendido' :
                   '⚪ No Configurado'}
                </span>
                {status?.last_validated && (
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">
                    Validado: {new Date(status.last_validated).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-4xl font-black text-[#1D3146] leading-tight">
                  {status?.status === 'connected' ? 'Tu negocio ya está en piloto automático' : 
                   status?.status === 'token_expired' ? 'Se requiere acción inmediata' :
                   'Conecta tu cuenta oficial de Meta'}
                </h3>
                <p className="text-slate-500 font-medium leading-relaxed max-w-lg">
                  {status?.status === 'connected' ? 
                    `EntréGA está procesando mensajes automáticamente para ${status.business_name || 'tu negocio'}. No necesitas hacer nada más.` :
                    'Vincula tu WhatsApp Business Account (WABA) para que EntréGA pueda leer pedidos y actualizar tu stock en tiempo real.'}
                </p>
              </div>

              {status?.status === 'connected' ? (
                <div className="flex flex-wrap gap-4 pt-4">
                  <button 
                    onClick={handleDisconnect}
                    disabled={processing}
                    className="flex items-center gap-3 px-8 py-4 bg-white border border-rose-100 text-rose-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-50 transition-all shadow-sm active:scale-95"
                  >
                    <Power size={16} />
                    Desconectar cuenta
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-4 pt-4">
                  <button 
                    onClick={handleLaunchOnboarding}
                    disabled={processing}
                    className="flex items-center gap-3 px-10 py-5 bg-[#1D3146] text-[#56CCF2] rounded-3xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] hover:shadow-xl hover:shadow-[#1D3146]/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {processing ? <RefreshCw className="animate-spin" size={20} /> : <MessageCircle size={20} />}
                    {status?.status === 'token_expired' ? 'Re-validar Conexión' : 'Vincular WhatsApp'}
                  </button>
                </div>
              )}
            </div>

            <div className="w-full md:w-72 space-y-4">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-[#1D3146]">
                  <Smartphone size={18} className="text-[#56CCF2]" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Metadata Técnica</span>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Phone ID</p>
                    <p className="text-xs font-mono font-bold text-[#1D3146] truncate">{status?.phone_number_id || '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Proveedor</p>
                    <p className="text-xs font-bold text-[#1D3146]">Meta Cloud API v21.0</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-[#1D3146]/5 rounded-3xl space-y-3">
                <div className="flex items-center gap-2 text-amber-600">
                  <Info size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Importante</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 leading-snug">
                  Asegúrate de tener un método de pago válido en tu Meta Business Center para evitar interrupciones.
                </p>
                <a href="https://business.facebook.com/" target="_blank" className="flex items-center gap-2 text-[#56CCF2] text-[9px] font-black uppercase tracking-widest hover:underline">
                  Meta Business Suite <ExternalLink size={10} />
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* Requirements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
              <div className="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center text-blue-500 shadow-sm">
                <ShieldCheck size={28} />
              </div>
              <h4 className="text-xl font-black text-[#1D3146]">Privacidad de Datos</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Tus conversaciones solo son procesadas por nuestra IA para extraer pedidos. Nunca guardamos el historial completo ni usamos tus datos para otros fines.
              </p>
           </div>
           
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
              <div className="bg-emerald-50 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                <CheckCircle2 size={28} />
              </div>
              <h4 className="text-xl font-black text-[#1D3146]">Certificación Tech</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Somos Tech Providers oficiales. La conexión se realiza directamente mediante el <b>Embedded Signup</b> oficial de Meta, garantizando máxima seguridad.
              </p>
           </div>
        </div>

      </div>
    </div>
  );
}
