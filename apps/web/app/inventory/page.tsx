'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Package, 
  Calendar,
  Search,
  Loader2,
  ArrowRight,
  TrendingUp,
  History
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useTenant } from '@/lib/context/tenant-context';

interface CustomerStock {
  customer_id: string;
  customer_name: string;
  sku: string;
  quantity: number;
  last_movement: string;
}

export default function InventoryOutsidePage() {
  const { activeTenant } = useTenant();
  const [inventory, setInventory] = useState<CustomerStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInventory = useCallback(async () => {
    if (!activeTenant) return;
    try {
      setLoading(true);
      const data = await apiRequest('customers/inventory', 'GET', null, activeTenant.id);
      setInventory(data || []);
    } catch (err) {
      console.error('Error fetching outside inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTenant]);

  useEffect(() => {
    if (activeTenant) {
      fetchInventory();
    }
  }, [activeTenant, fetchInventory]);

  const filtered = inventory.filter(item => 
    item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <h1 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
               <TrendingUp className="text-[#56CCF2]" size={36} /> Inventario en Calle
            </h1>
            <p className="text-slate-500 font-medium mt-1">Control de mercancía bajo resguardo de clientes (Consignación)</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 flex items-center gap-4">
            <div className="bg-[#56CCF2]/10 p-4 rounded-2xl text-[#56CCF2]">
               <Users size={24} />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Puntos de Venta</p>
               <p className="text-2xl font-black text-[#1D3146]">{new Set(inventory.map(i => i.customer_id)).size}</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 flex items-center gap-4">
            <div className="bg-orange-50 p-4 rounded-2xl text-orange-500">
               <Package size={24} />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Unidades Fuera</p>
               <p className="text-2xl font-black text-[#1D3146]">{inventory.reduce((acc, curr) => acc + curr.quantity, 0)}</p>
            </div>
         </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 min-h-[500px] flex flex-col">
         <div className="relative max-w-md mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Buscar por cliente o producto..." 
              className="w-full pl-12 pr-4 py-3 bg-[#EBEEF2] border-none rounded-2xl text-sm font-semibold text-[#1D3146] focus:ring-2 focus:ring-[#56CCF2]/30 outline-none"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>

         <div className="overflow-auto rounded-3xl border border-slate-50 shadow-sm flex-grow">
            <table className="w-full text-left border-collapse">
                <thead className="bg-[#1D3146] text-white">
                   <tr className="text-[10px] font-black uppercase tracking-widest text-white/70">
                      <th className="px-8 py-5">Cliente / Punto de Venta</th>
                      <th className="px-4 py-5">Producto (SKU)</th>
                      <th className="px-4 py-5 text-center">Unidades Fuera</th>
                      <th className="px-8 py-5 text-right">Último Movimiento</th>
                   </tr>
                </thead>
               <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={4} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-[#56CCF2]" size={32} /></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-20 text-center">
                        <p className="text-slate-400 font-bold italic">No hay inventario fuera en este momento.</p>
                      </td>
                    </tr>
                  ) : filtered.map((item, idx) => (
                    <tr key={idx} className="group hover:bg-slate-50 transition-all">
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                             <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-white transition-all text-slate-400">
                                <Users size={16} />
                             </div>
                             <span className="font-bold text-[#1D3146] uppercase tracking-wide text-sm">{item.customer_name}</span>
                          </div>
                       </td>
                       <td className="px-4 py-5">
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded bg-[#56CCF2]/10 flex items-center justify-center text-[10px] font-black text-[#56CCF2]">
                                <Package size={12} />
                             </div>
                             <span className="font-mono text-xs font-bold text-slate-500">{item.sku}</span>
                          </div>
                       </td>
                       <td className="px-4 py-5 text-center">
                          <div className="inline-flex items-center gap-2 bg-orange-50 px-4 py-1.5 rounded-full">
                             <span className="text-lg font-black text-orange-600">{item.quantity}</span>
                             <span className="text-[9px] font-black text-orange-400 uppercase tracking-tighter">unidades</span>
                          </div>
                       </td>
                       <td className="px-8 py-5 text-right">
                          <div className="flex flex-col items-end">
                             <span className="text-xs font-black text-[#1D3146]">
                                {new Date(item.last_movement).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                             </span>
                             <span className="text-[10px] font-medium text-slate-400">
                                {new Date(item.last_movement).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </span>
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
