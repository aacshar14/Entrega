'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Filter,
  Calendar,
  Package,
  TrendingUp,
  User,
  MoreVertical,
  RefreshCcw,
  Plus
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useTenant } from '@/lib/context/tenant-context';

interface Movement {
  id: string;
  type: string;
  quantity: number;
  sku: string;
  unit_price: number;
  total_amount: number;
  created_at: string;
  description: string;
  tier_applied?: string;
}

export default function MovementsPage() {
  const { activeTenant } = useTenant();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMovements = async () => {
    if (!activeTenant) return;
    try {
      setLoading(true);
      const data = await apiRequest('movements/', 'GET', null, activeTenant.id) as Movement[];
      // Sort by date descending
      const sorted = (data || []).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setMovements(sorted);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTenant) {
      fetchMovements();
    }
  }, [activeTenant]);

  const filteredMovements = movements.filter(m => {
    const search = searchTerm.toLowerCase();
    const sku = (m.sku || '').toLowerCase();
    const desc = (m.description || '').toLowerCase();
    const type = (m.type || '').toLowerCase();
    
    return sku.includes(search) || desc.includes(search) || type.includes(search);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Contextual */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-[#1D3146] p-4 rounded-3xl text-[#56CCF2] shadow-xl shadow-[#1D3146]/20">
            <Clock size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#1D3146] tracking-tight">Historial de Movimientos</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Actualizado en tiempo real • ChocoBites V1.1
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchMovements}
            className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-[#1D3146] hover:border-slate-200 transition-all shadow-sm active:scale-95"
            title="Sincronizar"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#56CCF2] transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por SKU, tipo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-14 pl-12 pr-6 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-[#1D3146] outline-none w-full md:w-64 focus:border-[#56CCF2] focus:ring-4 focus:ring-[#56CCF2]/10 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5">
           <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Movimientos</p>
              <h3 className="text-2xl font-black text-[#1D3146]">{movements.length}</h3>
           </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5">
           <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <ArrowUpRight size={24} />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entregas Hoy</p>
              <h3 className="text-2xl font-black text-[#1D3146]">
                {movements.filter(m => m.type === 'delivery' && new Date(m.created_at).toDateString() === new Date().toDateString()).length}
              </h3>
           </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5">
           <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
              <Filter size={24} />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ajustes Stock</p>
              <h3 className="text-2xl font-black text-[#1D3146]">
                {movements.filter(m => m.type === 'adjustment').length}
              </h3>
           </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha & Hora</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto / SKU</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cant / Precio</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-8"><div className="h-4 bg-slate-100 rounded-full w-full"></div></td>
                  </tr>
                ))
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                      <Clock size={48} className="opacity-20" />
                      <p className="font-bold text-sm uppercase tracking-widest">Sin movimientos registrados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((movement) => {
                  const isPositive = movement.quantity > 0;
                  const date = new Date(movement.created_at);
                  
                  return (
                    <tr key={movement.id} className="hover:bg-slate-50 group transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-white group-hover:shadow-sm transition-all">
                              <Calendar size={14} className="text-slate-400" />
                           </div>
                           <div>
                              <p className="text-xs font-black text-[#1D3146] leading-none mb-1">
                                {date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                              </p>
                              <p className="text-[10px] font-medium text-slate-400">
                                {date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm ${
                           movement.type === 'delivery' ? 'bg-rose-50 text-rose-600' : 
                           movement.type === 'restock' ? 'bg-emerald-50 text-emerald-600' :
                           'bg-blue-50 text-blue-600'
                         }`}>
                           {movement.type === 'delivery' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                           {movement.type === 'delivery' ? 'ENTREGA' : movement.type === 'restock' ? 'RESTOCK' : 'AJUSTE'}
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-[#56CCF2]/10 group-hover:text-[#56CCF2] transition-colors">
                               <Package size={14} />
                            </div>
                            <div>
                               <p className="text-xs font-black text-[#1D3146] leading-none mb-1">{movement.sku || 'N/A'}</p>
                               <p className="text-[10px] font-medium text-slate-400">{movement.description || 'Sin descripción'}</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-3">
                            <span className={`text-sm font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                               {isPositive ? '+' : ''}{movement.quantity}
                            </span>
                            <span className="text-slate-200">|</span>
                            <span className="text-[10px] font-bold text-slate-400">${movement.unit_price}</span>
                            {movement.tier_applied && (
                              <span className="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter text-slate-500">{movement.tier_applied}</span>
                            )}
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <p className="text-sm font-black text-[#1D3146] tracking-tight">
                            ${movement.total_amount ? movement.total_amount.toLocaleString() : '0.00'}
                         </p>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
