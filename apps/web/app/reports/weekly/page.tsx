'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

interface ReportData {
  deliveries: number;
  payments: number;
  new_customers: number;
  top_products: Array<{ name: string; quantity: number }>;
  top_debtors: Array<{ name: string; balance: number }>;
  period: string;
}

export default function WeeklyReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await apiRequest('reports/weekly') as ReportData;
        setData(res);
      } catch (err) {
        console.error('Error fetching report:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  return (
    <div className="space-y-8 max-w-5xl pb-20">
       <div className="flex justify-between items-center bg-gradient-to-br from-[#1D3146] to-[#2B4764] text-white p-12 rounded-3xl shadow-2xl relative overflow-hidden border border-white/10">
          <div className="relative z-10 space-y-2">
             <h2 className="text-5xl font-black tracking-tighter">Resumen Ejecutivo</h2>
             <p className="text-blue-200 text-lg font-medium opacity-90">KPIs operativos del periodo activo</p>
          </div>
          <div className="relative z-10 bg-white/10 backdrop-blur-3xl p-6 rounded-3xl border border-white/20 shadow-xl">
             <p className="text-blue-100 uppercase font-black tracking-wider text-[10px] leading-tight mb-2">Período Activo</p>
             <p className="text-xl font-bold">{data?.period || 'Semana Actual'}</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4">
             <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black">🚚</div>
             <div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] leading-tight mb-1">Entregas</p>
                <h3 className="text-4xl font-black text-slate-800 tracking-tighter">
                   {loading ? '...' : (data?.deliveries || 0)}
                </h3>
             </div>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4">
             <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center font-black">💰</div>
             <div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] leading-tight mb-1">Pagos</p>
                <h3 className="text-4xl font-black text-slate-800 tracking-tighter">
                   {loading ? '...' : `$${(data?.payments || 0).toLocaleString()}`}
                </h3>
             </div>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4">
             <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black">👤</div>
             <div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] leading-tight mb-1">Nuevos</p>
                <h3 className="text-4xl font-black text-slate-800 tracking-tighter">
                   {loading ? '...' : (data?.new_customers || 0)}
                </h3>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Products */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
             <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                <h3 className="text-xl font-black text-[#1D3146] tracking-tight">🏆 Lo más vendido</h3>
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Top 3</span>
             </div>
             <div className="p-4 space-y-2">
                {loading ? [1,2,3].map(i => <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse"></div>) : 
                 (data?.top_products?.length ? data.top_products.map((p, i) => (
                   <div key={i} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                         <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">#{i+1}</div>
                         <p className="font-bold text-[#1D3146]">{p.name}</p>
                      </div>
                      <p className="font-black text-blue-600">{p.quantity} <span className="text-[10px] opacity-40 uppercase">unid.</span></p>
                   </div>
                 )) : <div className="p-10 text-center text-slate-400 italic">Sin datos esta semana</div>)}
             </div>
          </div>

          {/* Top Debtors */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
             <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                <h3 className="text-xl font-black text-rose-500 tracking-tight">🚩 Mayor impacto (Adeudo)</h3>
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Cartera</span>
             </div>
             <div className="p-4 space-y-2">
                {loading ? [1,2,3].map(i => <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse"></div>) : 
                 (data?.top_debtors?.length ? data.top_debtors.map((d, i) => (
                   <div key={i} className="flex items-center justify-between p-5 bg-rose-50/30 rounded-2xl hover:bg-rose-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                         <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-xs">!</div>
                         <p className="font-bold text-[#1D3146]">{d.name}</p>
                      </div>
                      <p className="font-black text-rose-500">${d.balance.toLocaleString()}</p>
                   </div>
                 )) : <div className="p-10 text-center text-slate-400 italic">Todo al día ✨</div>)}
             </div>
          </div>
       </div>
       
       <div className="bg-slate-50 p-6 rounded-3xl flex items-start gap-4 border border-slate-100">
          <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">ℹ️</div>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
             Este reporte se genera dinámicamente según tu histórico. 
             Muestra quién te debe más y qué producto está rotando más rápido en los últimos 7 días.
          </p>
       </div>
    </div>
  )
}
