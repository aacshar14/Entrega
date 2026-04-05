'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

interface ReportData {
  deliveries: number;
  payments: number;
  new_customers: number;
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

  const skeleton = (<div className="h-20 bg-slate-100 rounded-2xl animate-pulse"></div>);

  return (
    <div className="space-y-8 max-w-5xl">
       <div className="flex justify-between items-center bg-gradient-to-br from-[#1D3146] to-[#2B4764] text-white p-12 rounded-3xl shadow-2xl relative overflow-hidden border border-white/10">
          <div className="relative z-10 space-y-2">
             <h2 className="text-5xl font-black tracking-tighter">Resumen Ejecutivo</h2>
             <p className="text-blue-200 text-lg font-medium opacity-90">KPIs críticos para la operación de ChocoBites</p>
          </div>
          <div className="relative z-10 bg-white/10 backdrop-blur-3xl p-6 rounded-3xl border border-white/20 shadow-xl">
             <p className="text-blue-100 uppercase font-black tracking-wider text-[10px] leading-tight mb-2">Período Activo</p>
             <p className="text-xl font-bold">{data?.period || 'Últimos 7 días'}</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4 hover:shadow-md transition-shadow">
             <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black">🚚</div>
             <div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] leading-tight mb-1">Entregas Realizadas</p>
                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">
                  {loading ? '...' : (data?.deliveries || 0)}
                </h3>
             </div>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4 hover:shadow-md transition-shadow">
             <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center font-black">💰</div>
             <div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] leading-tight mb-1">Recaudación (Bruta)</p>
                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">
                  {loading ? '...' : `$${(data?.payments || 0).toLocaleString()}`}
                </h3>
             </div>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4 hover:shadow-md transition-shadow">
             <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black">👤</div>
             <div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] leading-tight mb-1">Nuevos Clientes</p>
                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">
                  {loading ? '...' : (data?.new_customers || 0)}
                </h3>
             </div>
          </div>
       </div>
       
       <div className="bg-slate-100 p-6 rounded-2xl flex items-start gap-4">
          <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">ℹ️</div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
             Este reporte se genera dinámicamente basado en los movimientos manuales y automatizados registrados en la plataforma. Los datos reflejan la actividad de los últimos 7 días calendario.
          </p>
       </div>
    </div>
  )
}
