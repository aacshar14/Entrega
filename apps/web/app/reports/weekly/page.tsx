import React from 'react';

export default function WeeklyReportsPage() {
  return (
    <div className="space-y-8 max-w-5xl">
       <div className="flex justify-between items-center bg-gradient-to-br from-indigo-700 to-indigo-900 text-white p-12 rounded-3xl shadow-2xl relative overflow-hidden border border-white/10">
          <div className="relative z-10 space-y-2">
             <h2 className="text-5xl font-black tracking-tighter">Resumen Semanal</h2>
             <p className="text-indigo-200 text-lg font-medium opacity-90">KPIs críticos para la operación de ChocoBites V1.1</p>
          </div>
          <div className="relative z-10 bg-white/10 backdrop-blur-3xl p-6 rounded-3xl border border-white/20 shadow-xl">
             <p className="text-indigo-100 uppercase font-black tracking-wider text-[10px] leading-tight mb-2">Período</p>
             <p className="text-xl font-bold">25 Mar - 01 Abr, 2026</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4 hover:shadow-md transition-shadow">
             <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black">🚚</div>
             <div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] leading-tight mb-1">Entregas</p>
                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">142</h3>
             </div>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4 hover:shadow-md transition-shadow">
             <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center font-black">💰</div>
             <div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] leading-tight mb-1">Recaudación</p>
                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">$1.2M</h3>
             </div>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4 hover:shadow-md transition-shadow">
             <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center font-black">📦</div>
             <div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] leading-tight mb-1">Stock Bajo</p>
                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">4 SKUs</h3>
             </div>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4 hover:shadow-md transition-shadow">
             <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center font-black">⚠️</div>
             <div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] leading-tight mb-1">Morosidad</p>
                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">8.5%</h3>
             </div>
          </div>
       </div>
    </div>
  )
}
