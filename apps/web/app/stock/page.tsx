'use client';
import React, { useState } from 'react';

export default function StockPage() {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // API call to bulk import (Next.js proxy configured in next.config.mjs)
      const response = await fetch('/api/v1/products/bulk-import', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('📦 Catálogo de ChocoBites importado correctamente');
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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Inventario y Precios</h2>
          <p className="text-slate-400 font-medium">Control maestro de stock para el piloto ChocoBites</p>
        </div>
        
        <div className="flex gap-4 relative z-10">
          <label className={`cursor-pointer group flex items-center gap-3 px-6 py-3.5 rounded-2xl font-bold transition-all duration-300 ${uploading ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-black hover:shadow-xl hover:shadow-slate-200'}`}>
            <span>{uploading ? 'Procesando...' : 'Subir Catálogo (.csv)'}</span>
            {!uploading && <span className="text-slate-400 group-hover:text-white">↑</span>}
            <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="overflow-hidden rounded-3xl border border-slate-50 shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-500">
              <tr className="border-b border-slate-50">
                <th className="p-5 font-black uppercase text-[10px] tracking-widest">Producto</th>
                <th className="p-5 font-black uppercase text-[10px] tracking-widest">SKU</th>
                <th className="p-5 font-black uppercase text-[10px] tracking-widest">Disponible</th>
                <th className="p-5 font-black uppercase text-[10px] tracking-widest text-right">Precio</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-indigo-50/30 transition-all duration-200 cursor-pointer border-b border-slate-50 last:border-0 group">
                <td className="p-5 text-sm font-bold text-slate-800 group-hover:text-indigo-600">Chocolate Amargo 70%</td>
                <td className="p-5 text-xs font-mono text-slate-400">CH-AM-001</td>
                <td className="p-5">
                   <div className="flex items-center gap-2">
                       <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                       <span className="bg-green-100 text-green-700 px-3 py-1 rounded-xl text-xs font-black">100 unidades</span>
                   </div>
                </td>
                <td className="p-5 text-right font-black text-slate-800">$150.00</td>
              </tr>
              <tr className="hover:bg-indigo-50/30 transition-all duration-200 cursor-pointer last:border-0 group">
                <td className="p-5 text-sm font-bold text-slate-800 group-hover:text-indigo-600">Trufas de Avellana</td>
                <td className="p-5 text-xs font-mono text-slate-400">TR-AV-042</td>
                <td className="p-5">
                   <div className="flex items-center gap-2">
                       <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                       <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-xl text-xs font-black">15 unidades</span>
                   </div>
                </td>
                <td className="p-5 text-right font-black text-slate-800">$220.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
