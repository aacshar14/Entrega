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
import Logo from '@/components/logo';

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export default function OnboardingPage() {
   const { activeTenant, refreshUser } = useTenant();
   const router = useRouter();
   const [step, setStep] = useState<OnboardingStep>(1);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [metaAppId, setMetaAppId] = useState<string | null>(null);
   const [formData, setFormData] = useState({
      business_name: activeTenant?.name || '',
      person_name: '',
      whatsapp: activeTenant?.business_whatsapp_number || '',
   });

   // Load User Name
   useEffect(() => {
      apiRequest('/users/me', 'GET')
         .then(res => {
            if (res.user?.full_name) {
               setFormData(prev => ({ ...prev, person_name: res.user.full_name }));
            }
         })
         .catch(err => console.error("Could not fetch user", err));
   }, []);

   // Load Public Config from Backend
   useEffect(() => {
      apiRequest('/config/public', 'GET')
         .then(res => {
            if (res.whatsapp_app_id) {
               setMetaAppId(res.whatsapp_app_id);
            }
         })
         .catch(err => console.error("Could not fetch public config", err));
   }, []);

   // Load FB SDK
   useEffect(() => {
      if (!metaAppId) return;

      // @ts-ignore
      window.fbAsyncInit = function () {
         // @ts-ignore
         FB.init({
            appId: metaAppId,
            autoLogAppEvents: true,
            xfbml: true,
            version: 'v22.0'
         });
      };

      (function (d: any, s: string, id: string) {
         var js: any, fjs: any = d.getElementsByTagName(s)[0];
         if (d.getElementById(id)) { return; }
         js = d.createElement(s); js.id = id;
         js.src = "https://connect.facebook.net/en_US/sdk.js";
         fjs.parentNode.insertBefore(js, fjs);
      }(document, 'script', 'facebook-jssdk'));
   }, [metaAppId]);

   // Auto-advance if already done (except for explicit navigation)
   useEffect(() => {
      if (!activeTenant) return;

      // If business has everything, go to graduation
      if (activeTenant.ready && activeTenant.business_whatsapp_connected && step < 5) {
         // Only auto-jump to grade if they just landed here
         // setStep(5);
      }
   }, [activeTenant]);

   const handleCreateBusiness = async () => {
      setLoading(true);
      setError(null);
      try {
         // 1. Update User Profile first
         if (formData.person_name) {
            await apiRequest('/users/me', 'PATCH', { full_name: formData.person_name });
         }

         // 2. Clear and safe slug generator
         let slug = formData.business_name
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');

         if (!slug) slug = `biz-${Math.random().toString(36).substring(2, 7)}`;

         await apiRequest('/tenants/', 'POST', { name: formData.business_name, slug });
         await refreshUser();
         setStep(2);
      } catch (err: any) {
         if (err.message?.includes("exists")) {
            setError("Ese nombre ya está en uso. Prueba agregando tu ciudad.");
         } else {
            setError(err.message || "Error al crear negocio");
         }
      } finally {
         setLoading(false);
      }
   };

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

         // Harden rows access
         const rows = Array.isArray(preview?.rows) ? preview.rows : [];

         if (preview?.valid_rows_count > 0 && rows.length > 0) {
            const validRows = rows.filter((r: any) => r.is_valid).map((r: any) => r.data);
            await apiRequest(`/${type}/import/commit`, 'POST', { rows: validRows }, activeTenant.id);
            await refreshUser();
            setStep(type === 'customers' ? 3 : 4);
         } else {
            setError(`El archivo CSV no contiene filas válidas o el formato es incorrecto.`);
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

   const isCreationMode = !activeTenant;
   const currentBusinessName = activeTenant?.name || "Nuevo Negocio";

   return (
      <div className="min-h-screen bg-[#EBEEF2] flex flex-col p-4 md:p-6 animate-in fade-in duration-700 overflow-x-hidden">

         {/* Header */}
         <div className="flex flex-col items-center gap-4 py-8">
            <div className="bg-[#1D3146] p-4 rounded-3xl shadow-xl rotate-[-6deg] hover:rotate-0 transition-transform duration-500">
               <Logo variant="master" className="w-10 h-10" />
            </div>
            <div className="text-center">
               <h1 className="text-2xl font-black text-[#1D3146] tracking-tighter italic">Entrega Academy</h1>
               <p className="text-xs text-[#56CCF2] font-black uppercase tracking-[0.2em] mt-1">Programa de Activación {currentBusinessName}</p>
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
                  className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all duration-500 border-4 border-[#EBEEF2] ${step === s ? 'bg-[#1D3146] text-white scale-125' :
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
               <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-500 w-full max-w-full">
                  <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center text-blue-500 mb-6">
                     <Building2 size={32} />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                     <span className="px-2 py-1 bg-[#1D3146] text-[#56CCF2] text-[8px] font-black uppercase rounded-md">Lección 1</span>
                     <h2 className="text-2xl font-black text-[#1D3146] tracking-tight">Fundamentos del Negocio</h2>
                  </div>
                  <p className="text-sm text-slate-500 mb-8 font-medium italic">Comencemos con el nombre oficial de tu operación.</p>

                  <div className="space-y-4">
                     <div className="space-y-2">
                        <label htmlFor="user_name" className="text-[10px] font-black uppercase tracking-widest text-[#1D3146] ml-2">Tu Nombre (Responsable)</label>
                        <input
                           id="user_name"
                           type="text"
                           placeholder="Ej: Leonardo Gonzalez"
                           className="w-full h-16 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none"
                           value={formData.person_name}
                           onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                           title="Ingresa tu nombre personal"
                        />
                     </div>

                     <div className="space-y-2">
                        <label htmlFor="biz_name" className="text-[10px] font-black uppercase tracking-widest text-[#1D3146] ml-2">Nombre del Negocio</label>
                        <input
                           id="biz_name"
                           type="text"
                           placeholder="Ej: Distribuidora Los Santos"
                           className="w-full h-16 px-6 bg-[#EBEEF2] border-none rounded-2xl text-sm font-bold text-[#1D3146] outline-none"
                           value={formData.business_name}
                           onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                           title="Ingresa el nombre de tu negocio"
                        />
                     </div>
                  </div>

                  <button
                     onClick={isCreationMode ? handleCreateBusiness : handleUpdateBusinessName}
                     disabled={!formData.business_name || !formData.person_name || loading}
                     className="w-full mt-10 py-5 bg-[#1D3146] text-[#56CCF2] font-black rounded-2xl shadow-xl shadow-[#1D3146]/20 flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-30"
                  >
                     {loading ? <Loader2 className="animate-spin text-white" /> : (isCreationMode ? "Crear Negocio" : "Continuar")}
                     <ArrowRight size={20} />
                  </button>
               </div>
            )}

            {step === 2 && (
               <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-500 w-full max-w-full">
                  <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center text-emerald-500 mb-6">
                     <Users size={32} />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                     <span className="px-2 py-1 bg-[#1D3146] text-[#56CCF2] text-[8px] font-black uppercase rounded-md">Lección 2</span>
                     <h2 className="text-2xl font-black text-[#1D3146] tracking-tight">Maestría en Clientes</h2>
                  </div>
                  <p className="text-sm text-slate-500 mb-8 font-medium italic underline decoration-[#56CCF2]/30">Domina la carga masiva de tu base de datos operativa.</p>

                  <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-6 md:p-10 text-center group hover:border-[#56CCF2]/30 transition-all cursor-pointer relative bg-slate-50/50">
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

                  <div className="mt-8 p-4 md:p-6 bg-slate-50 rounded-2xl border border-slate-100">
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
               <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-500 w-full max-w-full">
                  <div className="bg-orange-50 w-16 h-16 rounded-2xl flex items-center justify-center text-orange-500 mb-6">
                     <Package size={32} />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                     <span className="px-2 py-1 bg-[#1D3146] text-[#56CCF2] text-[8px] font-black uppercase rounded-md">Lección 3</span>
                     <h2 className="text-2xl font-black text-[#1D3146] tracking-tight">Control de Inventario</h2>
                  </div>
                  <p className="text-sm text-slate-500 mb-8 font-medium italic underline decoration-orange-200">Sincroniza tus existencias actuales.</p>

                  <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-6 md:p-10 text-center group hover:border-orange-200 transition-all cursor-pointer relative bg-slate-50/50">
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

                  <div className="mt-8 p-4 md:p-6 bg-orange-50/30 rounded-2xl border border-orange-100">
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
               <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-500 w-full max-w-full">
                  <div className="bg-green-50 w-16 h-16 rounded-2xl flex items-center justify-center text-green-500 mb-6">
                     <MessageCircle size={32} fill="currentColor" className="opacity-20" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                     <span className="px-2 py-1 bg-[#1D3146] text-[#56CCF2] text-[8px] font-black uppercase rounded-md">Lección 4</span>
                     <h2 className="text-2xl font-black text-[#1D3146] tracking-tight">Canales de Comunicación</h2>
                  </div>
                  <p className="text-sm text-slate-500 mb-4 font-medium italic">Habilita avisos automáticos a tus clientes.</p>
                  <p className="text-[10px] text-[#56CCF2] font-semibold mb-8 underline decoration-[#56CCF2]/20">Al conectar Meta, aceptas nuestra <Link href="/privacy">Política de Privacidad</Link>.</p>

                  <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 text-center">
                     {activeTenant?.whatsapp_status === 'connected' ? (
                        <div className="animate-in zoom-in-95 duration-500">
                           <div className="w-16 h-16 bg-[#56CCF2]/20 text-[#56CCF2] rounded-full flex items-center justify-center mx-auto mb-4">
                              <CheckCircle2 size={32} />
                           </div>
                           <h3 className="text-sm font-black text-[#1D3146] uppercase tracking-tight">¡WhatsApp Conectado!</h3>
                           <p className="text-[10px] text-slate-400 font-bold mt-1">{activeTenant?.whatsapp_account_name || activeTenant?.name}</p>
                           <p className="text-xs font-black text-[#1D3146] mt-2 underline decoration-[#56CCF2]">{activeTenant?.whatsapp_display_number || formData.whatsapp}</p>

                           <button
                              onClick={() => {
                                 setFormData({ ...formData, whatsapp: '' });
                                 if (activeTenant) apiRequest('/whatsapp/auth/disconnect', 'DELETE', {}, activeTenant.id).then(() => refreshUser());
                              }}
                              className="mt-4 text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-600 transition-colors"
                           >
                              Desconectar Cuenta
                           </button>
                        </div>
                     ) : (
                        <div className="py-4">
                           <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                              <MessageCircle size={32} />
                           </div>
                           <p className="text-[11px] text-slate-500 font-medium mb-6 px-4">
                              Conecta tu cuenta de <strong>WhatsApp Business</strong> para habilitar avisos automáticos.
                           </p>

                           <button
                              onClick={async () => {
                                 if (!metaAppId) {
                                    setError("Meta App ID no configurado en el servidor.");
                                    return;
                                 }
                                 setLoading(true);
                                 try {
                                    // @ts-ignore
                                    FB.login((response: any) => {
                                       if (response.authResponse) {
                                          const { code } = response.authResponse;
                                          apiRequest('/whatsapp/auth/exchange', 'POST', { code }, activeTenant?.id)
                                             .then(() => refreshUser())
                                             .catch((e: any) => setError("Error en intercambio: " + e.message))
                                             .finally(() => setLoading(false));
                                       } else {
                                          setError("El usuario canceló el registro o no se autorizó la aplicación.");
                                          setLoading(false);
                                       }
                                    }, {
                                       scope: 'whatsapp_business_management,whatsapp_business_messaging',
                                       extras: {
                                          feature: 'whatsapp_embedded_signup',
                                          session_info: { version: 2 },
                                          setup_mode: 'direct_enumeration'
                                       }
                                    });
                                 } catch (err: any) {
                                    setError("Error al conectar con Meta: " + err.message);
                                    setLoading(false);
                                 }
                              }}
                              disabled={loading || !metaAppId}
                              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                           >
                              {loading ? <Loader2 className="animate-spin" /> : (
                                 <>
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                                       <path d="M12.001 2.002c-5.522 0-9.999 4.477-9.999 9.999 0 4.909 3.541 8.987 8.188 9.854V14.89h-2.54v-2.889h2.54V9.798c0-2.507 1.493-3.891 3.776-3.891 1.094 0 2.238.195 2.238.195v2.459h-1.26c-1.242 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.966c4.647-.867 8.188-4.945 8.188-9.854 0-5.522-4.477-9.999-9.999-9.999z" />
                                    </svg>
                                    Conectar con Meta
                                 </>
                              )}
                           </button>
                           <p className="text-[9px] text-slate-400 font-bold mt-4 tracking-tighter uppercase">Integración Oficial de WhatsApp Business Cloud API {metaAppId ? `(${metaAppId})` : ''}</p>
                        </div>
                     )}
                  </div>

                  <div className="flex gap-4 mt-8">
                     <button onClick={prevStep} className="py-5 px-6 text-slate-400 font-black rounded-2xl active:scale-95 transition-all" title="Regresar">
                        <ArrowLeft size={20} />
                     </button>
                     <button
                        onClick={() => setStep(5)}
                        disabled={activeTenant?.whatsapp_status !== 'connected'}
                        className="flex-grow py-5 bg-[#1D3146] text-[#56CCF2] font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-30"
                     >
                        Finalizar Configuración
                        <ArrowRight size={20} />
                     </button>
                  </div>
               </div>
            )}

            {step === 5 && (
               <div className="bg-[#1D3146] rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-12 text-center shadow-2xl relative overflow-hidden group animate-in zoom-in-95 duration-500 w-full max-w-full">
                  <div className="relative z-10 flex flex-col items-center">
                     <div className="bg-[#56CCF2] w-24 h-24 rounded-full flex items-center justify-center text-[#1D3146] mb-8 shadow-2xl shadow-[#56CCF2]/30 animate-bounce">
                        <CheckCircle2 size={48} strokeWidth={3} />
                     </div>
                     <h2 className="text-3xl font-black text-white mb-2 tracking-tight">¡Graduado!</h2>
                     <p className="text-[#56CCF2] text-sm font-black uppercase tracking-[0.2em] mb-10">Has completado la Entrega Academy</p>

                     <div className="w-full space-y-3 mb-12">
                        <div className={`flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 ${activeTenant?.clients_imported ? 'opacity-100' : 'opacity-40'}`}>
                           <span className="text-[10px] font-black uppercase tracking-widest text-[#56CCF2]">Base de Clientes</span>
                           <CheckCircle2 size={16} className={activeTenant?.clients_imported ? 'text-[#56CCF2]' : 'text-white/20'} />
                        </div>
                        <div className={`flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 ${activeTenant?.stock_imported ? 'opacity-100' : 'opacity-40'}`}>
                           <span className="text-[10px] font-black uppercase tracking-widest text-[#56CCF2]">Gestión de Stock</span>
                           <CheckCircle2 size={16} className={activeTenant?.stock_imported ? 'text-[#56CCF2]' : 'text-white/20'} />
                        </div>
                        <div className={`flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 ${activeTenant?.business_whatsapp_connected ? 'opacity-100' : 'opacity-40'}`}>
                           <span className="text-[10px] font-black uppercase tracking-widest text-[#56CCF2]">WhatsApp Operativo</span>
                           <CheckCircle2 size={16} className={activeTenant?.business_whatsapp_connected ? 'text-[#56CCF2]' : 'text-white/20'} />
                        </div>
                     </div>

                     <Link href="/dashboard" className="w-full py-6 bg-[#56CCF2] text-[#1D3146] font-black rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-[#56CCF2]/20 hover:scale-105 transition-all text-sm uppercase tracking-[0.2em]">
                        Activar {activeTenant?.name || "Negocio"}
                        <Zap size={20} fill="currentColor" />
                     </Link>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#56CCF2] opacity-[0.03] rounded-full translate-x-1/2 -translate-y-1/2"></div>
               </div>
            )}
         </div>

         {/* Footer */}
         <div className="py-8 text-center">
            <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.2em]">Entrega Onboarding Academy © 2026</p>
         </div>

      </div>
   );
}
