'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Truck, 
  Banknote, 
  AlertCircle, 
  Package,
  ChevronRight,
  Handshake,
  Loader2,
  Users,
  Wallet
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useTenant } from '@/lib/context/tenant-context';
import Link from 'next/link';

interface DashboardStats {
  customer_count: number;
  product_count: number;
  total_payments: number;
  total_debt: number;
  low_stock_count: number;
  weekly_produced: number;
  weekly_delivered: number;
}

interface StockItem {
  name: string;
  quantity: number;
  quantity_outside: number;
  total: number;
}

interface DashboardData {
  stats: DashboardStats;
  stock: Array<StockItem>;
  debtors: Array<{ name: string, amount: number }>;
  recent_activity?: Array<{
    id: string;
    customer_name: string;
    description: string;
    quantity: number;
    type: string;
    amount: number;
    created_at: string;
  }>;
  welcome_message: string;
  business_name: string;
}

export default function Dashboard() {
  const { activeTenant } = useTenant();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (!activeTenant) return;
    try {
      setLoading(true);
      const res = await apiRequest('dashboard', 'GET', null, activeTenant.id);
      setData(res);
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTenant]);

  useEffect(() => {
    if (activeTenant) {
      fetchDashboard();
    }
  }, [activeTenant, fetchDashboard]);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="animate-spin text-[#56CCF2]" size={48} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Actualizando datos reales...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1400px] animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="mb-2">
         <h1 className="text-3xl font-black text-[#1D3146] tracking-tight">{data.welcome_message}</h1>
         <p className="text-slate-500 font-medium italic mt-1">Hoy en {data.business_name || 'Entrega'}</p>
      </div>

      {/* 4 Cards Principales */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-3xl p-7 bg-gradient-to-br from-[#1D3146] to-[#2B4764] text-white flex flex-col justify-between h-44 shadow-2xl shadow-[#1D3146]/20 transition-transform hover:scale-[1.02]">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Clientes Registrados</p>
                 <h3 className="text-5xl font-black mt-2">{data.stats.customer_count}</h3>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl">
                <Users size={24} className="text-[#56CCF2]" />
              </div>
           </div>
           <p className="text-[11px] font-bold text-[#56CCF2] flex items-center gap-1 uppercase tracking-widest">
              Total Cartera Activa
           </p>
        </div>

        <div className="rounded-3xl p-7 bg-gradient-to-br from-[#56CCF2] to-[#45B8E0] text-white flex flex-col justify-between h-44 shadow-2xl shadow-[#56CCF2]/20 transition-transform hover:scale-[1.02]">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Pagos Recibidos (Histórico)</p>
                 <h3 className="text-4xl font-black mt-2">${data.stats.total_payments.toLocaleString()}</h3>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl">
                <Banknote size={24} />
              </div>
           </div>
           <p className="text-[11px] font-bold opacity-80 uppercase tracking-widest">Flujo de Caja Total</p>
        </div>

        <div className="rounded-3xl p-7 bg-gradient-to-br from-rose-500 to-rose-600 text-white flex flex-col justify-between h-44 shadow-2xl shadow-rose-500/20 transition-transform hover:scale-[1.02]">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Saldo Pendiente (Adeudos)</p>
                 <h3 className="text-4xl font-black mt-2">${data.stats.total_debt.toLocaleString()}</h3>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl">
                <Wallet size={24} />
              </div>
           </div>
           <p className="text-[11px] font-bold opacity-80 uppercase tracking-widest italic flex items-center gap-1">
              <AlertCircle size={12} /> Cuentas por Cobrar
           </p>
        </div>

        <div className="rounded-3xl p-7 bg-gradient-to-br from-orange-500 to-orange-600 text-white flex flex-col justify-between h-44 shadow-2xl shadow-orange-500/20 transition-transform hover:scale-[1.02]">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Productos en Catálogo</p>
                 <h3 className="text-5xl font-black mt-2">{data.stats.product_count}</h3>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl">
                <Package size={24} />
              </div>
           </div>
            <div className="flex flex-col gap-1">
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg w-fit ${data.stats.low_stock_count > 0 ? 'bg-white/20 text-white' : 'bg-green-500 text-white'}`}>
                 {data.stats.low_stock_count} Stock Bajo
              </span>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">
                Semana: {data.stats.weekly_produced} In / {data.stats.weekly_delivered} Out
              </p>
            </div>
        </div>
      </section>

      {/* Grid de Contenido Real */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
         
         {/* Movimientos Recientes */}
         <div className="lg:col-span-7 space-y-8">
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
               <div className="p-8 pb-4 flex items-center justify-between">
                  <h3 className="font-extrabold text-[#1D3146] text-xl tracking-tight">Actividad Reciente</h3>
                  <button className="text-xs font-black uppercase tracking-widest text-[#56CCF2] hover:underline underline-offset-4">Historial Completo</button>
               </div>
               
               <div className="p-0">
                  {data.recent_activity && data.recent_activity.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                      {data.recent_activity.map((activity, i) => (
                        <div key={i} className="py-5 px-8 flex items-center justify-between hover:bg-slate-50/50 transition-all cursor-default">
                           <div className="flex items-center gap-4">
                              <div className="bg-[#56CCF2]/10 p-3 rounded-2xl flex-shrink-0">
                                 <Truck className="text-[#56CCF2]" size={20} />
                              </div>
                              <div>
                                 <p className="font-bold text-[#1D3146] text-base">{activity.customer_name}</p>
                                 <p className="text-xs font-bold text-slate-400 capitalize flex items-center gap-2">
                                    <span className="text-[#56CCF2] font-black">{activity.quantity} unid.</span> • 
                                    {activity.description}
                                 </p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="font-black text-rose-500 text-lg">${activity.amount.toLocaleString()}</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                                {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 pt-0 space-y-2">
                       <div className="bg-slate-50 p-10 rounded-3xl text-center border border-dashed border-slate-200">
                           <Truck className="text-slate-200 mx-auto mb-4" size={40} />
                           <p className="text-slate-400 font-bold text-sm">Aún no hay actividad de envíos para mostrar.</p>
                       </div>
                    </div>
                  )}
               </div>
            </div>
         </div>

         {/* Derecha - Tablas Reales de Almacén y Adeudos */}
         <div className="lg:col-span-5 space-y-8">
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
               <div className="p-8 pb-4 flex items-center justify-between">
                  <h3 className="font-extrabold text-[#1D3146] text-xl tracking-tight">Stock Maestro</h3>
                  <Link href="/stock" className="text-[10px] font-black uppercase text-[#56CCF2] tracking-widest">IR AL ALMACÉN</Link>
               </div>
               <div className="p-0 px-8 pb-8">
                  {data.stock.length > 0 ? (
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                          <th className="pb-4">Producto</th>
                          <th className="pb-4 text-center">Almacén</th>
                          <th className="pb-4 text-center">Fuera</th>
                          <th className="pb-4 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {data.stock.map((item, idx) => (
                          <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 font-bold text-slate-700">{item.name}</td>
                            <td className="py-4 text-center">
                              <span className={`${item.quantity <= 10 ? 'text-orange-600' : 'text-slate-600'} font-medium`}>
                                {item.quantity}
                              </span>
                            </td>
                            <td className="py-4 text-center text-slate-400 font-medium">
                              {item.quantity_outside > 0 ? (
                                <span className="text-blue-500">+{item.quantity_outside}</span>
                              ) : (
                                '0'
                              )}
                            </td>
                            <td className="py-4 text-right font-black text-slate-900">
                              {item.quantity + item.quantity_outside}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-10 text-center text-slate-400 text-xs font-bold italic">No hay productos en inventario.</div>
                  )}
               </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
               <div className="p-8 pb-4 flex items-center justify-between">
                  <h3 className="font-extrabold text-[#1D3146] text-xl tracking-tight">Saldos de Clientes</h3>
                  <Link href="/customers" className="text-[10px] font-black uppercase text-[#56CCF2] tracking-widest">VER CARTERA</Link>
               </div>
               <div className="p-0">
                  <div className="grid grid-cols-2 bg-slate-50/50 py-3 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                     <span>CLIENTE</span>
                     <span className="text-right">DEBE</span>
                  </div>
                  {data.debtors.length > 0 ? data.debtors.map((p, i) => (
                    <div key={i} className="grid grid-cols-2 py-5 px-8 border-b border-slate-50 last:border-0 items-center hover:bg-slate-50/50 transition-all cursor-default">
                       <span className="text-base font-bold text-[#1D3146]">{p.name}</span>
                       <span className="text-right font-black text-rose-500 text-xl">${p.amount.toLocaleString()}</span>
                    </div>
                  )) : (
                    <div className="p-10 text-center text-slate-400 text-xs font-bold italic">Todos tus clientes están al día. ✨</div>
                  )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
