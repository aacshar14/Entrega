'use client';

import React from 'react';
import { 
  Coins, 
  TrendingUp, 
  CreditCard, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight,
  Database,
  Zap,
  Activity
} from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function PlatformCostsPage() {
  const [costs, setCosts] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadCosts() {
      try {
        const data = await apiRequest('admin/costs', 'GET');
        setCosts(data);
      } catch (err) {
        console.error('Error fetching costs:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCosts();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-[#1D3146] tracking-tight">Costos de Plataforma</h1>
        <p className="text-slate-500 mt-2 font-medium italic">Estimación de uso infra-operativo y proyecciones de facturación.</p>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0F172A] text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8">
              <Coins className="text-amber-400 opacity-20 group-hover:opacity-40 transition-opacity" size={80} />
           </div>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Mensual Proyectado (USD)</p>
           <h2 className="text-5xl font-black mb-4">${costs?.estimated_monthly_usd ?? '0.00'}</h2>
           <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full w-fit text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
              <TrendingUp size={12} />
              En línea con presupuesto
           </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
           <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <Zap size={28} />
           </div>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Volumen Acumulado</p>
           <h3 className="text-3xl font-black text-[#1D3146]">{costs?.total_events?.toLocaleString() ?? '0'} ev</h3>
           <p className="text-xs text-slate-400 mt-2 font-medium">Eventos procesados históricamente.</p>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
           <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
              <Activity size={28} />
           </div>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Eventos (24h)</p>
           <h3 className="text-3xl font-black text-[#1D3146]">{costs?.events_last_24h?.toLocaleString() ?? '0'} ev</h3>
           <p className="text-xs text-slate-400 mt-2 font-medium">Carga operativa del último periodo.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Breakdown */}
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
           <div className="p-10 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-xl font-black text-[#1D3146] flex items-center gap-3">
                 <CreditCard className="text-blue-500" size={24} />
                 Desglose de Costos
              </h3>
              <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-3 py-1 rounded-full tracking-widest">
                 Est. Unitario
              </span>
           </div>
           <div className="p-10 space-y-8">
              {costs?.breakdown.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between group">
                   <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:scale-150 transition-transform"></div>
                      <span className="text-sm font-bold text-[#1D3146]">{item.label}</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-600">${item.value.toFixed(2)}</span>
                      <span className="text-[10px] font-black text-slate-300 uppercase">{item.unit}</span>
                   </div>
                </div>
              ))}
              <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                 <span className="text-xs font-black uppercase tracking-[0.2em] text-[#1D3146]">Total Proyectado</span>
                 <span className="text-2xl font-black text-blue-600">${costs?.estimated_monthly_usd.toFixed(2)}</span>
              </div>
           </div>
        </div>

        {/* Resources Usage */}
        <div className="space-y-6">
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6 group hover:border-blue-200 transition-all">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 rounded-3xl flex items-center justify-center transition-all">
                 <Database size={32} />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Storage Tier</p>
                 <h4 className="text-xl font-black text-[#1D3146]">Postgres Standard</h4>
                 <p className="text-xs text-slate-500 font-medium mt-1 italic">Backup diario habilitado.</p>
              </div>
              <ArrowUpRight className="ml-auto text-slate-200" size={20} />
           </div>

           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6 group hover:border-emerald-200 transition-all">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 rounded-3xl flex items-center justify-center transition-all">
                 <BarChart3 size={32} />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Inbound Traffic</p>
                 <h4 className="text-xl font-black text-[#1D3146]">Free-Tier Optimized</h4>
                 <p className="text-xs text-slate-500 font-medium mt-1 italic">Hasta 50k ev/día sin costo adicional.</p>
              </div>
              <ArrowUpRight className="ml-auto text-slate-200" size={20} />
           </div>
        </div>
      </div>
    </div>
  );
}
