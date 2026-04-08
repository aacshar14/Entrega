'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Package, 
  Search, 
  RefreshCcw, 
  Calendar,
  Layers,
  TrendingDown
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useTenant } from '@/lib/context/tenant-context';

interface CustomerStock {
  customer_id: string;
  customer_name: string;
  sku: string;
  product_name: string;
  quantity_outside: number;
  last_movement_at: string;
}

export default function CustomerInventoryPage() {
  const { activeTenant } = useTenant();
  const [inventory, setInventory] = useState<CustomerStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPair, setSelectedPair] = useState<{ customerId: string, sku: string, customerName: string, productName: string } | null>(null);
  const [pairMovements, setPairMovements] = useState<any[]>([]);
  const [pairLoading, setPairLoading] = useState(false);

  const fetchInventory = async () => {
    if (!activeTenant) return;
    try {
      setLoading(true);
      const data = await apiRequest('movements/customer-inventory', 'GET', null, activeTenant.id);
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching customer inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPairDetails = async (customerId: string, sku: string, customerName: string, productName: string) => {
    if (!activeTenant) return;
    try {
      setSelectedPair({ customerId, sku, customerName, productName });
      setPairLoading(true);
      // We'll use the main movements list and filter client-side 
      const allMovements = await apiRequest('movements', 'GET', null, activeTenant.id);
      const filtered = (allMovements || []).filter((m: any) => m.customer_id === customerId && m.sku === sku);
      setPairMovements(filtered);
    } catch (error) {
      console.error('Error fetching pair details:', error);
    } finally {
      setPairLoading(false);
    }
  };

  const handleDeleteMovement = async (movementId: string) => {
    if (!activeTenant || !confirm('¿Estás seguro de eliminar este registro? Esto afectará los saldos automáticamente.')) return;
    try {
      await apiRequest(`movements/${movementId}`, 'DELETE', null, activeTenant.id);
      // Refresh both
      if (selectedPair) {
        setPairMovements(prev => prev.filter(m => m.id !== movementId));
      }
      fetchInventory();
    } catch (error) {
      alert('Error al eliminar movimiento');
    }
  };

  useEffect(() => {
    if (activeTenant) {
      fetchInventory();
    }
  }, [activeTenant]);

  const filtered = inventory.filter(item => {
    const search = searchTerm.toLowerCase();
    return (
      (item.customer_name || '').toLowerCase().includes(search) ||
      (item.sku || '').toLowerCase().includes(search) ||
      (item.product_name || '').toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Detail Modal */}
      {selectedPair && (
        <div className="fixed inset-0 bg-[#1D3146]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div>
                <h2 className="text-xl font-black text-[#1D3146]">{selectedPair.customerName}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedPair.productName} ({selectedPair.sku})</p>
              </div>
              <button 
                onClick={() => setSelectedPair(null)}
                className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
              {pairLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <RefreshCcw size={32} className="text-[#56CCF2] animate-spin" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cargando historial...</p>
                </div>
              ) : pairMovements.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-sm font-bold text-slate-300">No se encontraron registros de este par.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pairMovements.map((move: any) => (
                    <div key={move.id} className="group flex items-center justify-between p-6 bg-slate-50/50 hover:bg-white rounded-3xl border border-transparent hover:border-slate-100 transition-all hover:shadow-xl hover:shadow-slate-100/50">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          move.type === 'delivery' || move.type === 'delivery_to_customer' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {move.type === 'delivery' || move.type === 'delivery_to_customer' ? <TrendingDown size={20} /> : <RefreshCcw size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="text-sm font-black text-[#1D3146]">
                               {move.type === 'delivery' || move.type === 'delivery_to_customer' ? 'Entrega' : 'Devolución'}
                             </span>
                             <span className="px-2 py-0.5 bg-white border border-slate-100 rounded-md text-[9px] font-black text-slate-400 uppercase">
                               {Math.abs(move.quantity)} Units
                             </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold flex items-center gap-2">
                            <Calendar size={10} />
                            {new Date(move.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                         <div className="text-right mr-2">
                           <p className="text-sm font-black text-[#1D3146]">${parseFloat(move.total_amount).toLocaleString()}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Valor Transacción</p>
                         </div>
                         <button 
                           onClick={() => handleDeleteMovement(move.id)}
                           className="w-10 h-10 bg-white border border-white group-hover:border-red-50 rounded-xl flex items-center justify-center text-transparent group-hover:text-red-400 group-hover:hover:bg-red-50 transition-all"
                           title="Eliminar Registro"
                         >
                           <Package size={16} />
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-8 border-t border-slate-50 bg-slate-50/30">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center leading-relaxed">
                ⚠️ Las eliminaciones son irreversibles y disparan una <br/> 
                reconciliación automática de saldos en todo el sistema.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header Contextual */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-[#1D3146] p-4 rounded-3xl text-[#56CCF2] shadow-xl shadow-[#1D3146]/20">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black text-[#1D3146] tracking-tight">Inventario por Clientes</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Distribución actual • ChocoBites V1.1
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchInventory}
            className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-[#1D3146] hover:border-slate-200 transition-all shadow-sm active:scale-95"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#56CCF2] transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente o SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-14 pl-12 pr-6 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-[#1D3146] outline-none w-full md:w-64 focus:border-[#56CCF2] focus:ring-4 focus:ring-[#56CCF2]/10 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Total Clientes con Stock</p>
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                 <Users size={18} />
              </div>
              <h3 className="text-2xl font-black text-[#1D3146]">
                {new Set(inventory.map(i => i.customer_id)).size}
              </h3>
           </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Variedad de Productos</p>
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#56CCF2]/10 text-[#56CCF2] rounded-xl flex items-center justify-center">
                 <Package size={18} />
              </div>
              <h3 className="text-2xl font-black text-[#1D3146]">
                {new Set(inventory.map(i => i.sku)).size}
              </h3>
           </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm md:col-span-2">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Total Unidades Afuera</p>
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                 <Layers size={18} />
              </div>
              <h3 className="text-2xl font-black text-[#1D3146]">
                {inventory.reduce((acc, curr) => acc + curr.quantity_outside, 0)}
              </h3>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto / SKU</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cantidad Afuera</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Último Movimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-8 py-8"><div className="h-4 bg-slate-100 rounded-full w-full"></div></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-slate-300">
                    <div className="flex flex-col items-center gap-4">
                      <TrendingDown size={48} className="opacity-20" />
                      <p className="font-bold text-sm uppercase tracking-widest">No hay stock fuera de almacén</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr 
                    key={`${item.customer_id}-${item.sku}-${idx}`} 
                    onClick={() => fetchPairDetails(item.customer_id, item.sku, item.customer_name, item.product_name)}
                    className="hover:bg-slate-50 group transition-colors cursor-pointer"
                  >
                    <td className="px-8 py-6 font-bold text-[#1D3146] text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-[#1D3146] group-hover:text-white transition-all">
                          {item.customer_name?.charAt(0)}
                        </div>
                        {item.customer_name}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <Package size={14} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-[#1D3146] leading-none mb-1">{item.product_name}</p>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{item.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-sm font-black ring-1 ring-orange-200">
                        {item.quantity_outside}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-[#1D3146] flex items-center gap-2">
                          <Calendar size={12} className="text-slate-400" />
                          {new Date(item.last_movement_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(item.last_movement_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
