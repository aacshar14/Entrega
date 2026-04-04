'use client';
import React from 'react';
import { 
  Truck, 
  Banknote, 
  AlertCircle, 
  Package,
  ChevronRight,
  Handshake,
  Settings2
} from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="space-y-8 max-w-[1400px]">
      {/* 4 Cards Principales (Colores sólidos y degradados suaves) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-2xl p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white flex flex-col justify-between h-40 shadow-xl shadow-blue-500/10 transition-all hover:scale-[1.02]">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">Entregas Hoy:</p>
                 <h3 className="text-4xl font-extrabold mt-1">15 <span className="text-sm font-medium opacity-70">productos</span></h3>
              </div>
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Truck size={24} />
              </div>
           </div>
           <p className="text-[12px] font-medium opacity-70">30 productos totales</p>
        </div>

        <div className="rounded-2xl p-6 bg-gradient-to-br from-teal-500 to-teal-600 text-white flex flex-col justify-between h-40 shadow-xl shadow-teal-500/10 transition-all hover:scale-[1.02]">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">Pagos Hoy:</p>
                 <h3 className="text-4xl font-extrabold mt-1">$5,200</h3>
              </div>
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Banknote size={24} />
              </div>
           </div>
           <p className="text-[12px] font-medium opacity-70">4 recibidos</p>
        </div>

        <div className="rounded-2xl p-6 bg-gradient-to-br from-rose-500 to-rose-600 text-white flex flex-col justify-between h-40 shadow-xl shadow-rose-500/10 transition-all hover:scale-[1.02]">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">Clientes con Adeudo:</p>
                 <h3 className="text-4xl font-extrabold mt-1">3</h3>
              </div>
              <div className="bg-white/20 p-2.5 rounded-xl">
                <AlertCircle size={24} />
              </div>
           </div>
           <p className="text-[12px] font-medium opacity-70">Total $8,750</p>
        </div>

        <div className="rounded-2xl p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white flex flex-col justify-between h-40 shadow-xl shadow-orange-500/10 transition-all hover:scale-[1.02]">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">Stock Bajo:</p>
                 <h3 className="text-4xl font-extrabold mt-1">5</h3>
              </div>
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Package size={24} />
              </div>
           </div>
           <p className="text-[12px] font-medium opacity-70 italic">Requiere atención</p>
        </div>
      </section>

      {/* Grid de Contenido (Columnas 7/5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
         
         {/* Movimientos Recientes (Izquierda - 7/12) */}
         <div className="lg:col-span-7 space-y-8">
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-8 pb-4 flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">Movimientos Recientes</h3>
                  <button className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:underline underline-offset-4">Ver todos <ChevronRight size={16} /></button>
               </div>
               
               <div className="p-6 pt-0 space-y-1">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-2 mb-2">Hoy</p>
                  {[
                    { icon: Truck, label: 'Entrega a Juan', sub: '+15 productos', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { icon: Handshake, label: 'Pago recibo Ana', sub: '$1,500', color: 'text-orange-500', bg: 'bg-orange-50' },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50/80 rounded-2xl transition-all cursor-pointer group">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${m.bg}`}>
                             <m.icon className={m.color} size={22} />
                          </div>
                          <div>
                             <p className="text-base font-bold text-slate-900">{m.label}</p>
                          </div>
                       </div>
                       <span className={`text-base font-black ${m.sub.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>{m.sub}</span>
                    </div>
                  ))}

                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-2 mt-6 mb-2">Historico</p>
                  {[
                    { icon: Truck, label: 'Entrega a Carlos', sub: '+10 productos', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { icon: Handshake, label: 'Pago recibo Luis', sub: '$2,000', color: 'text-orange-500', bg: 'bg-orange-50' },
                  ].map((m, i) => (
                    <div key={i+2} className="flex items-center justify-between p-4 hover:bg-slate-50/80 rounded-2xl transition-all cursor-pointer group">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${m.bg}`}>
                             <m.icon className={m.color} size={22} />
                          </div>
                          <div>
                             <p className="text-base font-bold text-slate-900">{m.label}</p>
                          </div>
                       </div>
                       <span className={`text-base font-black ${m.sub.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>{m.sub}</span>
                    </div>
                  ))}
               </div>
            </div>

            {/* Resumen Semanal */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                <h4 className="text-lg font-extrabold text-slate-800 mb-6">Resumen Semanal</h4>
                <div className="grid grid-cols-3 gap-6">
                   <div className="p-6 border border-slate-100 rounded-2xl bg-slate-50/50 flex flex-col gap-1">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Entregas:</p>
                      <h4 className="text-4xl font-black text-slate-900">45</h4>
                   </div>
                   <div className="p-6 border border-slate-100 rounded-2xl bg-slate-50/50 flex flex-col gap-1 text-center">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pagos Recibidos:</p>
                      <h4 className="text-4xl font-black text-emerald-500 leading-none">$12,800</h4>
                   </div>
                   <div className="p-6 border border-slate-100 rounded-2xl bg-slate-50/50 flex flex-col gap-1 text-right">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Saldo Pendiente:</p>
                      <h4 className="text-4xl font-black text-rose-500 leading-none">$8,750</h4>
                   </div>
                </div>
            </div>
         </div>

         {/* Derecha - Tablas de Stock y Adeudos */}
         <div className="lg:col-span-5 space-y-8">
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-8 pb-4 flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">Stock Actual</h3>
                  <button className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:underline underline-offset-4">Ver inventario <ChevronRight size={16} /></button>
               </div>
               <div className="p-0">
                  <div className="grid grid-cols-2 bg-slate-50/50 py-3 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                     <span>Producto</span>
                     <span className="text-right">Disponible</span>
                  </div>
                  {[
                    { n: 'ChocoBites Barra', q: '25' },
                    { n: 'ChocoBites Mix', q: '12' },
                    { n: 'Galleta Crunch', q: '8' },
                    { n: 'Brownie Bites', q: '4' }
                  ].map((p, i) => (
                    <div key={i} className="grid grid-cols-2 py-5 px-8 border-b border-slate-50 last:border-0 items-center hover:bg-slate-50/50 transition-all cursor-default">
                       <span className="text-base font-bold text-slate-700">{p.n}</span>
                       <span className="text-right text-lg font-black text-slate-900">{p.q}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-8 pb-4 flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">Adeudos por Cliente</h3>
                  <button className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:underline underline-offset-4">Ver adeudos <ChevronRight size={16} /></button>
               </div>
               <div className="p-0">
                  <div className="grid grid-cols-2 bg-slate-50/50 py-3 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                     <span>Cliente</span>
                     <span className="text-right">Saldo Pendiente</span>
                  </div>
                  {[
                    { n: 'Ana López', a: '$3,500' },
                    { n: 'Carlos Pérez', a: '$2,750' },
                    { n: 'Luis García', a: '$2,500' }
                  ].map((p, i) => (
                    <div key={i} className="grid grid-cols-2 py-5 px-8 border-b border-slate-50 last:border-0 items-center hover:bg-slate-50/50 transition-all cursor-default text-lg">
                       <span className="text-base font-bold text-slate-700">{p.n}</span>
                       <span className="text-right font-black text-slate-900">{p.a}</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}
