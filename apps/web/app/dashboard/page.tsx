import React from 'react';

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      {/* Fila 1 — KPIs (4 cards) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 border-l-4 border-indigo-500">
           <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-black uppercase tracking-widest">Entregas Hoy</span>
              <span className="text-xl">🚚</span>
           </div>
           <div className="mt-4 flex items-end gap-3 font-black text-slate-900 leading-none">
              <h3 className="text-4xl tracking-tighter transition-all">12</h3>
              <span className="text-green-500 text-xs font-bold bg-green-50 px-2 py-1 rounded-lg mb-1">+15% vs ayer</span>
           </div>
        </div>

        <div className="glass-card p-6 border-l-4 border-green-500">
           <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-black uppercase tracking-widest">Cobrado Hoy</span>
              <span className="text-xl">💰</span>
           </div>
           <div className="mt-4 flex flex-col font-black text-slate-900 leading-none">
              <h3 className="text-4xl tracking-tighter transition-all tracking-tight">$4.250</h3>
              <p className="mt-4 text-xs font-bold text-slate-400">3 cobros procesados</p>
           </div>
        </div>

        <div className="glass-card p-6 border-l-4 border-orange-400">
           <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-black uppercase tracking-widest">Saldo Pendiente</span>
              <span className="text-xl">💳</span>
           </div>
           <div className="mt-4 flex items-end justify-between font-black text-slate-900 leading-none">
              <h3 className="text-4xl tracking-tighter transition-all">$1.820</h3>
              <span className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-pulse shadow-[0_0_10px_2px_rgba(251,146,60,0.5)]"></span>
           </div>
        </div>

        <div className="glass-card p-6 border-l-4 border-red-500">
           <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-black uppercase tracking-widest">Clientes en Mora</span>
              <span className="text-xl">⚠️</span>
           </div>
           <div className="mt-4 flex flex-col font-black text-slate-900 leading-none">
              <h3 className="text-4xl tracking-tighter transition-all text-red-600">2</h3>
              <p className="mt-4 text-xs font-black uppercase tracking-widest text-red-500 bg-red-50 px-2 py-1 rounded-lg w-fit">Acción requerida</p>
           </div>
        </div>
      </section>

      {/* Fila 2 — Actividad Reciente */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Últimas Entregas */}
         <div className="glass-card p-0 overflow-hidden flex flex-col bg-white">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
               <h3 className="font-black text-slate-800 text-lg">Últimas Entregas</h3>
               <button className="text-xs font-bold text-indigo-600 hover:underline">Ver todas</button>
            </div>
            <div className="divide-y divide-slate-50 p-2">
               {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all group cursor-pointer">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center font-bold text-indigo-700">T{i}</div>
                        <div>
                           <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-700">Tulos Choco {i}</p>
                           <p className="text-xs text-slate-400 font-medium tracking-tighter">Entrega #00{i} • Hace 10 min</p>
                        </div>
                     </div>
                     <span className="font-black text-slate-800">$450.00</span>
                  </div>
               ))}
            </div>
         </div>

         {/* Últimos Pagos */}
         <div className="glass-card p-0 overflow-hidden flex flex-col bg-white shadow-sm border border-slate-50">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
               <h3 className="font-black text-slate-800 text-lg">Últimos Pagos</h3>
               <button className="text-xs font-bold text-indigo-600 hover:underline">Ver todos</button>
            </div>
            <div className="divide-y divide-slate-50 p-2">
               {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all group cursor-pointer">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center font-bold text-green-700">P{i}</div>
                        <div>
                           <p className="text-sm font-bold text-slate-900 group-hover:text-green-700">Abarrotes Pérez {i}</p>
                           <p className="text-xs text-slate-400 font-medium tracking-tighter">Transferencia • Hoy, 10:30 AM</p>
                        </div>
                     </div>
                     <span className="font-black text-green-600">+$1,200.00</span>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* Fila 3 — Operación */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="glass-card p-8 bg-slate-900 text-white relative overflow-hidden group">
            <h4 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Stock Crítico</h4>
            <div className="space-y-4 relative z-10">
               <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Chocolate Amargo 70%</span>
                  <span className="text-red-400 font-black text-xs uppercase px-2 py-0.5 bg-red-400/10 rounded-md">8 unidades</span>
               </div>
               <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div className="bg-red-400 h-full w-[15%]" />
               </div>
            </div>
            <p className="mt-8 text-xs text-slate-500 font-medium relative z-10 underline cursor-pointer hover:text-white transition-all">Surtir stock ahora</p>
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2 group-hover:bg-indigo-500/20 transition-all duration-700"></div>
         </div>

         <div className="glass-card p-8 bg-white flex flex-col gap-6">
            <h4 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Top Adeudos</h4>
            <div className="space-y-3">
               {[1, 2].map(i => (
                  <div key={i} className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl hover:border-indigo-100 transition-all cursor-pointer">
                     <span className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-xs font-bold">{i}</span>
                     <p className="flex-grow text-sm font-bold text-slate-800">Distribuidora Galindo {i}</p>
                     <p className="font-black text-red-500 text-sm">$2,450.00</p>
                  </div>
               ))}
            </div>
         </div>
      </section>
    </div>
  )
}
