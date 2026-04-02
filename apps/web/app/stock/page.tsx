'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Upload, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  TrendingUp,
  Search,
  Filter
} from 'lucide-react';

interface ProductStock {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

export default function StockPage() {
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStock = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.entrega.space'}/api/v1/products/stock`, {
          headers: {
              'Authorization': `Bearer ${localStorage.getItem('supabase-token') || ''}`,
          }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching stock:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.entrega.space'}/api/v1/products/bulk-import`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('supabase-token') || ''}`,
        },
        body: formData,
      });

      if (response.ok) {
        await fetchStock(); // Refresh list
        alert('📦 Catálogo de productos importado correctamente');
      } else {
        alert('❌ Error al subir el catálogo. Revisa el formato CSV.');
      }
    } catch (error) {
      console.error('Error uploading:', error);
      alert('❌ Error de conexión con el servidor.');
    } finally {
      setUploading(false);
    }
  };

  const filteredProducts = products.filter(p => 
     p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto py-8">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
         <div>
            <h1 className="text-3xl font-black text-[#1D3146] tracking-tight flex items-center gap-3">
               <Package className="text-[#56CCF2]" size={32} />
               Inventario y Precios
            </h1>
            <p className="text-slate-500 mt-1 font-medium italic">Control maestro de stock en tiempo real.</p>
         </div>
         
         <div className="flex gap-4">
            <label className={`cursor-pointer flex items-center gap-2 px-6 py-3 bg-[#1D3146] text-white text-sm font-bold rounded-2xl hover:scale-105 transition-all shadow-xl shadow-[#1D3146]/20 ${uploading ? 'opacity-50' : ''}`}>
               {uploading ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
               <span>{uploading ? 'Procesando...' : 'Importar Catálogo'}</span>
               <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={uploading} />
            </label>
         </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
             <div className="bg-[#56CCF2]/10 p-4 rounded-2xl">
                <Package className="text-[#56CCF2]" size={24} />
             </div>
             <div>
                <p className="text-2xl font-black text-[#1D3146]">{products.length}</p>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Productos Totales</p>
             </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
             <div className="bg-green-100 p-4 rounded-2xl">
                <CheckCircle2 className="text-green-600" size={24} />
             </div>
             <div>
                <p className="text-2xl font-black text-[#1D3146]">{products.filter(p => p.quantity > 0).length}</p>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">En Stock</p>
             </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
             <div className="bg-red-100 p-4 rounded-2xl">
                <AlertCircle className="text-red-500" size={24} />
             </div>
             <div>
                <p className="text-2xl font-black text-[#1D3146]">{products.filter(p => p.quantity <= 0).length}</p>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Sin Existencias</p>
             </div>
          </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="relative flex-grow max-w-md">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="text" 
                 placeholder="Buscar producto o SKU..." 
                 className="w-full pl-12 pr-4 py-3 bg-[#EBEEF2] border-none rounded-2xl text-sm font-semibold text-[#1D3146] focus:ring-2 focus:ring-[#56CCF2]/30 outline-none"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            
            <div className="flex gap-4">
               <button className="p-3 bg-[#EBEEF2] rounded-xl text-slate-500 hover:bg-slate-200 transition-colors">
                  <Filter size={18} />
               </button>
               {/* Template download link */}
               <a 
                 href="#" 
                 onClick={(e) => {
                   e.preventDefault();
                   const csvContent = "name,sku,price,initial_stock,category\nChocolate Amargo 70%,CH-AM-001,150.0,100,Chocolates";
                   const blob = new Blob([csvContent], { type: 'text/csv' });
                   const url = window.URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url;
                   a.download = 'entrega_plantilla_stock.csv';
                   a.click();
                 }}
                 className="flex items-center gap-2 px-4 py-2 text-[#56CCF2] text-xs font-black uppercase tracking-widest hover:bg-[#56CCF2]/5 rounded-xl transition-all"
               >
                  <Download size={14} />
                  Descargar Plantilla
               </a>
            </div>
         </div>

         <div className="overflow-x-auto rounded-3xl border border-slate-50 shadow-sm">
            <table className="w-full text-left border-collapse">
               <thead className="bg-[#1D3146] text-white">
                  <tr className="text-[10px] font-black uppercase tracking-widest">
                     <th className="px-8 py-5">Producto</th>
                     <th className="px-4 py-5">SKU</th>
                     <th className="px-4 py-5 text-center">Disponible</th>
                     <th className="px-8 py-5 text-right">Precio</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-20 text-center">
                         <Loader2 className="animate-spin mx-auto text-[#56CCF2]" size={32} />
                         <p className="mt-4 text-sm font-bold text-slate-400">Cargando inventario...</p>
                      </td>
                    </tr>
                  ) : filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-all duration-200 group cursor-pointer font-medium text-sm">
                         <td className="px-8 py-5">
                            <span className="font-bold text-[#1D3146] group-hover:text-[#56CCF2] transition-colors">{p.name}</span>
                         </td>
                         <td className="px-4 py-5">
                            <span className="font-mono text-xs text-slate-400">{p.sku || '---'}</span>
                         </td>
                         <td className="px-4 py-5 font-black text-center">
                            <span className={`inline-block px-3 py-1 rounded-xl text-[10px] ${
                               p.quantity > 10 ? 'bg-green-100 text-green-700' : 
                               p.quantity > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                            }`}>
                               {p.quantity} unid.
                            </span>
                         </td>
                         <td className="px-8 py-5 text-right font-black text-[#1D3146]">
                            ${p.price.toFixed(2)}
                         </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-20 text-center">
                         <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Package className="text-slate-300" size={32} />
                         </div>
                         <p className="text-lg font-bold text-[#1D3146]">No se encontraron productos</p>
                         <p className="text-sm text-slate-400">Intenta importar tu catálogo para comenzar.</p>
                      </td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
