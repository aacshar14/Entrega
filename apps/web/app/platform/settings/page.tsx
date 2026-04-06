'use client';

import React from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Zap, 
  Database, 
  Bell, 
  ChevronRight, 
  AlertOctagon, 
  Lock,
  Globe,
  Save,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function PlatformSettingsPage() {
  const [settings, setSettings] = React.useState<any>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    async function loadSettings() {
      try {
        const data = await apiRequest('admin/settings', 'GET');
        setSettings(data);
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleToggle = (category: string, key: string) => {
     setSettings({
        ...settings,
        [category]: {
           ...settings[category],
           [key]: !settings[category][key]
        }
     });
  };

  const handleSave = async () => {
     setIsSaving(true);
     try {
        await apiRequest('admin/settings', 'PATCH', settings);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
     } catch (err) {
        alert('Error saving settings');
     } finally {
        setIsSaving(false);
     }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-[#1D3146] tracking-tight">Platform Configuration</h1>
          <p className="text-slate-500 mt-2 font-medium">Ajustes globales de seguridad, límites y runtime de EntréGA.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          title="Guardar todos los cambios de configuración global"
          className={`px-8 py-3 rounded-2xl flex items-center gap-3 font-black text-sm uppercase tracking-widest transition-all ${success ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg active:scale-95'}`}
        >
           {success ? <CheckCircle2 size={18} /> : isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div> : <Save size={18} />}
           {success ? 'Guardado' : isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {/* Feature Flags Section */}
      <section className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
         <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/10">
            <h3 className="text-xl font-black text-[#1D3146] flex items-center gap-3">
               <Zap className="text-amber-500" size={24} />
               Feature Flags & Modules
            </h3>
            <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest">
               Platform Runtime
            </span>
         </div>
         <div className="divide-y divide-slate-50">
            {Object.entries(settings?.features || {}).map(([key, value]) => (
               <div key={key} className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div>
                     <p className="text-sm font-black text-[#1D3146] uppercase tracking-tight">{key.replace('enable_', '').replace('_', ' ')}</p>
                     <p className="text-xs text-slate-400 font-medium mt-1">Habilitar módulo de {key.replace('enable_', '')} globalmente.</p>
                  </div>
                  <button 
                    onClick={() => handleToggle('features', key)}
                    className={`w-14 h-8 rounded-full relative transition-all duration-300 ${value ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                     <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${value ? 'left-7 shadow-[-2px_0_10px_rgba(0,0,0,0.1)]' : 'left-1 shadow-[2px_0_10px_rgba(0,0,0,0.1)]'}`}></div>
                  </button>
               </div>
            ))}
         </div>
      </section>

      {/* Limits & Quotas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <h3 className="text-lg font-black text-[#1D3146] mb-8 flex items-center gap-2">
               <AlertOctagon className="text-rose-500" size={20} />
               Global Limits
            </h3>
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Max Tenants</span>
                  <input 
                    type="number"
                    title="Cantidad máxima de tenants permitidos por administrador"
                    placeholder="Ej. 10"
                    className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-black text-blue-600 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    defaultValue={settings?.limits?.max_tenants_per_admin}
                  />
               </div>
               <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Events/Day Free</span>
                  <input 
                    type="number"
                    title="Límite máximo de eventos gratuitos por día"
                    placeholder="Ej. 1000"
                    className="w-24 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-black text-blue-600 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    defaultValue={settings?.limits?.max_events_per_day_free_tier}
                  />
               </div>
            </div>
         </section>

         <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
               <h3 className="text-lg font-black text-[#1D3146] mb-4 flex items-center gap-2">
                  <Globe className="text-indigo-500" size={20} />
                  Environment Info
               </h3>
               <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                     <span className="text-slate-500">Node Environment</span>
                     <span className="font-black text-slate-700 uppercase tracking-widest">{settings?.environment}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                     <span className="text-slate-500">API Health Code</span>
                     <span className="text-emerald-500 font-black">200 OK</span>
                  </div>
               </div>
            </div>
            <div className="mt-8 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-3 items-start">
               <AlertTriangle size={16} className="text-orange-500 mt-0.5" />
               <p className="text-[10px] text-orange-900 font-medium leading-relaxed uppercase tracking-tighter">
                  Advertencia: Los cambios en el runtime son inmediatos y afectan a todos los tenants de la red.
               </p>
            </div>
         </section>
      </div>

      {/* Security Info */}
      <div className="bg-[#F1F5F9] p-8 rounded-[2.5rem] border border-slate-200/50 flex items-center justify-between">
         <div className="flex items-center gap-6 text-slate-500">
            <Lock size={20} />
            <span className="text-xs font-bold uppercase tracking-widest">Platform Isolation: Active (Layer 7 Override)</span>
         </div>
         <button className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 tracking-widest flex items-center gap-2 group">
            Ver logs de auditoría 
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
         </button>
      </div>
    </div>
  );
}
