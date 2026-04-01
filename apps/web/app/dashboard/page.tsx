import React from 'react';

export default function Dashboard() {
  return (
    <div className="space-y-8 max-w-[1280px]">
      {/* 4 Cards de Colores (Top) */}
      <section className="grid grid-cols-4 gap-6">
        <div className="kpi-card bg-[#3182CE] border-l-4 border-blue-600">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-xs font-bold uppercase opacity-80">Entregas Hoy:</p>
                 <h3 className="text-3xl font-black mt-1">15 <span className="text-sm font-medium opacity-70">productos</span></h3>
                 <p className="text-[10px] mt-2 opacity-60 italic">30 productos totales</p>
              </div>
              <span className="text-2xl bg-white/20 p-2 rounded-lg">🚚</span>
           </div>
        </div>

        <div className="kpi-card bg-[#319795] border-l-4 border-teal-600">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-xs font-bold uppercase opacity-80">Pagos Hoy:</p>
                 <h3 className="text-3xl font-black mt-1">$5,200</h3>
                 <p className="text-[10px] mt-2 opacity-60 italic">4 recibos</p>
              </div>
              <span className="text-2xl bg-white/20 p-2 rounded-lg">💰</span>
           </div>
        </div>

        <div className="kpi-card bg-[#E53E3E] border-l-4 border-red-700">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-xs font-bold uppercase opacity-80">Clientes con Adeudo:</p>
                 <h3 className="text-3xl font-black mt-1">3</h3>
                 <p className="text-[10px] mt-2 opacity-60 italic">Total $8,750</p>
              </div>
              <span className="text-2xl bg-white/20 p-2 rounded-lg">⚠️</span>
           </div>
        </div>

        <div className="kpi-card bg-[#DD6B20] border-l-4 border-orange-700">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-xs font-bold uppercase opacity-80">Stock Bajo:</p>
                 <h3 className="text-3xl font-black mt-1">5</h3>
                 <p className="text-[10px] mt-2 opacity-60 italic">Requiere atención</p>
              </div>
              <span className="text-2xl bg-white/20 p-2 rounded-lg">📦</span>
           </div>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-8 items-start">
         {/* Movimientos Recientes (Izquierda - 7/12) */}
         <div className="col-span-12 lg:col-span-7 bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
               <h3 className="font-bold text-slate-800 text-lg">Movimientos Recientes</h3>
               <button className="text-xs font-bold text-blue-600 hover:underline">Ver todos &gt;</button>
            </div>
            
            <div className="divide-y divide-slate-50 overflow-hidden">
               {/* Hoy */}
               <div className="bg-slate-50/50 px-6 py-2 border-b border-slate-50 text-[11px] font-black uppercase text-slate-400 tracking-wider">Hoy</div>
               <div className="flex items-center justify-between p-4 px-8 hover:bg-slate-50 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                     <span className="text-xl">🚚</span>
                     <div>
                        <p className="text-sm font-bold text-slate-800">Entrega a Juan</p>
                     </div>
                  </div>
                  <span className="font-black text-green-500 text-sm">+15 productos</span>
               </div>
               <div className="flex items-center justify-between p-4 px-8 hover:bg-slate-50 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                     <span className="text-xl">🤝</span>
                     <div>
                        <p className="text-sm font-bold text-slate-800">Pago recibo Ana</p>
                     </div>
                  </div>
                  <span className="font-black text-red-500 text-sm">$1,500</span>
               </div>
               
               {/* 22/04/2024 */}
               <div className="bg-slate-50/50 px-6 py-2 border-b border-slate-50 text-[11px] font-black uppercase text-slate-400 tracking-wider">22/04/2024</div>
               <div className="flex items-center justify-between p-4 px-8 hover:bg-slate-50 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                     <span className="text-xl">🚚</span>
                     <div>
                        <p className="text-sm font-bold text-slate-800">Entrega a Carlos</p>
                     </div>
                  </div>
                  <span className="font-black text-green-500 text-sm">+10 productos</span>
               </div>
               <div className="flex items-center justify-between p-4 px-8 hover:bg-slate-50 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                     <span className="text-xl">🤝</span>
                     <div>
                        <p className="text-sm font-bold text-slate-800">Pago recibo Luis</p>
                     </div>
                  </div>
                  <span className="font-black text-red-500 text-sm">$2,000</span>
               </div>
            </div>
         </div>

         {/* Stock y Adeudos (Derecha - 5/12) */}
         <div className="col-span-12 lg:col-span-5 space-y-8">
            {/* Stock Actual Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
               <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-md">Stock Actual</h3>
                  <button className="text-[10px] font-black text-blue-600 hover:underline">Ver inventario &gt;</button>
               </div>
               <div className="p-0">
                  <div className="grid grid-cols-2 bg-slate-50/80 items-center justify-between py-2 px-6 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     <span>Producto</span>
                     <span className="text-right">Disponible</span>
                  </div>
                  {[
                    { n: 'ChocoBites Barra', q: '25' },
                    { n: 'ChocoBites Mix', q: '12' },
                    { n: 'Galleta Crunch', q: '8' },
                    { n: 'Brownie Bites', q: '4' }
                  ].map((p, i) => (
                    <div key={i} className="grid grid-cols-2 p-4 px-6 border-b border-slate-50 items-center last:border-0 hover:bg-slate-50 transition-all">
                       <span className="text-[13px] font-bold text-slate-800">{p.n}</span>
                       <span className="text-right font-black text-slate-800">{p.q}</span>
                    </div>
                  ))}
               </div>
            </div>

            {/* Adeudos por Cliente Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
               <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-md">Adeudos por Cliente</h3>
                  <button className="text-[10px] font-black text-blue-600 hover:underline">Ver adeudos &gt;</button>
               </div>
               <div className="p-0">
                  <div className="grid grid-cols-2 bg-slate-50/80 items-center justify-between py-2 px-6 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     <span>Cliente</span>
                     <span className="text-right">Saldo Pendiente</span>
                  </div>
                  {[
                    { n: 'Ana López', a: '$3,500' },
                    { n: 'Carlos Pérez', a: '$2,750' },
                    { n: 'Luis García', a: '$2,500' }
                  ].map((p, i) => (
                    <div key={i} className="grid grid-cols-2 p-4 px-6 border-b border-slate-50 items-center last:border-0 hover:bg-slate-50 transition-all">
                       <span className="text-[13px] font-bold text-slate-800">{p.n}</span>
                       <span className="text-right font-black text-slate-800">{p.a}</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* Resumen Semanal (Cajas de abajo) */}
      <div className="grid grid-cols-12 gap-8">
         <div className="col-span-12 lg:col-span-7 bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex flex-col gap-6">
            <h4 className="font-bold text-slate-500 uppercase text-[11px] tracking-widest">Resumen Semanal</h4>
            <div className="grid grid-cols-3 gap-6 items-center">
               <div className="bg-slate-50 p-6 rounded-lg text-center border border-slate-100/50">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Entregas:</p>
                  <h4 className="text-3xl font-black text-slate-800 mt-2 tracking-tighter">45</h4>
               </div>
               <div className="bg-slate-50 p-6 rounded-lg text-center border border-slate-100/50">
                  <p className="text-[10px] font-black text-emerald-500 uppercase">Pagos Recibidos:</p>
                  <h4 className="text-3xl font-black text-emerald-600 mt-2 tracking-tighter">$12,800</h4>
               </div>
               <div className="bg-slate-50 p-6 rounded-lg text-center border border-slate-100/50">
                  <p className="text-[10px] font-black text-red-400 uppercase">Saldo Pendiente:</p>
                  <h4 className="text-3xl font-black text-red-600 mt-2 tracking-tighter">$8,750</h4>
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}
