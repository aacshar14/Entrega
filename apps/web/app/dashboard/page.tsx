import React from 'react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Bienvenido, ChocoBites</h2>
          <p className="text-slate-500 font-medium">Resumen general de operaciones (V1.1 Pilot)</p>
        </div>
        <div className="flex gap-4">
           <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-blue-200 active:transform active:scale-95 transition-all duration-200">Nueva Operación</button>
           <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-semibold transition-all">Exportar PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <p className="text-slate-500 font-bold uppercase text-xs tracking-wider">Entregas Hoy</p>
          <h3 className="text-4xl font-extrabold text-blue-600 mt-2 tracking-tighter">12</h3>
          <p className="text-green-600 text-sm font-semibold mt-2">↑ 15% vs ayer</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <p className="text-slate-500 font-bold uppercase text-xs tracking-wider">Efectivo Recaudado</p>
          <h3 className="text-4xl font-extrabold text-indigo-600 mt-2 tracking-tighter">$4.250</h3>
          <p className="text-slate-400 text-sm font-medium mt-2">3 cobros pendientes</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <p className="text-slate-500 font-bold uppercase text-xs tracking-wider">Adeudo Total</p>
          <h3 className="text-4xl font-extrabold text-rose-500 mt-2 tracking-tighter">$1.820</h3>
          <p className="text-rose-400 text-sm font-semibold mt-2">¡2 clientes en mora!</p>
        </div>
      </div>
    </div>
  )
}
