'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Upload, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Search,
  Plus,
  ArrowRight,
  TrendingUp,
  Tag,
  DollarSign,
  TrendingDown,
  Box,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface ProductStock {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  category?: string;
}

export default function StockPage() {
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for mobile development/preview
  const mockProducts: ProductStock[] = [
    { id: '1', name: 'Barra ChocoBites 70%', sku: 'CH-AM-001', price: 150.0, quantity: 120, category: 'Barritas' },
    { id: '2', name: 'Trufas de Avellana', sku: 'TR-AV-042', price: 220.0, quantity: 15, category: 'Premium' },
    { id: '3', name: 'Brownie Bites', sku: 'BB-005', price: 85.0, quantity: 4, category: 'Bocados' },
    { id: '4', name: 'Galleta Crunch', sku: 'GC-102', price: 120.0, quantity: 45, category: 'Galletas' },
  ];

  const fetchStock = async () => {
    try {
      setLoading(true);
      // In a real app, use the actual API. Using mock for UI evolution.
      setTimeout(() => {
          setProducts(mockProducts);
          setLoading(false);
      }, 800);
    } catch (error) {
      console.error('Error fetching stock:', error);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const filteredProducts = products.filter(p => 
     p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto py-2">
      
      {/* Header Flexing Roles */}
      <div className="flex items-center justify-between mb-8">
         <div>
            <h1 className="text-2xl md:text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
               <Package className="text-[#56CCF2]" size={32} />
               Inventario
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Control Maestro ChocoBites</p>
         </div>
         <div className="flex gap-2">
            <button className="p-3 bg-[#EBEEF2] rounded-2xl text-[#1D3146] hover:bg-slate-200 transition-colors" title="Importar Stock" aria-label="Importar Stock">
               <Upload size={20} />
            </button>
            <button className="px-5 py-3 bg-[#1D3146] text-white font-bold rounded-2xl flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                <Plus size={20} strokeWidth={3} />
                <span className="hidden sm:inline">Nuevo</span>
            </button>
         </div>
      </div>

      {/* Stats Quick View (Mobile Only Highlights) */}
      <div className="flex gap-4 mb-10 overflow-x-auto pb-4 scrollbar-hide px-1">
         <div className="flex-none bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm min-w-[160px] flex flex-col justify-between">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Existencias OK</p>
            <h4 className="text-2xl font-black text-green-600">32 SKUs</h4>
         </div>
         <div className="flex-none bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm min-w-[160px] flex flex-col justify-between">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Stock Bajo</p>
            <h4 className="text-2xl font-black text-orange-500">5 SKUs</h4>
         </div>
         <div className="flex-none bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm min-w-[160px] flex flex-col justify-between">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Crítico</p>
            <h4 className="text-2xl font-black text-rose-500">2 SKUs</h4>
         </div>
      </div>

      {/* Search Bar */}
      <div className="relative group mb-10">
         <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
         <input 
           type="text" 
           placeholder="Buscar productos o SKU..." 
           className="w-full h-16 pl-14 pr-6 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm text-sm font-bold text-[#1D3146] outline-none"
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      {/* Mobile Card List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {loading ? (
            Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-40 bg-white rounded-[2.5rem] animate-pulse border border-slate-50"></div>
            ))
         ) : filteredProducts.length > 0 ? (
            filteredProducts.map((p) => (
               <div key={p.id} className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group active:scale-[0.98]">
                  <div className="flex justify-between items-start mb-4">
                     <div className="space-y-1">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[8px] font-black uppercase rounded-md tracking-tighter">{p.category || 'Categoría'}</span>
                        <h3 className="text-lg font-black text-[#1D3146] leading-tight group-hover:text-[#56CCF2] transition-colors">{p.name}</h3>
                        <p className="text-[10px] font-mono text-slate-400">{p.sku || '---'}</p>
                     </div>
                     <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black ${
                        p.quantity > 50 ? 'bg-green-50 text-green-600' :
                        p.quantity > 10 ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600 shadow-inner'
                     }`}>
                        <span className="text-xl leading-none">{p.quantity}</span>
                        <span className="text-[8px] uppercase tracking-tighter">unid.</span>
                     </div>
                  </div>

                  {/* Pricing and Quick Actions */}
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-50">
                     <div className="flex items-center gap-2">
                        <div className="bg-[#56CCF2]/10 p-2 rounded-xl text-[#56CCF2]">
                           <DollarSign size={14} />
                        </div>
                        <span className="text-sm font-black text-[#1D3146]">${p.price.toFixed(2)}</span>
                     </div>
                     <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#1D3146] hover:text-white transition-all shadow-sm">
                           <TrendingUp size={14} />
                           Ajustar
                        </button>
                        <button className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-colors" title="Ver Detalle" aria-label="Ver Detalle">
                           <ChevronRight size={18} />
                        </button>
                     </div>
                  </div>

                  {/* Visual Status Indicator Strip */}
                  <div className={`absolute top-0 bottom-0 left-0 w-2 ${
                     p.quantity > 50 ? 'bg-green-500' :
                     p.quantity > 10 ? 'bg-orange-400' : 'bg-red-500'
                  } opacity-40`}></div>
               </div>
            ))
         ) : (
            <div className="col-span-full py-20 text-center">
               <Package className="mx-auto text-slate-200 mb-4" size={48} />
               <p className="text-lg font-bold text-slate-400 uppercase tracking-widest leading-tight">No se encontraron productos</p>
            </div>
         )}
      </div>

    </div>
  );
}
