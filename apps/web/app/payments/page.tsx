import React from 'react';

export default function PaymentsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Historial de Cobros</h2>
        <p className="text-slate-400 font-medium">Control de flujo de caja para entregas realizadas</p>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <span className="text-xs font-black uppercase text-slate-400 tracking-widest leading-none">Últimos cobros registrados</span>
            <button className="bg-white text-slate-600 border border-slate-100 px-4 py-2 rounded-xl text-xs font-bold hover:shadow-md transition-all">Ver todos</button>
         </div>
         <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex justify-between items-center p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="flex gap-4 items-center">
                   <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center font-black">$</div>
                   <div>
                      <p className="font-bold text-slate-800 leading-tight">Cobro #00{i}</p>
                      <p className="text-xs font-medium text-slate-400 mt-1">Efectivo - ChocoBites Pilot</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="font-black text-slate-800 text-lg leading-tight tracking-tight">$850.00</p>
                   <p className="text-[10px] uppercase font-black tracking-widest text-green-600 mt-1">Saldado</p>
                </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  )
}
